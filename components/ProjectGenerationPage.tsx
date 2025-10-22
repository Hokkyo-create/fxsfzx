import React, { useState, useEffect } from 'react';
import type { ProjectGenerationConfig, Project, Chapter, User, IconName } from '../types';
import { generateEbookProjectStream } from '../services/geminiService';
import Icon from './Icons';

interface ProjectGenerationPageProps {
    user: User;
    config: ProjectGenerationConfig;
    onGenerationComplete: (newProject: Omit<Project, 'id' | 'createdAt'>) => void;
    onCancel: () => void;
}

const ProjectGenerationPage: React.FC<ProjectGenerationPageProps> = ({ user, config, onGenerationComplete, onCancel }) => {
    const [status, setStatus] = useState('Gerando texto do ebook...');
    const [streamedText, setStreamedText] = useState('');
    const [projectTitle, setProjectTitle] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const generateProject = async () => {
            try {
                // Step 1: Generate Ebook Text Stream
                let fullText = '';
                const stream = generateEbookProjectStream(config.topic, config.chapters);
                for await (const chunk of stream) {
                    fullText += chunk;
                    setStreamedText(fullText);
                }

                // Step 2: Parse the generated text
                setStatus('Analisando o conteúdo gerado...');
                const titleMatch = fullText.match(/^#\s*(.*)/);
                const title = titleMatch ? titleMatch[1] : config.topic;
                setProjectTitle(title);

                const introMatch = fullText.match(/\[INTRODUÇÃO\]([\s\S]*?)(\[CAPÍTULO 1:|\n\n\[CAPÍTULO 1:)/);
                const introduction = introMatch ? introMatch[1].trim() : '';

                const conclusionMatch = fullText.match(/\[CONCLUSÃO\]([\s\S]*)/);
                const conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';

                const chapters: Chapter[] = [];
                const chapterRegex = /\[CAPÍTULO (\d+):\s*([^\]]+)\]\[ÍCONE:\s*([^\]]+)\]([\s\S]*?)(?=\[CAPÍTULO|\[CONCLUSÃO\]|$)/g;
                let match;
                while ((match = chapterRegex.exec(fullText)) !== null) {
                    chapters.push({
                        title: `Capítulo ${match[1]}: ${match[2].trim()}`,
                        icon: match[3].trim() as IconName,
                        content: match[4].trim(),
                    });
                }

                if (chapters.length === 0) {
                    throw new Error("A IA não conseguiu estruturar o conteúdo em capítulos. Tente novamente com um tópico mais claro.");
                }

                const newProjectData: Omit<Project, 'id' | 'createdAt'> = {
                    name: title,
                    introduction,
                    chapters,
                    conclusion,
                    createdBy: user.name,
                    avatarUrl: user.avatarUrl,
                };
                
                setStatus('Finalizando...');
                onGenerationComplete(newProjectData);

            } catch (err) {
                const message = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido durante a geração.';
                console.error("Project Generation Failed:", err);
                setError(message);
            }
        };

        generateProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config, user]);


    const renderContent = (text: string) => {
        return text.split('\n').map((line, i) => {
            if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mb-4">{line.substring(2)}</h1>;
            if (line.startsWith('[CAPÍTULO')) return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{line}</h2>;
            if (line.startsWith('[INTRODUÇÃO]') || line.startsWith('[CONCLUSÃO]')) return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{line}</h2>;
            return <p key={i} className="text-sm">{line}</p>;
        });
    };

    return (
        <div className="fixed inset-0 bg-darker text-white z-50 flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col p-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-800 flex-shrink-0 mb-4">
                     <div className="flex items-center gap-3">
                        <Icon name="Brain" className="w-6 h-6 text-brand-red animate-pulse" />
                        <h3 className="text-xl font-display tracking-wider text-white">
                            {error ? 'Erro na Geração' : `Gerando: ${projectTitle || config.topic}`}
                        </h3>
                    </div>
                    {!error && (
                        <div className="text-sm text-yellow-400 flex items-center gap-2">
                           <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                           <span>{status}</span>
                        </div>
                    )}
                </div>

                {error ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center">
                        <Icon name="Fire" className="w-16 h-16 text-red-500 mb-4" />
                        <p className="text-red-300 max-w-md">{error}</p>
                        <button onClick={onCancel} className="mt-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-md transition-colors">
                            Voltar
                        </button>
                    </div>
                ) : (
                    <div className="flex-grow overflow-y-auto pr-2 text-gray-300 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                        {renderContent(streamedText)}
                        <div className="w-2 h-4 bg-yellow-400 animate-blinking-cursor inline-block ml-1"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectGenerationPage;