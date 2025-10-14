
import React from 'react';
import type { Project } from '../types';
import Icon from './Icons';
import Avatar from './Avatar';

interface ProjectCardProps {
    project: Project;
    onClick: () => void;
    style?: React.CSSProperties;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, style }) => {
    const creationDate = new Date(project.createdAt).toLocaleDateString('pt-BR');

    return (
        <div
            onClick={onClick}
            style={style}
            className="group relative bg-dark/60 backdrop-blur-sm border border-gray-800 rounded-lg flex flex-col transition-all duration-300 transform hover:-translate-y-2 cursor-pointer shadow-lg shadow-black/40 hover:shadow-2xl hover:shadow-brand-red/40 animate-stagger-in"
        >
            <div className="relative w-full aspect-[16/9] rounded-t-lg overflow-hidden">
                {project.coverImageUrl ? (
                    <img src={project.coverImageUrl} alt={project.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <Icon name="BookOpen" className="w-16 h-16 text-gray-700" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-white leading-tight flex-grow line-clamp-2">{project.name}</h3>
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                        <Avatar src={project.avatarUrl} name={project.createdBy} size="sm" />
                        <span className="text-xs text-gray-400">{project.createdBy}</span>
                    </div>
                    <span className="text-xs text-gray-500">{creationDate}</span>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
