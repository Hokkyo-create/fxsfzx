import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from './Icons';
import type { Song, YouTubeTrack, User, RadioState } from '../types';
import { searchYouTubeMusic } from '../services/geminiService';
import { setupRadioStateListener, updateRadioState, uploadSong } from '../services/supabaseService';


// Extend the window interface for the YouTube API
declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

interface MusicPlayerProps {
    user: User;
    playlist: Song[];
    error: string | null;
    onTrackChange: (track: { title: string; artist: string } | null) => void;
    isOpen: boolean;
    onClose: () => void;
}

const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const UploadSongModal: React.FC<{onClose: () => void}> = ({ onClose }) => {
    const [songFile, setSongFile] = useState<File | null>(null);
    const [songTitle, setSongTitle] = useState('');
    const [songArtist, setSongArtist] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSongFile(e.target.files[0]);
            if (!songTitle) setSongTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
        }
    }

    const handleUploadSong = async () => {
        if (!songFile || !songTitle || !songArtist) {
            setError("Por favor, preencha todos os campos.");
            return;
        }
        setIsUploading(true);
        setError('');
        try {
            await uploadSong(songFile, songTitle, songArtist);
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Música enviada com sucesso!' } }));
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Falha no upload.';
            setError(errorMessage);
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4 p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-4">
                    <h3 className="text-xl font-display tracking-wider text-white">Adicionar Música à Rádio</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"><Icon name="X" className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <input type="text" value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="Título da Música" className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white" />
                    <input type="text" value={songArtist} onChange={e => setSongArtist(e.target.value)} placeholder="Nome do Artista" className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white" />
                    <input id="song-file-input" type="file" onChange={handleFileChange} accept="audio/mp3,audio/mpeg" className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-brand-red file:text-white hover:file:bg-red-700"/>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <button onClick={handleUploadSong} disabled={isUploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-600">
                        {isUploading ? "Enviando..." : "Enviar para a Rádio"}
                    </button>
                </div>
            </div>
        </div>
    );
}


