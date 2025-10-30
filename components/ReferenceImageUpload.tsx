
import React, { useState, useRef } from 'react';
import type { ImageFile } from '../types';
import Loader from './Loader';
import { generateReferenceImage } from '../services/geminiService';
import SparklesIcon from './icons/SparklesIcon';
import PhotoIcon from './icons/PhotoIcon';

interface ReferenceImageUploadProps {
  label: string;
  onImageChange: (image: ImageFile | null) => void;
  image: ImageFile | null;
}

const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.75): Promise<{ base64: string; mimeType: string; }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      if (!event.target?.result) {
        return reject(new Error("Failed to read file."));
      }
      img.src = event.target.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = dataUrl.split(',')[1];
        
        resolve({ base64, mimeType });
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};


const ReferenceImageUpload: React.FC<ReferenceImageUploadProps> = ({ label, onImageChange, image }) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'generate'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const { base64, mimeType } = await compressImage(file);
        onImageChange({
          base64,
          mimeType,
          name: file.name,
        });
      } catch (error) {
        console.error("Failed to process image:", error);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleRemoveImage = () => {
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const generatedImage = await generateReferenceImage(prompt);
      onImageChange(generatedImage);
    } catch (error) {
      console.error("Failed to generate image:", error);
      // You could set an error state here to inform the user
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <div className="mt-1 flex flex-col border-2 border-gray-600 border-dashed rounded-md h-48 bg-gray-800/50 relative">
        {isCompressing || isGenerating ? (
          <div className="w-full h-full flex flex-col justify-center items-center">
            <Loader text={isCompressing ? "처리 중..." : "AI 이미지 생성 중..."} />
          </div>
        ) : !image ? (
          <div className="h-full flex flex-col">
            <div className="flex border-b border-gray-600">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 p-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'upload' ? 'bg-gray-700 text-indigo-300' : 'text-gray-400 hover:bg-gray-700/50'}`}
              >
                <PhotoIcon className="w-5 h-5"/>
                업로드
              </button>
              <button
                onClick={() => setActiveTab('generate')}
                className={`flex-1 p-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'generate' ? 'bg-gray-700 text-indigo-300' : 'text-gray-400 hover:bg-gray-700/50'}`}
              >
                <SparklesIcon className="w-5 h-5"/>
                생성
              </button>
            </div>
            <div className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center">
              {activeTab === 'upload' ? (
                 <div className="space-y-1 text-center">
                    <PhotoIcon className="mx-auto h-10 w-10 text-gray-500" />
                    <div className="flex text-sm text-gray-400">
                    <label
                        htmlFor={`file-upload-${label.replace(/\s+/g, '-')}`}
                        className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-indigo-500 px-1"
                    >
                        <span>파일 업로드</span>
                        <input
                        id={`file-upload-${label.replace(/\s+/g, '-')}`}
                        name={`file-upload-${label.replace(/\s+/g, '-')}`}
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        />
                    </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG 최대 10MB</p>
                </div>
              ) : (
                <div className="w-full flex flex-col h-full justify-center">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="예: 위엄있는 하얀 늑대, 디지털 아트"
                    className="w-full flex-1 p-2 bg-gray-900/80 border border-gray-500 rounded-md text-sm text-gray-300 placeholder-gray-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                  <button
                    onClick={handleGenerateImage}
                    disabled={!prompt.trim()}
                    className="mt-2 w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:cursor-not-allowed"
                  >
                    <SparklesIcon className="w-4 h-4 mr-2" />
                    생성
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={`data:${image.mimeType};base64,${image.base64}`}
              alt="미리보기"
              className="max-h-full max-w-full object-contain rounded-md"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-gray-900/70 text-white rounded-full p-1.5 hover:bg-red-600/80 transition-colors"
              aria-label="이미지 제거"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferenceImageUpload;
