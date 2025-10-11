import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { VideoScript } from '../types';
import Icon from './Icons';

interface StitchedVideoPlayerProps {
    sceneUrls: string[];
    script: VideoScript;
    voiceStyle: 'male' | 'female';
}

const StitchedVideoPlayer: React.FC<StitchedVideoPlayerProps> = ({ sceneUrls, script, voiceStyle }) => {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0); // Overall progress from 0 to 1
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
        };
        loadVoices();
        // Voices might load asynchronously
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    const playNarration = useCallback((text: string) => {
        window.speechSynthesis.cancel(); // Cancel any previous speech
        if (!text.trim() || voices.length === 0) return;

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find a suitable voice
        const ptBrVoices = voices.filter(v => v.lang.startsWith('pt-BR'));
        let selectedVoice = ptBrVoices[0] || voices.find(v => v.lang.startsWith('pt')) || null;
        
        if (voiceStyle === 'female') {
            // Fix: The 'gender' property is not standard. Check voice name for gender keywords instead.
            selectedVoice = ptBrVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('feminina')) || selectedVoice;
        } else {
            // Fix: The 'gender' property is not standard. Check voice name for gender keywords instead.
             selectedVoice = ptBrVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('masculina')) || selectedVoice;
        }
        
        utterance.voice = selectedVoice;
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);

    }, [voices, voiceStyle]);
    
    const handlePlayPause = useCallback(() => {
        setIsPlaying(prev => !prev);
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.play().catch(e => console.error("Video play failed:", e));
            // Resume speech if paused
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
        } else {
            video.pause();
            // Pause speech
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
            }
        }
    }, [isPlaying]);
    
    const handleVideoEnded = () => {
        if (currentSceneIndex < sceneUrls.length - 1) {
            setCurrentSceneIndex(prev => prev + 1);
        } else {
            setIsPlaying(false);
            setCurrentSceneIndex(0); // Loop back to the beginning
        }
    };
    
    // Switch video source and play narration when scene changes
    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.src = sceneUrls[currentSceneIndex];
            video.load();
            if (isPlaying) {
                video.play().catch(e => console.error("Video play on scene change failed:", e));
                playNarration(script.scenes[currentSceneIndex].narration);
            }
        }
    }, [currentSceneIndex, sceneUrls, script.scenes, isPlaying, playNarration]);

    // Update overall progress bar
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const updateProgressBar = () => {
             if (video.duration > 0) {
                const sceneProgress = video.currentTime / video.duration;
                const overall = (currentSceneIndex + sceneProgress) / sceneUrls.length;
                setProgress(overall);
            }
        };
        video.addEventListener('timeupdate', updateProgressBar);
        return () => video.removeEventListener('timeupdate', updateProgressBar);
    }, [currentSceneIndex, sceneUrls.length]);
    

    return (
        <div className="w-full">
             <p className="text-sm font-semibold text-gray-300 mb-2">Vídeo Completo Gerado</p>
            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative group">
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    onEnded={handleVideoEnded}
                    onPlay={() => {
                        if (!window.speechSynthesis.speaking) {
                             playNarration(script.scenes[currentSceneIndex].narration);
                        }
                    }}
                    playsInline
                />
                 <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={handlePlayPause} className="p-4 bg-black/50 rounded-full">
                        <Icon name={isPlaying ? "Pause" : "Play"} className="w-8 h-8 text-white" />
                    </button>
                </div>
            </div>
             <div className="mt-2 p-2 bg-gray-900/50 rounded-lg">
                 <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div className="bg-brand-red h-1.5 rounded-full" style={{ width: `${progress * 100}%` }}></div>
                </div>
                 <div className="flex justify-between items-center mt-2 px-1">
                    <p className="text-xs text-gray-400">Cena {currentSceneIndex + 1} de {sceneUrls.length}</p>
                    <button onClick={handlePlayPause} className="text-gray-300 hover:text-white">
                        <Icon name={isPlaying ? "Pause" : "Play"} className="w-5 h-5" />
                    </button>
                 </div>
             </div>
        </div>
    );
};

export default StitchedVideoPlayer;
