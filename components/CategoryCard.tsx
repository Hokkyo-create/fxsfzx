import React from 'react';
import type { LearningCategory } from '../types';
import Icon from './Icons';

interface CategoryCardProps {
    category: LearningCategory;
    progress: number;
    onClick: () => void;
}

const colorMap = {
    red: { border: 'border-red-500', shadow: 'hover:shadow-red-500/20', progress: 'bg-red-500' },
    orange: { border: 'border-orange-500', shadow: 'hover:shadow-orange-500/20', progress: 'bg-orange-500' },
    green: { border: 'border-green-500', shadow: 'hover:shadow-green-500/20', progress: 'bg-green-500' },
    cyan: { border: 'border-cyan-500', shadow: 'hover:shadow-cyan-500/20', progress: 'bg-cyan-500' },
    blue: { border: 'border-blue-500', shadow: 'hover:shadow-blue-500/20', progress: 'bg-blue-500' },
    indigo: { border: 'border-indigo-500', shadow: 'hover:shadow-indigo-500/20', progress: 'bg-indigo-500' },
    yellow: { border: 'border-yellow-500', shadow: 'hover:shadow-yellow-500/20', progress: 'bg-yellow-500' },
    rose: { border: 'border-rose-500', shadow: 'hover:shadow-rose-500/20', progress: 'bg-rose-500' },
};

type ColorKey = keyof typeof colorMap;

const CategoryCard: React.FC<CategoryCardProps> = ({ category, progress, onClick }) => {
    const { title, description, icon, videos, color } = category;
    const colorClasses = colorMap[color as ColorKey] || colorMap.red;
    const completedCount = Math.round((progress / 100) * videos.length);
    
    return (
        <div 
            onClick={onClick}
            className={`group bg-dark border ${colorClasses.border} rounded-lg p-6 flex flex-col transition-all duration-300 ${colorClasses.shadow} transform hover:-translate-y-2 cursor-pointer relative overflow-hidden`}
        >
            <div className={`absolute -top-8 -left-8 w-24 h-24 text-gray-800 opacity-20`}>
                 <Icon name={icon} className="w-full h-full" />
            </div>
            
            <div className="flex justify-between items-start mb-4 z-10">
                <div className={`w-12 h-12 flex items-center justify-center rounded-lg bg-gray-800 border ${colorClasses.border}`}>
                    <Icon name={icon} className="w-6 h-6" />
                </div>
                 <div className="flex items-center gap-2">
                    <Icon name="Heart" className="w-5 h-5 text-gray-600 hover:text-rose-500 transition-colors" />
                    <Icon name="Dots" className="w-5 h-5 text-gray-600" />
                </div>
            </div>

            <div className="flex-grow z-10">
                <h3 className="text-2xl font-display tracking-wider text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm mb-6 h-12">{description}</p>
            </div>

            <div className="mt-auto z-10">
                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>{videos.length} vídeos</span>
                    <span>{completedCount}/{videos.length}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className={`${colorClasses.progress} h-2 rounded-full transition-all duration-500`} style={{ width: `${progress}%` }}></div>
                </div>
                 <p className="text-right text-xs font-mono text-gray-400 mt-2">{Math.round(progress)}%</p>
            </div>
        </div>
    );
}

export default CategoryCard;