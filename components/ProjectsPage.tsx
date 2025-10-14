import React, { useState, useEffect } from 'react';
import type { User, Project, ProjectGenerationConfig } from '../types';
import Icon from './Icons';
import Avatar from './Avatar';
import ProjectCard from './ProjectCard';
import CreateProjectModal from './CreateProjectModal';
import { setupProjectsListener } from '../services/supabaseService';

interface ProjectsPageProps {
    user: User;
    onBack: () => void;
    onSelectProject: (project: Project) => void;
    onStartGeneration: (config: ProjectGenerationConfig) => void;
}

const ProjectsPage: React.FC<ProjectsPageProps> = ({ user, onBack, onSelectProject, onStartGeneration }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = setupProjectsListener((projectData, err) => {
            if (err) {
                console.error("Failed to fetch projects:", err);
                setError("Não foi possível carregar os projetos. Tente novamente mais tarde.");
            } else {
                setProjects(projectData);
                setError(null);
            }
        });

        return unsubscribe;
    }, []);

    const handleStartGeneration = (config: ProjectGenerationConfig) => {
        setIsCreateModalOpen(false);
        onStartGeneration(config);
    };

    return (
        <>
            <div className="min-h-screen bg-darker text-white font-sans flex flex-col animate-fade-in">
                {/* Header */}
                <header className="bg-dark border-b border-gray-900 sticky top-0 z-20 flex-shrink-0">
                    <div className="container mx-auto px-4 sm:px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors mr-2">
                                    <Icon name="ChevronLeft" className="w-6 h-6" />
                                </button>
                                <Icon name="BookOpen" className="w-8 h-8 text-brand-red" />
                                <div>
                                    <h1 className="text-xl font-display tracking-wider text-white">Área de Projetos</h1>
                                    <p className="text-xs text-gray-400">Crie, visualize e gerencie seus projetos de IA.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="flex items-center gap-2 text-sm text-gray-400">
                                   <Avatar src={user.avatarUrl} name={user.name} size="sm" />
                                   <span className="hidden md:inline">{user.name}</span>
                               </div>
                                <button 
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-transform transform hover:scale-105"
                                >
                                    <Icon name="Plus" className="w-5 h-5" />
                                    <span className="hidden sm:inline">Novo Projeto</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-grow container mx-auto px-4 sm:px-6 py-8">
                    {error ? (
                        <div className="text-center text-red-400 p-8 bg-red-900/20 border border-red-500/30 rounded-lg">{error}</div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <Icon name="BookOpen" className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <h2 className="text-xl font-semibold text-gray-300">Nenhum projeto encontrado.</h2>
                            <p className="mt-2">Clique em "Novo Projeto" para começar a criar com a ajuda da IA.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {projects.map(project => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    onClick={() => onSelectProject(project)}
                                    style={{}}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>
            
            <CreateProjectModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                user={user}
                onStartGeneration={handleStartGeneration}
            />
        </>
    );
};

export default ProjectsPage;
