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
    <section className="mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
      <h2 className="text-2xl font-display tracking-wider text-white mb-6">Continue Aprendendo</h2>
      <div 
        onClick={onClick}
        className="group relative bg-dark border border-gray-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:border-brand-red/50 hover:shadow-2xl hover:shadow-brand-red/10 transform hover:-translate-y-1"
      >
        <div className="absolute inset-0 w-full h-full">
          <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/60 to-transparent"></div>
        </div>
        
        <div className="relative flex flex-col md:flex-row items-center gap-6 p-6">
          <div className="flex-shrink-0 w-full md:w-1/3 aspect-video rounded-lg overflow-hidden shadow-lg">
             <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex-grow">
            <p className="font-semibold text-xs uppercase tracking-wider text-brand-red mb-2">{category.title}</p>
            <h3 className="text-xl lg:text-2xl font-bold text-white line-clamp-2 mb-2" title={video.title}>{video.title}</h3>
            <div className="flex items-center gap-4">
              <button className="flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-5 rounded-md transition-transform transform group-hover:scale-105">
                <Icon name="Play" className="w-5 h-5" />
                <span>Continuar</span>
              </button>
              <p className="text-sm text-gray-400">Próximo na sua trilha</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContinueLearningCard;