


import React, { useState, useRef, useCallback } from 'react';
import type { Project, Chapter, IconName } from '../types';
import { users } from '../data';
import Icon from './Icons';
import Avatar from './Avatar';
import { downloadEbookWebpageAsPdf } from '../utils/pdfGenerator';
import EditImageModal from './EditImageModal';
import InteractiveEbookModal from './InteractiveEbookModal';
import VideoGenerationModal from './VideoGenerationModal';
import ShortFormVideoGeneratorModal from './ShortFormVideoGeneratorModal';
// Fix: Correctly import all necessary functions from the Gemini service.
import { generateImagePromptForText, generateImage, generateWebpageFromProject, extendEbookProjectStream } from '../services/geminiService';
// Fix: Import the EbookCard component instead of redefining it locally.
import EbookCard from './EbookCard';

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
    
    // Sync with project prop changes
    React.useEffect(() => {
        setStatus(project.status || 'draft');
        setPrice(project.price || 0);
        setPublicDescription(project.publicDescription || '');
        setCollaborators(project.collaborators || []);
    }, [project]);

    const handleAddCollaborator = () => {
        if (selectedUser && !collaborators.includes(selectedUser)) {
            const newCollaborators = [...collaborators, selectedUser];
            setCollaborators(newCollaborators);
            onUpdateProject(project.id, { collaborators: newCollaborators }); // Update immediately
            setSelectedUser('');
        }
    };
    
    const handleRemoveCollaborator = (name: string) => {
        const newCollaborators = collaborators.filter(c => c !== name);
        setCollaborators(newCollaborators);
        onUpdateProject(project.id, { collaborators: newCollaborators }); // Update immediately
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

const ProjectViewerPage: React.FC<ProjectViewerPageProps> = ({ project, onBack, onUpdateProject }) => {
    const [isEditCoverModalOpen, setIsEditCoverModalOpen] = useState(false);
    const [isEditChapterImageModalOpen, setIsEditChapterImageModalOpen] = useState<number | null>(null);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [isShortFormVideoModalOpen, setIsShortFormVideoModalOpen] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isExtending, setIsExtending] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState<Record<string, boolean>>({});

    const handleDownload = async () => {
        setIsDownloadingPdf(true);
        window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Gerando layout da página web com IA...' }}));
        try {
            const htmlContent = await generateWebpageFromProject(project);
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Layout gerado! Criando PDF...' }}));
            await downloadEbookWebpageAsPdf(htmlContent, project.name);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Falha ao baixar PDF.";
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'error', message }}));
            console.error("PDF download failed", e);
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handleExtendProject = async () => {
        setIsExtending(true);
        window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'IA está escrevendo mais capítulos...' }}));
        try {
            let newChaptersText = '';
            const stream = extendEbookProjectStream(project);
            for await (const chunk of stream) {
                newChaptersText += chunk;
            }

            const newChapters: Chapter[] = [];
            const chapterRegex = /\[CAPÍTULO (\d+):\s*([^\]]+)\]\[ÍCONE:\s*([^\]]+)\]([\s\S]*?)(?=\[CAPÍTULO|\[CONCLUSÃO\]|$)/g;
            let match;
            while ((match = chapterRegex.exec(newChaptersText)) !== null) {
                newChapters.push({
                    title: `Capítulo ${match[1]}: ${match[2].trim()}`,
                    icon: match[3].trim() as IconName,
                    content: match[4].trim(),
                });
            }

            if (newChapters.length > 0) {
                const allChapters = [...project.chapters, ...newChapters];
                onUpdateProject(project.id, { chapters: allChapters });
                window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: `${newChapters.length} novos capítulos foram adicionados!` }}));
            } else {
                throw new Error("A IA não conseguiu gerar novos capítulos. Tente novamente.");
            }

        } catch (e) {
            const message = e instanceof Error ? e.message : "Falha ao estender o ebook.";
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'error', message }}));
        } finally {
            setIsExtending(false);
        }
    };
    
    const getCoverPrompt = useCallback(async () => {
        return await generateImagePromptForText(project.name, project.introduction);
    }, [project.name, project.introduction]);

    const getChapterPrompt = useCallback(async (chapter: Chapter) => {
        return await generateImagePromptForText(chapter.title, chapter.content);
    }, []);
    
    const handleRegenerateImage = async (newPrompt: string): Promise<string> => {
        // Fix: Call generateImage with no specified aspect ratio, letting it default.
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

    const handleGenerateCover = async () => {
        setIsGeneratingImage(prev => ({ ...prev, cover: true }));
        try {
            const prompt = await getCoverPrompt();
            // Fix: Specify the '3:4' aspect ratio for the ebook cover.
            const base64 = await generateImage(prompt, '3:4');
            const newImageUrl = `data:image/png;base64,${base64}`;
            onUpdateProject(project.id, { coverImageUrl: newImageUrl });
        } catch (error) {
             const message = error instanceof Error ? error.message : "Falha ao gerar imagem da capa.";
             window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'error', message }}));
        } finally {
            setIsGeneratingImage(prev => ({ ...prev, cover: false }));
        }
    };

    const handleGenerateChapterImage = async (chapterIndex: number) => {
        const key = `chapter-${chapterIndex}`;
        setIsGeneratingImage(prev => ({ ...prev, [key]: true }));
        try {
            const chapter = project.chapters[chapterIndex];
            const prompt = await getChapterPrompt(chapter);
            // Fix: Specify the '16:9' aspect ratio for chapter images.
            const base64 = await generateImage(prompt, '16:9');
            const newImageUrl = `data:image/png;base64,${base64}`;

            const updatedChapters = [...project.chapters];
            updatedChapters[chapterIndex] = { ...updatedChapters[chapterIndex], imageUrl: newImageUrl };
            onUpdateProject(project.id, { chapters: updatedChapters });
        } catch (error) {
             const message = error instanceof Error ? error.message : `Falha ao gerar imagem para o capítulo ${chapterIndex + 1}.`;
             window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'error', message }}));
        } finally {
            setIsGeneratingImage(prev => ({ ...prev, [key]: false }));
        }
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
                            </div>
                        </div>
                    </div>
                </header>
                
                <div className="container mx-auto flex flex-col lg:flex-row gap-6 p-4 sm:p-6">
                    <main className="flex-grow space-y-8">
                        {/* Cover Card */}
                        <section className="ebook-card ebook-cover-card bg-dark/50 border border-gray-800 rounded-lg p-8 md:p-12">
                             <div className="relative text-center">
                                {project.coverImageUrl ? (
                                     <div className="relative group max-w-lg mx-auto aspect-[3/4] rounded-lg overflow-hidden shadow-2xl shadow-black/50">
                                        <img src={project.coverImageUrl} alt={project.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={() => setIsEditCoverModalOpen(true)} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white font-bold py-2 px-4 rounded-md hover:bg-white/30">
                                                <Icon name="Pencil" className="w-4 h-4" /> Editar Capa
                                            </button>
                                        </div>
                                     </div>
                                ) : (
                                    <div className="max-w-lg mx-auto aspect-[3/4] rounded-lg bg-dark/30 border border-dashed border-gray-700 flex flex-col items-center justify-center p-8">
                                        <p className="text-gray-400 mb-4">Gere uma capa com IA para seu ebook.</p>
                                        <button 
                                            onClick={handleGenerateCover} 
                                            disabled={isGeneratingImage['cover']}
                                            className="flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            {isGeneratingImage['cover'] 
                                                ? <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Gerando...</span></>
                                                : <><Icon name="Sparkles" className="w-5 h-5" /><span>Gerar Capa</span></>
                                            }
                                        </button>
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
                            <React.Fragment key={index}>
                                <EbookCard title={chapter.title} icon={chapter.icon}>
                                    <p>{chapter.content}</p>
                                </EbookCard>
                                
                                {/* Image Divider Section */}
                                <div className="my-0 py-8 px-4 bg-dark/30 border-y-2 border-gray-900 flex flex-col items-center justify-center text-center">
                                    { chapter.imageUrl ? (
                                        <div className="relative group max-w-lg w-full">
                                            <img src={chapter.imageUrl} alt={`Imagem para ${chapter.title}`} className="w-full h-auto object-cover rounded-lg shadow-lg" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                                <button onClick={() => setIsEditChapterImageModalOpen(index)} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white font-bold py-2 px-4 rounded-md hover:bg-white/30">
                                                    <Icon name="Pencil" className="w-4 h-4" /> Editar Imagem
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-gray-400 mb-4">Gere uma imagem com IA para ilustrar o capítulo acima.</p>
                                            <button 
                                                onClick={() => handleGenerateChapterImage(index)} 
                                                disabled={isGeneratingImage[`chapter-${index}`]}
                                                className="flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
                                            >
                                                {isGeneratingImage[`chapter-${index}`] 
                                                    ? <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Gerando...</span></>
                                                    : <><Icon name="Sparkles" className="w-5 h-5" /><span>Gerar Imagem</span></>
                                                }
                                            </button>
                                        </>
                                    )}
                                </div>
                            </React.Fragment>
                        ))}
                        
                        {/* Conclusion Card */}
                        <EbookCard title="Conclusão" icon="Sparkles">
                             <p>{project.conclusion}</p>
                        </EbookCard>

                        <section className="mt-8 p-6 bg-dark/50 border border-gray-800 rounded-lg">
                            <h3 className="text-2xl font-display text-white mb-4">Próximos Passos</h3>
                            <p className="text-gray-400 mb-6 text-sm">Use o poder da IA para aprimorar e distribuir seu projeto.</p>
                            <div className="flex flex-col md:flex-row gap-4">
                                <button
                                    onClick={handleExtendProject}
                                    disabled={isExtending}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {isExtending ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            <span>Escrevendo...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="Pencil" className="w-5 h-5" />
                                            <span>Gerar mais 10 capítulos com IA</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleDownload}
                                    disabled={isDownloadingPdf}
                                    className="flex-1 flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {isDownloadingPdf ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            <span>Gerando PDF...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="Download" className="w-5 h-5" />
                                            <span>Baixar PDF Estilo Gamma</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </section>
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
                onRegenerate={(newPrompt) => handleRegenerateImage(newPrompt, '3:4')}
                onSave={handleSaveCover}
            />
            {isEditChapterImageModalOpen !== null && (
                 <EditImageModal
                    isOpen={isEditChapterImageModalOpen !== null}
                    onClose={() => setIsEditChapterImageModalOpen(null)}
                    imageUrl={project.chapters[isEditChapterImageModalOpen].imageUrl}
                    getInitialPrompt={() => getChapterPrompt(project.chapters[isEditChapterImageModalOpen!])}
                    onRegenerate={(newPrompt) => handleRegenerateImage(newPrompt, '16:9')}
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