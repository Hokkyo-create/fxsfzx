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


const MusicPlayer: React.FC<MusicPlayerProps> = ({ user, playlist, error }) => {
    const [mode, setMode] = useState<'playlist' | 'youtube'>('playlist');
    const [youtubeTrack, setYoutubeTrack] = useState<YouTubeTrack | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<YouTubeTrack[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    
    // Shared radio state
    const [radioState, setRadioState] = useState<RadioState | null>(null);

    const audioRef = useRef<HTMLAudioElement>(null);
    const youtubePlayerRef = useRef<any>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const progressIntervalRef = useRef<number | null>(null);
    const intentToPlayYoutube = useRef(false);
    const isSeeking = useRef(false);

    const currentPlaylistTrackId = radioState?.current_track_id;
    const currentPlaylistTrack = playlist.find(s => s.id === currentPlaylistTrackId);
    
    const currentTrack = mode === 'playlist' ? 
        { title: currentPlaylistTrack?.title, artist: currentPlaylistTrack?.artist } : 
        { title: youtubeTrack?.title, artist: youtubeTrack?.artist };

    // --- State Sync & Listeners ---
    
    // Shared Radio State Listener
    useEffect(() => {
        const unsubscribe = setupRadioStateListener((state, err) => {
            if (err) {
                console.error("Error fetching radio state:", err);
            } else if (state) {
                setRadioState(state);
            }
        });
        return () => unsubscribe();
    }, []);
    
    // Effect to synchronize local audio element with shared radio state
    useEffect(() => {
        if (mode !== 'playlist' || !radioState || !audioRef.current || !currentPlaylistTrack) return;

        const { is_playing, seek_timestamp, track_progress_on_seek, updated_by } = radioState;

        // Update audio source if different
        if (audioRef.current.src !== currentPlaylistTrack.url) {
            audioRef.current.src = currentPlaylistTrack.url;
            audioRef.current.load();
        }

        // Sync playback state, only if initiated by another user to avoid feedback loops
        if (updated_by !== user.name && !isSeeking.current) {
            const timeSinceUpdate = (Date.now() - seek_timestamp) / 1000;
            const expectedCurrentTime = track_progress_on_seek + (is_playing ? timeSinceUpdate : 0);
            
            if (Math.abs(audioRef.current.currentTime - expectedCurrentTime) > 2) {
                 audioRef.current.currentTime = expectedCurrentTime;
            }
        }
        
        if (is_playing && audioRef.current.paused) {
            audioRef.current.play().catch(e => console.log("Autoplay prevented by browser"));
        } else if (!is_playing && !audioRef.current.paused) {
            audioRef.current.pause();
        }
        
    }, [radioState, playlist, mode, user.name, currentPlaylistTrack]);


    // Initialize YouTube Player
    useEffect(() => {
        const onPlayerStateChange = (event: any) => {
            if (intentToPlayYoutube.current && event.data === window.YT.PlayerState.CUED) { // CUED means ready
                youtubePlayerRef.current.playVideo();
                intentToPlayYoutube.current = false;
            }

            if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
            else if ([window.YT.PlayerState.PAUSED, window.YT.PlayerState.ENDED].includes(event.data)) setIsPlaying(false);
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
    
    // Effect for handling progress bar updates for both modes
    useEffect(() => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        if (isPlaying && !isSeeking.current) {
            progressIntervalRef.current = window.setInterval(() => {
                let currentTime = 0;
                let currentDuration = 0;
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
    
    // Effect for local mute state
    useEffect(() => {
        if (audioRef.current) audioRef.current.muted = isMuted;
        if (youtubePlayerRef.current?.isMuted) {
            if (isMuted) youtubePlayerRef.current.mute();
            else youtubePlayerRef.current.unMute();
        }
    }, [isMuted]);

    // --- Control Handlers ---

    const handleUpdateRadioState = (newState: Partial<RadioState>) => {
        const progress = audioRef.current?.currentTime || 0;
        updateRadioState({
            seek_timestamp: Date.now(),
            track_progress_on_seek: progress,
            updated_by: user.name,
            ...newState,
        });
    };
    
    const togglePlayPause = () => {
        if (!isExpanded) setIsExpanded(true);
        
        if (mode === 'playlist') {
            if (!currentPlaylistTrack && playlist.length > 0) {
                // If no track is selected, play the first one
                handleSelectPlaylistTrack(playlist[0]);
            } else {
                handleUpdateRadioState({ is_playing: !radioState?.is_playing });
            }
        } else { // YouTube mode
             if (isPlaying) youtubePlayerRef.current?.pauseVideo();
             else youtubePlayerRef.current?.playVideo();
        }
    };

    const handleSelectPlaylistTrack = (song: Song) => {
        if (audioRef.current) {
            audioRef.current.src = song.url;
            audioRef.current.load();
            audioRef.current.play().catch(e => console.error("Play failed:", e));
        }
        handleUpdateRadioState({ current_track_id: song.id, is_playing: true, track_progress_on_seek: 0 });
    };
    
    const toTrack = (direction: 'next' | 'prev') => {
        if (mode !== 'playlist' || playlist.length < 2) return;
        const currentIndex = playlist.findIndex(t => t.id === currentPlaylistTrackId);
        if (currentIndex === -1) return;

        const nextIndex = direction === 'next'
            ? (currentIndex + 1) % playlist.length
            : (currentIndex - 1 + playlist.length) % playlist.length;
        
        handleSelectPlaylistTrack(playlist[nextIndex]);
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || duration === 0) return;
        isSeeking.current = true;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = (clickX / rect.width) * duration;
        
        if(mode === 'playlist') {
            if(audioRef.current) audioRef.current.currentTime = newTime;
            handleUpdateRadioState({ track_progress_on_seek: newTime });
        }
        if(mode === 'youtube' && youtubePlayerRef.current?.seekTo) {
            youtubePlayerRef.current.seekTo(newTime, true);
        }
        setProgress(newTime);
        setTimeout(() => { isSeeking.current = false }, 200);
    }

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
    
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchError('');
        try {
            const results = await searchYouTubeMusic(searchQuery);
            setSearchResults(results);
        } catch(err) {
            setSearchError(err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
            setIsSearching(false);
        }
    }
    
    const playYoutubeTrack = (track: YouTubeTrack) => {
        if (!isPlayerReady) {
            setSearchError("Player do YouTube ainda não está pronto. Tente novamente em alguns segundos.");
            return;
        }
        setYoutubeTrack(track);
        switchMode('youtube');
        intentToPlayYoutube.current = true;
        youtubePlayerRef.current.loadVideoById(track.id);
        if (!isExpanded) setIsExpanded(true);
    };
    
    return (
        <>
            <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => toTrack('next')} onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)} crossOrigin="anonymous" />
            <div id="youtube-player" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}></div>
            
            {isUploadModalOpen && <UploadSongModal onClose={() => setIsUploadModalOpen(false)} />}
            
            <div className="fixed bottom-4 left-4 right-4 sm:left-8 sm:right-auto z-50 flex items-end gap-3 pointer-events-none">
                 <button onClick={togglePlayPause} className="w-14 h-14 bg-dark/80 backdrop-blur-sm border-2 border-brand-red rounded-full flex items-center justify-center shadow-lg transform transition-all hover:scale-110 animate-glow pointer-events-auto">
                    <Icon name={isPlaying ? "Pause" : "Play"} className="w-6 h-6 text-brand-red" />
                </button>
                
                 <div className={`bg-dark/90 backdrop-blur-sm border border-brand-red/30 rounded-lg shadow-2xl shadow-brand-red/20 flex flex-col w-full sm:w-[350px] max-h-[70vh] sm:max-h-[500px] transition-all duration-300 ease-out origin-bottom-left ${isExpanded ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                    {/* Header */}
                    <div className="flex-shrink-0 flex items-center p-2 border-b border-gray-700">
                        <button onClick={() => switchMode('playlist')} className={`px-3 py-1.5 text-sm font-semibold transition-colors ${mode === 'playlist' ? 'text-brand-red border-b-2 border-brand-red' : 'text-gray-400 hover:text-white'}`}>Rádio ARC7HIVE</button>
                        <button onClick={() => switchMode('youtube')} className={`px-3 py-1.5 text-sm font-semibold transition-colors ${mode === 'youtube' ? 'text-brand-red border-b-2 border-brand-red' : 'text-gray-400 hover:text-white'}`}>YouTube</button>
                        <div className="flex-grow"></div>
                        <button onClick={() => setIsUploadModalOpen(true)} className="p-2 rounded-full text-gray-400 hover:bg-gray-800" title="Adicionar Música MP3"><Icon name="Upload" className="w-5 h-5" /></button>
                        <button onClick={() => setIsExpanded(false)} className="p-2 rounded-full text-gray-400 hover:bg-gray-800"><Icon name="X" className="w-5 h-5" /></button>
                    </div>

                    {/* Player Info Section */}
                    <div className="flex-shrink-0 p-3">
                         <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gray-800 rounded-md flex items-center justify-center text-brand-red overflow-hidden">
                                {mode === 'youtube' && youtubeTrack ? <img src={youtubeTrack.thumbnailUrl} alt={youtubeTrack.title} className="w-full h-full object-cover" /> : <Icon name="Heart" className="w-6 h-6" />}
                            </div>
                            <div className="flex-grow min-w-0">
                                <p className="text-sm font-bold text-white truncate" title={currentTrack?.title}>{currentTrack?.title || 'Selecione uma música'}</p>
                                <p className="text-xs text-gray-400 truncate" title={currentTrack?.artist}>{currentTrack?.artist || 'Rádio Colaborativa'}</p>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1">
                                <button onClick={() => toTrack('prev')} disabled={mode !== 'playlist'} className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-30"><Icon name="SkipBack" className="w-5 h-5"/></button>
                                <button onClick={() => toTrack('next')} disabled={mode !== 'playlist'} className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-30"><Icon name="SkipForward" className="w-5 h-5"/></button>
                            </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-gray-500">{formatTime(progress)}</span>
                            <div ref={progressBarRef} onClick={handleProgressClick} className="flex-grow h-1.5 bg-gray-700 rounded-full cursor-pointer group">
                                <div className="h-full bg-brand-red rounded-full relative" style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%', filter: 'drop-shadow(0 0 3px #E50914)'}}>
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{boxShadow: '0 0 6px 2px #E50914'}}></div>
                                </div>
                            </div>
                            <span className="text-xs text-gray-500">{formatTime(duration)}</span>
                            <button onClick={() => setIsMuted(p => !p)} className="p-1 text-gray-400 hover:text-white"><Icon name={isMuted ? 'VolumeOff' : 'VolumeUp'} className="w-4 h-4" /></button>
                        </div>
                    </div>
                    
                    {mode === 'playlist' && (
                        <div className="flex-grow overflow-y-auto space-y-2 p-3 pr-2">
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

                     {mode === 'youtube' && (
                        <div className="flex flex-col flex-grow min-h-0 px-3 pb-3">
                            <form onSubmit={handleSearch} className="relative py-3">
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar música ou artista..." className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 pl-4 pr-10 text-sm"/>
                                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-brand-red"><Icon name="Search" className="w-4 h-4"/></button>
                            </form>
                            <div className="flex-grow overflow-y-auto space-y-2 pr-1">
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
                        </div>
                     )}
                </div>
            </div>
        </>
    );
};

export default MusicPlayer;