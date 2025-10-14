import React from 'react';
import type { NextVideoInfo } from '../types';
import Icon from './Icons';

interface ContinueLearningCardProps {
  nextVideoInfo: NextVideoInfo;
  onClick: () => void;
}

const ContinueLearningCard: React.FC<ContinueLearningCardProps> = ({ nextVideoInfo, onClick }) => {
  const { video, category } = nextVideoInfo;

  return (
    <div 
      onClick={onClick}
      className="group relative bg-dark/50 rounded-lg overflow-hidden cursor-pointer h-full flex transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-brand-red/30"
    >
      <div className="absolute inset-0 w-full h-full">
        <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark/80 via-dark/70 to-transparent"></div>
      </div>
      
      <div className="relative flex flex-col md:flex-row items-center gap-6 p-4 w-full">
        <div className="flex-shrink-0 w-full md:w-1/3 aspect-video rounded-lg overflow-hidden shadow-lg">
           <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-grow">
          <p className="font-semibold text-xs uppercase tracking-wider text-brand-red mb-1">{category.title}</p>
          <h3 className="text-lg font-bold text-white line-clamp-2 mb-3" title={video.title}>{video.title}</h3>
          <div className="flex items-center gap-4">
            <button className="flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-transform transform group-hover:scale-105">
              <Icon name="Play" className="w-5 h-5" />
              <span>Continuar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContinueLearningCard;