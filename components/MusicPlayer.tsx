import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from './Icons';
import type { Song } from '../types';

interface MusicPlayerProps {
    playlist: Song[];
}

const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ playlist }) => {
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    const currentTrack = playlist?.[currentTrackIndex];

    const toPrevTrack = useCallback(() => {
        if (playlist.length === 0) return;
        setCurrentTrackIndex(prevIndex => (prevIndex - 1 + playlist.length) % playlist.length);
    }, [playlist.length]);

    const toNextTrack = useCallback(() => {
        if (playlist.length === 0) return;
        setCurrentTrackIndex(prevIndex => (prevIndex + 1) % playlist.length);
    }, [playlist.length]);

    useEffect(() => {
        if (isPlaying) {
            audioRef.current?.play().catch(e => console.error("Error playing audio:", e));
        } else {
            audioRef.current?.pause();
        }
    }, [isPlaying, currentTrackIndex, playlist]);
    
    useEffect(() => {
        // If the playlist changes and the current track is no longer valid, stop playback.
        if (playlist.length > 0 && currentTrackIndex >= playlist.length) {
            setCurrentTrackIndex(0);
        } else if (playlist.length === 0) {
            setIsPlaying(false);
        }
    }, [playlist, currentTrackIndex]);

    const onTimeUpdate = () => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
        }
    };
    
    const onLoadedData = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    }

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || !audioRef.current) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = (clickX / rect.width) * duration;
        audioRef.current.currentTime = newTime;
    }

    const togglePlayPause = () => {
        if (playlist.length === 0) return;
        if (!isExpanded) setIsExpanded(true);
        setIsPlaying(prev => !prev);
    };

    if (playlist.length === 0 && isExpanded) {
        setIsExpanded(false); // Collapse if playlist becomes empty
    }

    return (
        <>
            <audio
                ref={audioRef}
                src={currentTrack?.url}
                onTimeUpdate={onTimeUpdate}
                onLoadedData={onLoadedData}
                onEnded={toNextTrack}
                preload="auto"
            />
            <div className="fixed bottom-4 left-4 sm:left-8 z-50 flex items-end gap-3">
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
                        bg-dark/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg flex items-center gap-4 p-3 pr-4
                        transition-all duration-300 ease-out origin-bottom-left
                        ${isExpanded && playlist.length > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
                    `}
                    style={{width: '300px'}}
                >
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-800 rounded-md flex items-center justify-center text-brand-red">
                        <Icon name="Heart" className="w-6 h-6" />
                    </div>
                    <div className="flex-grow min-w-0">
                        <p className="text-sm font-bold text-white truncate" title={currentTrack?.title}>{currentTrack?.title || 'Sem música'}</p>
                        <p className="text-xs text-gray-400 truncate" title={currentTrack?.artist}>{currentTrack?.artist || 'Adicione à playlist'}</p>
                         <div className="mt-2">
                             <div 
                                ref={progressBarRef}
                                onClick={handleProgressClick}
                                className="w-full h-1.5 bg-gray-600 rounded-full cursor-pointer"
                             >
                                <div 
                                    className="h-full bg-brand-red rounded-full" 
                                    style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%'}}
                                ></div>
                             </div>
                             <div className="flex justify-between text-xs text-gray-500 mt-1">
                                 <span>{formatTime(progress)}</span>
                                 <span>{formatTime(duration)}</span>
                             </div>
                         </div>
                    </div>
                     <div className="flex-shrink-0 flex items-center gap-1">
                        <button onClick={toPrevTrack} className="p-2 text-gray-400 hover:text-white transition-colors"><Icon name="SkipBack" className="w-5 h-5"/></button>
                        <button onClick={toNextTrack} className="p-2 text-gray-400 hover:text-white transition-colors"><Icon name="SkipForward" className="w-5 h-5"/></button>
                    </div>
                     <button onClick={() => setIsExpanded(false)} className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border-2 border-dark hover:bg-brand-red">
                        <Icon name="X" className="w-3 h-3" />
                     </button>
                </div>
            </div>
        </>
    );
};

export default MusicPlayer;
