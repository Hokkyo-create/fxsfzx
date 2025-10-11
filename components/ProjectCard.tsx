import React from 'react';
import type { Project } from '../types';
import Icon from './Icons';
import Avatar from './Avatar';

interface ProjectCardProps {
    project: Project;
    onClick: () => void;
    style: React.CSSProperties;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, style }) => {
    const { name, createdBy, avatarUrl, createdAt, coverImageUrl } = project;
    
    return (
        <div 
            onClick={onClick}
            style={style}
            className="group bg-dark border border-gray-800 rounded-lg flex flex-col transition-all duration-300 hover:border-brand-red/50 hover:shadow-2xl hover:shadow-brand-red/10 transform hover:-translate-y-1 cursor-pointer relative overflow-hidden animate-pop-in aspect-[3/4]"
        >
            {coverImageUrl ? (
                <>
                    <img src={coverImageUrl} alt={`Capa de ${name}`} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/70 to-transparent"></div>
                </>
            ) : (
                <div className="absolute -top-10 -right-10 w-28 h-28 text-gray-800/50 opacity-10 group-hover:opacity-20 group-hover:rotate-6 transition-all duration-500">
                     <Icon name="BookOpen" className="w-full h-full" />
                </div>
            )}
            
            <div className="flex-grow z-10 p-5 flex flex-col justify-end">
                <h3 className="text-xl font-display tracking-wider text-white line-clamp-3" title={name}>{name}</h3>
            </div>

            <div className="mt-auto z-10 border-t border-gray-800 p-4 bg-dark/50">
                <div className="flex justify-between items-center text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                        <Avatar src={avatarUrl} name={createdBy} size="sm" />
                        <span>{createdBy}</span>
                    </div>
                    <span>{new Date(createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
            </div>
        </div>
    );
}

export default ProjectCard;