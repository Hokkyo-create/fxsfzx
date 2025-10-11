import React, { useState, useEffect } from 'react';
import type { User, Project, ProjectGenerationConfig } from '../types';
import Icon from './Icons';
import ProjectCard from './ProjectCard';
import CreateProjectModal from './CreateProjectModal';
import { setupProjectsListener } from '../services/firebaseService';


interface ProjectsPageProps {
    user: User;
    onBack: () => void;
    onSelectProject: (project: Project) => void;
    onStartGeneration: (config: ProjectGenerationConfig) => void;
}

const ProjectsPage: React.FC<ProjectsPageProps> = ({ user, onBack, onSelectProject, onStartGeneration }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = setupProjectsListener(setProjects);
        return () => unsubscribe();
    }, []);
    
    const handleStart = (config: ProjectGenerationConfig) => {
        setIsModalOpen(false);
        onStartGeneration(config);
    }

    return (
        <div className="min-h-screen bg-darker text-white font-sans flex flex-col">
             <header className="bg-dark border-b border-gray-900 sticky top-0 z-20">
                <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors mr-2">
                            <Icon name="ChevronLeft" className="w-6 h-6" />
                        </button>
                        <Icon name="BookOpen" className="w-8 h-8 text-brand-red" />
                        <div>
                             <h1 className="text-2xl font-display tracking-wider text-white">Área de Projetos</h1>
                             <p className="text-xs text-gray-400">Crie, colabore e execute.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-transform transform hover:scale-105"
                    >
                         <Icon name="Plus" className="w-5 h-5" />
                         <span className="hidden sm:inline">Criar Novo Projeto com IA</span>
                    </button>
                </div>
            </header>
            
            <main className="container mx-auto px-4 sm:px-6 py-8 flex-grow">
                 {projects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projects.map((project, index) => (
                           <ProjectCard 
                                key={project.id}
                                project={project}
                                onClick={() => onSelectProject(project)}
                                style={{ animationDelay: `${index * 50}ms` }}
                           />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 animate-fade-in">
                        <Icon name="BookOpen" className="w-24 h-24 mb-4" />
                        <h2 className="text-2xl font-display text-gray-300">Nenhum projeto encontrado</h2>
                        <p className="mt-2 max-w-md">Parece que ainda não há nenhum projeto. Que tal criar o primeiro e dar início à colaboração?</p>
                    </div>
                )}
            </main>

            <CreateProjectModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                user={user} 
                onStartGeneration={handleStart}
            />
        </div>
    );
};

export default ProjectsPage;