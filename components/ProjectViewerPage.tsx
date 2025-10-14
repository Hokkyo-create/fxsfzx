
import React, { useState, useRef, useCallback } from 'react';
import type { Project, Chapter } from '../types';
import Icon from './Icons';
import { downloadProjectAsPdf } from '../utils/pdfGenerator';
import EditImageModal from './EditImageModal';
import InteractiveEbookModal from './InteractiveEbookModal';
import VideoGenerationModal from './VideoGenerationModal';
import { generateImagePromptForText, generateImage } from '../services/geminiService';

interface ProjectViewerPageProps {
    project: Project;
    onBack: () => void;
    onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
}

const ProjectViewerPage: React.FC<ProjectViewerPageProps> = ({ project, onBack, onUpdateProject }) => {
    const [isEditCoverModalOpen, setIsEditCoverModalOpen] = useState(false);
    const [isEditChapterImageModalOpen, setIsEditChapterImageModalOpen] = useState<number | null>(null);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    const pdfContentRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (pdfContentRef.current) {
            setIsDownloadingPdf(true);
            try {
                await downloadProjectAsPdf(pdfContentRef.current, project.name);
            } catch (e) {
                console.error("PDF download failed", e);
            } finally {
                setIsDownloadingPdf(false);
            }
        }
    };
    
    const getCoverPrompt = useCallback(async () => {
        return await generateImagePromptForText(project.name, project.introduction);
    }, [project.name, project.introduction]);

    const getChapterPrompt = useCallback(async (chapter: Chapter) => {
        return await generateImagePromptForText(chapter.title, chapter.content);
    }, []);
    
    const handleRegenerateImage = async (newPrompt: string): Promise<string> => {
        const base64 = await generateImage(newPrompt);
        return `data:image/png;base64,${base64}`;
    };

    const handleSaveCover = (newImageUrl: string) => {
        onUpdateProject(project.id, { coverImageUrl: newImageUrl });
        setIsEditCoverModalOpen(false);
    };
    
    const handleSaveChapterImage = (chapterIndex: number, newImageUrl: string) => {
        const updatedChapters = [...project.chapters];
        updatedChapters[chapterIndex] = { ...updatedChapters[chapterIndex], imageUrl: newImageUrl };
        onUpdateProject(project.id, { chapters: updatedChapters });
        setIsEditChapterImageModalOpen(null);
    };

    return (
        <>
            <div className="min-h-screen bg-darker text-white font-sans">
                {/* Header */}
                 <header className="bg-dark/80 backdrop-blur-sm border-b border-gray-900 sticky top-0 z-20 flex-shrink-0">
                    <div className="container mx-auto px-4 sm:px-6 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center min-w-0">
                                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors mr-4 flex-shrink-0">
                                    <Icon name="ChevronLeft" className="w-6 h-6" />
                                </button>
                                <div className="flex items-center gap-3 min-w-0">
                                    <Icon name="BookOpen" className="w-8 h-8 text-brand-red flex-shrink-0" />
                                    <div className="min-w-0">
                                        <h1 className="text-xl font-display tracking-wider text-white truncate">{project.name}</h1>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsVideoModalOpen(true)} className="p-2 rounded-full hover:bg-gray-800 transition-colors" title="Gerar Vídeo"><Icon name="Film" className="w-5 h-5"/></button>
                                <button onClick={() => setIsQuizModalOpen(true)} className="p-2 rounded-full hover:bg-gray-800 transition-colors" title="Quiz Interativo"><Icon name="Sparkles" className="w-5 h-5"/></button>
                                <button onClick={handleDownload} disabled={isDownloadingPdf} className="p-2 rounded-full hover:bg-gray-800 transition-colors" title="Baixar PDF"><Icon name="Download" className="w-5 h-5"/></button>
                            </div>
                        </div>
                    </div>
                </header>

                <main ref={pdfContentRef} className="container mx-auto px-4 sm:px-6 py-8 ebook-content">
                    {/* Cover Section */}
                    <div className="relative mb-8 text-center pdf-page-break">
                        {project.coverImageUrl && (
                             <div className="relative group max-w-lg mx-auto aspect-[3/4] rounded-lg overflow-hidden shadow-2xl shadow-black/50">
                                <img src={project.coverImageUrl} alt={project.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button onClick={() => setIsEditCoverModalOpen(true)} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white font-bold py-2 px-4 rounded-md hover:bg-white/30">
                                        <Icon name="Pencil" className="w-4 h-4" /> Editar Capa
                                    </button>
                                </div>
                             </div>
                        )}
                        <h1 className="text-4xl md:text-5xl font-display tracking-wider text-white mt-8">{project.name}</h1>
                        <p className="text-gray-400 mt-2">por {project.createdBy}</p>
                    </div>

                    {/* Content */}
                    <div className="max-w-3xl mx-auto prose-invert prose-p:text-gray-300 prose-headings:text-white prose-headings:font-display">
                        <section className="pdf-page-break">
                            <h2>Introdução</h2>
                            <p>{project.introduction}</p>
                        </section>
                        {project.chapters.map((chapter, index) => (
                            <section key={index} className="pdf-page-break">
                                <h2>{chapter.title}</h2>
                                {chapter.imageUrl && (
                                     <div className="relative group my-4 rounded-lg overflow-hidden">
                                        <img src={chapter.imageUrl} alt={`Imagem para ${chapter.title}`} className="w-full h-auto object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={() => setIsEditChapterImageModalOpen(index)} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white font-bold py-2 px-4 rounded-md hover:bg-white/30">
                                                <Icon name="Pencil" className="w-4 h-4" /> Editar Imagem
                                            </button>
                                        </div>
                                     </div>
                                )}
                                <p>{chapter.content}</p>
                            </section>
                        ))}
                        <section>
                            <h2>Conclusão</h2>
                            <p>{project.conclusion}</p>
                        </section>
                    </div>
                </main>
            </div>
            
            {/* Modals */}
            <EditImageModal
                isOpen={isEditCoverModalOpen}
                onClose={() => setIsEditCoverModalOpen(false)}
                imageUrl={project.coverImageUrl}
                getInitialPrompt={getCoverPrompt}
                onRegenerate={handleRegenerateImage}
                onSave={handleSaveCover}
            />
            {isEditChapterImageModalOpen !== null && (
                 <EditImageModal
                    isOpen={isEditChapterImageModalOpen !== null}
                    onClose={() => setIsEditChapterImageModalOpen(null)}
                    imageUrl={project.chapters[isEditChapterImageModalOpen].imageUrl}
                    getInitialPrompt={() => getChapterPrompt(project.chapters[isEditChapterImageModalOpen!])}
                    onRegenerate={handleRegenerateImage}
                    onSave={(newUrl) => handleSaveChapterImage(isEditChapterImageModalOpen!, newUrl)}
                />
            )}
            <InteractiveEbookModal 
                isOpen={isQuizModalOpen}
                onClose={() => setIsQuizModalOpen(false)}
                project={project}
            />
            <VideoGenerationModal
                isOpen={isVideoModalOpen}
                onClose={() => setIsVideoModalOpen(false)}
                project={project}
            />
        </>
    );
};

export default ProjectViewerPage;
