import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icons';

// The previous URL was unreliable and likely blocked by CORS, causing audio playback errors.
// This new URL points to a royalty-free victory theme from a reliable CDN.
const MUSIC_URL = 'https://cdn.pixabay.com/download/audio/2022/07/23/audio_770b99726a.mp3';
const SONG_TITLE = 'Victory Fanfare';
const ARTIST_NAME = 'LiteSaturation';


const MusicPlayer: React.FC = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [songInfoVisible, setSongInfoVisible] = useState(false);
    const songInfoTimeoutRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        // Attempt autoplay on mount
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {}).catch(error => {
                console.log("Autoplay was prevented by the browser:", error);
            });
        }

        return () => {
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
        };
    }, []);


    const togglePlayPause = () => {
        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play();
        }

        setSongInfoVisible(true);
        if (songInfoTimeoutRef.current) {
            clearTimeout(songInfoTimeoutRef.current);
        }
        songInfoTimeoutRef.current = window.setTimeout(() => {
            setSongInfoVisible(false);
        }, 3000); // Hide after 3 seconds
    };

    return (
        <>
            <audio ref={audioRef} src={MUSIC_URL} loop />
            <div className="fixed bottom-4 left-4 sm:left-8 z-50 flex items-end gap-4">
                <button
                    onClick={togglePlayPause}
                    className="w-14 h-14 bg-dark/80 backdrop-blur-sm border-2 border-brand-red rounded-full flex items-center justify-center shadow-lg transform transition-all hover:scale-110 hover:shadow-brand-red/30 animate-pop-in"
                    aria-label={isPlaying ? "Pausar música" : "Tocar música"}
                    title={isPlaying ? "Pausar música" : "Tocar música"}
                >
                    <Icon name={isPlaying ? "Pause" : "Play"} className="w-6 h-6 text-brand-red" />
                </button>

                <div 
                    className={`
                        w-max bg-dark/90 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-2 shadow-lg
                        transition-all duration-500 ease-out
                        ${songInfoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
                    `}
                >
                    <p className="text-sm font-bold text-white">{SONG_TITLE}</p>
                    <p className="text-xs text-gray-400">{ARTIST_NAME}</p>
                </div>
            </div>
        </>
    );
};

export default MusicPlayer;
