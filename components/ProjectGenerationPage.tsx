import React, { useState, useEffect, useRef } from 'react';
import type { User, Project, Chapter, ProjectGenerationConfig } from '../types';
import Icon from './Icons';
import { generateEbookProjectStream, generateImagePromptForText, generateImage } from '../services/geminiService';
import { createProject } from '../services/supabaseService';
import { downloadProjectAsPdf } from '../utils/pdfGenerator';
import EditImageModal from './EditImageModal';
import VideoGenerationModal from './VideoGenerationModal';
import InteractiveEbookModal from './InteractiveEbookModal';


interface ProjectGenerationPageProps {
    config: ProjectGenerationConfig;
    user: User;
    onFinish: () => void;
}

type GenerationStatus = 'generating-text' | 'parsing-text' | 'generating-images' | 'completed' | 'error';
type EditableProject = Omit<Project, 'id' | 'createdBy' | 'avatarUrl' | 'createdAt'>;

// Helper function to parse the raw markdown into a structured Project object
const parseEbookContent = (markdown: string, topic: string): EditableProject => {
    const lines = markdown.split('\n');
    const title = lines.find(line => line.startsWith('# '))?.substring(2).trim() || topic;
    
    let introduction = '';
    const chapters: Chapter[] = [];
    let conclusion = '';
    
    const introMatch = markdown.match(/\[INTRODUÇÃO\]([\s\S]*?)(\[CAPÍTULO 1:|\n\n)/);
    introduction = introMatch ? introMatch[1].trim() : 'Introdução não encontrada.';
    
    const conclusionMatch = markdown.match(/\[CONCLUSÃO\]([\s\S]*)/);
    conclusion = conclusionMatch ? conclusionMatch[1].trim() : 'Conclusão não encontrada.';

    const chapterRegex = /\[CAPÍTULO (\d+): (.*?)\]([\s\S]*?)(?=\[CAPÍTULO|\[CONCLUSÃO\]|$)/g;
    let match;
    while((match = chapterRegex.exec(markdown)) !== null) {
        chapters.push({
            title: `Capítulo ${match[1]}: ${match[2].trim()}`,
            content: match[3].trim(),
        });
    }

    return {
        name: title,
        introduction,
        chapters,
        conclusion,
    };
};


const ProjectGenerationPage: React.FC<ProjectGenerationPageProps> = ({ config, user, onFinish }) => {
    const [rawContent, setRawContent] = useState('');
    const [projectData, setProjectData] = useState<EditableProject | null>(null);
    const [status, setStatus] = useState<GenerationStatus>('generating-text');
    const [statusMessage, setStatusMessage] = useState('Gerando conteúdo do ebook...');
    const [imageGenerationProgress, setImageGenerationProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [editingImage, setEditingImage] = useState<{ type: 'cover' | 'chapter'; index: number; } | null>(null);

    const [videoModalProject, setVideoModalProject] = useState<Project | null>(null);
    const [interactiveModalProject, setInteractiveModalProject] = useState<Project | null>(null);
    
    const contentEndRef = useRef<HTMLDivElement>(null);
    const printableAreaRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const generate = async () => {
            try {
                // Stage 1: Generate Text Content
                let fullText = '';
                const stream = generateEbookProjectStream(config.topic, config.chapters);
                for await (const chunk of stream) {
                    if (typeof chunk === 'string') {
                        fullText += chunk;
                        setRawContent(prev => prev + chunk);
                    }
                }
                
                // Stage 2: Parse Text
                setStatus('parsing-text');
                setStatusMessage('Analisando estrutura do conteúdo...');
                const parsedData = parseEbookContent(fullText, config.topic);
                setProjectData(parsedData);

                // Stage 3: Generate Images (optional)
                if (config.generateImages) {
                    setStatus('generating-images');
                    const totalImages = parsedData.chapters.length + 1; // chapters + cover
                    setImageGenerationProgress({ current: 0, total: totalImages });

                    // Generate Cover Image
                    setStatusMessage(`Gerando capa... (1/${totalImages})`);
                    const coverPrompt = await generateImagePromptForText(parsedData.name, parsedData.introduction);
                    const coverImageBase64 = await generateImage(coverPrompt);
                    const coverImageUrl = `data:image/png;base64,${coverImageBase64}`;
                    setProjectData(prev => prev ? { ...prev, coverImageUrl } : null);
                    setImageGenerationProgress({ current: 1, total: totalImages });

                    // Generate Chapter Images
                    const updatedChapters: Chapter[] = [...parsedData.chapters];
                    for (let i = 0; i < parsedData.chapters.length; i++) {
                        const chapter = parsedData.chapters[i];
                        setStatusMessage(`Gerando imagem para o Capítulo ${i + 1}... (${i + 2}/${totalImages})`);
                        const prompt = await generateImagePromptForText(chapter.title, chapter.content);
                        const imageBase64 = await generateImage(prompt);
                        updatedChapters[i].imageUrl = `data:image/png;base64,${imageBase64}`;
                        setProjectData(prev => prev ? { ...prev, chapters: [...updatedChapters] } : null);
                        setImageGenerationProgress({ current: i + 2, total: totalImages });
                    }
                }
                
                setStatus('completed');
                setStatusMessage('Geração concluída!');

            } catch (err) {
                let errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
                if (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('quota')) {
                    errorMessage = "A cota de uso da API foi excedida. Tente novamente mais tarde ou crie um projeto com menos capítulos/imagens.";
                }
                setError(errorMessage);
                setStatus('error');
                setStatusMessage('Erro na geração');
            }
        };

        generate();
    }, [config]);

    useEffect(() => {
        contentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [rawContent]);

    const handleSaveProject = async () => {
        if (!projectData) return;
        setIsSaving(true);
        setError(null);
        try {
            const projectToSave: Omit<Project, 'id' | 'createdAt'> = {
                name: projectData.name || 'Projeto Sem Título',
                introduction: projectData.introduction || '',
                chapters: projectData.chapters || [],
                conclusion: projectData.conclusion || '',
                coverImageUrl: projectData.coverImageUrl || '',
                createdBy: user.name,
                avatarUrl: user.avatarUrl,
            };
            await createProject(projectToSave);
            onFinish();
        } catch(e) {
            setError("Falha ao salvar o projeto no banco de dados. Tente novamente.");
            console.error("Supabase save error:", e);
            setIsSaving(false);
        }
    };

    const handleDownload = async () => {
        if (!printableAreaRef.current || !projectData) return;
        setIsDownloading(true);
        await downloadProjectAsPdf(printableAreaRef.current, projectData.name);
        setIsDownloading(false);
    }
    
    const handleRegenerateImage = async (newPrompt: string): Promise<string> => {
        const imageBase64 = await generateImage(newPrompt);
        return `data:image/png;base64,${imageBase64}`;
    };

    const handleSaveImage = (newImageUrl: string) => {
        if (!editingImage || !projectData) return;

        if (editingImage.type === 'cover') {
            setProjectData({ ...projectData, coverImageUrl: newImageUrl });
        } else {
            const updatedChapters = [...projectData.chapters];
            updatedChapters[editingImage.index].imageUrl = newImageUrl;
            setProjectData({ ...projectData, chapters: updatedChapters });
        }
        setEditingImage(null);
    };
    
     const getPromptForImage = async (): Promise<string> => {
        if (!editingImage || !projectData) return '';
        if (editingImage.type === 'cover') {
            return await generateImagePromptForText(projectData.name, projectData.introduction);
        } else {
            const chapter = projectData.chapters[editingImage.index];
            return await generateImagePromptForText(chapter.title, chapter.content);
        }
    };


    const renderContent = () => {
        if (status === 'generating-text') {
            return (
                <>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{rawContent}</div>
                    <span className="w-1 h-6 bg-gray-300 inline-block animate-blinking-cursor"></span>
                </>
            );
        }

        if (projectData) {
             return (
                 <div ref={printableAreaRef} className="bg-darker text-white p-4">
                     {projectData.coverImageUrl && (
                         <div className="w-full aspect-[3/4] max-h-[800px] bg-black mx-auto mb-8">
                            <img src={projectData.coverImageUrl} alt={`Capa de ${projectData.name}`} className="w-full h-full object-contain" />
                         </div>
                     )}
                     <div className="max-w-4xl mx-auto">
                        <h1 className="text-4xl md:text-5xl font-display text-white mb-8 border-b-2 border-brand-red pb-4">{projectData.name}</h1>
                        <h3 className="text-2xl font-display text-brand-red mt-8 mb-4">Introdução</h3>
                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{projectData.introduction}</p>
                        {projectData.chapters.map((chapter, index) => (
                            <div key={index}>
                                <h3 className="text-2xl font-display text-brand-red mt-8 mb-4">{chapter.title}</h3>
                                {chapter.imageUrl ? (
                                    <div className="my-6 animate-fade-in">
                                        <img src={chapter.imageUrl} alt={`Imagem para ${chapter.title}`} className="w-full rounded-lg object-cover" />
                                    </div>
                                ) : (
                                    status === 'generating-images' && imageGenerationProgress.current >= index + 2 &&
                                    <div className="my-6 w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                                        <svg className="animate-spin h-8 w-8 text-brand-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    </div>
                                )}
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{chapter.content}</p>
                            </div>
                        ))}
                        <h3 className="text-2xl font-display text-brand-red mt-8 mb-4">Conclusão</h3>
                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{projectData.conclusion}</p>
                     </div>
                 </div>
            )
        }
        return null;
    }

    const openVideoModal = () => {
        if (!projectData) return;
        const tempProject: Project = { ...projectData, id: 'temp', createdBy: user.name, avatarUrl: user.avatarUrl, createdAt: Date.now() };
        setVideoModalProject(tempProject);
    };

    const openInteractiveModal = () => {
        if (!projectData) return;
        const tempProject: Project = { ...projectData, id: 'temp', createdBy: user.name, avatarUrl: user.avatarUrl, createdAt: Date.now() };
        setInteractiveModalProject(tempProject);
    };

    return (
        <>
        <div className="min-h-screen bg-darker text-white font-sans flex flex-col animate-fade-in">
            <header className="bg-dark border-b border-gray-900 sticky top-0 z-20 flex-shrink-0">
                <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Icon name="Brain" className="w-8 h-8 text-brand-red" />
                        <div>
                             <h1 className="text-xl font-display tracking-wider text-white">Gerador de Projeto IA</h1>
                             <p className="text-xs text-gray-400">Tópico: "{config.topic}"</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {status !== 'completed' && status !== 'error' && (
                             <div className={`flex items-center gap-2 text-sm text-yellow-400`}>
                                 <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                {`${statusMessage} ${status === 'generating-images' ? `(${imageGenerationProgress.current}/${imageGenerationProgress.total})` : ''}`}
                            </div>
                        )}
                        <button onClick={onFinish} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded-md transition-colors" title="Cancelar e Voltar">
                            <Icon name="X" className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-grow container mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-8 overflow-hidden">
                <aside className="md:w-1/3 lg:w-1/4 flex-shrink-0 bg-dark/50 border border-gray-800 rounded-lg p-6 h-full flex flex-col">
                     <h2 className="font-display text-xl text-white border-b border-gray-700 pb-3 mb-4">Estrutura do Ebook</h2>
                     <div className="flex-grow overflow-y-auto space-y-3 mb-6 pr-2">
                        {projectData?.coverImageUrl && (
                            <div className="relative group">
                                <h3 className="font-bold text-white animate-fade-in-up">Capa do Ebook</h3>
                                <div className="mt-2 aspect-[3/4] w-full bg-gray-900 rounded-md flex items-center justify-center">
                                    <img src={projectData.coverImageUrl} alt="Capa gerada" className="w-full h-full object-cover rounded-md" />
                                </div>
                                 <button onClick={() => setEditingImage({ type: 'cover', index: -1 })} className="absolute top-8 right-0 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Icon name="Pencil" className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {projectData?.chapters.map((chapter, index) => (
                             <div key={index} className="text-gray-300 animate-fade-in-up relative group" style={{animationDelay: `${index * 50}ms`}}>
                                <h3 className="font-semibold text-gray-100 mt-4">{chapter.title}</h3>
                                {chapter.imageUrl && (
                                     <div className="mt-2 aspect-video w-full bg-gray-900 rounded-md flex items-center justify-center">
                                        <img src={chapter.imageUrl} alt={`Imagem para ${chapter.title}`} className="w-full h-full object-cover rounded-md" />
                                     </div>
                                )}
                                 {chapter.imageUrl && (
                                    <button onClick={() => setEditingImage({ type: 'chapter', index })} className="absolute top-12 right-0 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Icon name="Pencil" className="w-4 h-4" />
                                    </button>
                                 )}
                             </div>
                        ))}
                     </div>
                </aside>

                <main className="md:w-2/3 lg:w-3/4 bg-dark/50 border border-gray-800 rounded-lg h-full flex flex-col">
                    <div className="flex-grow p-1 md:p-2 overflow-y-auto">
                        {renderContent()}
                        {status === 'error' && <div className="p-8 text-center text-red-400 bg-red-900/20 rounded-lg m-4 border border-red-500/30">{error}</div>}
                        <div ref={contentEndRef}></div>
                    </div>

                    {(status === 'completed' || status === 'error') && (
                        <div className="flex-shrink-0 p-4 border-t border-gray-800 bg-dark/80 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <button
                                onClick={openVideoModal}
                                disabled={status === 'error' || !projectData}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                                <Icon name="Film" className="w-5 h-5" />
                                Fazer Vídeo do Ebook
                            </button>
                            <button
                                onClick={openInteractiveModal}
                                disabled={status === 'error' || !projectData}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                                <Icon name="Sparkles" className="w-5 h-5" />
                                Fazer Ebook Interativo
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={isDownloading || status === 'error' || !projectData}
                                className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                                <Icon name="Download" className="w-5 h-5" />
                                {isDownloading ? 'Gerando PDF...' : 'Baixar PDF'}
                            </button>
                            <button
                                onClick={handleSaveProject}
                                disabled={isSaving || status === 'error' || !projectData}
                                className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                                <Icon name="Upload" className="w-5 h-5" />
                                {isSaving ? 'Salvando...' : 'Salvar Projeto'}
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
        
        {editingImage && projectData && (
            <EditImageModal
                isOpen={!!editingImage}
                onClose={() => setEditingImage(null)}
                imageUrl={editingImage.type === 'cover' ? projectData.coverImageUrl : projectData.chapters[editingImage.index].imageUrl}
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

export default ProjectGenerationPage;