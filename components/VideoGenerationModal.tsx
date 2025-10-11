import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { Project, VideoScript } from '../types';
import Icon from './Icons';
import StitchedVideoPlayer from './StitchedVideoPlayer';
import { generateEbookVideo, generateVideoScriptAndPrompts } from '../services/geminiService';

interface VideoGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
}

const loadingMessages = [
    "Analisando o conteúdo do ebook...",
    "Construindo o roteiro visual...",
    "Renderizando os primeiros quadros...",
    "Sincronizando áudio e movimento...",
    "Aplicando efeitos cinematográficos...",
    "Polindo os detalhes finais...",
    "Quase pronto, ajustando a iluminação...",
    "Compilando a obra-prima...",
];

type VideoStyle = 'cinematic' | 'viral' | 'documentary';
type AspectRatio = '16:9' | '9:16' | '1:1';
type VoiceStyle = 'male' | 'female';


const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({ isOpen, onClose, project }) => {
    const [status, setStatus] = useState<'configuring' | 'starting' | 'generating' | 'done' | 'error'>('configuring');
    const [statusMessage, setStatusMessage] = useState('Pronto para começar...');
    const [generatedSceneUrls, setGeneratedSceneUrls] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
    
    // Configuration State
    const [videoStyle, setVideoStyle] = useState<VideoStyle>('viral');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    const [duration, setDuration] = useState(1);
    const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>('male');
    const [videoScript, setVideoScript] = useState<VideoScript | null>(null);

    const pollingIntervalRef = useRef<number | null>(null);
    const messageIntervalRef = useRef<number | null>(null);
    const isCancelledRef = useRef(false);

    const cleanupIntervals = () => {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
    };
    
    const handleClose = () => {
        isCancelledRef.current = true;
        cleanupIntervals();
        onClose();
    };

    const resetState = () => {
        cleanupIntervals();
        setStatus('configuring');
        setGeneratedSceneUrls([]);
        setError(null);
        setStatusMessage('Pronto para começar...');
        setVideoScript(null);
        setVideoStyle('viral');
        setAspectRatio('9:16');
        setDuration(1);
        setVoiceStyle('male');
        setGenerationProgress({ current: 0, total: 0 });
        isCancelledRef.current = false;
    };

    useEffect(() => {
        if (!isOpen) {
            resetState();
        }
    }, [isOpen]);

    const pollOperation = (operation: any): Promise<string> => {
       return new Promise((resolve, reject) => {
            pollingIntervalRef.current = window.setInterval(async () => {
                if (isCancelledRef.current) {
                    cleanupIntervals();
                    return reject(new Error("Geração cancelada pelo usuário."));
                }
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const updatedOp = await ai.operations.getVideosOperation({ operation });

                    if (updatedOp.done) {
                        cleanupIntervals();
                        const downloadLink = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                        if (downloadLink) {
                            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                            const videoBlob = await response.blob();
                            const objectUrl = URL.createObjectURL(videoBlob);
                            resolve(objectUrl);
                        } else {
                            reject(new Error("Operação concluída, mas nenhum link de vídeo foi encontrado."));
                        }
                    }
                } catch (err) {
                    cleanupIntervals();
                    reject(err);
                }
            }, 10000);
        });
    };

    const startGeneration = async () => {
        setStatus('starting');
        setStatusMessage('Gerando roteiro e narração...');
        setError(null);

        try {
            // Step 1: Generate Script
            const script = await generateVideoScriptAndPrompts(project, videoStyle, duration, voiceStyle);
            setVideoScript(script);

            if (!script.scenes || script.scenes.length === 0) {
                throw new Error("A IA não conseguiu gerar um roteiro com cenas para o vídeo.");
            }
            
            setStatus('generating');
            setGenerationProgress({ current: 0, total: script.scenes.length });
            
            // Step 2: Generate all scenes sequentially
            const urls: string[] = [];
            for (let i = 0; i < script.scenes.length; i++) {
                if (isCancelledRef.current) throw new Error("Geração cancelada.");
                
                const scene = script.scenes[i];
                setGenerationProgress({ current: i + 1, total: script.scenes.length });
                setStatusMessage(`Gerando cena ${i + 1} de ${script.scenes.length}...`);
                
                const operation = await generateEbookVideo(scene.prompt, aspectRatio, videoStyle);
                const sceneUrl = await pollOperation(operation);
                urls.push(sceneUrl);
                setGeneratedSceneUrls([...urls]);
            }
            
            setStatus('done');
            setStatusMessage('Seu vídeo completo está pronto!');

        } catch (err) {
            if (isCancelledRef.current) return;
            const msg = err instanceof Error ? err.message : "Falha ao iniciar a geração do vídeo.";
            setError(msg);
            setStatus('error');
            cleanupIntervals();
        }
    };


    const renderContent = () => {
        if (status === 'configuring') {
            return (
                 <div className="w-full p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="videoStyle" className="text-sm font-medium text-gray-300 block mb-2">Estilo do Vídeo</label>
                            <select id="videoStyle" value={videoStyle} onChange={(e) => setVideoStyle(e.target.value as VideoStyle)} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white">
                                <option value="viral">Viral Dinâmico (Edição Rápida)</option>
                                <option value="cinematic">Cinematográfico</option>
                                <option value="documentary">Documentário</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="aspectRatio" className="text-sm font-medium text-gray-300 block mb-2">Formato (Proporção)</label>
                            <select id="aspectRatio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white">
                                <option value="9:16">Reels/TikTok (9:16)</option>
                                <option value="16:9">YouTube (16:9)</option>
                                <option value="1:1">Instagram (1:1)</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="duration" className="text-sm font-medium text-gray-300 block mb-2">Duração (minutos)</label>
                            <input type="number" id="duration" value={duration} onChange={e => setDuration(Math.max(1, parseInt(e.target.value, 10)))} min="1" className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white" />
                        </div>
                         <div>
                            <label htmlFor="voiceStyle" className="text-sm font-medium text-gray-300 block mb-2">Voz da Narração</label>
                            <select id="voiceStyle" value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value as VoiceStyle)} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white">
                                <option value="male">Voz Masculina (Padrão)</option>
                                <option value="female">Voz Feminina (Padrão)</option>
                            </select>
                        </div>
                    </div>
                     <button onClick={startGeneration} className="w-full mt-8 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors">
                        Gerar Vídeo Completo
                    </button>
                </div>
            )
        }
        
        if (status === 'done' && generatedSceneUrls.length > 0 && videoScript) {
            return (
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <div className="w-full">
                        <StitchedVideoPlayer 
                            sceneUrls={generatedSceneUrls}
                            script={videoScript}
                            voiceStyle={voiceStyle}
                        />
                    </div>
                    <div className="w-full">
                         <p className="text-sm font-semibold text-gray-300 mb-2">Roteiro Completo / Legendas</p>
                         <textarea
                            readOnly
                            value={videoScript.fullNarrationScript}
                            className="w-full h-48 lg:h-[calc(100%-30px)] bg-gray-900 border border-gray-700 rounded-md p-3 text-sm text-gray-300 resize-none"
                         />
                    </div>
                </div>
            );
        }

        if (status === 'error') {
            return (
                <div className="text-center p-8 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <Icon name="X" className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">Erro na Geração</h4>
                    <p className="text-red-300 text-sm">{error}</p>
                     <button onClick={resetState} className="mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Tentar Novamente
                    </button>
                </div>
            );
        }

        return (
            <div className="text-center p-8 w-full max-w-lg">
                <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-brand-red rounded-full animate-spin border-t-transparent border-l-transparent"></div>
                    <div className="w-full h-full flex items-center justify-center">
                        <Icon name="Film" className="w-10 h-10 text-brand-red animate-pulse" />
                    </div>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">
                    {status === 'starting' ? 'Preparando Geração...' : 'Gerando seu vídeo...'}
                </h4>
                <p className="text-gray-400 text-sm transition-opacity duration-500">{statusMessage}</p>
                 {status === 'generating' && generationProgress.total > 0 && (
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                        <div className="bg-brand-red h-2.5 rounded-full" style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}></div>
                    </div>
                )}
                <p className="text-xs text-gray-500 mt-4">(Este processo pode levar vários minutos. Por favor, não feche esta janela.)</p>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-5xl mx-4 p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-4 border-b border-gray-800 flex-shrink-0 mb-4">
                    <div className="flex items-center gap-3">
                        <Icon name="Film" className="w-6 h-6 text-brand-red" />
                        <h3 className="text-xl font-display tracking-wider text-white">Vídeo do Ebook com IA</h3>
                    </div>
                    <button onClick={handleClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <Icon name="X" className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="min-h-[400px] flex items-center justify-center">
                    {renderContent()}
                </div>
                
                {(status === 'done' || status === 'error') && (
                    <div className="pt-4 border-t border-gray-800 mt-4">
                        <button onClick={handleClose} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-md transition-colors">
                            Fechar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoGenerationModal;