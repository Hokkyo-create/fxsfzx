import React, { useState } from 'react';
import type { Project, Slide } from '../types';
import Icon from './Icons';
import Avatar from './Avatar';
import { generatePresentationFromProject, generateWebpageFromProject } from '../services/geminiService';
import PresentationViewer from './PresentationViewer';
import WebpageViewer from './WebpageViewer';

interface GammaModeModalProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Project[];
}

const GammaModeModal: React.FC<GammaModeModalProps> = ({ isOpen, onClose, projects }) => {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [format, setFormat] = useState<'presentation' | 'webpage' | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationResult, setGenerationResult] = useState<Slide[] | string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleClose = () => {
        setSelectedProject(null);
        setFormat(null);
        setIsGenerating(false);
        setGenerationResult(null);
        setError(null);
        onClose();
    }

    const resetGeneration = () => {
        setGenerationResult(null);
        setError(null);
        setFormat(null);
    }
    
    const handleSelectProject = (project: Project) => {
        setSelectedProject(project);
    }
    
    const handleGenerate = async () => {
        if (!selectedProject || !format) return;
        
        setIsGenerating(true);
        setGenerationResult(null);
        setError(null);
        
        try {
            if (format === 'presentation') {
                const slides = await generatePresentationFromProject(selectedProject);
                if (slides && slides.length > 0) {
                    setGenerationResult(slides);
                } else {
                    throw new Error("A IA não conseguiu gerar os slides. Tente novamente.");
                }
            } else { // webpage
                const html = await generateWebpageFromProject(selectedProject);
                if (html && html.includes('</html>')) {
                    setGenerationResult(html);
                } else {
                    throw new Error("A IA não conseguiu gerar a página web. Tente novamente.");
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
            setError(msg);
        } finally {
            setIsGenerating(false);
        }
    }

    if (!isOpen) return null;

    const renderContent = () => {
        if (generationResult) {
            if (format === 'presentation' && Array.isArray(generationResult)) {
                return <PresentationViewer slides={generationResult} projectName={selectedProject!.name} />;
            }
            if (format === 'webpage' && typeof generationResult === 'string') {
                return <WebpageViewer htmlContent={generationResult} />;
            }
        }
        
        if (isGenerating) {
             return (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                    <svg className="animate-spin h-10 w-10 text-brand-red mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h4 className="text-lg font-bold text-white">Transformando seu conteúdo...</h4>
                    <p className="text-gray-400 text-sm">A IA está reestruturando seu projeto. Isso pode levar um minuto.</p>
                </div>
            );
        }
        
        if (error) {
            return (
                 <div className="flex-grow flex flex-col items-center justify-center text-center p-8 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <Icon name="X" className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">Erro na Geração</h4>
                    <p className="text-red-300 text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="mt-4 text-sm font-semibold underline hover:text-white">Tentar Novamente</button>
                </div>
            );
        }

        if (selectedProject) {
            return (
                 <div className="p-4">
                    <p className="text-gray-400 text-sm mb-2">Projeto Selecionado:</p>
                    <p className="font-bold text-white text-lg mb-6">{selectedProject.name}</p>
                    <h4 className="font-semibold text-white mb-3">Escolha o formato de saída:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                            onClick={() => setFormat('presentation')}
                            className={`p-4 border-2 rounded-lg text-left transition-colors ${format === 'presentation' ? 'border-brand-red bg-brand-red/10' : 'border-gray-700 hover:border-gray-600'}`}
                        >
                            <h5 className="font-bold text-white">Apresentação de Slides</h5>
                            <p className="text-xs text-gray-400 mt-1">Gere slides concisos e visuais, ideal para apresentações.</p>
                        </button>
                         <button 
                            onClick={() => setFormat('webpage')}
                            className={`p-4 border-2 rounded-lg text-left transition-colors ${format === 'webpage' ? 'border-brand-red bg-brand-red/10' : 'border-gray-700 hover:border-gray-600'}`}
                        >
                            <h5 className="font-bold text-white">Gerar Ebook estilo Gamma</h5>
                            <p className="text-xs text-gray-400 mt-1">Crie uma página única e estilizada com o conteúdo do seu ebook, pronta para ser baixada como PDF.</p>
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                {projects.length > 0 ? projects.map(project => (
                    <div 
                        key={project.id} 
                        onClick={() => handleSelectProject(project)}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                         {project.coverImageUrl ? (
                             <img src={project.coverImageUrl} alt={project.name} className="w-16 h-10 object-cover rounded flex-shrink-0 bg-gray-700" />
                        ) : (
                            <div className="w-16 h-10 rounded flex-shrink-0 bg-gray-700 flex items-center justify-center"><Icon name="BookOpen" className="w-5 h-5 text-gray-500" /></div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{project.name}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <Avatar src={project.avatarUrl} name={project.createdBy} size="sm" className="w-4 h-4" />
                                <p className="text-xs text-gray-400">{project.createdBy}</p>
                            </div>
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-gray-500 py-8">Você não possui projetos para transformar.</p>
                )}
            </div>
        )
    };
    
    const getFooter = () => {
        if (generationResult) {
            return (
                 <button onClick={resetGeneration} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-md transition-colors">
                    <Icon name="ChevronLeft" className="w-5 h-5 inline-block mr-2"/>
                    Voltar para Seleção
                </button>
            );
        }
        if (selectedProject && !isGenerating && !error) {
            return (
                <div className="flex gap-4">
                     <button onClick={() => setSelectedProject(null)} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-md transition-colors">
                        Voltar
                    </button>
                    <button 
                        onClick={handleGenerate}
                        disabled={!format}
                        className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-50"
                    >
                        <Icon name="Sparkles" className="w-5 h-5"/>
                        Gerar
                    </button>
                </div>
            );
        }
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={handleClose}>
            <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-4xl mx-4 p-6 flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-4 border-b border-gray-800 flex-shrink-0 mb-4">
                    <div className="flex items-center gap-3">
                        <Icon name="Sparkles" className="w-6 h-6 text-brand-red" />
                        <h3 className="text-xl font-display tracking-wider text-white">Modo Gamma: Transformar Projeto</h3>
                    </div>
                    <button onClick={handleClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <Icon name="X" className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-grow flex flex-col justify-center min-h-0">
                   {renderContent()}
                </div>

                {getFooter() && (
                    <div className="flex-shrink-0 pt-4 mt-4 border-t border-gray-800">
                        {getFooter()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GammaModeModal;