import React, { useState, useEffect, useCallback } from 'react';
import YouTube from 'react-youtube';
import type { Project, VideoScript, Video } from '../types';
import Icon from './Icons';
import { generateVideoScript, searchYouTubeVideos } from '../services/geminiService';
import StitchedVideoPlayer from './StitchedVideoPlayer';

interface VideoGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
}

type GenerationStatus = 'idle' | 'scripting' | 'selecting' | 'completed' | 'error';

const statusMessages: Record<GenerationStatus, string> = {
    idle: 'Pronto para começar.',
    scripting: 'A IA está criando um roteiro para o vídeo...',
    selecting: 'Selecione os vídeos para cada cena.',
    completed: 'Seu vídeo está pronto!',
    error: 'Ocorreu um erro.',
};

const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({ isOpen, onClose, project }) => {
    const [status, setStatus] = useState<GenerationStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [script, setScript] = useState<VideoScript | null>(null);
    
    // New state for interactive selection
    const [sceneVideos, setSceneVideos] = useState<Record<number, Video>>({});
    const [activeSceneIndex, setActiveSceneIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Video[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

    const resetState = useCallback(() => {
        setStatus('idle');
        setError(null);
        setScript(null);
        setSceneVideos({});
        setActiveSceneIndex(null);
        setSearchQuery('');
        setSearchResults([]);
        setIsSearching(false);
        setPreviewVideoId(null);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setTimeout(resetState, 300);
        }
    }, [isOpen, resetState]);

    const handleStartScripting = async () => {
        if (!project) return;
        
        try {
            setStatus('scripting');
            const generatedScript = await generateVideoScript(project);
            setScript(generatedScript);
            setStatus('selecting');
            setActiveSceneIndex(0); // Start selection at the first scene
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Falha ao criar o roteiro.";
            setError(msg);
            setStatus('error');
        }
    };
    
    const handleSelectScene = (index: number) => {
        if (!script) return;
        setActiveSceneIndex(index);
        setSearchQuery(script.scenes[index].prompt);
        setSearchResults([]);
        setPreviewVideoId(null);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        setSearchResults([]);
        setPreviewVideoId(null);
        try {
            const results = await searchYouTubeVideos(searchQuery);
            setSearchResults(results.slice(0, 10)); // Limit to 10 results
        } catch (err) {
             const msg = err instanceof Error ? err.message : "Falha na busca.";
             setError(msg);
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleSelectVideoForScene = (video: Video) => {
        if (activeSceneIndex === null) return;
        
        setSceneVideos(prev => ({ ...prev, [activeSceneIndex]: video }));
        
        // Auto-advance to the next unassigned scene
        if (script) {
            let nextIndex = -1;
            for (let i = 0; i < script.scenes.length; i++) {
                if (!sceneVideos[i] && i > activeSceneIndex) {
                    nextIndex = i;
                    break;
                }
            }
            if (nextIndex !== -1) {
                handleSelectScene(nextIndex);
            } else {
                setActiveSceneIndex(null); // All scenes are filled
            }
        }
    };

    const allScenesSelected = script && Object.keys(sceneVideos).length === script.scenes.length;

    const renderSelectionWorkspace = () => (
        <div className="flex flex-col md:flex-row gap-4 h-full overflow-hidden">
            {/* Scene List */}
            <div className="w-full md:w-1/3 flex-shrink-0 bg-darker/50 p-3 rounded-lg flex flex-col">
                <h4 className="font-display text-lg text-white mb-2 flex-shrink-0">Cenas do Roteiro</h4>
                <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                    {script?.scenes.map((scene, index) => (
                        <div 
                            key={index}
                            onClick={() => handleSelectScene(index)}
                            className={`p-3 rounded-lg cursor-pointer border-2 transition-colors ${activeSceneIndex === index ? 'border-brand-red bg-brand-red/10' : 'border-transparent hover:bg-gray-800'}`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-white">Cena {index + 1}</span>
                                {sceneVideos[index] ? <Icon name="Check" className="w-5 h-5 text-green-400" /> : <Icon name="Film" className="w-5 h-5 text-gray-500" />}
                            </div>
                            <p className="text-xs text-gray-400 mt-1 italic line-clamp-2">"{scene.prompt}"</p>
                            {sceneVideos[index] && <img src={sceneVideos[index].thumbnailUrl} alt="Thumbnail" className="mt-2 rounded-md aspect-video object-cover"/>}
                        </div>
                    ))}
                </div>
                 {allScenesSelected && (
                    <button onClick={() => setStatus('completed')} className="mt-4 w-full flex-shrink-0 flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105">
                        <Icon name="Sparkles" className="w-5 h-5" />
                        Finalizar e Assistir
                    </button>
                )}
            </div>

            {/* Search & Preview Panel */}
            <div className="w-full md:w-2/3 bg-darker/50 p-3 rounded-lg flex flex-col overflow-hidden">
                {activeSceneIndex !== null ? (
                    <>
                    <form onSubmit={handleSearch} className="relative flex-shrink-0">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar vídeo..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-full py-2 pl-4 pr-12 text-white"
                        />
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-brand-red">
                            <Icon name="Search" className="w-5 h-5" />
                        </button>
                    </form>
                    <div className="flex-grow mt-2 overflow-y-auto pr-1">
                        {isSearching && <p className="text-center p-4">Buscando...</p>}
                        {previewVideoId ? (
                            <div className="sticky top-0 z-10 p-2 bg-darker/80 backdrop-blur-sm">
                                <YouTube videoId={previewVideoId} opts={{ width: '100%', height: '240', playerVars: { autoplay: 1 } }} />
                                <button onClick={() => setPreviewVideoId(null)} className="text-sm text-gray-400 mt-2 hover:text-white">Fechar Prévia</button>
                            </div>
                        ) : null}
                        {searchResults.map(video => (
                            <div key={video.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-800">
                                <img src={video.thumbnailUrl} alt={video.title} className="w-24 h-14 object-cover rounded flex-shrink-0"/>
                                <div className="min-w-0">
                                    <p className="text-sm text-white font-semibold line-clamp-2">{video.title}</p>
                                    <p className="text-xs text-gray-500">{video.duration}</p>
                                </div>
                                <div className="flex gap-1 ml-auto">
                                    <button onClick={() => setPreviewVideoId(video.id)} className="p-2 bg-gray-700 hover:bg-blue-600 rounded-md" title="Play"><Icon name="Play" className="w-4 h-4 text-white"/></button>
                                    <button onClick={() => handleSelectVideoForScene(video)} className="p-2 bg-gray-700 hover:bg-green-600 rounded-md" title="Selecionar"><Icon name="Check" className="w-4 h-4 text-white"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-center text-gray-500">
                        <p>{allScenesSelected ? 'Pronto para finalizar!' : 'Selecione uma cena para começar.'}</p>
                    </div>
                )}
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div 
                className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-6xl mx-4 p-6 flex flex-col h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-4 border-b border-gray-800 flex-shrink-0 mb-4">
                    <div className="flex items-center gap-3">
                        <Icon name="Film" className="w-6 h-6 text-brand-red" />
                        <h3 className="text-xl font-display tracking-wider text-white">Gerador de Vídeo Interativo</h3>
                    </div>
                    <div>
                        <span className="text-sm text-gray-400 mr-4">{statusMessages[status]}</span>
                        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                            <Icon name="X" className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div className="flex-grow overflow-hidden relative">
                    {status === 'completed' && script && allScenesSelected ? (
                        <StitchedVideoPlayer script={script} videos={script.scenes.map((s, i) => sceneVideos[i])} />
                    ) : status === 'selecting' && script ? (
                        renderSelectionWorkspace()
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <h4 className="text-2xl font-display text-white mb-2">{project.name}</h4>
                            <p className="text-gray-400 mb-8 max-w-lg">Transforme seu ebook em um vídeo curto, com narração e cenas selecionadas por você.</p>
                            
                            {status === 'idle' && (
                                <button onClick={handleStartScripting} className="flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-md transition-transform transform hover:scale-105">
                                    <Icon name="Sparkles" className="w-5 h-5" />
                                    Começar
                                </button>
                            )}
                            
                             {status === 'scripting' && (
                                <div className="flex items-center gap-3 text-lg text-yellow-300">
                                     <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <p>{statusMessages[status]}</p>
                                </div>
                             )}

                             {status === 'error' && (
                                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 max-w-md">
                                    <p className="font-bold mb-2">{statusMessages[status]}</p>
                                    <p className="text-sm">{error}</p>
                                     <button onClick={handleStartScripting} className="mt-4 text-sm font-semibold underline hover:text-white">Tentar Novamente</button>
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
