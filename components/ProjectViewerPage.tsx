


import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Project, Chapter, IconName } from '../types';
import { users } from '../data';
import Icon from './Icons';
import Avatar from './Avatar';
import { downloadProjectAsPdf } from '../utils/pdfGenerator';
import EditImageModal from './EditImageModal';
import InteractiveEbookModal from './InteractiveEbookModal';
import VideoGenerationModal from './VideoGenerationModal';
import ShortFormVideoGeneratorModal from './ShortFormVideoGeneratorModal';
import { generateImagePromptForText, generateImage } from '../services/geminiService';

interface ProjectViewerPageProps {
    project: Project;
    onBack: () => void;
    onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
}


const SettingsSidebar: React.FC<{ project: Project; onUpdateProject: ProjectViewerPageProps['onUpdateProject'] }> = ({ project, onUpdateProject }) => {
    const [status, setStatus] = useState(project.status || 'draft');
    const [price, setPrice] = useState(project.price || 0);
    const [publicDescription, setPublicDescription] = useState(project.publicDescription || '');
    const [collaborators, setCollaborators] = useState(project.collaborators || []);
    const [selectedUser, setSelectedUser] = useState('');

    const availableUsers = users.filter(u => u.name !== project.createdBy && !collaborators.includes(u.name));
    
    useEffect(() => {
        setStatus(project.status || 'draft');
        setPrice(project.price || 0);
        setPublicDescription(project.publicDescription || '');
        setCollaborators(project.collaborators || []);
    }, [project]);

    const handleAddCollaborator = () => {
        if (selectedUser && !collaborators.includes(selectedUser)) {
            setCollaborators([...collaborators, selectedUser]);
            setSelectedUser('');
        }
    };
    
    const handleRemoveCollaborator = (name: string) => {
        setCollaborators(collaborators.filter(c => c !== name));
    };

    const handleSaveChanges = () => {
        const updates: Partial<Project> = {
            status,
            price: Number(price),
            publicDescription,
            collaborators,
        };
        onUpdateProject(project.id, updates);
        window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Alterações salvas com sucesso!' }}));
    };

    return (
        <aside className="w-full lg:w-1/3 lg:max-w-sm flex-shrink-0 bg-dark border border-gray-800 rounded-lg flex flex-col p-4 max-h-[calc(100vh-150px)]">
            <div className="flex-grow overflow-y-auto space-y-6 pr-2">
                {/* Collaborators Section */}
                <div>
                    <h3 className="font-display tracking-wider text-white text-lg mb-3">Colaboradores</h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            <Avatar src={project.avatarUrl} name={project.createdBy} size="sm" />
                            <span className="font-semibold">{project.createdBy}</span>
                            <span className="text-xs bg-brand-red/50 text-white px-2 py-0.5 rounded-full">Dono</span>
                        </div>
                         {collaborators.map(name => {
                             const user = users.find(u => u.name === name);
                             return (
                                <div key={name} className="flex items-center justify-between gap-2 text-sm group">
                                    <div className="flex items-center gap-2">
                                        <Avatar src={user?.avatarUrl || ''} name={name} size="sm" />
                                        <span>{name}</span>
                                    </div>
                                    <button onClick={() => handleRemoveCollaborator(name)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"><Icon name="X" className="w-4 h-4" /></button>
                                </div>
                             )
                         })}
                    </div>
                    <div className="flex gap-2 mt-3">
                        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="flex-grow bg-gray-900 border border-gray-700 rounded-md text-sm p-1.5 focus:ring-1 focus:ring-brand-red">
                            <option value="">Adicionar...</option>
                            {availableUsers.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                        </select>
                        <button onClick={handleAddCollaborator} disabled={!selectedUser} className="bg-gray-700 hover:bg-gray-600 px-3 rounded-md text-sm disabled:opacity-50">Add</button>
                    </div>
                </div>

                {/* Publishing Section */}
                <div className="border-t border-gray-800 pt-4">
                     <h3 className="font-display tracking-wider text-white text-lg mb-3">Publicação & Venda</h3>
                     <div className="space-y-4">
                         <div>
                            <label className="text-sm font-medium text-gray-300 flex items-center justify-between mb-2">
                                <span>Status</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${status === 'published' ? 'bg-green-500/30 text-green-300' : 'bg-gray-700 text-gray-300'}`}>{status === 'published' ? 'Publicado' : 'Rascunho'}</span>
                            </label>
                            <button onClick={() => setStatus(s => s === 'draft' ? 'published' : 'draft')} role="switch" aria-checked={status === 'published'} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${status === 'published' ? 'bg-brand-red' : 'bg-gray-600'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${status === 'published' ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                         </div>
                         <div>
                             <label htmlFor="price" className="text-sm font-medium text-gray-300 block mb-2">Preço (R$)</label>
                             <input id="price" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min="0" className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white" />
                         </div>
                         <div>
                              <label htmlFor="desc" className="text-sm font-medium text-gray-300 block mb-2">Descrição Pública</label>
                              <textarea id="desc" rows={4} value={publicDescription} onChange={e => setPublicDescription(e.target.value)} placeholder="Descreva seu ebook para a página de vendas..." className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white text-sm"></textarea>
                         </div>
                     </div>
                </div>
            </div>
            <div className="flex-shrink-0 p-2 border-t border-gray-800">
                <button onClick={handleSaveChanges} className="w-full bg-brand-red hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-md transition-colors">
                    Salvar Alterações
                </button>
            </div>
        </aside>
    )
}

const EbookCard: React.FC<{
    title: string;
    icon?: IconName;
    imageUrl?: string;
    onEditImage?: () => void;
    children: React.ReactNode;
    className?: string;
}> = ({ title, icon, imageUrl, onEditImage, children, className = '' }) => {
    return (
        <section className={`ebook-card bg-dark/50 border border-gray-800 rounded-lg p-8 md:p-12 shadow-lg ${className}`}>
            <div className="flex items-center gap-4 mb-6">
                {icon && <div className="w-12 h-12 flex-shrink-0 bg-brand-red/10 rounded-lg flex items-center justify-center border border-brand-red/20"><Icon name={icon} className="w-7 h-7 text-brand-red" /></div>}
                <h2 className="text-2xl md:text-3xl font-display tracking-wider text-white">{title}</h2>
            </div>
            <div className={imageUrl ? "md:grid md:grid-cols-2 gap-8 items-start" : ""}>
                {imageUrl && (
                    <div className="relative group mb-6 md:mb-0 rounded-lg overflow-hidden">
                        <img src={imageUrl} alt={`Imagem para ${title}`} className="w-full h-auto object-cover" />
                        {onEditImage && (
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button onClick={onEditImage} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white font-bold py-2 px-4 rounded-md hover:bg-white/30">
                                    <Icon name="Pencil" className="w-4 h-4" /> Editar Imagem
                                </button>
                            </div>
                        )}
                    </div>
                )}
                <div className="prose-invert prose-p:text-gray-300 prose-p:leading-relaxed whitespace-pre-wrap">
                    {children}
                </div>
            </div>
        </section>
    );
};


const ProjectViewerPage: React.FC<ProjectViewerPageProps> = ({ project, onBack, onUpdateProject }) => {
    const [isEditCoverModalOpen, setIsEditCoverModalOpen] = useState(false);
    const [isEditChapterImageModalOpen, setIsEditChapterImageModalOpen] = useState<number | null>(null);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [isShortFormVideoModalOpen, setIsShortFormVideoModalOpen] = useState(false);
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
                            <div className="flex items-center gap-1 sm:gap-2">
                                <button onClick={() => setIsShortFormVideoModalOpen(true)} className="p-2 rounded-full hover:bg-gray-800 transition-colors" title="Criar Vídeo Rápido (TikTok/Reels)"><Icon name="Film" className="w-5 h-5"/></button>
                                <button onClick={() => setIsQuizModalOpen(true)} className="p-2 rounded-full hover:bg-gray-800 transition-colors" title="Quiz Interativo"><Icon name="Sparkles" className="w-5 h-5"/></button>
                                <button onClick={handleDownload} disabled={isDownloadingPdf} className="p-2 rounded-full hover:bg-gray-800 transition-colors" title="Baixar PDF"><Icon name="Download" className="w-5 h-5"/></button>
                            </div>
                        </div>
                    </div>
                </header>
                
                <div className="container mx-auto flex flex-col lg:flex-row gap-6 p-4 sm:p-6">
                    <main ref={pdfContentRef} className="flex-grow space-y-8">
                        {/* Cover Card */}
                        <section className="ebook-card ebook-cover-card bg-dark/50 border border-gray-800 rounded-lg p-8 md:p-12">
                             <div className="relative text-center">
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
                        </section>

                        {/* Introduction Card */}
                        <EbookCard title="Introdução" icon="BookOpen">
                            <p>{project.introduction}</p>
                        </EbookCard>

                        {/* Chapters */}
                        {project.chapters.map((chapter, index) => (
                            <EbookCard
                                key={index}
                                title={chapter.title}
                                icon={chapter.icon}
                                imageUrl={chapter.imageUrl}
                                onEditImage={() => setIsEditChapterImageModalOpen(index)}
                            >
                                <p>{chapter.content}</p>
                            </EbookCard>
                        ))}
                        
                        {/* Conclusion Card */}
                        <EbookCard title="Conclusão" icon="Sparkles">
                             <p>{project.conclusion}</p>
                        </EbookCard>
                    </main>

                    <SettingsSidebar project={project} onUpdateProject={onUpdateProject} />
                </div>

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
            <ShortFormVideoGeneratorModal
                isOpen={isShortFormVideoModalOpen}
                onClose={() => setIsShortFormVideoModalOpen(false)}
                project={project}
            />
        </>
    );
};

export default ProjectViewerPage;