import React, { useRef, useState, useEffect } from 'react';
import type { Project, Chapter } from '../types';
import Icon from './Icons';
import Avatar from './Avatar';
import { downloadProjectAsPdf } from '../utils/pdfGenerator';
import EditImageModal from './EditImageModal';
import VideoGenerationModal from './VideoGenerationModal';
import InteractiveEbookModal from './InteractiveEbookModal';
import { generateImagePromptForText, generateImage } from '../services/geminiService';
import { updateProject } from '../services/supabaseService';

interface ProjectViewerPageProps {
    project: Project;
    onBack: () => void;
}

const ProjectViewerPage: React.FC<ProjectViewerPageProps> = ({ project, onBack }) => {
    const printableAreaRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [editableProject, setEditableProject] = useState<Project>(project);
    const [editingImage, setEditingImage] = useState<{ type: 'cover' | 'chapter'; index: number; } | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // State for new modals
    const [videoModalProject, setVideoModalProject] = useState<Project | null>(null);
    const [interactiveModalProject, setInteractiveModalProject] = useState<Project | null>(null);

    useEffect(() => {
        setEditableProject(project);
    }, [project]);

    const handleDownloadPdf = async () => {
        if (!printableAreaRef.current) return;
        setIsDownloading(true);
        await downloadProjectAsPdf(printableAreaRef.current, editableProject.name);
        setIsDownloading(false);
    };
    
    const handleRegenerateImage = async (newPrompt: string): Promise<string> => {
        const imageBase64 = await generateImage(newPrompt);
        return `data:image/png;base64,${imageBase64}`;
    };
    
    const handleSaveImage = (newImageUrl: string) => {
        if (!editingImage) return;

        if (editingImage.type === 'cover') {
            setEditableProject(prev => ({ ...prev, coverImageUrl: newImageUrl }));
        } else {
            const updatedChapters = [...editableProject.chapters];
            updatedChapters[editingImage.index].imageUrl = newImageUrl;
            setEditableProject(prev => ({ ...prev, chapters: updatedChapters }));
        }
        setHasChanges(true);
        setEditingImage(null);
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            await updateProject(editableProject.id, {
                coverImageUrl: editableProject.coverImageUrl,
                chapters: editableProject.chapters,
            });
            setHasChanges(false);
        } catch (error) {
            console.error("Failed to save changes:", error);
            alert("Falha ao salvar as alterações.");
        } finally {
            setIsSaving(false);
        }
    }
    
    const renderMarkdownContent = (text: string) => {
        return text.split('\n').map((paragraph, index) => (
            paragraph.trim() ? <p key={index} className="text-gray-300 leading-relaxed mb-4">{paragraph}</p> : null
        ));
    }
    
    const getPromptForImage = async (): Promise<string> => {
        if (!editingImage) return '';
        if (editingImage.type === 'cover') {
            return await generateImagePromptForText(editableProject.name, editableProject.introduction);
        } else {
            const chapter = editableProject.chapters[editingImage.index];
            return await generateImagePromptForText(chapter.title, chapter.content);
        }
    };

    return (
        <>
            <div className="min-h-screen bg-darker text-white font-sans flex flex-col animate-fade-in">
                <header className="bg-dark border-b border-gray-900 sticky top-0 z-20">
                    <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors mr-2 flex-shrink-0">
                                <Icon name="ChevronLeft" className="w-6 h-6" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-xl font-display tracking-wider text-white truncate" title={editableProject.name}>{editableProject.name}</h1>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                    <Avatar src={editableProject.avatarUrl} name={editableProject.createdBy} size="sm" />
                                    <span>Criado por {editableProject.createdBy}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                             {hasChanges && (
                                <button
                                    onClick={handleSaveChanges}
                                    disabled={isSaving}
                                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 transition-colors disabled:bg-gray-600"
                                >
                                    <Icon name="Upload" className="w-4 h-4" />
                                    <span className="text-sm font-semibold hidden sm:inline">{isSaving ? 'Salvando...' : 'Salvar'}</span>
                                </button>
                            )}
                            <button 
                                onClick={handleDownloadPdf}
                                disabled={isDownloading}
                                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-md bg-brand-red hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                            >
                                <Icon name="Download" className="w-4 h-4" />
                                <span className="text-sm font-semibold hidden sm:inline">{isDownloading ? 'Baixando...' : 'Baixar PDF'}</span>
                            </button>
                            <button
                                onClick={() => setVideoModalProject(editableProject)}
                                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                title="Fazer Vídeo do Ebook"
                            >
                                <Icon name="Film" className="w-4 h-4" />
                                <span className="text-sm font-semibold hidden sm:inline">Vídeo</span>
                            </button>
                            <button
                                onClick={() => setInteractiveModalProject(editableProject)}
                                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 transition-colors"
                                title="Fazer Ebook Interativo"
                            >
                                <Icon name="Sparkles" className="w-4 h-4" />
                                <span className="text-sm font-semibold hidden sm:inline">Interativo</span>
                            </button>
                        </div>
                    </div>
                </header>
                <main className="container mx-auto px-4 sm:px-6 py-8 flex-grow">
                    <div ref={printableAreaRef} className="max-w-4xl mx-auto bg-dark/50 border border-gray-800 rounded-lg overflow-hidden">
                        {editableProject.coverImageUrl && (
                            <div className="w-full aspect-[3/4] max-h-[1024px] bg-black relative group">
                                <img src={editableProject.coverImageUrl} alt={`Capa de ${editableProject.name}`} className="w-full h-full object-contain" />
                                <button onClick={() => setEditingImage({ type: 'cover', index: -1 })} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Icon name="Pencil" className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    <div className="p-8 md:p-12">
                        <h1 className="text-4xl md:text-5xl font-display text-white mb-8 border-b-2 border-brand-red pb-4">{editableProject.name}</h1>
                        
                        <h3 className="text-2xl font-display text-brand-red mt-8 mb-4">Introdução</h3>
                        {renderMarkdownContent(editableProject.introduction)}

                        {editableProject.chapters?.map((chapter, index) => (
                            <div key={index}>
                                <h3 className="text-2xl font-display text-brand-red mt-8 mb-4">{chapter.title}</h3>
                                {chapter.imageUrl && (
                                    <div className="my-6 relative group">
                                        <img src={chapter.imageUrl} alt={`Imagem para ${chapter.title}`} className="w-full rounded-lg object-cover" />
                                        <button onClick={() => setEditingImage({ type: 'chapter', index })} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Icon name="Pencil" className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                                {renderMarkdownContent(chapter.content)}
                            </div>
                        ))}

                        <h3 className="text-2xl font-display text-brand-red mt-8 mb-4">Conclusão</h3>
                        {renderMarkdownContent(editableProject.conclusion)}
                    </div>
                    </div>
                </main>
            </div>
            {editingImage && (
                <EditImageModal
                    isOpen={!!editingImage}
                    onClose={() => setEditingImage(null)}
                    imageUrl={editingImage.type === 'cover' ? editableProject.coverImageUrl : editableProject.chapters[editingImage.index].imageUrl}
                    getInitialPrompt={getPromptForImage}
                    onRegenerate={handleRegenerateImage}
                    onSave={handleSaveImage}
                />
            )}
            {videoModalProject && (
                <VideoGenerationModal
                    isOpen={!!videoModalProject}
                    onClose={() => setVideoModalProject(null)}
                    project={videoModalProject}
                />
            )}
            {interactiveModalProject && (
                <InteractiveEbookModal
                    isOpen={!!interactiveModalProject}
                    onClose={() => setInteractiveModalProject(null)}
                    project={interactiveModalProject}
                />
            )}
        </>
    );
};

export default ProjectViewerPage;