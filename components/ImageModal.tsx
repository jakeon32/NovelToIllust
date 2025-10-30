import React, { useState, useEffect } from 'react';
import type { Scene } from '../types';
import Loader from './Loader';
import XMarkIcon from './icons/XMarkIcon';
import ArrowDownTrayIcon from './icons/ArrowDownTrayIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import PencilIcon from './icons/PencilIcon';
import SparklesIcon from './icons/SparklesIcon';

interface ImageModalProps {
  scene: Scene;
  onClose: () => void;
  onRegenerate: (sceneId: string) => void;
  onDownload: (imageUrl: string, filename: string) => void;
  onEdit: (sceneId: string, editPrompt: string) => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ scene, onClose, onRegenerate, onDownload, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');

  const handleDownload = () => {
    if (scene.imageUrl) {
        // Create a filename from the first few words of the description
        const filename = scene.description.split(' ').slice(0, 5).join('_') + '.png';
        onDownload(scene.imageUrl, filename);
    }
  }

  const handleApplyEdit = () => {
    if (!editPrompt.trim()) return;
    onEdit(scene.id, editPrompt);
  };

  useEffect(() => {
    if (!scene.isGenerating) {
      setIsEditing(false);
      setEditPrompt('');
    }
  }, [scene.isGenerating]);


  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity duration-300 p-4"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md sm:max-w-lg md:max-w-4xl max-h-[95vh] flex flex-col p-4 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex-shrink-0 flex justify-between items-center pb-4 border-b border-gray-700">
            <h2 id="modal-title" className="text-lg font-medium text-gray-300 truncate pr-4">{scene.description}</h2>
             <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
              aria-label="닫기"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
        </div>
        
        <div className="flex-grow flex items-center justify-center overflow-hidden my-4">
          {scene.isGenerating ? (
            <Loader text={isEditing ? "편집 적용 중..." : "재생성 중..."} />
          ) : isEditing ? (
             <div className="w-full h-full flex flex-col md:flex-row gap-4 p-4">
                <div className="md:w-1/2 flex items-center justify-center bg-black/20 rounded-lg overflow-hidden">
                    <img
                        src={scene.imageUrl!}
                        alt="편집 미리보기"
                        className="max-h-full max-w-full object-contain"
                    />
                </div>
                <div className="md:w-1/2 flex flex-col">
                    <h3 className="text-lg font-semibold text-indigo-300 mb-2">이미지 편집</h3>
                    <p className="text-sm text-gray-400 mb-4">변경하고 싶은 내용을 설명해주세요. 예: "하늘을 보라색으로 바꿔줘" 또는 "남자에게 모자를 추가해줘"</p>
                    <textarea
                        className="w-full flex-1 p-3 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 transition-colors placeholder-gray-500"
                        placeholder="예: 캐릭터의 셔츠를 빨간색으로 바꿔줘"
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                    />
                    <div className="mt-4 flex gap-4">
                         <button
                            onClick={handleApplyEdit}
                            disabled={!editPrompt.trim()}
                            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:cursor-not-allowed"
                         >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            편집 적용
                         </button>
                         <button
                            onClick={() => setIsEditing(false)}
                            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600"
                         >
                            취소
                         </button>
                    </div>
                </div>
             </div>
          ) : scene.imageUrl ? (
            <img
              src={scene.imageUrl}
              alt={scene.description}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="text-gray-500">이미지를 사용할 수 없습니다.</div>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center justify-end flex-wrap gap-2 pt-4 border-t border-gray-700">
          <button
            onClick={() => setIsEditing(true)}
            disabled={!scene.imageUrl || scene.isGenerating}
            className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PencilIcon className="w-5 h-5 mr-2" />
            편집
          </button>
          <button
            onClick={() => onRegenerate(scene.id)}
            disabled={scene.isGenerating}
            className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className="w-5 h-5 mr-2" />
            재생성
          </button>
          <button
            onClick={handleDownload}
            disabled={!scene.imageUrl || scene.isGenerating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:bg-indigo-900/50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            다운로드
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
