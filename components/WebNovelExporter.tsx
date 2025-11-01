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
    let remainingText = story.novelText;
    let processedIndex = 0;

    // Get scenes with images, sorted by their appearance in the text
    const scenesWithImages = story.scenes
      .filter(scene => scene.imageUrl && scene.structuredDescription?.sourceExcerpt)
      .map(scene => ({
        scene,
        index: story.novelText.indexOf(scene.structuredDescription!.sourceExcerpt)
      }))
      .filter(item => item.index !== -1)
      .sort((a, b) => a.index - b.index);

    // Build sections by interleaving text and images
    scenesWithImages.forEach(({ scene, index }) => {
      const excerpt = scene.structuredDescription!.sourceExcerpt;
      const excerptEnd = index + excerpt.length;

      // Add text before this scene
      if (index > processedIndex) {
        const textBeforeScene = story.novelText.substring(processedIndex, index);
        if (textBeforeScene.trim()) {
          sections.push({
            type: 'text',
            content: textBeforeScene
          });
        }
      }

      // Add the source excerpt text
      sections.push({
        type: 'text',
        content: excerpt
      });

      // Add the image
      sections.push({
        type: 'image',
        content: '',
        sceneId: scene.id,
        imageUrl: scene.imageUrl!,
        sceneDescription: scene.structuredDescription?.summary || scene.description
      });

      processedIndex = excerptEnd;
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
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(story.title)}</title>
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
      text-indent: 1em;
      white-space: pre-wrap;
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

    .image-caption {
      margin-top: 0.75rem;
      font-size: 0.9rem;
      color: #718096;
      font-style: italic;
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
    <h1>${escapeHtml(story.title)}</h1>

    ${novelSections.map(section => {
      if (section.type === 'text') {
        return `<div class="text-section">${escapeHtml(section.content)}</div>`;
      } else {
        return `<div class="image-section">
          <img src="${section.imageUrl}" alt="${escapeHtml(section.sceneDescription || 'Scene illustration')}" />
          <div class="image-caption">${escapeHtml(section.sceneDescription || '')}</div>
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
            <h1 className="text-3xl font-bold mb-6 text-center border-b-2 border-blue-500 pb-4">
              {story.title}
            </h1>

            {novelSections.map((section, index) => {
              if (section.type === 'text') {
                return (
                  <div key={index} className="mb-4 whitespace-pre-wrap text-justify indent-4">
                    {section.content}
                  </div>
                );
              } else {
                return (
                  <div key={index} className="my-8 text-center">
                    <img
                      src={section.imageUrl}
                      alt={section.sceneDescription || 'Scene illustration'}
                      className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
                    />
                    {section.sceneDescription && (
                      <p className="mt-2 text-sm text-gray-600 italic">
                        {section.sceneDescription}
                      </p>
                    )}
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