const MusicPlayer: React.FC<MusicPlayerProps> = ({ user, playlist, error, onTrackChange, isOpen, onClose }) => {
    const [mode, setMode] = useState<'playlist' | 'youtube'>('playlist');
    const [youtubeTrack, setYoutubeTrack] = useState<YouTubeTrack | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [volume, setVolume] = useState(0.75);
    const [isMuted, setIsMuted] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isRadioActive, setIsRadioActive] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<YouTubeTrack[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    
    const [radioState, setRadioState] = useState<RadioState | null>(null);

    const audioRef = useRef<HTMLAudioElement>(null);
    const youtubePlayerRef = useRef<any>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const progressIntervalRef = useRef<number | null>(null);
    const isSeeking = useRef(false);
    const lastVolume = useRef(volume);
    const isMyUpdate = useRef(false);

    const currentPlaylistTrackId = radioState?.current_track_id;
    const currentPlaylistTrack = playlist.find(s => s.id === currentPlaylistTrackId);
    
    const currentTrack = mode === 'playlist' ? 
        { title: currentPlaylistTrack?.title, artist: currentPlaylistTrack?.artist, art: null } : 
        { title: youtubeTrack?.title, artist: youtubeTrack?.artist, art: youtubeTrack?.thumbnailUrl };

    // Update marquee when track or play state changes
    useEffect(() => {
        if (isPlaying && currentTrack?.title) {
            onTrackChange({ title: currentTrack.title, artist: currentTrack.artist || (mode === 'playlist' ? 'Rádio Colaborativa' : 'YouTube') });
        } else {
            onTrackChange(null);
        }
    }, [isPlaying, currentTrack, mode, onTrackChange]);

    // Subscribe to Supabase radio state when activated
    useEffect(() => {
        if (!isRadioActive) return;
        const unsubscribe = setupRadioStateListener((state, err) => {
            if (err) console.error("Error fetching radio state:", err);
            else if (state) setRadioState(state);
        });
        return () => unsubscribe();
    }, [isRadioActive]);
    
    // Sync local audio player with the shared radio state from Supabase
    useEffect(() => {
        if (mode !== 'playlist' || !isRadioActive || !radioState || !audioRef.current || isMyUpdate.current) {
            isMyUpdate.current = false;
            return;
        }

        const { current_track_id, is_playing, seek_timestamp, track_progress_on_seek } = radioState;
        const trackFromState = playlist.find(s => s.id === current_track_id);

        if (!trackFromState) return;

        if (audioRef.current.src !== trackFromState.url) {
            audioRef.current.src = trackFromState.url;
            audioRef.current.load();
        }

        if (!isSeeking.current) {
            const timeSinceUpdate = (Date.now() - seek_timestamp) / 1000;
            const expectedCurrentTime = track_progress_on_seek + (is_playing ? timeSinceUpdate : 0);
            if (Math.abs(audioRef.current.currentTime - expectedCurrentTime) > 2) {
                 audioRef.current.currentTime = expectedCurrentTime;
            }
        }
        
        if (is_playing && audioRef.current.paused) {
            audioRef.current.play().catch(e => console.log("Sync play prevented by browser."));
        } else if (!is_playing && !audioRef.current.paused) {
            audioRef.current.pause();
        }
    }, [radioState, playlist, mode, user.name, isRadioActive]);

    // Initialize YouTube Player
    useEffect(() => {
        const onPlayerStateChange = (event: any) => {
            if (event.data === window.YT.PlayerState.CUED || event.data === window.YT.PlayerState.UNSTARTED) {
                event.target.playVideo();
            }
            setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
        };
        const initYoutubePlayer = () => {
             youtubePlayerRef.current = new window.YT.Player('youtube-player', {
                height: '1', width: '1',
                playerVars: { 'controls': 0, 'playsinline': 1 },
                events: { 'onReady': () => setIsPlayerReady(true), 'onStateChange': onPlayerStateChange }
            });
        }
        if (typeof window.YT === 'undefined' || typeof window.YT.Player === 'undefined') {
            window.onYouTubeIframeAPIReady = initYoutubePlayer;
        } else if (!youtubePlayerRef.current) {
            initYoutubePlayer();
        }
    }, []);
    
    // Update progress bar
    useEffect(() => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (isPlaying && !isSeeking.current) {
            progressIntervalRef.current = window.setInterval(() => {
                let currentTime = 0, currentDuration = 0;
                if (mode === 'playlist' && audioRef.current) {
                    currentTime = audioRef.current.currentTime;
                    currentDuration = audioRef.current.duration;
                } else if (mode === 'youtube' && youtubePlayerRef.current?.getCurrentTime) {
                    currentTime = youtubePlayerRef.current.getCurrentTime() ?? 0;
                    currentDuration = youtubePlayerRef.current.getDuration() ?? 0;
                }
                setProgress(currentTime);
                if (currentDuration > 0 && !isNaN(currentDuration)) setDuration(currentDuration);
            }, 500);
        }
        return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current) };
    }, [isPlaying, mode]);
    
    // Update volume
    useEffect(() => {
        const newVolume = isMuted ? 0 : volume;
        if (audioRef.current) audioRef.current.volume = newVolume;
        if (youtubePlayerRef.current?.setVolume) youtubePlayerRef.current.setVolume(newVolume * 100);
    }, [volume, isMuted]);

    // Function to send state updates to Supabase
    const handleUpdateRadioState = (newState: Partial<RadioState>) => {
        if (!isRadioActive) return;
        const progress = audioRef.current?.currentTime || 0;
        updateRadioState({
            seek_timestamp: Date.now(),
            track_progress_on_seek: progress,
            updated_by: user.name,
            ...newState,
        });
    };
    
    const togglePlayPause = () => {
        if (mode === 'playlist') {
            if (!isRadioActive) {
                setIsRadioActive(true);
                return;
            }
            if (!currentPlaylistTrack && playlist.length > 0) {
                handleSelectPlaylistTrack(playlist[0]);
                return;
            }
            const shouldBePlaying = !radioState?.is_playing;
            isMyUpdate.current = true;
            handleUpdateRadioState({ is_playing: shouldBePlaying });
            if (shouldBePlaying) {
                audioRef.current?.play().catch(console.error);
            } else {
                audioRef.current?.pause();
            }
        } else {
             const playerState = youtubePlayerRef.current?.getPlayerState();
             if (playerState === 1) {
                 youtubePlayerRef.current.pauseVideo();
             } else {
                 youtubePlayerRef.current.playVideo();
             }
        }
    };

    const handleSelectPlaylistTrack = (song: Song) => {
        if (!isRadioActive) setIsRadioActive(true);
        isMyUpdate.current = true;
        handleUpdateRadioState({ current_track_id: song.id, is_playing: true, track_progress_on_seek: 0 });
        if (audioRef.current) {
            audioRef.current.src = song.url;
            audioRef.current.load();
            audioRef.current.play().catch(e => console.error("Playback failed on select:", e));
        }
    };
    
    const toTrack = (direction: 'next' | 'prev') => {
        if (mode !== 'playlist' || !isRadioActive || playlist.length < 2) return;
        const currentIndex = playlist.findIndex(t => t.id === currentPlaylistTrackId);
        if (currentIndex === -1) return;
        const nextIndex = direction === 'next' ? (currentIndex + 1) % playlist.length : (currentIndex - 1 + playlist.length) % playlist.length;
        handleSelectPlaylistTrack(playlist[nextIndex]);
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || duration === 0) return;
        isSeeking.current = true;
        const rect = progressBarRef.current.getBoundingClientRect();
        const newTime = ((e.clientX - rect.left) / rect.width) * duration;
        
        if (mode === 'playlist') {
            if (audioRef.current) audioRef.current.currentTime = newTime;
            isMyUpdate.current = true;
            handleUpdateRadioState({ track_progress_on_seek: newTime });
        } else if (mode === 'youtube' && youtubePlayerRef.current?.seekTo) {
            youtubePlayerRef.current.seekTo(newTime, true);
        }
        
        setProgress(newTime);
        setTimeout(() => { isSeeking.current = false }, 200);
    }
    
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchError('');
        try {
            setSearchResults(await searchYouTubeMusic(searchQuery));
        } catch(err) {
            setSearchError(err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
            setIsSearching(false);
        }
    }
    
    const playYoutubeTrack = (track: YouTubeTrack) => {
        if (!isPlayerReady) return;
        setYoutubeTrack(track);
        switchMode('youtube');
        youtubePlayerRef.current.loadVideoById(track.id);
    };

    const switchMode = (newMode: 'playlist' | 'youtube') => {
        if (mode === newMode) return;
        setIsPlaying(false);
        setProgress(0);
        setDuration(0);
        if (newMode === 'playlist') {
             if (youtubePlayerRef.current?.stopVideo) youtubePlayerRef.current.stopVideo();
             setYoutubeTrack(null);
        } else {
             if (audioRef.current) audioRef.current.pause();
        }
        setMode(newMode);
    }

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVol = parseFloat(e.target.value);
        setVolume(newVol);
        if (newVol > 0) {
            setIsMuted(false);
            lastVolume.current = newVol;
        } else {
            setIsMuted(true);
        }
    };
    
    const toggleMute = () => {
        const shouldMute = !isMuted;
        setIsMuted(shouldMute);
        if (shouldMute && volume > 0) {
            lastVolume.current = volume;
            setVolume(0);
        } else if (!shouldMute) {
            setVolume(lastVolume.current > 0 ? lastVolume.current : 0.75);
        }
    };
    
    if (!isOpen) return null;

    return (
        <>
            <audio ref={audioRef} onPlay={() => {if(mode === 'playlist') setIsPlaying(true)}} onPause={() => {if(mode === 'playlist') setIsPlaying(false)}} onEnded={() => toTrack('next')} onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)} crossOrigin="anonymous" />
            <div id="youtube-player" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}></div>
            {isUploadModalOpen && <UploadSongModal onClose={() => setIsUploadModalOpen(false)} />}
            
            <div 
                className={`fixed top-0 left-0 h-full w-80 bg-dark/90 backdrop-blur-sm border-r border-brand-red/30 shadow-2xl shadow-brand-red/20 flex flex-col z-40
                    sm:animate-player-panel-in
                    max-sm:bottom-0 max-sm:w-full max-sm:h-screen max-sm:border-r-0 max-sm:border-t max-sm:player-panel-mobile-in`}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 flex-shrink-0">
                     <div className="w-full aspect-square bg-gray-900/50 rounded-lg flex items-center justify-center text-brand-red overflow-hidden relative border border-gray-800">
                        {currentTrack.art ? <img src={currentTrack.art} alt={currentTrack.title} className="w-full h-full object-cover" /> : <Icon name="Heart" className="w-24 h-24 text-brand-red/50" />}
                        <button onClick={onClose} className="absolute top-2 right-2 p-2 rounded-full bg-black/30 text-gray-300 hover:bg-brand-red hover:text-white transition-colors"><Icon name="X" className="w-5 h-5" /></button>
                     </div>
                     <div className="text-center mt-4">
                        <p className="text-lg font-bold text-white truncate" title={currentTrack?.title}>{currentTrack?.title || 'Rádio ARC7HIVE'}</p>
                        <p className="text-sm text-gray-400 truncate" title={currentTrack?.artist}>{currentTrack?.artist || (isRadioActive ? 'Rádio Colaborativa' : 'Offline')}</p>
                     </div>
                     <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-gray-500">{formatTime(progress)}</span>
                        <div ref={progressBarRef} onClick={handleProgressClick} className="flex-grow h-1.5 bg-gray-700 rounded-full cursor-pointer group">
                            <div className="h-full bg-brand-red rounded-full relative" style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%', filter: 'drop-shadow(0 0 3px #E50914)'}}>
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{boxShadow: '0 0 6px 2px #E50914'}}></div>
                            </div>
                        </div>
                        <span className="text-xs text-gray-500">{formatTime(duration)}</span>
                    </div>
                     <div className="mt-4 flex items-center justify-center gap-6">
                        <button onClick={() => toTrack('prev')} disabled={mode !== 'playlist'} className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-30"><Icon name="SkipBack" className="w-6 h-6"/></button>
                        <button onClick={togglePlayPause} className="w-14 h-14 bg-brand-red rounded-full flex items-center justify-center text-white shadow-lg transform transition-transform hover:scale-110">
                            <Icon name={isPlaying ? "Pause" : "Play"} className="w-7 h-7" />
                        </button>
                        <button onClick={() => toTrack('next')} disabled={mode !== 'playlist'} className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-30"><Icon name="SkipForward" className="w-6 h-6"/></button>
                     </div>
                     <div className="mt-4 flex items-center gap-3 px-2">
                        <button onClick={toggleMute} className="p-1 text-gray-400 hover:text-white"><Icon name={isMuted || volume === 0 ? 'VolumeOff' : 'VolumeUp'} className="w-5 h-5" /></button>
                        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="volume-slider" />
                     </div>
                </div>

                <div className="flex-shrink-0 flex items-center p-2 border-y border-gray-700 bg-black/20">
                    <button onClick={() => switchMode('playlist')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${mode === 'playlist' ? 'text-white bg-brand-red/30' : 'text-gray-400 hover:text-white'}`}>Rádio</button>
                    <button onClick={() => switchMode('youtube')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${mode === 'youtube' ? 'text-white bg-brand-red/30' : 'text-gray-400 hover:text-white'}`}>YouTube</button>
                </div>

                <div className="flex-grow min-h-0 flex flex-col">
                {mode === 'playlist' ? (
                    <>
                        <div className="p-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-300">Playlist Colaborativa</h3>
                            <button onClick={() => setIsUploadModalOpen(true)} className="p-1.5 rounded-md bg-gray-700/50 hover:bg-brand-red text-gray-300 hover:text-white" title="Adicionar Música MP3"><Icon name="Upload" className="w-4 h-4" /></button>
                        </div>
                        {!isRadioActive ? (
                            <div className="p-4 text-center m-3">
                                <button onClick={() => setIsRadioActive(true)} className="w-full bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105">
                                    [ Conectar à Rádio ]
                                </button>
                            </div>
                        ) : (
                            <div className="flex-grow overflow-y-auto space-y-1 p-3 pt-0 pr-2">
                                {error ? <div className="p-3 text-center text-xs text-red-300 bg-red-900/30 rounded-lg"><strong>Falha:</strong> {error}</div>
                                : playlist.length > 0 ? (
                                    playlist.map((song) => (
                                        <div key={song.id} onClick={() => handleSelectPlaylistTrack(song)} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${currentPlaylistTrackId === song.id ? 'bg-brand-red/20' : 'hover:bg-gray-800'}`}>
                                            <div className="min-w-0">
                                                <p className={`text-sm truncate font-semibold ${currentPlaylistTrackId === song.id ? 'text-white' : 'text-gray-200'}`}>{song.title}</p>
                                                <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : <p className="text-center text-sm text-gray-500 py-4">A playlist está vazia.</p>}
                            </div>
                        )}
                    </>
                ) : ( // YouTube Mode
                    <div className="flex flex-col flex-grow min-h-0 px-3 pb-3">
                        <div className="flex-grow overflow-y-auto space-y-2 pr-1 pt-2">
                            {isSearching && <p className="text-center text-sm text-gray-400">Buscando...</p>}
                            {searchError && <p className="text-center text-sm text-red-400">{searchError}</p>}
                            {searchResults.map(track => (
                                <div key={track.id} onClick={() => playYoutubeTrack(track)} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-800 cursor-pointer">
                                    <img src={track.thumbnailUrl} alt={track.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0"/>
                                    <div className="min-w-0">
                                        <p className="text-sm text-white truncate font-semibold">{track.title}</p>
                                        <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleSearch} className="relative mt-auto pt-3">
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar no YouTube..." className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 pl-4 pr-10 text-sm"/>
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-brand-red"><Icon name="Search" className="w-4 h-4"/></button>
                        </form>
                    </div>
                )}
                </div>
            </div>
        </>
    );
};

export default MusicPlayer;