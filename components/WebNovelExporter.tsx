import React, { useState, useMemo } from 'react';
import type { Story } from '../types';

interface WebNovelExporterProps {
  story: Story;
  onClose: () => void;
}

interface NovelSection {
  type: 'text' | 'image';
  content: string;
  sceneId?: string;
  imageUrl?: string;
  sceneDescription?: string;
}

export default function WebNovelExporter({ story, onClose }: WebNovelExporterProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Process novel text and insert images at appropriate positions
  const novelSections = useMemo(() => {
    const sections: NovelSection[] = [];
    let processedIndex = 0;

    console.log('🔍 WebNovelExporter: Processing novel text');
    console.log('📝 Novel text length:', story.novelText.length);
    console.log('🎬 Total scenes:', story.scenes.length);

    // Normalize text for better matching (remove extra whitespace, normalize quotes)
    const normalizeText = (text: string): string => {
      return text
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/[""]/g, '"')  // Normalize quotes
        .replace(/['']/g, "'")  // Normalize apostrophes
        .trim();
    };

    const normalizedNovelText = normalizeText(story.novelText);

    // Get scenes with images, sorted by their appearance in the text
    const scenesWithImages = story.scenes
      .filter(scene => {
        const hasImage = !!scene.imageUrl;
        const hasExcerpt = !!scene.structuredDescription?.sourceExcerpt;
        console.log(`🎬 Scene ${scene.id}:`, { hasImage, hasExcerpt, excerpt: scene.structuredDescription?.sourceExcerpt?.substring(0, 50) });
        return hasImage && hasExcerpt;
      })
      .map(scene => {
        const excerpt = scene.structuredDescription!.sourceExcerpt;
        const normalizedExcerpt = normalizeText(excerpt);
        const index = normalizedNovelText.indexOf(normalizedExcerpt);

        console.log(`🔎 Searching for excerpt in novel:`, {
          excerpt: excerpt.substring(0, 80) + '...',
          found: index !== -1,
          index
        });

        return {
          scene,
          originalExcerpt: excerpt,
          index
        };
      })
      .filter(item => item.index !== -1)
      .sort((a, b) => a.index - b.index);

    console.log(`✅ Found ${scenesWithImages.length} scenes with matching excerpts`);

    // If no matching scenes, just return the full text
    if (scenesWithImages.length === 0) {
      console.log('⚠️ No scenes with matching excerpts found, returning full text');
      sections.push({
        type: 'text',
        content: story.novelText
      });
      return sections;
    }

    // Build mapping from normalized positions to original positions
    let originalIndex = 0;
    let normalizedIndex = 0;
    const positionMap: number[] = [];

    for (let i = 0; i < story.novelText.length; i++) {
      const char = story.novelText[i];
      if (char.match(/\s/)) {
        // Skip consecutive whitespace in normalized version
        if (normalizedIndex < normalizedNovelText.length && normalizedNovelText[normalizedIndex] === ' ') {
          positionMap[normalizedIndex] = i;
          normalizedIndex++;
        }
      } else {
        positionMap[normalizedIndex] = i;
        normalizedIndex++;
      }
    }

    // Build sections by interleaving text and images
    scenesWithImages.forEach(({ scene, originalExcerpt, index }) => {
      // Map normalized index back to original text index
      const originalStartIndex = positionMap[index] || index;
      const excerptEnd = index + normalizeText(originalExcerpt).length;
      const originalEndIndex = positionMap[excerptEnd] || (originalStartIndex + originalExcerpt.length);

      // Add text before this scene
      if (originalStartIndex > processedIndex) {
        const textBeforeScene = story.novelText.substring(processedIndex, originalStartIndex);
        if (textBeforeScene.trim()) {
          sections.push({
            type: 'text',
            content: textBeforeScene
          });
        }
      }

      // Add the source excerpt text (from original)
      const actualExcerpt = story.novelText.substring(originalStartIndex, originalEndIndex);
      sections.push({
        type: 'text',
        content: actualExcerpt
      });

      // Add the image
      sections.push({
        type: 'image',
        content: '',
        sceneId: scene.id,
        imageUrl: scene.imageUrl!,
        sceneDescription: scene.structuredDescription?.summary || scene.description
      });

      processedIndex = originalEndIndex;
    });

    // Add remaining text after last scene
    if (processedIndex < story.novelText.length) {
      const remainingTextContent = story.novelText.substring(processedIndex);
      if (remainingTextContent.trim()) {
        sections.push({
          type: 'text',
          content: remainingTextContent
        });
      }
    }

    console.log(`📚 Generated ${sections.length} sections (text + images)`);
    return sections;
  }, [story]);

  const handleDownloadHTML = () => {
    setIsExporting(true);

    try {
      const htmlContent = generateHTMLDocument();
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${story.title || 'novel'}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting HTML:', error);
      alert('Failed to export web novel page');
    } finally {
      setIsExporting(false);
    }
  };

  const generateHTMLDocument = (): string => {
    const cleanTitle = removeMarkdown(story.title);

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(cleanTitle)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Noto Serif KR', 'Georgia', serif;
      line-height: 1.8;
      background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%);
      padding: 2rem 1rem;
      color: #2d3748;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 3rem 2.5rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      border-radius: 8px;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 2rem;
      text-align: center;
      color: #1a202c;
      border-bottom: 3px solid #4299e1;
      padding-bottom: 1rem;
    }

    .text-section {
      margin-bottom: 1.5rem;
      text-align: justify;
      line-height: 1.9;
    }

    .text-section:not(:first-of-type) {
      text-indent: 1.5em;
    }

    .image-section {
      margin: 3rem 0;
      text-align: center;
    }

    .image-section img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .footer {
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #a0aec0;
      font-size: 0.85rem;
    }

    @media (max-width: 768px) {
      .container {
        padding: 2rem 1.5rem;
      }

      h1 {
        font-size: 2rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(cleanTitle)}</h1>

    ${novelSections.map(section => {
      if (section.type === 'text') {
        // Remove markdown and split into paragraphs
        const cleanText = removeMarkdown(section.content);
        const paragraphs = cleanText
          .split(/\n\n+/)
          .map(p => p.trim())
          .filter(p => p.length > 0);

        return paragraphs.map(para =>
          `<div class="text-section">${escapeHtml(para)}</div>`
        ).join('\n    ');
      } else {
        return `<div class="image-section">
          <img src="${section.imageUrl}" alt="Scene illustration" />
        </div>`;
      }
    }).join('\n    ')}

    <div class="footer">
      Generated with Novel to Illustration AI
    </div>
  </div>
</body>
</html>`;
  };

  const removeMarkdown = (text: string): string => {
    return text
      // Remove headers (##, ###, etc.)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold (**text** or __text__)
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      // Remove italic (*text* or _text_)
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove inline code (`code`)
      .replace(/`([^`]+)`/g, '$1')
      // Remove strikethrough (~~text~~)
      .replace(/~~(.*?)~~/g, '$1');
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Web Novel Page Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow">
            <h1 className="text-3xl font-bold mb-6 text-center border-b-2 border-blue-500 pb-4 text-gray-900">
              {removeMarkdown(story.title)}
            </h1>

            {novelSections.map((section, index) => {
              if (section.type === 'text') {
                const cleanText = removeMarkdown(section.content);
                const paragraphs = cleanText
                  .split(/\n\n+/)
                  .map(p => p.trim())
                  .filter(p => p.length > 0);

                return paragraphs.map((para, pIndex) => (
                  <div key={`${index}-${pIndex}`} className="mb-4 text-justify indent-4 text-gray-800 leading-relaxed">
                    {para}
                  </div>
                ));
              } else {
                return (
                  <div key={index} className="my-8 text-center">
                    <img
                      src={section.imageUrl}
                      alt="Scene illustration"
                      className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
                    />
                  </div>
                );
              }
            })}

            <div className="mt-12 pt-6 border-t text-center text-sm text-gray-500">
              Generated with Novel to Illustration AI
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={handleDownloadHTML}
            disabled={isExporting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : 'Download HTML'}
          </button>
        </div>
      </div>
    </div>
  );
}
