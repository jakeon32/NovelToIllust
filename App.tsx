import React, { useState, useEffect, useCallback } from 'react';
import type { Character, Scene, ImageFile, Story, Background } from './types';
import { generateScenesFromText, generateIllustration, generateTitleFromText, editIllustration, analyzeCharacter, analyzeBackground, analyzeArtStyle, generatePrompt } from './services/geminiService';
import { loadStories, saveStories, migrateFromLocalStorage, isIndexedDBAvailable } from './utils/storage';
import { supabase } from './services/supabaseClient';
import { loadStoriesFromSupabase, saveStoriesToSupabase, deleteStoryFromSupabase, saveStoryToSupabase } from './services/supabaseStorage';
import { saveSceneImage, getSceneImage, deleteAllSceneImagesForStory, migrateSceneImagesFromLocalStorage } from './services/localSceneStorage';
import type { User } from '@supabase/supabase-js';
import ReferenceImageUpload from './components/ReferenceImageUpload';
import SceneCard from './components/SceneCard';
import Loader from './components/Loader';
import StorySidebar from './components/StorySidebar';
import ImageModal from './components/ImageModal';
import Auth from './components/Auth';
import PlusIcon from './components/icons/PlusIcon';
import TrashIcon from './components/icons/TrashIcon';
import SparklesIcon from './components/icons/SparklesIcon';
import FilmIcon from './components/icons/FilmIcon';
import Bars3Icon from './components/icons/Bars3Icon';

