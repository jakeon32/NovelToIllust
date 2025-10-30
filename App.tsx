import React, { useState, useEffect, useCallback } from 'react';
import type { Character, Scene, ImageFile, Story, Background } from './types';
import { generateScenesFromText, generateIllustration, generateTitleFromText, editIllustration } from './services/geminiService';
import ReferenceImageUpload from './components/ReferenceImageUpload';
import SceneCard from './components/SceneCard';
import Loader from './components/Loader';
import StorySidebar from './components/StorySidebar';
import ImageModal from './components/ImageModal';
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
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSceneForModal, setSelectedSceneForModal] = useState<Scene | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const savedStories = localStorage.getItem('novel-ai-stories');
      if (savedStories) {
        const parsedStories = JSON.parse(savedStories);
        setStories(parsedStories);
        if (parsedStories.length > 0) {
          setCurrentStoryId(parsedStories[0].id);
        } else {
          handleNewStory();
        }
      } else {
        handleNewStory();
      }
    } catch (e) {
      console.error("Failed to load stories from localStorage", e);
      handleNewStory();
    }
  }, []);

  useEffect(() => {
    if (stories.length > 0) {
      try {
        localStorage.setItem('novel-ai-stories', JSON.stringify(stories));
      } catch (e) {
        console.error("Failed to save stories to localStorage. Storage might be full.", e);
        setError("스토리를 저장할 수 없습니다. 브라우저 저장 공간이 가득 찼습니다. 더 작은 레퍼런스 이미지를 사용하거나 공간을 확보해주세요.");
      }
    } else {
      // Clean up localStorage if all stories are deleted
      localStorage.removeItem('novel-ai-stories');
    }
  }, [stories]);

  const currentStory = stories.find(s => s.id === currentStoryId);

  const handleNewStory = () => {
    const newStory: Story = {
      id: `story-${Date.now()}`,
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
  
  const handleDeleteStory = (storyId: string) => {
    const updatedStories = stories.filter(s => s.id !== storyId);
    setStories(updatedStories);

    if (currentStoryId === storyId) {
        if (updatedStories.length > 0) {
            setCurrentStoryId(updatedStories[0].id);
        } else {
            handleNewStory();
        }
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
      id: `char-${Date.now()}`,
      name: `캐릭터 ${currentStory.characters.length + 1}`,
      image: null,
    };
    handleUpdateCurrentStory({ characters: [...currentStory.characters, newCharacter] });
  };
  
  const handleCharacterChange = <T extends keyof Character>(id: string, field: T, value: Character[T]) => {
      if (!currentStory) return;
      const updatedCharacters = currentStory.characters.map((char) =>
        char.id === id ? { ...char, [field]: value } : char
      );
      handleUpdateCurrentStory({ characters: updatedCharacters });
  };
  
  const handleRemoveCharacter = (id: string) => {
    if (!currentStory) return;
    const updatedCharacters = currentStory.characters.filter((char) => char.id !== id);
    handleUpdateCurrentStory({ characters: updatedCharacters });
  };
  
  const handleAddBackground = (image: ImageFile) => {
    if (!currentStory || currentStory.backgrounds.length >= 2) return;
    const newBackground: Background = {
      id: `bg-${Date.now()}`,
      image: image,
    };
    handleUpdateCurrentStory({ backgrounds: [...currentStory.backgrounds, newBackground] });
  };

  const handleRemoveBackground = (id: string) => {
    if (!currentStory) return;
    const updatedBackgrounds = currentStory.backgrounds.filter((bg) => bg.id !== id);
    handleUpdateCurrentStory({ backgrounds: updatedBackgrounds });
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
      const newScenes: Scene[] = sceneDescriptions.map((desc, index) => ({
        id: `scene-${index}-${Date.now()}`,
        description: desc,
        imageUrl: null,
        isGenerating: false,
        shotType: 'automatic',
      }));
      handleUpdateCurrentStory({ scenes: newScenes, title });
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const generateSingleIllustration = async (scene: Scene) => {
    if (!currentStory) return;

    handleUpdateCurrentStory(prevStory => ({
        scenes: prevStory.scenes.map(s => s.id === scene.id ? { ...s, isGenerating: true } : s)
    }));

    if (selectedSceneForModal && selectedSceneForModal.id === scene.id) {
        setSelectedSceneForModal(prev => prev ? { ...prev, isGenerating: true } : null);
    }

    try {
      const imageUrl = await generateIllustration(scene.description, currentStory.characters, currentStory.backgrounds, currentStory.artStyle, scene.shotType);
      
      handleUpdateCurrentStory(prevStory => ({
        scenes: prevStory.scenes.map(s => s.id === scene.id ? { ...s, imageUrl, isGenerating: false } : s)
      }));

      if (selectedSceneForModal && selectedSceneForModal.id === scene.id) {
        setSelectedSceneForModal(prev => prev ? { ...prev, imageUrl, isGenerating: false } : null);
      }
    } catch (err) {
      console.error(`Failed to generate illustration for scene ${scene.id}:`, err);
      setError(`일러스트 생성에 실패했습니다. 다시 시도해주세요.`);
      
      handleUpdateCurrentStory(prevStory => ({
        scenes: prevStory.scenes.map(s => s.id === scene.id ? { ...s, isGenerating: false } : s)
      }));
       if (selectedSceneForModal && selectedSceneForModal.id === scene.id) {
        setSelectedSceneForModal(prev => prev ? { ...prev, isGenerating: false } : null);
      }
    }
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

  const handleDownloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
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
                <div className="w-6 md:hidden"></div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <ReferenceImageUpload label="아트 스타일 레퍼런스" image={currentStory.artStyle} onImageChange={(img) => handleUpdateCurrentStory({ artStyle: img })} />
                <div>
                    <div className="space-y-4">
                        {currentStory.backgrounds.map(bg => (
                            <div key={bg.id} className="relative group w-full">
                                <label className="block text-sm font-medium text-gray-300 mb-1 truncate">배경: {bg.image.name}</label>
                                <div className="w-full h-48 bg-gray-800/50 rounded-md flex items-center justify-center p-2 border-2 border-gray-600 border-dashed">
                                    <img
                                        src={`data:${bg.image.mimeType};base64,${bg.image.base64}`}
                                        alt={bg.image.name}
                                        className="max-h-full max-w-full object-contain rounded-md"
                                    />
                                    <button
                                        onClick={() => handleRemoveBackground(bg.id)}
                                        className="absolute top-8 right-2 bg-gray-900/70 text-white rounded-full p-1.5 hover:bg-red-600/80 transition-colors"
                                        aria-label="Remove background"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        {currentStory.backgrounds.length < 2 && (
                            <ReferenceImageUpload
                                label="배경 레퍼런스 추가"
                                image={null}
                                onImageChange={(img) => { if (img) handleAddBackground(img); }}
                            />
                        )}
                    </div>
                </div>
                </div>
                <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-300">캐릭터</h3>
                <div className="space-y-4">
                    {currentStory.characters.map((char) => (
                    <div key={char.id} className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-gray-900/70 rounded-lg border border-gray-700">
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
                        <ReferenceImageUpload label={`${char.name} 이미지`} image={char.image} onImageChange={(img) => handleCharacterChange(char.id, 'image', img)} />
                        </div>
                        <button
                        onClick={() => handleRemoveCharacter(char.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                        <TrashIcon className="w-6 h-6" />
                        </button>
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
                <h2 className="text-2xl font-bold mb-6 text-center text-indigo-300">3. 생성된 장면 및 일러스트</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentStory.scenes.map((scene) => (
                    <SceneCard 
                        key={scene.id} 
                        scene={scene} 
                        onRegenerate={() => generateSingleIllustration(scene)}
                        onView={setSelectedSceneForModal}
                        onDelete={handleDeleteScene}
                        onShotTypeChange={handleSceneShotTypeChange}
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
            onRegenerate={() => generateSingleIllustration(selectedSceneForModal)}
            onDownload={handleDownloadImage}
            onEdit={handleEditIllustration}
        />
      )}
    </div>
  );
};

export default App;
