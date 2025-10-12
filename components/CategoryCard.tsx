import React from 'react';
import type { LearningCategory } from '../types';
import Icon from './Icons';

interface CategoryCardProps {
    category: LearningCategory;
    progress: number;
    onClick: () => void;
}

const colorMap = {
    red: { border: 'border-red-500/40', shadow: 'hover:shadow-[0_0_30px_-5px_rgba(229,9,20,0.4)]', progress: 'bg-red-500', iconBg: 'bg-red-500/10' },
    orange: { border: 'border-orange-500/40', shadow: 'hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.4)]', progress: 'bg-orange-500', iconBg: 'bg-orange-500/10' },
    green: { border: 'border-green-500/40', shadow: 'hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.4)]', progress: 'bg-green-500', iconBg: 'bg-green-500/10' },
    cyan: { border: 'border-cyan-500/40', shadow: 'hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.4)]', progress: 'bg-cyan-500', iconBg: 'bg-cyan-500/10' },
    blue: { border: 'border-blue-500/40', shadow: 'hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.4)]', progress: 'bg-blue-500', iconBg: 'bg-blue-500/10' },
    indigo: { border: 'border-indigo-500/40', shadow: 'hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)]', progress: 'bg-indigo-500', iconBg: 'bg-indigo-500/10' },
    yellow: { border: 'border-yellow-500/40', shadow: 'hover:shadow-[0_0_30px_-5px_rgba(234,179,8,0.4)]', progress: 'bg-yellow-500', iconBg: 'bg-yellow-500/10' },
    rose: { border: 'border-rose-500/40', shadow: 'hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.4)]', progress: 'bg-rose-500', iconBg: 'bg-rose-500/10' },
};

type ColorKey = keyof typeof colorMap;

const CategoryCard: React.FC<CategoryCardProps> = ({ category, progress, onClick }) => {
    const { title, description, icon, videos, color } = category;
    const colorClasses = colorMap[color as ColorKey] || colorMap.red;
    const completedCount = Math.round((progress / 100) * videos.length);
    
    return (
        <div 
            onClick={onClick}
            className={`category-card group bg-dark/50 backdrop-blur-lg border ${colorClasses.border} rounded-lg p-6 flex flex-col transition-all duration-300 ${colorClasses.shadow} transform hover:-translate-y-2 cursor-pointer relative overflow-hidden h-[288px]`}
        >
            <div className={`absolute -top-8 -left-8 w-24 h-24 text-gray-800/50 opacity-10 group-hover:opacity-20 transition-opacity`}>
                 <Icon name={icon} className="w-full h-full" />
            </div>
            
            <div className="flex justify-between items-start mb-4 z-10">
                <div className={`w-12 h-12 flex items-center justify-center rounded-lg ${colorClasses.iconBg} border ${colorClasses.border}`}>
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
                    <span>{videos.length > 0 ? `${videos.length} vídeos` : 'Em breve'}</span>
                    {videos.length > 0 && <span>{completedCount}/{videos.length}</span>}
                </div>
                 {videos.length > 0 && (
                    <div className="w-full bg-gray-800/50 rounded-full h-2">
                        <div className={`${colorClasses.progress} h-2 rounded-full transition-all duration-500`} style={{ width: `${progress}%` }}></div>
                    </div>
                )}
                 <p className="text-right text-xs font-mono text-gray-400 mt-2">{Math.round(progress)}%</p>
            </div>
        </div>
    );
}

export default CategoryCard;