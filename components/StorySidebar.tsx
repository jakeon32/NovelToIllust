import React from 'react';
import type { Story } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import XMarkIcon from './icons/XMarkIcon';

interface StorySidebarProps {
  stories: Story[];
  currentStoryId: string | null;
  onSelectStory: (id: string) => void;
  onNewStory: () => void;
  onDeleteStory: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const StorySidebar: React.FC<StorySidebarProps> = ({
  stories,
  currentStoryId,
  onSelectStory,
  onNewStory,
  onDeleteStory,
  isOpen,
  onClose,
}) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        ></div>
      )}

      <aside
        className={`fixed top-0 left-0 w-64 bg-gray-900/80 backdrop-blur-sm border-r border-gray-700 flex flex-col h-screen z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:fixed ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">My Stories</h2>
          <button onClick={onClose} className="md:hidden p-2 text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-700">
          <button
            onClick={onNewStory}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            New Story
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {stories.map((story) => (
              <div
                key={story.id}
                className={`group flex items-center justify-between rounded-md text-sm font-medium cursor-pointer ${
                  currentStoryId === story.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                onClick={() => onSelectStory(story.id)}
              >
                <span className="p-2 truncate flex-1">{story.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete "${story.title}"?`)) {
                      onDeleteStory(story.id);
                    }
                  }}
                  className={`p-2 rounded-md opacity-0 group-hover:opacity-100 ${
                    currentStoryId === story.id ? 'hover:bg-indigo-700' : 'hover:bg-red-500/50'
                  } transition-opacity`}
                  aria-label={`Delete story ${story.title}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </nav>
        <div className="p-4 border-t border-gray-700 text-center">
          <p className="text-xs text-gray-500">Novel to Illustration AI</p>
        </div>
      </aside>
    </>
  );
};

export default StorySidebar;
