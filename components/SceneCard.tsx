import React from 'react';
import type { Scene } from '../types';
import Loader from './Loader';
import ArrowPathIcon from './icons/ArrowPathIcon';
import SparklesIcon from './icons/SparklesIcon';
import TrashIcon from './icons/TrashIcon';

interface SceneCardProps {
  scene: Scene;
  onRegenerate: (sceneId: string) => void;
  onView: (scene: Scene) => void;
  onDelete: (sceneId: string) => void;
  onShotTypeChange: (sceneId: string, shotType: string) => void;
}

const shotTypes = [
    { value: 'automatic', label: 'Automatic' },
    { value: 'wide_shot', label: 'Wide Shot' },
    { value: 'medium_shot', label: 'Medium Shot' },
    { value: 'close_up', label: 'Close-up' },
    { value: 'low_angle', label: 'Low Angle' },
    { value: 'high_angle', label: 'High Angle' },
    { value: 'point_of_view', label: 'Point of View' },
    { value: 'dutch_angle', label: 'Dutch Angle' },
];


const SceneCard: React.FC<SceneCardProps> = ({ scene, onRegenerate, onView, onDelete, onShotTypeChange }) => {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg group relative flex flex-col justify-between">
      <div>
        <div className="aspect-w-16 aspect-h-9 bg-gray-900 flex items-center justify-center">
          {scene.isGenerating ? (
            <div className="h-60 flex items-center justify-center">
              <Loader text="Creating image..." />
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
                Generate Image
              </button>
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">{scene.description}</p>
          <div className="mt-4">
            <label htmlFor={`shot-type-${scene.id}`} className="block text-xs font-medium text-gray-400 mb-1">Shot Type</label>
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
        </div>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {scene.imageUrl && !scene.isGenerating && (
            <button
            onClick={() => onRegenerate(scene.id)}
            disabled={scene.isGenerating}
            className="bg-gray-900/60 text-white rounded-full p-2 hover:bg-indigo-600/80 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Regenerate image"
            title="Regenerate image"
            >
            <ArrowPathIcon className="w-5 h-5" />
            </button>
        )}
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this scene? This action cannot be undone.')) {
              onDelete(scene.id);
            }
          }}
          className="bg-gray-900/60 text-white rounded-full p-2 hover:bg-red-600/80 transition-all opacity-0 group-hover:opacity-100"
          aria-label="Delete scene"
          title="Delete scene"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
       </div>
    </div>
  );
};

export default SceneCard;