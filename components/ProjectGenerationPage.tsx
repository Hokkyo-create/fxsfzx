import React, { useState, useEffect, useRef } from 'react';
import type { User, Project, Chapter } from '../types';
import Icon from './Icons';
import { generateEbookProjectStream, generateImagePromptForText, generateImage } from '../services/geminiService';
import { createProject } from '../services/firebaseService';

interface ProjectGenerationConfig {
    topic: string;
    chapters: number;
}

interface ProjectGenerationPageProps {
    config: ProjectGenerationConfig;
    user: User;
    onFinish: () => void;
}

type GenerationStatus = 'generating-text' | 'parsing-text' | 'generating-images' | 'completed' | 'error';

// Helper function to parse the raw markdown into a structured Project object
const parseEbookContent = (markdown: string, topic: string): Omit<Project, 'id' | 'createdBy' | 'avatarUrl' | 'createdAt'> => {
    const lines = markdown.split('\n');
    const title = lines.find(line => line.startsWith('# '))?.substring(2).trim() || topic;
    
    let introduction = '';
    const chapters: Chapter[] = [];
    let conclusion = '';
    
    let currentSection: 'intro' | 'chapter' | 'conclusion' | null = null;
    let currentChapterContent: string[] = [];
    let currentChapterTitle = '';

    const introMatch = markdown.match(/\[INTRODUÇÃO\]([\s\S]*?)\[CAPÍTULO 1:/);
    introduction = introMatch ? introMatch[1].trim() : '';
    
    const conclusionMatch = markdown.match(/\[CONCLUSÃO\]([\s\S]*)/);
    conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';

    const chapterRegex = /\[CAPÍTULO (\d+): (.*?)\]([\s\S]*?)(?=\[CAPÍTULO|\[CONCLUSÃO\]|$)/g;
    let match;
    while((match = chapterRegex.exec(markdown)) !== null) {
        chapters.push({
            title: `Capítulo ${match[1]}: ${match[2]}`,
            content: match[3].trim(),
        });
    }

    return {
        name: title,
        introduction,
        chapters,
        conclusion,
        coverImageUrl: '',
    };
};


const ProjectGenerationPage: React.FC<ProjectGenerationPageProps> = ({ config, user, onFinish }) => {
    const [rawContent, setRawContent] = useState('');
    const [projectData, setProjectData] = useState<Omit<Project, 'id' | 'createdBy' | 'avatarUrl' | 'createdAt' | 'coverImageUrl'> & { coverImageUrl?: string } | null>(null);
    const [status, setStatus] = useState<GenerationStatus>('generating-text');
    const [statusMessage, setStatusMessage] = useState('Gerando conteúdo do ebook...');
    const [imageGenerationProgress, setImageGenerationProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const contentEndRef = useRef<HTMLDivElement>(null);
    
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

                // Stage 3: Generate Images
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
                const updatedChapters: Chapter[] = [];
                for (let i = 0; i < parsedData.chapters.length; i++) {
                    const chapter = parsedData.chapters[i];
                    setStatusMessage(`Gerando imagem para o Capítulo ${i + 1}... (${i + 2}/${totalImages})`);
                    const prompt = await generateImagePromptForText(chapter.title, chapter.content);
                    const imageBase64 = await generateImage(prompt);
                    const imageUrl = `data:image/png;base64,${imageBase64}`;
                    updatedChapters.push({ ...chapter, imageUrl });
                    setProjectData(prev => prev ? { ...prev, chapters: [...updatedChapters, ...parsedData.chapters.slice(i + 1)] } : null);
                    setImageGenerationProgress({ current: i + 2, total: totalImages });
                }
                
                setStatus('completed');
                setStatusMessage('Geração concluída!');

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
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
        try {
            await createProject({
                ...projectData,
                createdBy: user.name,
                avatarUrl: user.avatarUrl,
            });
            onFinish();
        } catch(e) {
            setError("Falha ao salvar o projeto.");
            console.error(e);
            setIsSaving(false);
        }
    };

    const StatusIndicator = () => {
        const color = status === 'completed' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-yellow-400';
        let message = statusMessage;
        if (status === 'generating-images') {
            message = `${statusMessage} ${imageGenerationProgress.current}/${imageGenerationProgress.total}`;
        }

        return (
             <div className={`flex items-center gap-2 text-sm ${color}`}>
                 <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {message}
            </div>
        )
    }

    return (
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
                        {status !== 'completed' && status !== 'error' && <StatusIndicator />}
                        <button onClick={onFinish} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded-md transition-colors" title="Cancelar e Voltar">
                            <Icon name="X" className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-grow container mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-8 overflow-hidden">
                {/* Outline Sidebar */}
                <aside className="md:w-1/3 lg:w-1/4 flex-shrink-0 bg-dark/50 border border-gray-800 rounded-lg p-6 h-full flex flex-col">
                     <h2 className="font-display text-xl text-white border-b border-gray-700 pb-3 mb-4">Estrutura do Ebook</h2>
                     <ul className="space-y-3 mb-6 flex-grow overflow-y-auto">
                        {projectData?.name && <li className="font-bold text-white animate-fade-in-up">{projectData.name}</li>}
                        {projectData?.chapters.map((chapter, index) => (
                             <li key={index} className="text-gray-300 animate-fade-in-up" style={{animationDelay: `${index * 50}ms`}}>{chapter.title}</li>
                        ))}
                     </ul>
                     <div className="mt-auto">
                        <h3 className="font-display text-lg text-white mb-2">Capa do Ebook</h3>
                        <div className="aspect-[3/4] w-full bg-gray-900 rounded-md flex items-center justify-center">
                           {status === 'generating-images' && imageGenerationProgress.current < 1 && <svg className="animate-spin h-8 w-8 text-brand-red" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                           {projectData?.coverImageUrl && <img src={projectData.coverImageUrl} alt="Capa gerada" className="w-full h-full object-cover rounded-md" />}
                        </div>
                     </div>
                </aside>

                {/* Content Viewer */}
                <main className="md:w-2/3 lg:w-3/4 bg-dark/50 border border-gray-800 rounded-lg h-full flex flex-col">
                    <div className="flex-grow p-8 md:p-12 overflow-y-auto">
                        {status === 'generating-text' && (
                            <>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{rawContent}</div>
                                <span className="w-1 h-6 bg-gray-300 inline-block animate-blinking-cursor"></span>
                            </>
                        )}
                        {status !== 'generating-text' && projectData && (
                            <div>
                                <h1 className="text-4xl md:text-5xl font-display text-white mb-8 border-b-2 border-brand-red pb-4">{projectData.name}</h1>
                                <h3 className="text-2xl font-display text-brand-red mt-8 mb-4">Introdução</h3>
                                <p className="text-gray-300 leading-relaxed">{projectData.introduction}</p>
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
                                        <p className="text-gray-300 leading-relaxed">{chapter.content}</p>
                                    </div>
                                ))}
                                <h3 className="text-2xl font-display text-brand-red mt-8 mb-4">Conclusão</h3>
                                <p className="text-gray-300 leading-relaxed">{projectData.conclusion}</p>
                            </div>
                        )}
                        
                        {status === 'error' && <p className="text-red-400 mt-4">Erro: {error}</p>}
                        <div ref={contentEndRef}></div>
                    </div>

                    {status === 'completed' && (
                        <div className="flex-shrink-0 p-4 border-t border-gray-800 bg-dark/80 backdrop-blur-sm">
                            <button
                                onClick={handleSaveProject}
                                disabled={isSaving}
                                className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar Projeto na Nuvem'}
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ProjectGenerationPage;