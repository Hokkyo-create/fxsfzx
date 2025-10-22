import React, { useState, useMemo } from 'react';
import type { User, Project, ProjectGenerationConfig } from '../types';
import Icon from './Icons';
import Section from './Section';
import ProjectCard from './ProjectCard';
import CreateProjectModal from './CreateProjectModal';
import ProjectGenerationPage from './ProjectGenerationPage';
import GammaModeModal from './GammaModeModal';
import { createProject } from '../services/firebaseService';

interface ProjectsPageProps {
    user: User;
    projects: Project[];
    onBack: () => void;
    onViewProject: (project: Project) => void;
    onProjectCreated: () => void; // To refresh project list in App.tsx
    onNavigate: (page: 'notebook-lm') => void;
}

const ProjectsPage: React.FC<ProjectsPageProps> = ({ user, projects, onBack, onViewProject, onProjectCreated, onNavigate }) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isGammaModalOpen, setIsGammaModalOpen] = useState(false);
    const [generationConfig, setGenerationConfig] = useState<ProjectGenerationConfig | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleStartGeneration = (config: ProjectGenerationConfig) => {
        setIsCreateModalOpen(false);
        setGenerationConfig(config);
    };

    const handleGenerationComplete = async (newProjectData: Omit<Project, 'id' | 'createdAt'>) => {
        try {
            await createProject(newProjectData);
            onProjectCreated(); // Notify App.tsx to refetch projects
            setGenerationConfig(null);
             window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Projeto criado com sucesso!' }}));
        } catch (error) {
            console.error("Failed to save project:", error);
             const errorMessage = error instanceof Error ? error.message : "Falha ao salvar o projeto.";
             window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'error', message: errorMessage }}));
            setGenerationConfig(null); // Go back to projects page even on error
        }
    };
    
    const { ownedProjects, collaboratingProjects } = useMemo(() => {
        const filtered = projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return {
            ownedProjects: filtered.filter(p => p.createdBy === user.name),
            collaboratingProjects: filtered.filter(p => p.createdBy !== user.name && p.collaborators?.includes(user.name)),
        };
    }, [projects, searchTerm, user.name]);

    if (generationConfig) {
        return (
            <ProjectGenerationPage
                user={user}
                config={generationConfig}
                onGenerationComplete={handleGenerationComplete}
                onCancel={() => setGenerationConfig(null)}
            />
        );
    }

    return (
        <>
            <div className="min-h-screen bg-darker text-white font-sans">
                {/* Header */}
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
                                        <p className="text-xs text-gray-400">Crie, colabore e monetize seus ebooks</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onNavigate('notebook-lm')} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-2 sm:px-4 rounded-md transition-colors" title="Modo Notebook LM">
                                    <Icon name="Pencil" className="w-5 h-5" />
                                    <span className="hidden sm:inline">Notebook LM</span>
                                </button>
                                <button onClick={() => setIsGammaModalOpen(true)} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-2 sm:px-4 rounded-md transition-colors" title="Modo Gamma">
                                    <Icon name="Sparkles" className="w-5 h-5" />
                                    <span className="hidden sm:inline">Modo Gamma</span>
                                </button>
                                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-2 sm:px-4 rounded-md transition-transform transform hover:scale-105">
                                    <Icon name="Plus" className="w-5 h-5" />
                                    <span className="hidden sm:inline">Novo Projeto</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 sm:px-6 py-8">
                     <div className="relative mb-8">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar em todos os projetos..."
                            className="w-full bg-dark/50 border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-white focus:ring-2 focus:ring-brand-red focus:border-brand-red transition"
                        />
                        <Icon name="Search" className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>

                    <Section title="Seus Projetos">
                        {ownedProjects.length > 0 ? (
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {ownedProjects.map((project, index) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        onClick={() => onViewProject(project)}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-500 bg-dark/30 rounded-lg">
                                <p>Você ainda não criou nenhum projeto.</p>
                            </div>
                        )}
                    </Section>
                    
                    {collaboratingProjects.length > 0 && (
                        <Section title="Projetos Colaborativos">
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {collaboratingProjects.map((project, index) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        onClick={() => onViewProject(project)}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    />
                                ))}
                            </div>
                        </Section>
                    )}

                </main>
            </div>
            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                user={user}
                onStartGeneration={handleStartGeneration}
            />
            <GammaModeModal
                isOpen={isGammaModalOpen}
                onClose={() => setIsGammaModalOpen(false)}
                projects={ownedProjects}
            />
        </>
    );
};

export default ProjectsPage;