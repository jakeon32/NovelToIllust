import React, { useState, useEffect } from 'react';
import type { Scene } from '../types';
import Loader from './Loader';
import ArrowPathIcon from './icons/ArrowPathIcon';
import SparklesIcon from './icons/SparklesIcon';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';

interface SceneCardProps {
  scene: Scene;
  onRegenerate: (sceneId: string) => void;
  onView: (scene: Scene) => void;
  onDelete: (sceneId: string) => void;
  onShotTypeChange: (sceneId: string, shotType: string) => void;
  onAspectRatioChange: (sceneId: string, aspectRatio: string) => void;
  onDescriptionChange: (sceneId: string, description: string) => void;
  onCustomPromptChange: (sceneId: string, customPrompt: string) => void;
}

const shotTypes = [
    { value: 'automatic', label: '자동' },
    { value: 'wide_shot', label: '와이드 샷' },
    { value: 'medium_shot', label: '미디엄 샷' },
    { value: 'close_up', label: '클로즈업' },
    { value: 'low_angle', label: '로우 앵글' },
    { value: 'high_angle', label: '하이 앵글' },
    { value: 'point_of_view', label: '시점 샷' },
    { value: 'dutch_angle', label: '더치 앵글' },
];

const aspectRatios = [
    { value: '1:1', label: '정사각형 (1:1)' },
    { value: '16:9', label: '가로 (16:9)' },
    { value: '9:16', label: '세로 (9:16)' },
    { value: '4:3', label: '가로 (4:3)' },
    { value: '3:4', label: '세로 (3:4)' },
];


const SceneCard: React.FC<SceneCardProps> = ({ scene, onRegenerate, onView, onDelete, onShotTypeChange, onAspectRatioChange, onDescriptionChange, onCustomPromptChange }) => {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(scene.description);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(scene.customPrompt || '');

  // Auto-expand prompt section when a new prompt is generated
  useEffect(() => {
    if (scene.customPrompt && !scene.imageUrl && editedPrompt !== scene.customPrompt) {
      setIsPromptExpanded(true);
      setEditedPrompt(scene.customPrompt);
    }
  }, [scene.customPrompt, scene.imageUrl]);

  const handleSaveDescription = () => {
    if (editedDescription.trim() && editedDescription !== scene.description) {
      onDescriptionChange(scene.id, editedDescription);
    }
    setIsEditingDescription(false);
  };

  const handleCancelEdit = () => {
    setEditedDescription(scene.description);
    setIsEditingDescription(false);
  };

  const handleSavePrompt = () => {
    if (editedPrompt !== scene.customPrompt) {
      onCustomPromptChange(scene.id, editedPrompt);
    }
    setIsEditingPrompt(false);
  };

  const handleCancelPromptEdit = () => {
    setEditedPrompt(scene.customPrompt || '');
    setIsEditingPrompt(false);
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg group relative flex flex-col justify-between">
      <div>
        <div className="aspect-w-16 aspect-h-9 bg-gray-900 flex items-center justify-center">
          {scene.isGenerating ? (
            <div className="h-60 flex items-center justify-center">
              <Loader text="이미지 생성 중..." />
            </div>
          ) : scene.imageUrl ? (
            <button onClick={() => onView(scene)} className="w-full h-full block focus:outline-none">
              <img
                src={scene.imageUrl}
                alt={scene.description}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
              />
            </button>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center text-gray-500 p-4">
              <button
                onClick={() => onRegenerate(scene.id)}
                disabled={scene.isGenerating}
                className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
              >
                <SparklesIcon className="w-5 h-5 mr-2" />
                이미지 생성
              </button>
            </div>
          )}
        </div>
        <div className="p-4">
          {isEditingDescription ? (
            <div className="space-y-2">
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-gray-300 text-sm leading-relaxed focus:ring-1 focus:ring-indigo-500 resize-none"
                rows={3}
                placeholder="장면 설명을 입력하세요..."
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDescription}
                  className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-md transition-colors"
                >
                  저장
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-md transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="relative group/desc">
              <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">{scene.description}</p>
              <button
                onClick={() => setIsEditingDescription(true)}
                className="absolute top-0 right-0 p-1 text-gray-500 hover:text-indigo-400 opacity-0 group-hover/desc:opacity-100 transition-opacity"
                title="설명 편집"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Custom Prompt Section - only show if prompt exists or user wants to edit */}
          {scene.customPrompt && (
            <div className="mt-4 border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between w-full text-xs font-medium text-gray-400">
                <button
                  onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                  className="text-left hover:text-gray-300 transition-colors"
                >
                  생성 프롬프트 {isPromptExpanded ? '▼' : '▶'}
                </button>
                <div className="flex items-center gap-2">
                  {!isEditingPrompt && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('프롬프트를 초기화하고 재생성하시겠습니까?')) {
                            onCustomPromptChange(scene.id, '');
                          }
                        }}
                        className="p-1 text-gray-500 hover:text-yellow-400 transition-colors"
                        title="프롬프트 초기화 (재생성)"
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingPrompt(true);
                          setIsPromptExpanded(true);
                        }}
                        className="p-1 text-gray-500 hover:text-indigo-400 transition-colors"
                        title="프롬프트 편집"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isPromptExpanded && (
                <div className="mt-2">
                  {isEditingPrompt ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedPrompt}
                        onChange={(e) => setEditedPrompt(e.target.value)}
                        className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-gray-300 text-xs leading-relaxed focus:ring-1 focus:ring-indigo-500 resize-none font-mono"
                        rows={8}
                        placeholder="커스텀 프롬프트를 입력하세요..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSavePrompt}
                          className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-md transition-colors"
                        >
                          저장
                        </button>
                        <button
                          onClick={handleCancelPromptEdit}
                          className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-md transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <pre className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap bg-gray-900 p-3 rounded-md max-h-60 overflow-y-auto font-mono">
                      {scene.customPrompt}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`shot-type-${scene.id}`} className="block text-xs font-medium text-gray-400 mb-1">촬영 구도</label>
              <select
                  id={`shot-type-${scene.id}`}
                  value={scene.shotType}
                  onChange={(e) => onShotTypeChange(scene.id, e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
              >
                  {shotTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
              </select>
            </div>
            <div>
              <label htmlFor={`aspect-ratio-${scene.id}`} className="block text-xs font-medium text-gray-400 mb-1">비율</label>
              <select
                  id={`aspect-ratio-${scene.id}`}
                  value={scene.aspectRatio}
                  onChange={(e) => onAspectRatioChange(scene.id, e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
              >
                  {aspectRatios.map(ratio => (
                      <option key={ratio.value} value={ratio.value}>{ratio.label}</option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {scene.imageUrl && !scene.isGenerating && (
            <button
            onClick={() => onRegenerate(scene.id)}
            disabled={scene.isGenerating}
            className="bg-gray-900/60 text-white rounded-full p-2 hover:bg-indigo-600/80 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="이미지 재생성"
            title="이미지 재생성"
            >
            <ArrowPathIcon className="w-5 h-5" />
            </button>
        )}
        <button
          onClick={() => {
            if (window.confirm('이 장면을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.')) {
              onDelete(scene.id);
            }
          }}
          className="bg-gray-900/60 text-white rounded-full p-2 hover:bg-red-600/80 transition-all opacity-0 group-hover:opacity-100"
          aria-label="장면 삭제"
          title="장면 삭제"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
       </div>
    </div>
  );
};

export default SceneCard;