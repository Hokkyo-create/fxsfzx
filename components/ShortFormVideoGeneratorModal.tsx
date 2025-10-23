import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Project, ShortFormVideoScript } from '../types';
import Icon from './Icons';
// Fix: Correctly import all necessary functions from the Gemini service.
import { generateShortFormVideoScript, generateTtsAudio, generateImage } from '../services/geminiService';
import { decode, encode, pcmToWav } from '../utils/audioUtils';

interface ShortFormVideoGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
}

type GenerationStatus = 'idle' | 'scripting' | 'narrating' | 'generating_images' | 'ready' | 'playing' | 'error';
type CaptionStyle = 'zoomIn' | 'slideUp' | 'fadeIn' | 'pop';

interface VideoAsset {
    type: 'audio' | 'image';
    name: string;
    url: string;
}

const musicTracks = [
    { name: 'Upbeat Tech', url: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_752f65b4aa.mp3' },
    { name: 'Lo-fi Focus', url: 'https://cdn.pixabay.com/download/audio/2022/08/03/audio_eb788b603d.mp3' },
    { name: 'Cinematic Ambient', url: 'https://cdn.pixabay.com/download/audio/2022/11/21/audio_a28f8babda.mp3' },
];

const captionAnimations: Record<CaptionStyle, string> = {
    zoomIn: 'animate-zoom-in',
    slideUp: 'animate-slide-up',
    fadeIn: 'animate-fade-in-caption',
    pop: 'animate-pop'
};


const VideoAssetsDownloadModal: React.FC<{ assets: VideoAsset[], onClose: () => void }> = ({ assets, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={onClose}>
        <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-display tracking-wider text-white mb-4">Download dos Ativos do Vídeo</h3>
            <p className="text-sm text-gray-400 mb-4">Baixe os arquivos gerados para montar seu vídeo em um editor externo como CapCut, InShot ou Instagram Reels.</p>
            <div className="space-y-2">
                {assets.map((asset, index) => (
                    <a
                        key={index}
                        href={asset.url}
                        download={asset.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-md text-white transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <Icon name={asset.type === 'audio' ? 'VolumeUp' : 'Film'} className="w-5 h-5 text-brand-red" />
                            <span className="font-semibold text-sm">{asset.name}</span>
                        </span>
                        <Icon name="Download" className="w-5 h-5 text-gray-400" />
                    </a>
                ))}
            </div>
            <button onClick={onClose} className="w-full mt-6 bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">Fechar</button>
        </div>
    </div>
);


const ShortFormVideoGeneratorModal: React.FC<ShortFormVideoGeneratorModalProps> = ({ isOpen, onClose, project }) => {
    const [status, setStatus] = useState<GenerationStatus>('idle');
    const [progress, setProgress] = useState({ value: 0, text: '' });
    const [error, setError] = useState<string | null>(null);
    const [script, setScript] = useState<ShortFormVideoScript | null>(null);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

    // Playback and editing state
    const [selectedMusic, setSelectedMusic] = useState(musicTracks[0].url);
    const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('zoomIn');
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [narrationDuration, setNarrationDuration] = useState(0);

    const musicAudioRef = useRef<HTMLAudioElement>(null);
    const narrationAudioRef = useRef<HTMLAudioElement>(null);
    
    const resetState = useCallback(() => {
        setStatus('idle');
        setError(null);
        setScript(null);
        setProgress({ value: 0, text: '' });
        setIsPlaying(false);
        setCurrentSceneIndex(0);
        setNarrationDuration(0);
        // Stop all media
        [musicAudioRef, narrationAudioRef].forEach(ref => {
            if (ref.current) {
                ref.current.pause();
                ref.current.currentTime = 0;
            }
        });
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setTimeout(resetState, 300);
        }
    }, [isOpen, resetState]);


    const handleGenerate = async () => {
        try {
            setStatus('scripting');
            setProgress({ value: 10, text: 'Analisando seu Ebook e criando o roteiro...' });
            let generatedScript = await generateShortFormVideoScript(project);

            setStatus('narrating');
            setProgress({ value: 25, text: 'Gravando a narração com voz de IA...' });
            const fullNarrationText = [generatedScript.hook, ...generatedScript.scenes.map(s => s.narration), generatedScript.cta].join('. ');
            const ttsBase64 = await generateTtsAudio(fullNarrationText);
            
            // Convert raw PCM to WAV format for browser playback
            const pcmData = decode(ttsBase64);
            const wavData = pcmToWav(pcmData, 24000, 1, 16); // Gemini TTS is 24kHz, 1-ch, 16-bit
            const wavBase64 = encode(wavData);
            generatedScript.fullNarrationAudioUrl = `data:audio/wav;base64,${wavBase64}`;

            setStatus('generating_images');
            const totalImages = generatedScript.scenes.length;
            const imagePromises = generatedScript.scenes.map(async (scene, index) => {
                setProgress({ value: 40 + (index / totalImages) * 60, text: `Gerando imagem para a cena ${index + 1}/${totalImages}...` });
                // Fix: Specify the '9:16' aspect ratio for vertical short-form videos.
                const imageBase64 = await generateImage(scene.imagePrompt, '9:16');
                return { ...scene, imageUrl: `data:image/png;base64,${imageBase64}` };
            });
            
            const scenesWithImages = await Promise.all(imagePromises);
            generatedScript.scenes = scenesWithImages;

            setScript(generatedScript);
            setStatus('ready');
            setProgress({ value: 100, text: 'Pronto!' });

        } catch (err) {
            const msg = err instanceof Error ? err.message : "Falha ao criar o vídeo.";
            setError(msg);
            setStatus('error');
        }
    };
    
    const sceneTimestamps = useMemo(() => {
        if (!script || narrationDuration === 0) return [0];

        const allParts = [script.hook, ...script.scenes.map(s => s.narration), script.cta];
        const totalChars = allParts.reduce((sum, part) => sum + part.length, 0);
        if (totalChars === 0) return [0];

        const timestamps = [0];
        let cumulativeTime = 0;
        for (let i = 0; i < allParts.length - 1; i++) {
            const partDuration = (allParts[i].length / totalChars) * narrationDuration;
            cumulativeTime += partDuration;
            timestamps.push(cumulativeTime);
        }
        return timestamps;
    }, [script, narrationDuration]);


    useEffect(() => {
        const narrationEl = narrationAudioRef.current;
        if (!narrationEl || !script) return;

        const handleTimeUpdate = () => {
            const time = narrationEl.currentTime;
            // Find the last timestamp that is less than or equal to the current time
            let newSceneIndex = sceneTimestamps.length - 1;
            while (sceneTimestamps[newSceneIndex] > time && newSceneIndex > 0) {
                newSceneIndex--;
            }

            if (newSceneIndex !== currentSceneIndex) {
                 setCurrentSceneIndex(newSceneIndex);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            if (musicAudioRef.current) {
                // When narration ends, also pause the music.
                musicAudioRef.current.pause();
            }
        };

        narrationEl.addEventListener('timeupdate', handleTimeUpdate);
        narrationEl.addEventListener('ended', handleEnded);
        narrationEl.addEventListener('pause', () => setIsPlaying(false));
        narrationEl.addEventListener('play', () => setIsPlaying(true));

        return () => {
            narrationEl.removeEventListener('timeupdate', handleTimeUpdate);
            narrationEl.removeEventListener('ended', handleEnded);
            narrationEl.removeEventListener('pause', () => setIsPlaying(false));
            narrationEl.removeEventListener('play', () => setIsPlaying(true));
        };
    }, [script, currentSceneIndex, sceneTimestamps]);
    
    const handlePlayPause = () => {
        const narration = narrationAudioRef.current;
        const music = musicAudioRef.current;
        if (!narration || !music) return;
        
        if (narration.paused) {
            if (narration.ended) {
                narration.currentTime = 0;
                music.currentTime = 0;
            }
            // The play() method returns a Promise which can be rejected if autoplay is disabled.
            narration.play().catch(e => console.error("Narration playback failed", e));
            music.play().catch(e => console.error("Music playback failed", e));
        } else {
            narration.pause();
            music.pause();
        }
    };
    
    // The visual scene index lags behind the text index by one (hook is index 0 for text, but scene 1 image is used)
    const visualSceneIndex = Math.max(0, Math.min(currentSceneIndex, script?.scenes.length ?? 0) -1);
    const currentImageUrl = script?.scenes[visualSceneIndex]?.imageUrl || script?.scenes[0]?.imageUrl;
    const currentCaptionText = script ? [script.hook, ...script.scenes.map(s => s.narration), script.cta][currentSceneIndex] : '';

    const videoAssets: VideoAsset[] = script ? [
        { type: 'audio', name: 'narracao_completa.wav', url: script.fullNarrationAudioUrl! },
        ...script.scenes.map((scene, i) => ({ type: 'image', name: `cena_${i+1}.png`, url: scene.imageUrl! }))
    ] : [];

    if (!isOpen) return null;

    return (
        <>
            {isDownloadModalOpen && <VideoAssetsDownloadModal assets={videoAssets} onClose={() => setIsDownloadModalOpen(false)} />}
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
                <audio ref={musicAudioRef} src={selectedMusic} loop />
                {script?.fullNarrationAudioUrl && <audio ref={narrationAudioRef} src={script.fullNarrationAudioUrl} onLoadedMetadata={(e) => setNarrationDuration(e.currentTarget.duration)}/>}
                <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-6xl mx-4 p-6 flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-4">
                        <h3 className="text-xl font-display tracking-wider text-white">Gerador de Vídeo Rápido</h3>
                        <button onClick={onClose} className="p-1"><Icon name="X" className="w-5 h-5" /></button>
                    </div>

                    <div className="flex-grow flex flex-col md:flex-row gap-6 overflow-hidden">
                         <div className="w-full md:w-2/5 flex items-center justify-center">
                            <div className="aspect-[9/16] w-full max-w-[300px] bg-black rounded-2xl shadow-lg relative overflow-hidden border-4 border-gray-700">
                                {currentImageUrl && (
                                    <img src={currentImageUrl} key={currentImageUrl} className="w-full h-full object-cover animate-ken-burns" alt="Cena do vídeo" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                                <div className="absolute inset-0 flex items-center justify-center p-8">
                                    <p className={`text-white text-center font-bold text-3xl leading-tight ${captionAnimations[captionStyle]}`} key={currentCaptionText} style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.9)' }}>
                                        {currentCaptionText}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-3/5 flex flex-col items-center justify-center">
                            {status === 'idle' && (
                                <div className="text-center">
                                    <h4 className="text-2xl font-bold text-white">Transforme seu eBook em um Vídeo Viral</h4>
                                    <p className="text-gray-400 mt-2 mb-6">A IA irá criar um roteiro, narração, imagens de cena e legendas animadas.</p>
                                    <button onClick={handleGenerate} className="flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-md"><Icon name="Sparkles" className="w-5 h-5" />Gerar Vídeo</button>
                                </div>
                            )}

                             {(status === 'scripting' || status === 'narrating' || status === 'generating_images') && (
                                <div className="text-center w-full max-w-md">
                                    <h4 className="text-lg font-bold text-white mb-2">{progress.text}</h4>
                                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                                        <div className="bg-brand-red h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress.value}%` }}></div>
                                    </div>
                                </div>
                             )}

                             {status === 'error' && (
                                 <div className="text-center p-4 bg-red-900/30 rounded-lg max-w-md">
                                     <h4 className="text-lg font-bold text-red-400">Erro!</h4>
                                     <p className="text-red-300 mt-2 text-sm">{error}</p>
                                     <button onClick={handleGenerate} className="mt-4 text-sm font-semibold underline hover:text-white">Tentar Novamente</button>
                                 </div>
                             )}

                             {status === 'ready' && script && (
                                 <div className="w-full max-w-sm space-y-4">
                                    <h4 className="text-xl font-bold text-white text-center">Vídeo Pronto!</h4>
                                    <div className="flex justify-center gap-4 items-center">
                                        <button onClick={handlePlayPause} className="w-16 h-16 bg-brand-red rounded-full flex items-center justify-center text-white">
                                            <Icon name={isPlaying ? "Pause" : "Play"} className="w-8 h-8"/>
                                        </button>
                                        <button onClick={() => setIsDownloadModalOpen(true)} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-5 rounded-md">
                                            <Icon name="Download" className="w-5 h-5" />
                                            Download
                                        </button>
                                    </div>
                                    <div className="space-y-2 pt-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-300 block mb-1">Estilo da Legenda</label>
                                            <select value={captionStyle} onChange={e => setCaptionStyle(e.target.value as CaptionStyle)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white">
                                                <option value="zoomIn">Zoom In</option>
                                                <option value="slideUp">Slide Up</option>
                                                <option value="fadeIn">Fade In</option>
                                                <option value="pop">Pop</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-300 block mb-1">Música de Fundo</label>
                                            <select value={selectedMusic} onChange={e => setSelectedMusic(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white">
                                                {musicTracks.map(track => <option key={track.url} value={track.url}>{track.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ShortFormVideoGeneratorModal;