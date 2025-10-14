import React from 'react';
import type { LearningCategory } from '../types';
import Icon from './Icons';

interface CategoryCardProps {
    category: LearningCategory;
    progress: number;
    onClick: () => void;
    style?: React.CSSProperties;
}

const colorMap = {
    red: 'hover:border-red-500 hover:shadow-red-500/30 text-red-400',
    orange: 'hover:border-orange-500 hover:shadow-orange-500/30 text-orange-400',
    green: 'hover:border-green-500 hover:shadow-green-500/30 text-green-400',
    cyan: 'hover:border-cyan-500 hover:shadow-cyan-500/30 text-cyan-400',
    blue: 'hover:border-blue-500 hover:shadow-blue-500/30 text-blue-400',
    indigo: 'hover:border-indigo-500 hover:shadow-indigo-500/30 text-indigo-400',
    yellow: 'hover:border-yellow-500 hover:shadow-yellow-500/30 text-yellow-400',
    rose: 'hover:border-rose-500 hover:shadow-rose-500/30 text-rose-400',
};

type ColorKey = keyof typeof colorMap;

const progressColorMap = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    cyan: 'bg-cyan-500',
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
    yellow: 'bg-yellow-500',
    rose: 'bg-rose-500',
};

const CategoryCard: React.FC<CategoryCardProps> = ({ category, progress, onClick, style }) => {
    const { title, icon, color } = category;
    const colorClass = colorMap[color as ColorKey] || colorMap.red;
    const progressColorClass = progressColorMap[color as ColorKey] || progressColorMap.red;
    
    return (
        <div 
            onClick={onClick}
            style={style}
            className={`group relative bg-dark/60 backdrop-blur-sm border border-gray-800 rounded-lg p-4 flex flex-col justify-between aspect-[4/3] transition-all duration-300 transform hover:-translate-y-2 cursor-pointer shadow-lg shadow-black/40 hover:shadow-2xl ${colorClass} animate-stagger-in`}
        >
            <div className="flex-shrink-0">
                <Icon name={icon} className={`w-10 h-10 mb-3 transition-colors duration-300 group-hover:text-white`} />
                <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
            </div>
            <div className="mt-4 w-full">
                <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                    <span>Progresso</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-black/30 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${progressColorClass} transition-all duration-500`} style={{ width: `${progress}%` }}></div>
                </div>
            </div>
            {/* Neon glow effect */}
            <div className="absolute -inset-px rounded-lg border-2 border-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: `0 0 15px var(--tw-shadow-color)` }}></div>
        </div>
    );
}

export default CategoryCard;