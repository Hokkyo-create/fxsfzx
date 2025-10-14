import React from 'react';
import type { Project } from '../types';
import Icon from './Icons';
import ProjectCard from './ProjectCard';
import Section from './Section';

interface ProjectsPageProps {
    projects: Project[];
    isLoading: boolean;
    onBack: () => void;
    onSelectProject: (project: Project) => void;
    onCreateProject: () => void;
    onDeleteProject: (projectId: string) => void;
}

const ProjectCardSkeleton: React.FC = () => (
    <div className="aspect-[3/4] bg-dark/60 rounded-lg animate-pulse"></div>
);

const ProjectsPage: React.FC<ProjectsPageProps> = ({ projects, isLoading, onBack, onSelectProject, onCreateProject, onDeleteProject }) => {
    return (
        <div className="min-h-screen bg-darker text-white font-sans animate-fade-in">
            <header className="bg-dark border-b border-gray-900 sticky top-0 z-20 flex-shrink-0">
                <div className="container mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center">
                            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors mr-4">
                                <Icon name="ChevronLeft" className="w-6 h-6" />
                            </button>
                            <div className="flex items-center gap-3">
                                <Icon name="BookOpen" className="w-8 h-8 text-brand-red" />
                                <div>
                                    <h1 className="text-xl font-display tracking-wider text-white">Área de Projetos</h1>
                                    <p className="text-xs text-gray-400">Crie e gerencie ebooks com o poder da IA</p>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={onCreateProject}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-brand-red hover:bg-red-700 text-white"
                        >
                            <Icon name="Plus" className="w-5 h-5" />
                            <span>Novo Projeto</span>
                        </button>
                    </div>
                </div>
            </header>
            
            <main className="container mx-auto px-4 sm:px-6 py-8">
                <Section title="Seus Projetos">
                    {isLoading ? (
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {Array.from({ length: 6 }).map((_, index) => <ProjectCardSkeleton key={index} />)}
                        </div>
                    ) : projects.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {projects.map((project, index) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    onClick={() => onSelectProject(project)}
                                    onDelete={onDeleteProject}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                />
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-16 px-8 bg-dark/50 border-2 border-dashed border-gray-800 rounded-lg">
                            <Icon name="BookOpen" className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                            <h3 className="text-xl font-display text-white">Nenhum projeto encontrado</h3>
                            <p className="text-gray-500 mt-2">Clique em "Novo Projeto" para começar a criar seu primeiro ebook com IA.</p>
                        </div>
                    )}
                </Section>
            </main>
        </div>
    );
};

export default ProjectsPage;