import React, { useState, useEffect, useCallback } from 'react';
import type { Project, VideoScript } from '../types';
import Icon from './Icons';
import { generateVideoScript, generateVideo, checkVideoOperationStatus } from '../services/geminiService';
import StitchedVideoPlayer from './StitchedVideoPlayer';
// Fix: Import the Operation type from @google/genai to correctly type the video generation operation object.
import type { Operation } from '@google/genai';

interface VideoGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
}

type GenerationStatus = 'idle' | 'scripting' | 'generating' | 'stitching' | 'completed' | 'error';

const statusMessages: Record<GenerationStatus, string> = {
    idle: 'Pronto para começar.',
    scripting: 'A IA está criando um roteiro para o vídeo...',
    generating: 'Gerando cenas de vídeo. Isso pode levar alguns minutos...',
    stitching: 'Combinando as cenas e a narração...',
    completed: 'Seu vídeo está pronto!',
    error: 'Ocorreu um erro.',
};

const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({ isOpen, onClose, project }) => {
    const [status, setStatus] = useState<GenerationStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [script, setScript] = useState<VideoScript | null>(null);
    const [videoUrls, setVideoUrls] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);

    const resetState = useCallback(() => {
        setStatus('idle');
        setError(null);
        setScript(null);
        setVideoUrls([]);
        setProgress(0);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setTimeout(resetState, 300);
        }
    }, [isOpen, resetState]);


    const handleGenerateVideo = async () => {
        if (!project) return;
        
        try {
            // 1. Generate Script
            setStatus('scripting');
            setProgress(10);
            const generatedScript = await generateVideoScript(project);
            setScript(generatedScript);

            // 2. Generate Video for each scene
            setStatus('generating');
            const generatedUrls: string[] = [];
            const totalScenes = generatedScript.scenes.length;
            
            for (let i = 0; i < totalScenes; i++) {
                const scene = generatedScript.scenes[i];
                // Fix: Type the operation variable as Operation to resolve property access errors.
                let operation: Operation = await generateVideo(scene.prompt);
                
                while (!operation.done) {
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    operation = await checkVideoOperationStatus(operation);
                }

                if (operation.response?.generatedVideos?.[0]?.video?.uri) {
                    generatedUrls.push(operation.response.generatedVideos[0].video.uri);
                    setVideoUrls([...generatedUrls]);
                    setProgress(10 + ((i + 1) / totalScenes) * 80);
                } else {
                    // This can happen in simulation mode, where the URI is directly in the mock.
                    // Or if the API genuinely fails on one scene.
                    const mockUri = (operation as any)?.response?.generatedVideos?.[0]?.video?.uri;
                    if(mockUri) {
                         generatedUrls.push(mockUri);
                         setVideoUrls([...generatedUrls]);
                         setProgress(10 + ((i + 1) / totalScenes) * 80);
                    } else {
                        throw new Error(`Falha ao gerar vídeo para a cena ${i + 1}.`);
                    }
                }
            }

            // 3. Finalize
            setStatus('completed');
            setProgress(100);

        } catch (err) {
            const msg = err instanceof Error ? err.message : "Falha ao criar o vídeo.";
            setError(msg);
            setStatus('error');
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div 
                className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-4xl mx-4 p-6 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-4 border-b border-gray-800 flex-shrink-0 mb-4">
                    <div className="flex items-center gap-3">
                        <Icon name="Film" className="w-6 h-6 text-brand-red" />
                        <h3 className="text-xl font-display tracking-wider text-white">Gerador de Vídeo com IA</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <Icon name="X" className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2">
                    {status === 'completed' && script && videoUrls.length > 0 ? (
                        <StitchedVideoPlayer script={script} videoUrls={videoUrls} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <h4 className="text-2xl font-display text-white mb-2">{project.name}</h4>
                            <p className="text-gray-400 mb-8 max-w-lg">Transforme seu ebook em um vídeo curto e dinâmico, com narração e cenas geradas por IA.</p>
                            
                            {status === 'idle' && (
                                <button onClick={handleGenerateVideo} className="flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-md transition-transform transform hover:scale-105">
                                    <Icon name="Sparkles" className="w-5 h-5" />
                                    Gerar Vídeo Agora
                                </button>
                            )}
                            
                             {(status !== 'idle' && status !== 'completed' && status !== 'error') && (
                                <div className="w-full max-w-md">
                                    <div className="flex items-center gap-3 text-lg text-yellow-300">
                                         <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        <p>{statusMessages[status]}</p>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                                        <div className="bg-brand-red h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    
                                    {status === 'generating' && script && (
                                        <div className="text-left mt-4 text-sm text-gray-400">
                                            <p className="font-bold mb-2">Progresso das Cenas:</p>
                                            <div className="grid grid-cols-2 gap-2">
                                            {script.scenes.map((scene, index) => (
                                                <div key={index} className={`flex items-center gap-2 p-2 rounded-md ${index < videoUrls.length ? 'bg-green-900/50' : 'bg-gray-800/50'}`}>
                                                    <Icon name={index < videoUrls.length ? "Check" : "Gear"} className={`w-4 h-4 ${index < videoUrls.length ? 'text-green-400' : 'text-gray-500'}`} />
                                                    <span className="truncate" title={scene.prompt}>Cena {index + 1}</span>
                                                </div>
                                            ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                             )}

                             {status === 'error' && (
                                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 max-w-md">
                                    <p className="font-bold mb-2">{statusMessages[status]}</p>
                                    <p className="text-sm">{error}</p>
                                     <button onClick={handleGenerateVideo} className="mt-4 text-sm font-semibold underline hover:text-white">Tentar Novamente</button>
                                </div>
                             )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoGenerationModal;
