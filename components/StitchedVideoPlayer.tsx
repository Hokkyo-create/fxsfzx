import React, { useState, useEffect, useRef } from 'react';
import type { VideoScript } from '../types';
import Icon from './Icons';

interface StitchedVideoPlayerProps {
    script: VideoScript;
    videoUrls: string[]; // Can be API URIs or direct placeholder URLs
}

const StitchedVideoPlayer: React.FC<StitchedVideoPlayerProps> = ({ script, videoUrls }) => {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [fetchedVideoBlobs, setFetchedVideoBlobs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Fetch video blobs since API URIs require an API key
    useEffect(() => {
        const fetchVideos = async () => {
            setIsLoading(true);
            // Safely get the API key
            const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
            
            try {
                const blobUrls = await Promise.all(
                    videoUrls.map(async (uri) => {
                        const isApiUrl = uri.includes('generativelanguage.googleapis.com');
                        if (isApiUrl && !apiKey) {
                           console.warn("API_KEY not found, cannot fetch generated video. This is expected in simulation mode.");
                           // In simulation, the URI is often a direct placeholder URL, so we can just use it.
                           // If it's a real API URL and we have no key, this fetch will fail, which is handled below.
                        }
                        const fetchUrl = isApiUrl && apiKey ? `${uri}&key=${apiKey}` : uri;
                        const response = await fetch(fetchUrl);
                        if (!response.ok) {
                            throw new Error(`Failed to fetch video from ${uri}`);
                        }
                        const blob = await response.blob();
                        return URL.createObjectURL(blob);
                    })
                );
                setFetchedVideoBlobs(blobUrls);
            } catch (error) {
                console.error("Error fetching video blobs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (videoUrls.length > 0) {
            fetchVideos();
        }

        // Cleanup blob URLs on unmount
        return () => {
            fetchedVideoBlobs.forEach(URL.revokeObjectURL);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoUrls]);

    // Setup Text-to-Speech
    useEffect(() => {
        if ('speechSynthesis' in window && script.fullNarrationScript) {
            const utterance = new SpeechSynthesisUtterance(script.fullNarrationScript);
            const voices = window.speechSynthesis.getVoices();
            utterance.voice = voices.find(voice => voice.lang === 'pt-BR') || voices.find(voice => voice.lang.startsWith('pt-')) || voices[0];
            utterance.pitch = 1;
            utterance.rate = 1;
            utterance.volume = 1;

            utterance.onstart = () => {
                videoRef.current?.play();
                setIsPlaying(true);
            };
            utterance.onend = () => {
                setIsPlaying(false);
                setCurrentSceneIndex(0); 
                if(videoRef.current) videoRef.current.currentTime = 0;
            };
            utterance.onpause = () => {
                videoRef.current?.pause();
                setIsPlaying(false);
            };
            utterance.onresume = () => {
                videoRef.current?.play();
                setIsPlaying(true);
            };
            
            utteranceRef.current = utterance;
            
            return () => {
                window.speechSynthesis.cancel();
            }
        }
    }, [script.fullNarrationScript]);


    const handlePlayPause = () => {
        if (!videoRef.current || !utteranceRef.current) return;
        
        if (isPlaying) {
             window.speechSynthesis.pause();
        } else {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            } else {
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utteranceRef.current);
            }
        }
    };

    const handleVideoEnded = () => {
        // Loop the current video if it ends before narration
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play();
        }
    };
    
    useEffect(() => {
        if (videoRef.current && fetchedVideoBlobs[currentSceneIndex]) {
            videoRef.current.src = fetchedVideoBlobs[currentSceneIndex];
            if (isPlaying) {
                videoRef.current.play().catch(e => console.error("Video play error:", e));
            }
        }
    }, [currentSceneIndex, fetchedVideoBlobs, isPlaying]);
    
    // This effect handles advancing scenes based on speech synthesis boundaries
    useEffect(() => {
        const utterance = utteranceRef.current;
        if (!utterance) return;
        
        let sceneStartTimes: {charIndex: number, sceneIndex: number}[] = [];
        let currentIndex = -1;
        
        script.scenes.reduce((acc, scene) => {
            currentIndex++;
            sceneStartTimes.push({charIndex: acc, sceneIndex: currentIndex});
            return acc + scene.narration.length;
        }, 0);
        
        const boundaryHandler = (event: SpeechSynthesisEvent) => {
            const spokenCharIndex = event.charIndex;
            
            // Find the current scene based on how many characters have been spoken
            let currentScene = 0;
            for(let i = sceneStartTimes.length - 1; i >= 0; i--) {
                if(spokenCharIndex >= sceneStartTimes[i].charIndex) {
                    currentScene = sceneStartTimes[i].sceneIndex;
                    break;
                }
            }
            
            if (currentScene !== currentSceneIndex) {
                setCurrentSceneIndex(currentScene);
            }
        }
        
        utterance.addEventListener('boundary', boundaryHandler);
        
        return () => {
            utterance.removeEventListener('boundary', boundaryHandler);
        }
        
    }, [script, currentSceneIndex]);


    if (isLoading) {
        return <div className="text-center text-gray-400 p-8">Carregando vídeos...</div>;
    }

    return (
        <div className="w-full">
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative group">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    onEnded={handleVideoEnded}
                    src={fetchedVideoBlobs[0]}
                    muted // Narration is handled by SpeechSynthesis
                    playsInline
                    loop
                />
                 <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={handlePlayPause} className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                        <Icon name={isPlaying ? "Pause" : "Play"} className="w-8 h-8" />
                    </button>
                </div>
            </div>
            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
                <h3 className="font-display text-lg text-brand-red mb-2">Roteiro e Narração</h3>
                <p className="text-sm text-gray-300 max-h-24 overflow-y-auto pr-2">{script.fullNarrationScript}</p>
            </div>
        </div>
    );
};

export default StitchedVideoPlayer;