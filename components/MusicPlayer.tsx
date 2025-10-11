import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from './Icons';
import type { Song, YouTubeTrack } from '../types';
import { searchYouTubeMusic } from '../services/geminiService';

// Extend the window interface for the YouTube API
declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

interface MusicPlayerProps {
    playlist: Song[];
}

const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ playlist }) => {
    const [mode, setMode] = useState<'playlist' | 'youtube'>('playlist');
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [youtubeTrack, setYoutubeTrack] = useState<YouTubeTrack | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    
    // YouTube search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<YouTubeTrack[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    const audioRef = useRef<HTMLAudioElement>(null);
    const youtubePlayerRef = useRef<any>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const progressIntervalRef = useRef<number | null>(null);
    const intentToPlayYoutube = useRef(false);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const toggleButtonRef = useRef<HTMLButtonElement>(null);

    const currentPlaylistTrack = playlist?.[currentTrackIndex];
    const currentTrack = mode === 'playlist' ? { title: currentPlaylistTrack?.title, artist: currentPlaylistTrack?.artist } : { title: youtubeTrack?.title, artist: youtubeTrack?.artist };

    const toPrevTrack = useCallback(() => {
        if (mode !== 'playlist' || playlist.length === 0) return;
        setCurrentTrackIndex(prevIndex => (prevIndex - 1 + playlist.length) % playlist.length);
    }, [playlist.length, mode]);

    const toNextTrack = useCallback(() => {
        if (mode !== 'playlist' || playlist.length === 0) return;
        setCurrentTrackIndex(prevIndex => (prevIndex + 1) % playlist.length);
    }, [playlist.length, mode]);
    
    const cleanupProgressInterval = () => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    };

    // Initialize YouTube Player
    useEffect(() => {
        const onPlayerStateChange = (event: any) => {
            // If a new video was loaded and we intended to play it, command it to play.
            if (event.data === window.YT.PlayerState.UNSTARTED && intentToPlayYoutube.current) {
                youtubePlayerRef.current.playVideo();
                intentToPlayYoutube.current = false; // Reset intent after using it
            }

            // Use functional updates to avoid stale state in the callback
            if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(currentIsPlaying => !currentIsPlaying ? true : currentIsPlaying);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(currentIsPlaying => currentIsPlaying ? false : currentIsPlaying);
            } else if (event.data === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
                setProgress(0);
            }
        };

        const initYoutubePlayer = () => {
             youtubePlayerRef.current = new window.YT.Player('youtube-player', {
                height: '1',
                width: '1',
                playerVars: { 'controls': 0 }, // Autoplay is unreliable, we'll control it manually
                events: {
                    'onReady': () => console.log("YouTube Player Ready"),
                    'onStateChange': onPlayerStateChange
                }
            });
        }
        
        if (typeof window.YT === 'undefined' || typeof window.YT.Player === 'undefined') {
            window.onYouTubeIframeAPIReady = initYoutubePlayer;
        } else if (!youtubePlayerRef.current) {
            initYoutubePlayer();
        }
    }, []);
    
    // Effect for handling progress bar and track changes
    useEffect(() => {
        cleanupProgressInterval();

        if (isPlaying) {
             if (mode === 'playlist' && audioRef.current) {
                if(audioRef.current.paused) {
                    audioRef.current.play().catch(e => console.error("Error playing audio:", e));
                }
                progressIntervalRef.current = window.setInterval(() => {
                    setProgress(audioRef.current?.currentTime ?? 0);
                    setDuration(audioRef.current?.duration ?? 0);
                }, 500);
            } else if (mode === 'youtube' && youtubePlayerRef.current?.getCurrentTime) {
                progressIntervalRef.current = window.setInterval(() => {
                    setProgress(youtubePlayerRef.current?.getCurrentTime() ?? 0);
                    setDuration(youtubePlayerRef.current?.getDuration() ?? 0);
                }, 500);
            }
        }

        return cleanupProgressInterval;
    }, [isPlaying, mode, currentTrackIndex]);

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || duration === 0) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = (clickX / rect.width) * duration;
        
        if(mode === 'playlist' && audioRef.current) audioRef.current.currentTime = newTime;
        if(mode === 'youtube' && youtubePlayerRef.current) youtubePlayerRef.current.seekTo(newTime, true);
        setProgress(newTime);
    }

    const switchMode = (newMode: 'playlist' | 'youtube') => {
        if (mode === newMode) return;
        
        setIsPlaying(false);
        setProgress(0);
        setDuration(0);

        if (newMode === 'playlist') {
            if (youtubePlayerRef.current?.stopVideo) youtubePlayerRef.current.stopVideo();
        } else {
             if (audioRef.current) audioRef.current.pause();
        }
        setMode(newMode);
    }

    const togglePlayPause = () => {
        const isCurrentlyPlayable = (mode === 'playlist' && currentPlaylistTrack) || (mode === 'youtube' && youtubeTrack);

        if (isCurrentlyPlayable) {
            const newIsPlaying = !isPlaying;
            if (newIsPlaying) {
                if (mode === 'playlist' && audioRef.current) {
                    audioRef.current.play().catch(e => console.error("Audio play failed:", e));
                } else if (mode === 'youtube' && youtubePlayerRef.current?.playVideo) {
                    youtubePlayerRef.current.playVideo();
                }
            } else {
                if (mode === 'playlist' && audioRef.current) {
                    audioRef.current.pause();
                } else if (mode === 'youtube' && youtubePlayerRef.current?.pauseVideo) {
                    youtubePlayerRef.current.pauseVideo();
                }
            }
            setIsPlaying(newIsPlaying);

            if (!isExpanded) {
                setIsExpanded(true);
            }
        } else {
            setIsExpanded(true);
            if (mode === 'playlist' && playlist.length === 0) {
                switchMode('youtube');
            }
        }
    };
    
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchError('');
        try {
            const results = await searchYouTubeMusic(searchQuery);
            setSearchResults(results);
        } catch(err) {
            const message = err instanceof Error ? err.message : "Erro desconhecido";
            setSearchError(message);
        } finally {
            setIsSearching(false);
        }
    }
    
    const playYoutubeTrack = (track: YouTubeTrack) => {
        if (!youtubePlayerRef.current) {
            console.error("YouTube player is not ready to play.");
            return;
        }
        setYoutubeTrack(track);
        switchMode('youtube');
        intentToPlayYoutube.current = true; // Signal our intent to play this video
        youtubePlayerRef.current.loadVideoById(track.id);
        // The onStateChange handler will now see the UNSTARTED event and play the video.
    };
    
    return (
        <>
            <audio
                ref={audioRef}
                src={currentPlaylistTrack?.url}
                onEnded={toNextTrack}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
                preload="auto"
            />
            <div id="youtube-player" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}></div>
            
            {/* Click-outside overlay for mobile */}
            {isExpanded && (
                <div
                    className="fixed inset-0 z-40 bg-transparent sm:hidden"
                    onClick={() => setIsExpanded(false)}
                    aria-hidden="true"
                ></div>
            )}
            
            <div className="fixed bottom-4 left-4 right-4 sm:left-8 sm:right-auto z-50 flex items-end gap-3">
                 <button
                    ref={toggleButtonRef}
                    onClick={togglePlayPause}
                    className="w-14 h-14 bg-dark/80 backdrop-blur-sm border-2 border-brand-red rounded-full flex items-center justify-center shadow-lg transform transition-all hover:scale-110 hover:shadow-brand-red/30 animate-pop-in flex-shrink-0"
                    aria-label={isPlaying ? "Pausar" : "Tocar"}
                    title={isPlaying ? "Pausar" : "Tocar"}
                >
                    <Icon name={isPlaying ? "Pause" : "Play"} className="w-6 h-6 text-brand-red" />
                </button>
                
                 <div 
                    ref={playerContainerRef}
                    className={`
                        bg-dark/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg flex flex-col
                        w-full sm:w-[350px] max-h-[70vh] sm:max-h-[500px]
                        transition-all duration-300 ease-out origin-bottom-left
                        ${isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
                    `}
                >
                    <div className="flex-shrink-0 p-3 pr-10 relative">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-600 mb-3">
                             <button onClick={() => switchMode('playlist')} className={`px-4 py-2 text-sm font-semibold transition-colors ${mode === 'playlist' ? 'text-brand-red border-b-2 border-brand-red' : 'text-gray-400 hover:text-white'}`}>Rádio ARC7HIVE</button>
                             <button onClick={() => switchMode('youtube')} className={`px-4 py-2 text-sm font-semibold transition-colors ${mode === 'youtube' ? 'text-brand-red border-b-2 border-brand-red' : 'text-gray-400 hover:text-white'}`}>Buscar no YouTube</button>
                        </div>

                         {/* Player Info */}
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gray-800 rounded-md flex items-center justify-center text-brand-red overflow-hidden">
                                {mode === 'youtube' && youtubeTrack ? (
                                    <img src={youtubeTrack.thumbnailUrl} alt={youtubeTrack.title} className="w-full h-full object-cover" />
                                ) : (
                                    <Icon name="Heart" className="w-6 h-6" />
                                )}
                            </div>
                            <div className="flex-grow min-w-0">
                                <p className="text-sm font-bold text-white truncate" title={currentTrack?.title}>{currentTrack?.title || 'Selecione uma música'}</p>
                                <p className="text-xs text-gray-400 truncate" title={currentTrack?.artist}>{currentTrack?.artist || ''}</p>
                                <div className="mt-2">
                                    <div ref={progressBarRef} onClick={handleProgressClick} className="w-full h-1.5 bg-gray-600 rounded-full cursor-pointer">
                                        <div className="h-full bg-brand-red rounded-full" style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%'}}></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>{formatTime(progress)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1">
                                <button onClick={toPrevTrack} disabled={mode !== 'playlist'} className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-30"><Icon name="SkipBack" className="w-5 h-5"/></button>
                                <button onClick={toNextTrack} disabled={mode !== 'playlist'} className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-30"><Icon name="SkipForward" className="w-5 h-5"/></button>
                            </div>
                        </div>
                        <button onClick={() => setIsExpanded(false)} className="absolute top-2 right-2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border-2 border-dark hover:bg-brand-red">
                            <Icon name="X" className="w-3 h-3" />
                        </button>
                    </div>
                    
                     {mode === 'youtube' && (
                        <div className="flex flex-col flex-grow min-h-0 border-t border-gray-600 px-3 pb-3">
                            <form onSubmit={handleSearch} className="relative py-3">
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar música ou artista..." className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 pl-4 pr-10 text-sm"/>
                                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-brand-red"><Icon name="Search" className="w-4 h-4"/></button>
                            </form>
                            <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                                {isSearching && <p className="text-center text-sm text-gray-400">Buscando...</p>}
                                {searchError && <p className="text-center text-sm text-red-400">{searchError}</p>}
                                {searchResults.map(track => (
                                    <div key={track.id} onClick={() => playYoutubeTrack(track)} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                                        <img src={track.thumbnailUrl} alt={track.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0"/>
                                        <div className="min-w-0">
                                            <p className="text-sm text-white truncate font-semibold">{track.title}</p>
                                            <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                     )}
                </div>
            </div>
        </>
    );
};

export default MusicPlayer;