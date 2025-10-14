import React, { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';
import type { VideoScript, Video } from '../types';
import Icon from './Icons';

interface StitchedVideoPlayerProps {
    script: VideoScript;
    videos: Video[];
}

const StitchedVideoPlayer: React.FC<StitchedVideoPlayerProps> = ({ script, videos }) => {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const playerRef = useRef<any>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const currentVideoId = videos[currentSceneIndex]?.id;

    const speakNarrationForScene = (sceneIndex: number) => {
        if ('speechSynthesis' in window && script.scenes[sceneIndex]) {
            window.speechSynthesis.cancel(); // Stop any previous speech
            
            const utterance = new SpeechSynthesisUtterance(script.scenes[sceneIndex].narration);
            const voices = window.speechSynthesis.getVoices();
            utterance.voice = voices.find(voice => voice.lang === 'pt-BR') || voices[0];
            utterance.onend = () => {
                // When narration for a scene ends, we could decide to auto-play the next scene
                // For now, we let the video `onEnd` handle it for better sync.
            };
            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
        }
    };

    const handlePlayPause = () => {
        if (!playerRef.current) return;

        const playerState = playerRef.current.getPlayerState();
        if (playerState === 1) { // Playing
            playerRef.current.pauseVideo();
            window.speechSynthesis.pause();
            setIsPlaying(false);
        } else { // Paused, ended, etc.
            playerRef.current.playVideo();
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            } else {
                speakNarrationForScene(currentSceneIndex);
            }
            setIsPlaying(true);
        }
    };

    const handleNextScene = () => {
        if (currentSceneIndex < videos.length - 1) {
            setCurrentSceneIndex(currentSceneIndex + 1);
        } else {
            // End of the stitched video
            setIsPlaying(false);
            window.speechSynthesis.cancel();
            setCurrentSceneIndex(0);
        }
    };
    
     const onPlayerReady = (event: any) => {
        playerRef.current = event.target;
    };
    
    const onPlayerStateChange = (event: any) => {
        if (event.data === 1) { // Playing
            setIsPlaying(true);
            if (!window.speechSynthesis.speaking || window.speechSynthesis.paused) {
                if(window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                } else {
                    speakNarrationForScene(currentSceneIndex);
                }
            }
        } else if (event.data === 2) { // Paused
            setIsPlaying(false);
            window.speechSynthesis.pause();
        } else if (event.data === 0) { // Ended
            handleNextScene();
        }
    };
    
    // Effect to handle changing scenes
    useEffect(() => {
        if(playerRef.current && isPlaying) {
             speakNarrationForScene(currentSceneIndex);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSceneIndex]);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative group flex-shrink-0">
                <YouTube
                    videoId={currentVideoId}
                    opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0 } }}
                    onReady={onPlayerReady}
                    onStateChange={onPlayerStateChange}
                    className="w-full h-full"
                />
                 <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={handlePlayPause} className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                        <Icon name={isPlaying ? "Pause" : "Play"} className="w-8 h-8" />
                    </button>
                </div>
            </div>
            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg flex-grow flex flex-col overflow-hidden">
                <h3 className="font-display text-lg text-brand-red mb-2 flex-shrink-0">Cena Atual: {currentSceneIndex + 1} / {videos.length}</h3>
                <div className="text-sm text-gray-300 flex-grow overflow-y-auto pr-2">
                   {script.scenes.map((scene, index) => (
                       <p key={index} className={`${index === currentSceneIndex ? 'font-bold text-white' : 'text-gray-400'}`}>
                           {scene.narration}
                       </p>
                   ))}
                </div>
            </div>
        </div>
    );
};

export default StitchedVideoPlayer;