const dataUrlToImageFile = (dataUrl: string, name: string = 'image.png'): ImageFile | null => {
    const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (!match) {
        console.error("Invalid data URL format");
        return null;
    }
    return {
        mimeType: match[1],
        base64: match[2],
        name: name,
    };
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);

  // Save currentStoryId to localStorage whenever it changes
  useEffect(() => {
    if (currentStoryId) {
      localStorage.setItem('currentStoryId', currentStoryId);
      console.log('💾 Current story ID saved:', currentStoryId);
    }
  }, [currentStoryId]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSceneForModal, setSelectedSceneForModal] = useState<Scene | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [analyzingCharacters, setAnalyzingCharacters] = useState<Record<string, boolean>>({});
  const [analyzingBackgrounds, setAnalyzingBackgrounds] = useState<Record<string, boolean>>({});
  const [analyzingArtStyle, setAnalyzingArtStyle] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  // Authentication state management
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const initializeStorage = async () => {
      if (!user) return; // Wait for user to be loaded

      try {
        // Load stories from Supabase (WITHOUT scenes - they're not stored there)
        let loadedStories = await loadStoriesFromSupabase();

        // If no stories in Supabase, try to migrate from IndexedDB
        if (loadedStories.length === 0) {
          console.log('No stories in Supabase, checking IndexedDB for migration...');

          // Try to migrate data from localStorage if exists
          let localStories = await migrateFromLocalStorage();

          // If no migrated data, load from IndexedDB
          if (localStories.length === 0) {
            localStories = await loadStories();
          }

          if (localStories.length > 0) {
            console.log(`Migrating ${localStories.length} stories from IndexedDB to Supabase...`);
            await saveStoriesToSupabase(localStories);
            loadedStories = localStories;
          }
        } else {
          // CRITICAL: Restore scenes from IndexedDB
          // Supabase doesn't store scenes, but IndexedDB does
          console.log('📚 Restoring scenes from IndexedDB...');
          const indexedDBStories = await loadStories();

          loadedStories = loadedStories.map(supabaseStory => {
            // Find matching story in IndexedDB
            const indexedDBStory = indexedDBStories.find(s => s.id === supabaseStory.id);

            if (indexedDBStory && indexedDBStory.scenes && indexedDBStory.scenes.length > 0) {
              console.log(`✅ Restored ${indexedDBStory.scenes.length} scenes for story: ${supabaseStory.title}`);
              return {
                ...supabaseStory,
                scenes: indexedDBStory.scenes, // Restore scenes from IndexedDB
              };
            }

            // No scenes in IndexedDB, keep empty
            return supabaseStory;
          });
        }

        // Migrate scene images from localStorage to IndexedDB if needed
        await migrateSceneImagesFromLocalStorage();

        // Load scene images from IndexedDB
        loadedStories = await Promise.all(
          loadedStories.map(async (story) => ({
            ...story,
            scenes: await Promise.all(
              story.scenes.map(async (scene) => ({
                ...scene,
                imageUrl: (await getSceneImage(story.id, scene.id)) || undefined,
              }))
            ),
          }))
        );

        if (loadedStories.length > 0) {
          setStories(loadedStories);

          // Restore previously selected story ID from localStorage
          const savedStoryId = localStorage.getItem('currentStoryId');
          const storyExists = savedStoryId && loadedStories.some(s => s.id === savedStoryId);

          if (storyExists) {
            setCurrentStoryId(savedStoryId);
            console.log('✅ Restored current story ID from localStorage:', savedStoryId);
          } else {
            setCurrentStoryId(loadedStories[0].id);
            console.log('ℹ️ No saved story ID found, using first story');
          }
        } else {
          handleNewStory();
        }
      } catch (e) {
        console.error("Failed to load stories:", e);
        setError('스토리를 불러오는데 실패했습니다.');
        handleNewStory();
      }
    };

    initializeStorage();
  }, [user]);

  useEffect(() => {
    const saveStoriesAsync = async () => {
      if (stories.length > 0) {
        try {
          // CRITICAL: Save to IndexedDB FIRST (for local persistence)
          // This ensures scenes are not lost when switching tabs or refreshing
          await saveStories(stories);
          console.log('💾 Stories saved to IndexedDB (including scenes)');

          // Then save to Supabase if user is logged in
          if (user) {
            await saveStoriesToSupabase(stories);
            console.log('☁️ Stories saved to Supabase (excluding scenes)');
          }
        } catch (e) {
          console.error("Failed to save stories:", e);
          setError("스토리를 저장할 수 없습니다.");
        }
      }
    };

    // Debounce saves to avoid too many writes
    const timeoutId = setTimeout(() => {
      saveStoriesAsync();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [stories, user]);

  const currentStory = stories.find(s => s.id === currentStoryId);

  const handleNewStory = () => {
    const newStory: Story = {
      id: crypto.randomUUID(),
      title: '새 스토리',
      novelText: '',
      characters: [],
      backgrounds: [],
      artStyle: null,
      scenes: [],
    };
    setStories(prev => [newStory, ...prev]);
    setCurrentStoryId(newStory.id);
    setIsSidebarOpen(false);
  };
  
  const handleDeleteStory = async (storyId: string) => {
    try {
      // Delete from Supabase
      await deleteStoryFromSupabase(storyId);

      // Delete scene images from IndexedDB
      await deleteAllSceneImagesForStory(storyId);
      console.log('🗑️ All scene images deleted from IndexedDB');

      // Update local state
      const updatedStories = stories.filter(s => s.id !== storyId);
      setStories(updatedStories);

      if (currentStoryId === storyId) {
          if (updatedStories.length > 0) {
              setCurrentStoryId(updatedStories[0].id);
          } else {
              handleNewStory();
          }
      }
    } catch (e) {
      console.error("Failed to delete story:", e);
      setError("스토리를 삭제하는데 실패했습니다.");
    }
  };

  const handleUpdateCurrentStory = (updates: Partial<Omit<Story, 'id'>> | ((prevStory: Story) => Partial<Omit<Story, 'id'>>)) => {
    if (currentStoryId) {
      setStories(prevStories =>
        prevStories.map(story => {
            if (story.id === currentStoryId) {
                const newUpdates = typeof updates === 'function' ? updates(story) : updates;
                return { ...story, ...newUpdates };
            }
            return story;
        })
      );
    }
  };

  const handleAddCharacter = () => {
    if (!currentStory) return;
    const newCharacter: Character = {
      id: crypto.randomUUID(),
      name: `캐릭터 ${currentStory.characters.length + 1}`,
      image: null,
    };
    handleUpdateCurrentStory({ characters: [...currentStory.characters, newCharacter] });
  };
  
  const handleCharacterChange = async <T extends keyof Character>(id: string, field: T, value: Character[T]) => {
      if (!currentStory) return;

      let updatedCharacters = currentStory.characters.map((char) =>
        char.id === id ? { ...char, [field]: value } : char
      );

      console.log('👤 Character updated:', {
        characterId: id,
        field,
        hasImage: field === 'image' ? !!value : 'N/A',
        timestamp: new Date().toISOString()
      });

      // Update UI immediately first
      handleUpdateCurrentStory({ characters: updatedCharacters });

      // If image is being updated and a new image is provided, analyze it in background
      if (field === 'image' && value) {
        console.log('🔍 Analyzing character appearance...');
        setAnalyzingCharacters(prev => ({ ...prev, [id]: true }));

        // Run analysis in background (don't block UI)
        analyzeCharacter(value as ImageFile)
          .then(result => {
            console.log('✅ Character analysis complete for character:', id);
            console.log('   Description preview:', result.description.substring(0, 150) + '...');
            console.log('   Structured analysis:', result.structuredAnalysis);

            // Update description and structured analysis
            // Use handleUpdateCurrentStory to ensure it's saved to Supabase
            handleUpdateCurrentStory(prevStory => {
              const updatedCharacters = prevStory.characters.map(char =>
                char.id === id ? { ...char, description: result.description, structuredAnalysis: result.structuredAnalysis } : char
              );

              console.log('   Updating character:', {
                characterId: id,
                foundCharacter: updatedCharacters.find(c => c.id === id),
                hasDescription: !!updatedCharacters.find(c => c.id === id)?.description
              });

              return { characters: updatedCharacters };
            });

            // Auto-expand the description after analysis
            setExpandedDescriptions(prev => ({ ...prev, [id]: true }));
          })
          .catch(error => {
            console.error('Failed to analyze character:', error);
            setError('캐릭터 분석에 실패했습니다.');
          })
          .finally(() => {
            setAnalyzingCharacters(prev => ({ ...prev, [id]: false }));
          });
      }
  };

  const handleReanalyzeCharacter = async (id: string) => {
    if (!currentStory) return;

    const character = currentStory.characters.find(c => c.id === id);
    if (!character?.image) {
      setError('캐릭터 이미지를 먼저 업로드해주세요.');
      return;
    }

    console.log('🔄 Re-analyzing character appearance...');
    setAnalyzingCharacters(prev => ({ ...prev, [id]: true }));

    try {
      const result = await analyzeCharacter(character.image);
      console.log('✅ Re-analysis complete:', result.description.substring(0, 100) + '...');

      const updatedCharacters = currentStory.characters.map((char) =>
        char.id === id ? { ...char, description: result.description, structuredAnalysis: result.structuredAnalysis } : char
      );

      handleUpdateCurrentStory({ characters: updatedCharacters });
    } catch (error) {
      console.error('Failed to re-analyze character:', error);
      setError('캐릭터 재분석에 실패했습니다.');
    } finally {
      setAnalyzingCharacters(prev => ({ ...prev, [id]: false }));
    }
  };
  
  const handleRemoveCharacter = (id: string) => {
    if (!currentStory) return;

    const character = currentStory.characters.find(c => c.id === id);
    const confirmMessage = character?.description
      ? `"${character.name}" 캐릭터와 분석 내용을 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
      : `"${character?.name}" 캐릭터를 삭제하시겠습니까?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const updatedCharacters = currentStory.characters.filter((char) => char.id !== id);
    handleUpdateCurrentStory({ characters: updatedCharacters });
  };
  
  const handleAddBackground = () => {
    if (!currentStory) return;
    const newBackground: Background = {
      id: crypto.randomUUID(),
      name: `배경 ${currentStory.backgrounds.length + 1}`,
      image: null as any, // Will be set by user
    };
    handleUpdateCurrentStory({ backgrounds: [...currentStory.backgrounds, newBackground] });
  };

  const handleBackgroundChange = async <T extends keyof Background>(id: string, field: T, value: Background[T]) => {
    if (!currentStory) return;

    let updatedBackgrounds = currentStory.backgrounds.map((bg) =>
      bg.id === id ? { ...bg, [field]: value } : bg
    );

    console.log('🏞️ Background updated:', {
      backgroundId: id,
      field,
      hasImage: field === 'image' ? !!value : 'N/A',
      timestamp: new Date().toISOString()
    });

    // Update UI immediately first
    handleUpdateCurrentStory({ backgrounds: updatedBackgrounds });

    // If image is being updated and a new image is provided, analyze it in background
    if (field === 'image' && value) {
      console.log('🔍 Analyzing background setting...');
      setAnalyzingBackgrounds(prev => ({ ...prev, [id]: true }));

      // Run analysis in background (don't block UI)
      analyzeBackground(value as ImageFile)
        .then(result => {
          console.log('✅ Background analysis complete:', result.description.substring(0, 100) + '...');

          // Update description and structured analysis
          // Use handleUpdateCurrentStory to ensure it's saved to Supabase
          handleUpdateCurrentStory(prevStory => ({
            backgrounds: prevStory.backgrounds.map(bg =>
              bg.id === id ? { ...bg, description: result.description, structuredAnalysis: result.structuredAnalysis } : bg
            ),
          }));

          // Auto-expand the description after analysis
          setExpandedDescriptions(prev => ({ ...prev, [`bg_${id}`]: true }));
        })
        .catch(error => {
          console.error('Failed to analyze background:', error);
          setError('배경 분석에 실패했습니다.');
        })
        .finally(() => {
          setAnalyzingBackgrounds(prev => ({ ...prev, [id]: false }));
        });
    }
  };

  const handleReanalyzeBackground = async (id: string) => {
    if (!currentStory) return;

    const background = currentStory.backgrounds.find(b => b.id === id);
    if (!background?.image) {
      setError('배경 이미지를 먼저 업로드해주세요.');
      return;
    }

    console.log('🔄 Re-analyzing background setting...');
    setAnalyzingBackgrounds(prev => ({ ...prev, [id]: true }));

    try {
      const result = await analyzeBackground(background.image);
      console.log('✅ Re-analysis complete:', result.description.substring(0, 100) + '...');

      const updatedBackgrounds = currentStory.backgrounds.map((bg) =>
        bg.id === id ? { ...bg, description: result.description, structuredAnalysis: result.structuredAnalysis } : bg
      );

      handleUpdateCurrentStory({ backgrounds: updatedBackgrounds });
    } catch (error) {
      console.error('Failed to re-analyze background:', error);
      setError('배경 재분석에 실패했습니다.');
    } finally {
      setAnalyzingBackgrounds(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRemoveBackground = (id: string) => {
    if (!currentStory) return;

    const background = currentStory.backgrounds.find(b => b.id === id);
    const confirmMessage = background?.description
      ? `"${background.name}" 배경과 분석 내용을 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
      : `"${background?.name}" 배경을 삭제하시겠습니까?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const updatedBackgrounds = currentStory.backgrounds.filter((bg) => bg.id !== id);
    handleUpdateCurrentStory({ backgrounds: updatedBackgrounds });
  };

  const handleArtStyleChange = async (artStyle: ImageFile | null) => {
    // If removing art style, ask for confirmation
    if (!artStyle && currentStory?.artStyle) {
      const confirmMessage = currentStory.artStyleDescription
        ? '아트 스타일 레퍼런스와 분석 내용을 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
        : '아트 스타일 레퍼런스를 삭제하시겠습니까?';

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    console.log('🎨 Art style updated:', {
      hasImage: !!artStyle,
      timestamp: new Date().toISOString()
    });

    // Update UI immediately first
    handleUpdateCurrentStory({ artStyle });

    // If new art style image is provided, analyze it in background
    if (artStyle) {
      console.log('🔍 Analyzing art style...');
      setAnalyzingArtStyle(true);

      // Run analysis in background (don't block UI)
      analyzeArtStyle(artStyle)
        .then(result => {
          console.log('✅ Art style analysis complete:', result.description.substring(0, 100) + '...');

          // Update description and structured analysis
          // Use handleUpdateCurrentStory to ensure it's saved to Supabase
          handleUpdateCurrentStory({ artStyleDescription: result.description, artStyleStructuredAnalysis: result.structuredAnalysis });

          // Auto-expand the description after analysis
          setExpandedDescriptions(prev => ({ ...prev, 'artStyle': true }));
        })
        .catch(error => {
          console.error('Failed to analyze art style:', error);
          setError('아트 스타일 분석에 실패했습니다.');
        })
        .finally(() => {
          setAnalyzingArtStyle(false);
        });
    } else {
      // Clear art style description if image is removed
      setStories(prevStories =>
        prevStories.map(story =>
          story.id === currentStoryId
            ? { ...story, artStyleDescription: undefined }
            : story
        )
      );
    }
  };

  const handleReanalyzeArtStyle = async () => {
    if (!currentStory?.artStyle) {
      setError('아트 스타일 이미지를 먼저 업로드해주세요.');
      return;
    }

    console.log('🔄 Re-analyzing art style...');
    setAnalyzingArtStyle(true);

    try {
      const result = await analyzeArtStyle(currentStory.artStyle);
      console.log('✅ Re-analysis complete:', result.description.substring(0, 100) + '...');

      handleUpdateCurrentStory({ artStyleDescription: result.description, artStyleStructuredAnalysis: result.structuredAnalysis });
    } catch (error) {
      console.error('Failed to re-analyze art style:', error);
      setError('아트 스타일 재분석에 실패했습니다.');
    } finally {
      setAnalyzingArtStyle(false);
    }
  };

  const handleAnalyzeNovel = async () => {
    if (!currentStory || !currentStory.novelText.trim()) {
      setError("소설 텍스트를 입력해주세요.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    handleUpdateCurrentStory({ scenes: [] });
    
    try {
        let title = currentStory.title;
        if (title === '새 스토리' || title === 'Untitled Story' || title === 'New Story') {
            title = await generateTitleFromText(currentStory.novelText);
        }

      const sceneDescriptions = await generateScenesFromText(currentStory.novelText);
      const newScenes: Scene[] = sceneDescriptions.map((structuredDesc, index) => ({
        id: crypto.randomUUID(),
        description: structuredDesc.summary, // Use summary for backward compatibility
        structuredDescription: structuredDesc, // Store full structured data
        imageUrl: null,
        isGenerating: false,
        shotType: 'automatic',
        aspectRatio: '1:1',
      }));
      handleUpdateCurrentStory({ scenes: newScenes, title });
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const generateSingleIllustration = async (sceneId: string) => {
    if (!currentStory) return;

    // Get the latest scene data from current story
    const scene = currentStory.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // STEP 1: If no customPrompt exists, generate it first and save it
    if (!scene.customPrompt) {
      console.log('📝 No custom prompt found, generating prompt first...');

      try {
        const generatedPrompt = await generatePrompt(
          scene.description,
          currentStory.characters,
          currentStory.backgrounds,
          currentStory.artStyleDescription,
          scene.shotType
        );

        // Save the generated prompt to the scene
        handleUpdateCurrentStory(prevStory => ({
          scenes: prevStory.scenes.map(s =>
            s.id === sceneId ? { ...s, customPrompt: generatedPrompt } : s
          )
        }));

        console.log('✅ Prompt generated and saved:', generatedPrompt.substring(0, 200) + '...');
        alert('프롬프트가 생성되었습니다. 장면 카드에서 프롬프트를 확인하고 수정한 후 다시 이미지 생성 버튼을 눌러주세요.');
        return; // Stop here, user needs to review the prompt
      } catch (err) {
        console.error('Failed to generate prompt:', err);
        setError('프롬프트 생성에 실패했습니다.');
        return;
      }
    }

    // STEP 2: If customPrompt exists, proceed with image generation
    console.log('✅ Using existing custom prompt for image generation');

    handleUpdateCurrentStory(prevStory => ({
        scenes: prevStory.scenes.map(s => s.id === sceneId ? { ...s, isGenerating: true } : s)
    }));

    if (selectedSceneForModal && selectedSceneForModal.id === sceneId) {
        setSelectedSceneForModal(prev => prev ? { ...prev, isGenerating: true } : null);
    }

    // CRITICAL: Use currentStory directly instead of searching again
    // currentStory is already the latest from React state
    const latestStory = currentStory;

    console.log('⚠️ CRITICAL: Checking story data before generation:', {
      storyId: latestStory.id,
      currentStoryId: currentStoryId,
      areEqual: latestStory.id === currentStoryId,
      timestamp: new Date().toISOString()
    });

    console.log('\n' + '='.repeat(100));
    console.log('🎨 FRONTEND: Preparing data for API call');
    console.log('='.repeat(100));
    console.log('📝 Scene Description:', scene.description);
    console.log('📐 Shot Type:', scene.shotType);
    console.log('📐 Aspect Ratio:', scene.aspectRatio);
    console.log('\n👥 Characters to send:', latestStory.characters.length);
    latestStory.characters.forEach((c, idx) => {
      console.log(`   Character ${idx + 1}:`, {
        name: c.name,
        hasImage: !!c.image,
        imageType: c.image?.mimeType,
        imageSize: c.image?.base64?.length || 0,
        hasDescription: !!c.description,
        descriptionLength: c.description?.length || 0,
        descriptionPreview: c.description ? c.description.substring(0, 100) + '...' : 'NO DESCRIPTION'
      });
    });
    console.log('\n🏞️  Backgrounds to send:', latestStory.backgrounds.length);
    latestStory.backgrounds.forEach((b, idx) => {
      console.log(`   Background ${idx + 1}:`, {
        name: b.name,
        hasImage: !!b.image,
        imageType: b.image?.mimeType,
        imageSize: b.image?.base64?.length || 0,
        hasDescription: !!b.description,
        descriptionLength: b.description?.length || 0,
        descriptionPreview: b.description ? b.description.substring(0, 100) + '...' : 'NO DESCRIPTION'
      });
    });
    console.log('\n🎨 Art Style to send:', latestStory.artStyle ? {
      hasImage: true,
      imageType: latestStory.artStyle.mimeType,
      imageSize: latestStory.artStyle.base64?.length || 0,
      hasDescription: !!latestStory.artStyleDescription,
      descriptionLength: latestStory.artStyleDescription?.length || 0,
      descriptionPreview: latestStory.artStyleDescription ? latestStory.artStyleDescription.substring(0, 100) + '...' : 'NO DESCRIPTION'
    } : 'NO ART STYLE');
    console.log('='.repeat(100) + '\n');

    console.log('📊 Current story state check:', {
      storyId: latestStory.id,
      totalCharacters: latestStory.characters.length,
      totalBackgrounds: latestStory.backgrounds.length,
      timestamp: new Date().toISOString()
    });

    try {
      console.log('🚀 Calling API to generate illustration...');
      const result = await generateIllustration(
        scene.description,
        scene.structuredDescription,
        latestStory.characters,
        latestStory.backgrounds,
        latestStory.artStyle,
        latestStory.artStyleDescription,
        scene.shotType,
        scene.aspectRatio
      );

      const imageUrl = result.image;
      const usedPrompt = result.prompt;

      console.log('📝 Prompt used for generation:', usedPrompt);

      // Compare with previous image to detect if it's actually different
      const previousImage = currentStory.scenes.find(s => s.id === sceneId)?.imageUrl;
      const imageHash = imageUrl.substring(imageUrl.length - 50, imageUrl.length); // Last 50 chars as hash
      const previousHash = previousImage ? previousImage.substring(previousImage.length - 50, previousImage.length) : 'none';

      console.log('✅ API returned image:', {
        imageUrlLength: imageUrl.length,
        imagePreview: imageUrl.substring(0, 100) + '...',
        imageHash: imageHash,
        previousImageHash: previousHash,
        isDifferent: imageHash !== previousHash,
        timestamp: new Date().toISOString()
      });

      if (imageHash === previousHash && previousImage) {
        console.warn('⚠️ WARNING: Generated image is IDENTICAL to previous image! This should not happen with AI generation.');
      }

      // Save scene image to IndexedDB
      if (currentStoryId) {
        await saveSceneImage(currentStoryId, sceneId, imageUrl);
        console.log('💾 Scene image saved to IndexedDB');
      }

      handleUpdateCurrentStory(prevStory => ({
        scenes: prevStory.scenes.map(s => s.id === sceneId ? { ...s, imageUrl, customPrompt: usedPrompt, isGenerating: false } : s)
      }));

      if (selectedSceneForModal && selectedSceneForModal.id === sceneId) {
        setSelectedSceneForModal(prev => prev ? { ...prev, imageUrl, isGenerating: false } : null);
      }
    } catch (err) {
      console.error(`Failed to generate illustration for scene ${sceneId}:`, err);
      setError(`일러스트 생성에 실패했습니다. 다시 시도해주세요.`);

      handleUpdateCurrentStory(prevStory => ({
        scenes: prevStory.scenes.map(s => s.id === sceneId ? { ...s, isGenerating: false } : s)
      }));
       if (selectedSceneForModal && selectedSceneForModal.id === sceneId) {
        setSelectedSceneForModal(prev => prev ? { ...prev, isGenerating: false } : null);
      }
    }
  };
  
  const generateAllScenes = async () => {
    if (!currentStory) return;

    // Find scenes without images
    const scenesToGenerate = currentStory.scenes.filter(scene => !scene.imageUrl && !scene.isGenerating);

    if (scenesToGenerate.length === 0) {
      setError('생성할 장면이 없습니다. 모든 장면에 이미 이미지가 있습니다.');
      return;
    }

    setIsGeneratingAll(true);
    setGenerationProgress({ current: 0, total: scenesToGenerate.length });
    setError(null);

    for (let i = 0; i < scenesToGenerate.length; i++) {
      const scene = scenesToGenerate[i];
      setGenerationProgress({ current: i + 1, total: scenesToGenerate.length });

      try {
        await generateSingleIllustration(scene.id);
      } catch (err) {
        console.error(`Failed to generate illustration for scene ${scene.id}:`, err);
        // Continue with next scene even if one fails
      }
    }

    setIsGeneratingAll(false);
    setGenerationProgress({ current: 0, total: 0 });
  };

  const handleEditIllustration = async (sceneId: string, editPrompt: string) => {
    const sceneToEdit = currentStory?.scenes.find(s => s.id === sceneId);
    if (!currentStory || !sceneToEdit || !sceneToEdit.imageUrl) return;

    const originalImageFile = dataUrlToImageFile(sceneToEdit.imageUrl);
    if (!originalImageFile) {
        setError("편집을 위한 원본 이미지를 처리할 수 없습니다.");
        return;
    }

    handleUpdateCurrentStory(prevStory => ({
        scenes: prevStory.scenes.map(s => s.id === sceneId ? { ...s, isGenerating: true } : s)
    }));

    if (selectedSceneForModal && selectedSceneForModal.id === sceneId) {
        setSelectedSceneForModal(prev => prev ? { ...prev, isGenerating: true } : null);
    }

    try {
        const newImageUrl = await editIllustration(originalImageFile, editPrompt);

        // Save edited scene image to IndexedDB
        if (currentStoryId) {
          await saveSceneImage(currentStoryId, sceneId, newImageUrl);
          console.log('💾 Edited scene image saved to IndexedDB');
        }

        handleUpdateCurrentStory(prevStory => ({
            scenes: prevStory.scenes.map(s => s.id === sceneId ? { ...s, imageUrl: newImageUrl, isGenerating: false } : s)
        }));

        if (selectedSceneForModal && selectedSceneForModal.id === sceneId) {
            setSelectedSceneForModal(prev => prev ? { ...prev, imageUrl: newImageUrl, isGenerating: false } : null);
        }
    } catch (err) {
        console.error(`Failed to edit illustration for scene ${sceneId}:`, err);
        setError(`편집 적용에 실패했습니다. 다시 시도해주세요.`);

        handleUpdateCurrentStory(prevStory => ({
            scenes: prevStory.scenes.map(s => s.id === sceneId ? { ...s, isGenerating: false } : s)
        }));

        if (selectedSceneForModal && selectedSceneForModal.id === sceneId) {
            setSelectedSceneForModal(prev => prev ? { ...prev, isGenerating: false } : null);
        }
    }
  };

  const handleDeleteScene = (sceneId: string) => {
    handleUpdateCurrentStory(prevStory => ({
      scenes: prevStory.scenes.filter(s => s.id !== sceneId)
    }));
  };

  const handleSceneShotTypeChange = (sceneId: string, shotType: string) => {
    handleUpdateCurrentStory(prevStory => ({
      scenes: prevStory.scenes.map(s => s.id === sceneId ? { ...s, shotType } : s)
    }));
  };

  const handleSceneAspectRatioChange = (sceneId: string, aspectRatio: string) => {
    handleUpdateCurrentStory(prevStory => ({
      scenes: prevStory.scenes.map(s => s.id === sceneId ? { ...s, aspectRatio } : s)
    }));
  };

  const handleSceneDescriptionChange = (sceneId: string, description: string) => {
    handleUpdateCurrentStory(prevStory => ({
      scenes: prevStory.scenes.map(s => s.id === sceneId ? { ...s, description } : s)
    }));
  };

  const handleSceneCustomPromptChange = (sceneId: string, customPrompt: string) => {
    handleUpdateCurrentStory(prevStory => ({
      scenes: prevStory.scenes.map(s => s.id === sceneId ? { ...s, customPrompt } : s)
    }));
  };

  const handleDownloadImage = (imageUrl: string, filename: string) => {
    try {
      // Convert base64 data URL to Blob for better mobile support
      const arr = imageUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });

      // Create blob URL
      const blobUrl = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab for mobile browsers that don't support download
      const newWindow = window.open(imageUrl, '_blank');
      if (!newWindow) {
        alert('다운로드에 실패했습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
      }
    }
  };
  
  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="bg-gray-900 h-screen flex items-center justify-center">
        <Loader text="로딩 중..." />
      </div>
    );
  }

  // Show Auth component if not logged in
  if (!user) {
    return <Auth />;
  }

  if (!currentStory) {
    return (
        <div className="bg-gray-900 h-screen flex items-center justify-center">
            <Loader text="스토리 로딩 중..."/>
        </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 text-gray-200 font-sans flex">
        <StorySidebar
            stories={stories}
            currentStoryId={currentStoryId}
            onSelectStory={(id) => {
                setCurrentStoryId(id);
                setIsSidebarOpen(false);
            }}
            onNewStory={handleNewStory}
            onDeleteStory={handleDeleteStory}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
        />
      <main className="flex-1 overflow-y-auto w-full md:pl-64">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <header className="mb-10">
              <div className="flex items-center justify-between">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden p-2 text-gray-400 hover:text-white"
                    aria-label="Open sidebar"
                >
                    <Bars3Icon className="w-6 h-6" />
                </button>
                <div className="flex-1 text-center">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
                        소설 AI 일러스트 생성기
                    </h1>
                    <p className="mt-2 text-md sm:text-lg text-gray-400">
                        글로 쓴 이야기를 시각적 걸작으로 변환하세요.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-sm text-gray-400">
                    {user?.email}
                  </div>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                    }}
                    className="px-3 py-1.5 text-sm text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            </header>
            
            {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md relative mb-6" role="alert">
                <strong className="font-bold">오류: </strong>
                <span className="block sm:inline">{error}</span>
                 <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Close">
                    <svg className="fill-current h-6 w-6 text-red-400" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                </button>
            </div>
            )}

            <div className="space-y-12">
            {/* Step 1: Add Reference Images */}
            <section className="bg-gray-800/50 p-6 rounded-xl shadow-2xl border border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-indigo-300">1. 레퍼런스 이미지 추가 (선택사항)</h2>
                <div className="mb-6">
                  <ReferenceImageUpload label="아트 스타일 레퍼런스" image={currentStory.artStyle} onImageChange={handleArtStyleChange} />

                  {/* Art Style AI Analysis Section */}
                  {currentStory.artStyle && (
                    <div className="mt-4 p-4 bg-gray-900/70 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => setExpandedDescriptions(prev => ({ ...prev, 'artStyle': !prev['artStyle'] }))}
                          className="flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${expandedDescriptions['artStyle'] ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          AI 분석 결과 {currentStory.artStyleDescription ? '✓' : '(분석 대기 중)'}
                        </button>
                        {currentStory.artStyleDescription && (
                          <button
                            onClick={handleReanalyzeArtStyle}
                            disabled={analyzingArtStyle}
                            className="text-xs px-2 py-1 text-gray-400 hover:text-indigo-400 border border-gray-600 hover:border-indigo-500 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {analyzingArtStyle ? '분석 중...' : '재분석'}
                          </button>
                        )}
                      </div>

                      {analyzingArtStyle && (
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-indigo-400 rounded-full animate-spin"></div>
                          <span>AI가 아트 스타일을 분석하고 있습니다...</span>
                        </div>
                      )}

                      {expandedDescriptions['artStyle'] && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">
                            일러스트 생성 시 이 설명을 참고합니다. 잘못된 부분이 있다면 직접 수정하세요.
                          </p>
                          <textarea
                            value={currentStory.artStyleDescription || '이미지를 업로드하면 자동으로 분석됩니다.'}
                            onChange={(e) => handleUpdateCurrentStory({ artStyleDescription: e.target.value })}
                            disabled={!currentStory.artStyleDescription}
                            className="w-full h-64 p-3 bg-gray-800 border border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="AI 분석 결과가 여기에 표시됩니다..."
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-300">배경</h3>
                <div className="space-y-4">
                    {currentStory.backgrounds.map((bg) => (
                    <div key={bg.id} className="flex flex-col gap-4 p-4 bg-gray-900/70 rounded-lg border border-gray-700">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <div className="flex-1 w-full">
                            <input
                              type="text"
                              value={bg.name}
                              onChange={(e) => handleBackgroundChange(bg.id, 'name', e.target.value)}
                              className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="배경 이름 (예: 왕궁 대전, 마법의 숲)"
                            />
                          </div>
                          <div className="flex-1 w-full">
                            <ReferenceImageUpload
                              label={`${bg.name} 이미지`}
                              image={bg.image}
                              onImageChange={(img) => handleBackgroundChange(bg.id, 'image', img)}
                              artStyle={currentStory.artStyle}
                            />
                          </div>
                          <button
                            onClick={() => handleRemoveBackground(bg.id)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <TrashIcon className="w-6 h-6" />
                          </button>
                        </div>

                        {/* AI Analysis Section */}
                        {bg.image && (
                          <div className="border-t border-gray-700 pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <button
                                onClick={() => setExpandedDescriptions(prev => ({ ...prev, [`bg_${bg.id}`]: !prev[`bg_${bg.id}`] }))}
                                className="flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300"
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform ${expandedDescriptions[`bg_${bg.id}`] ? 'rotate-90' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                AI 분석 결과 {bg.description ? '✓' : '(분석 대기 중)'}
                              </button>
                              {bg.description && (
                                <button
                                  onClick={() => handleReanalyzeBackground(bg.id)}
                                  disabled={analyzingBackgrounds[bg.id]}
                                  className="text-xs px-2 py-1 text-gray-400 hover:text-indigo-400 border border-gray-600 hover:border-indigo-500 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {analyzingBackgrounds[bg.id] ? '분석 중...' : '재분석'}
                                </button>
                              )}
                            </div>

                            {analyzingBackgrounds[bg.id] && (
                              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                                <div className="w-4 h-4 border-2 border-gray-400 border-t-indigo-400 rounded-full animate-spin"></div>
                                <span>AI가 배경 환경을 분석하고 있습니다...</span>
                              </div>
                            )}

                            {expandedDescriptions[`bg_${bg.id}`] && (
                              <div className="space-y-2">
                                <p className="text-xs text-gray-500">
                                  일러스트 생성 시 이 설명을 참고합니다. 잘못된 부분이 있다면 직접 수정하세요.
                                </p>
                                <textarea
                                  value={bg.description || '이미지를 업로드하면 자동으로 분석됩니다.'}
                                  onChange={(e) => handleBackgroundChange(bg.id, 'description', e.target.value)}
                                  disabled={!bg.description}
                                  className="w-full h-64 p-3 bg-gray-800 border border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="AI 분석 결과가 여기에 표시됩니다..."
                                />
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                    ))}
                </div>
                <button
                    onClick={handleAddBackground}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    배경 추가
                </button>
                </div>
                <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-300">캐릭터</h3>
                <div className="space-y-4">
                    {currentStory.characters.map((char) => (
                    <div key={char.id} className="flex flex-col gap-4 p-4 bg-gray-900/70 rounded-lg border border-gray-700">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <div className="flex-1 w-full">
                            <input
                              type="text"
                              value={char.name}
                              onChange={(e) => handleCharacterChange(char.id, 'name', e.target.value)}
                              className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="캐릭터 이름"
                            />
                          </div>
                          <div className="flex-1 w-full">
                            <ReferenceImageUpload
                              label={`${char.name} 이미지`}
                              image={char.image}
                              onImageChange={(img) => handleCharacterChange(char.id, 'image', img)}
                              artStyle={currentStory.artStyle}
                            />
                          </div>
                          <button
                            onClick={() => handleRemoveCharacter(char.id)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <TrashIcon className="w-6 h-6" />
                          </button>
                        </div>

                        {/* AI Analysis Section */}
                        {char.image && (
                          <div className="border-t border-gray-700 pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <button
                                onClick={() => setExpandedDescriptions(prev => ({ ...prev, [char.id]: !prev[char.id] }))}
                                className="flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300"
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform ${expandedDescriptions[char.id] ? 'rotate-90' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                AI 분석 결과 {char.description ? '✓' : '(분석 대기 중)'}
                              </button>
                              {char.description && (
                                <button
                                  onClick={() => handleReanalyzeCharacter(char.id)}
                                  disabled={analyzingCharacters[char.id]}
                                  className="text-xs px-2 py-1 text-gray-400 hover:text-indigo-400 border border-gray-600 hover:border-indigo-500 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {analyzingCharacters[char.id] ? '분석 중...' : '재분석'}
                                </button>
                              )}
                            </div>

                            {analyzingCharacters[char.id] && (
                              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                                <div className="w-4 h-4 border-2 border-gray-400 border-t-indigo-400 rounded-full animate-spin"></div>
                                <span>AI가 캐릭터 외형을 분석하고 있습니다...</span>
                              </div>
                            )}

                            {expandedDescriptions[char.id] && (
                              <div className="space-y-2">
                                <p className="text-xs text-gray-500">
                                  일러스트 생성 시 이 설명을 참고합니다. 잘못된 부분이 있다면 직접 수정하세요.
                                </p>
                                <textarea
                                  value={char.description || '이미지를 업로드하면 자동으로 분석됩니다.'}
                                  onChange={(e) => handleCharacterChange(char.id, 'description', e.target.value)}
                                  disabled={!char.description}
                                  className="w-full h-64 p-3 bg-gray-800 border border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="AI 분석 결과가 여기에 표시됩니다..."
                                />
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                    ))}
                </div>
                <button
                    onClick={handleAddCharacter}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    캐릭터 추가
                </button>
                </div>
            </section>

            {/* Step 2: Input Novel Text */}
            <section className="bg-gray-800/50 p-6 rounded-xl shadow-2xl border border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-indigo-300">2. 소설 텍스트 입력</h2>
                <textarea
                className="w-full h-60 p-4 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 placeholder-gray-500 text-gray-300"
                placeholder="소설의 장면이나 챕터를 여기에 붙여넣으세요..."
                value={currentStory.novelText}
                onChange={(e) => handleUpdateCurrentStory({ novelText: e.target.value })}
                />
                 <div className="mt-4 flex items-center gap-4">
                    <button
                    onClick={handleAnalyzeNovel}
                    disabled={isAnalyzing || !currentStory.novelText.trim()}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:bg-indigo-900/50 disabled:cursor-not-allowed transition-colors"
                    >
                    소설 분석 및 장면 생성
                    </button>
                    {isAnalyzing && <Loader text="텍스트 분석 중..." />}
                 </div>
            </section>
            
            {/* Step 3: Generated Scenes & Illustrations */}
            {currentStory.scenes.length > 0 && (
                <section>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                  <h2 className="text-2xl font-bold text-indigo-300">3. 생성된 장면 및 일러스트</h2>
                  <div className="flex items-center gap-4">
                    {isGeneratingAll && generationProgress.total > 0 && (
                      <div className="text-sm text-gray-400">
                        진행: {generationProgress.current}/{generationProgress.total}
                      </div>
                    )}
                    <button
                      onClick={generateAllScenes}
                      disabled={isGeneratingAll || currentStory.scenes.every(s => s.imageUrl || s.isGenerating)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
                    >
                      <SparklesIcon className="w-5 h-5 mr-2" />
                      {isGeneratingAll ? '생성 중...' : '모든 장면 생성'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentStory.scenes.map((scene) => (
                    <SceneCard
                        key={scene.id}
                        scene={scene}
                        onRegenerate={(sceneId) => generateSingleIllustration(sceneId)}
                        onView={setSelectedSceneForModal}
                        onDelete={handleDeleteScene}
                        onShotTypeChange={handleSceneShotTypeChange}
                        onAspectRatioChange={handleSceneAspectRatioChange}
                        onDescriptionChange={handleSceneDescriptionChange}
                        onCustomPromptChange={handleSceneCustomPromptChange}
                    />
                    ))}
                </div>
                </section>
            )}

            {/* Video Feature Suggestion */}
            {currentStory.scenes.some(s => s.imageUrl) && (
                <section className="bg-gray-800/50 p-6 rounded-xl shadow-2xl border border-gray-700 flex items-center gap-6 mt-12">
                    <div className="flex-shrink-0">
                        <FilmIcon className="w-12 h-12 text-teal-400"/>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-teal-300">다음 단계: 스토리에 생명을 불어넣으세요!</h3>
                        <p className="text-gray-400 mt-1">생성된 일러스트는 완벽한 스토리보드를 형성합니다. Google Veo와 같은 텍스트-비디오 AI 서비스를 사용하여 이 장면들을 애니메이션화하고 소설의 멋진 트레일러를 만들어보세요.</p>
                    </div>
                </section>
            )}
            </div>
        </div>
      </main>

      {selectedSceneForModal && (
        <ImageModal
            scene={selectedSceneForModal}
            onClose={() => setSelectedSceneForModal(null)}
            onRegenerate={generateSingleIllustration}
            onDownload={handleDownloadImage}
            onEdit={handleEditIllustration}
        />
      )}
    </div>
  );
};

export default App;
