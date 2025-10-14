import React from 'react';
import type { Project } from '../types';
import Avatar from './Avatar';
import Icon from './Icons';

interface ProjectCardProps {
    project: Project;
    onClick: () => void;
    onDelete: (projectId: string) => void;
    style?: React.CSSProperties;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onDelete, style }) => {
    const projectName = project.name || 'Sem Título';
    const fallbackCover = `https://placehold.co/600x800/0A0A0A/E50914?text=${encodeURIComponent(projectName.substring(0, 2))}`;

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card's main onClick
        if (window.confirm(`Tem certeza que deseja apagar o projeto "${projectName}"? Esta ação é irreversível.`)) {
            onDelete(project.id);
        }
    };

    return (
        <div
            onClick={onClick}
            style={style}
            className="group relative aspect-[3/4] bg-dark/60 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 transform hover:-translate-y-2 shadow-lg shadow-black/40 hover:shadow-2xl hover:shadow-brand-red/30 animate-stagger-in"
        >
            <img 
                src={project.coverImageUrl || fallbackCover} 
                alt={`Capa de ${projectName}`} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-4 w-full">
                <h3 className="text-lg font-bold text-white leading-tight line-clamp-2" title={projectName}>
                    {projectName}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                    <Avatar src={project.avatarUrl} name={project.createdBy} size="sm" />
                    <span className="text-xs text-gray-300">{project.createdBy}</span>
                </div>
            </div>
            <div className="absolute top-2 right-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Icon name="BookOpen" className="w-4 h-4 text-white" />
            </div>
            <button 
                onClick={handleDelete}
                className="absolute top-2 left-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:bg-brand-red hover:text-white"
                title="Apagar Projeto"
            >
                <Icon name="Trash" className="w-4 h-4" />
            </button>
        </div>
    );
}

export default ProjectCard;