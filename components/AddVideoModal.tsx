// components/AddVideoModal.tsx
import React, { useState, useMemo } from 'react';
import type { Video, LearningCategory, YouTubePlaylist } from '../types';
import Icon from './Icons';
import { searchYouTubeVideos, getVideosFromPlaylistUrl, searchVideosByAI, searchYouTubePlaylists } from '../services/geminiService';

interface AddVideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddVideos: (videos: Video[]) => void;
    existingVideoIds: Set<string>;
    allCategories: LearningCategory[];
    categoryTitle: string;
}

const AddVideoModal: React.FC<AddVideoModalProps> = ({ isOpen, onClose, onAddVideos, existingVideoIds, allCategories, categoryTitle }) => {
    const [mode, setMode] = useState<'search' | 'playlist' | 'ai' | 'playlist-search'>('search');
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Video[]>([]);
    const [playlistResults, setPlaylistResults] = useState<Video[]>([]);
    const [suggestions, setSuggestions] = useState<YouTubePlaylist[]>([]);
    const [selectedPlaylistVideos, setSelectedPlaylistVideos] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const allVideos = useMemo(() => allCategories.flatMap(c => c.videos), [allCategories]);

    if (!isOpen) return null;
    
    const resetState = () => {
        setQuery('');
        setPlaylistUrl('');
        setSearchResults([]);
        setPlaylistResults([]);
        setSuggestions([]);
        setSelectedPlaylistVideos(new Set());
        setIsLoading(false);
        setError('');
    }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError('');
        setSearchResults([]);
        try {
            const foundVideos = await searchYouTubeVideos(query);
            setSearchResults(foundVideos);
            if (foundVideos.length === 0) {
                setError("Nenhum vídeo encontrado para esta busca.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao buscar vídeos.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAiSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError('');
        setSearchResults([]);
        try {
            const foundVideos = await searchVideosByAI(query, allVideos);
            setSearchResults(foundVideos);
            if (foundVideos.length === 0) {
                setError("Nenhum vídeo relevante encontrado em nossas playlists para esta busca.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha na busca com IA.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const importPlaylist = async (url: string) => {
        setIsLoading(true);
        setError('');
        setPlaylistResults([]);
        try {
            const videos = await getVideosFromPlaylistUrl(url, existingVideoIds);
            setPlaylistResults(videos);
            setSelectedPlaylistVideos(new Set(videos.map(v => v.id)));
            if (videos.length === 0) {
                setError("Nenhum vídeo novo encontrado nesta playlist. Eles podem já estar na trilha ou a playlist está vazia/privada.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao importar a playlist.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportPlaylistForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!playlistUrl.trim()) return;
        importPlaylist(playlistUrl);
    };

    const handleSearchPlaylists = async (searchQuery: string) => {
        setIsLoading(true);
        setError('');
        setSuggestions([]);
        try {
            const results = await searchYouTubePlaylists(searchQuery);
            setSuggestions(results);
            if (results.length === 0) {
                setError("Nenhuma playlist encontrada para esta busca.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao buscar playlists.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchPlaylistsForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        handleSearchPlaylists(query);
    };

    const handleSuggestionClick = (playlist: YouTubePlaylist) => {
        const url = `https://www.youtube.com/playlist?list=${playlist.id}`;
        setMode('playlist');
        setPlaylistUrl(url);
        importPlaylist(url);
    };

    const handleAddSingleVideo = (video: Video) => {
        onAddVideos([video]);
    };
    
    const handleAddSelectedFromPlaylist = () => {
        if(selectedPlaylistVideos.size > 0) {
            const videosToAdd = playlistResults.filter(v => selectedPlaylistVideos.has(v.id));
            onAddVideos(videosToAdd);
            setPlaylistResults([]);
            setSelectedPlaylistVideos(new Set());
        }
    };

    const handleToggleSelectVideo = (videoId: string) => {
        setSelectedPlaylistVideos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(videoId)) {
                newSet.delete(videoId);
            } else {
                newSet.add(videoId);
            }
            return newSet;
        });
    };

    const handleToggleSelectAll = () => {
        if (selectedPlaylistVideos.size === playlistResults.length) {
            setSelectedPlaylistVideos(new Set());
        } else {
            setSelectedPlaylistVideos(new Set(playlistResults.map(v => v.id)));
        }
    };


    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-3xl mx-4 p-6 flex flex-col h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-4 border-b border-gray-800 flex-shrink-0 mb-4">
                    <h3 className="text-xl font-display tracking-wider text-white">Adicionar Conteúdo do YouTube</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <Icon name="X" className="w-5 h-5" />
                    </button>
                </div>
                
                 <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-lg bg-gray-900 mb-4">
                    <button onClick={() => { setMode('search'); resetState(); }} className={`py-1.5 text-sm font-semibold rounded-md transition-colors ${mode === 'search' ? 'text-white bg-brand-red' : 'text-gray-400 hover:bg-gray-800'}`}>Buscar Vídeo</button>
                    <button onClick={() => { setMode('playlist-search'); resetState(); }} className={`py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${mode === 'playlist-search' ? 'text-white bg-brand-red' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <Icon name="Search" className="w-4 h-4"/> Buscar Playlist
                    </button>
                    <button onClick={() => { setMode('ai'); resetState(); }} className={`py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${mode === 'ai' ? 'text-white bg-brand-red' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <Icon name="Sparkles" className="w-4 h-4"/> Busca IA
                    </button>
                    <button onClick={() => { setMode('playlist'); resetState(); }} className={`py-1.5 text-sm font-semibold rounded-md transition-colors ${mode === 'playlist' ? 'text-white bg-brand-red' : 'text-gray-400 hover:bg-gray-800'}`}>Importar URL</button>
                </div>

                {mode === 'search' ? (
                    <>
                        <form onSubmit={handleSearch} className="relative flex-shrink-0">
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Buscar no YouTube..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-full py-2 pl-4 pr-12 text-white focus:ring-2 focus:ring-brand-red"
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-brand-red disabled:text-gray-600" disabled={isLoading}>
                                {isLoading ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Icon name="Search" className="w-5 h-5" />}
                            </button>
                        </form>
                         <div className="flex-grow overflow-y-auto mt-4 pr-2 space-y-2">
                             {error && <p className="text-center text-red-400 p-4">{error}</p>}
                             {searchResults.length > 0 ? searchResults.map(video => {
                                 const isAdded = existingVideoIds.has(video.id);
                                 return (
                                     <div key={video.id} className="flex items-center gap-4 p-2 rounded-lg bg-gray-800/50">
                                         <img src={video.thumbnailUrl} alt={video.title} className="w-28 h-16 object-cover rounded flex-shrink-0" />
                                         <div className="min-w-0">
                                             <p className="text-sm font-semibold text-white line-clamp-2">{video.title}</p>
                                             <p className="text-xs text-gray-400">{video.duration}</p>
                                         </div>
                                         <button
                                             onClick={() => handleAddSingleVideo(video)}
                                             disabled={isAdded}
                                             className="ml-auto flex-shrink-0 flex items-center gap-2 bg-gray-700 hover:bg-brand-red text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors disabled:bg-green-600 disabled:cursor-not-allowed"
                                         >
                                             <Icon name={isAdded ? "Check" : "Plus"} className="w-4 h-4" />
                                             <span>{isAdded ? "Adicionado" : "Adicionar"}</span>
                                         </button>
                                     </div>
                                 );
                             }) : !isLoading && !error && <p className="text-center text-gray-500 pt-8">Faça uma busca para encontrar vídeos.</p>}
                         </div>
                    </>
                ) : mode === 'ai' ? (
                     <>
                        <form onSubmit={handleAiSearch} className="relative flex-shrink-0">
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Buscar em todas as playlists com IA..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-full py-2 pl-4 pr-12 text-white focus:ring-2 focus:ring-brand-red"
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-brand-red disabled:text-gray-600" disabled={isLoading}>
                                {isLoading ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Icon name="Sparkles" className="w-5 h-5" />}
                            </button>
                        </form>
                         <div className="flex-grow overflow-y-auto mt-4 pr-2 space-y-2">
                             {error && <p className="text-center text-red-400 p-4">{error}</p>}
                             {searchResults.length > 0 ? searchResults.map(video => {
                                 const isAdded = existingVideoIds.has(video.id);
                                 return (
                                     <div key={video.id} className="flex items-center gap-4 p-2 rounded-lg bg-gray-800/50">
                                         <img src={video.thumbnailUrl} alt={video.title} className="w-28 h-16 object-cover rounded flex-shrink-0" />
                                         <div className="min-w-0">
                                             <p className="text-sm font-semibold text-white line-clamp-2">{video.title}</p>
                                             <p className="text-xs text-gray-400">{video.duration}</p>
                                         </div>
                                         <button
                                             onClick={() => handleAddSingleVideo(video)}
                                             disabled={isAdded}
                                             className="ml-auto flex-shrink-0 flex items-center gap-2 bg-gray-700 hover:bg-brand-red text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors disabled:bg-green-600 disabled:cursor-not-allowed"
                                         >
                                             <Icon name={isAdded ? "Check" : "Plus"} className="w-4 h-4" />
                                             <span>{isAdded ? "Adicionado" : "Adicionar"}</span>
                                         </button>
                                     </div>
                                 );
                             }) : !isLoading && !error && <p className="text-center text-gray-500 pt-8">Use a busca inteligente para encontrar vídeos relevantes em todas as trilhas de conhecimento.</p>}
                         </div>
                    </>
                 ) : mode === 'playlist-search' ? (
                     <>
                        <form onSubmit={handleSearchPlaylistsForm} className="relative flex-shrink-0">
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder={`Buscar playlists sobre "${categoryTitle}"...`}
                                className="w-full bg-gray-900 border border-gray-700 rounded-full py-2 pl-4 pr-12 text-white focus:ring-2 focus:ring-brand-red"
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-brand-red disabled:text-gray-600" disabled={isLoading}>
                                {isLoading ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Icon name="Search" className="w-5 h-5" />}
                            </button>
                        </form>
                        <div className="flex-grow overflow-y-auto mt-4 pr-2 space-y-2">
                             {isLoading && <div className="text-center pt-8"><svg className="animate-spin h-8 w-8 text-brand-red mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>}
                            {error && <p className="text-center text-red-400 p-4">{error}</p>}
                            {suggestions.length > 0 ? (
                                suggestions.map(playlist => (
                                    <div key={playlist.id} onClick={() => handleSuggestionClick(playlist)} className="flex items-center gap-4 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 cursor-pointer transition-colors">
                                        <img src={playlist.thumbnailUrl} alt={playlist.title} className="w-28 h-16 object-cover rounded flex-shrink-0"/>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-white line-clamp-2">{playlist.title}</p>
                                            <p className="text-xs text-gray-400">{playlist.uploaderName} • {playlist.videoCount} vídeos</p>
                                        </div>
                                    </div>
                                ))
                            ) : !isLoading && !error && (
                                <p className="text-center text-gray-500 pt-8">Busque por um tópico para encontrar playlists relevantes.</p>
                            )}
                        </div>
                    </>
                ) : ( // Playlist mode
                     <>
                        <form onSubmit={handleImportPlaylistForm} className="relative flex-shrink-0 flex gap-2">
                             <input
                                 type="url"
                                 value={playlistUrl}
                                 onChange={e => setPlaylistUrl(e.target.value)}
                                 placeholder="Cole a URL da playlist do YouTube aqui"
                                 className="flex-grow bg-gray-900 border border-gray-700 rounded-full py-2 px-4 text-white focus:ring-2 focus:ring-brand-red"
                             />
                             <button type="submit" className="flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-full text-sm disabled:bg-gray-600" disabled={isLoading}>
                                 {isLoading ? 'Importando...' : 'Importar'}
                             </button>
                         </form>
                         {playlistResults.length > 0 && (
                            <div className="flex-shrink-0 flex justify-between items-center mt-4 p-2 bg-gray-900 rounded-md">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedPlaylistVideos.size === playlistResults.length}
                                        onChange={handleToggleSelectAll}
                                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-brand-red focus:ring-brand-red"
                                    />
                                    <span className="text-sm font-semibold text-gray-300">
                                        {selectedPlaylistVideos.size} de {playlistResults.length} selecionados
                                    </span>
                                </div>
                                <button onClick={handleAddSelectedFromPlaylist} disabled={selectedPlaylistVideos.size === 0} className="flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-semibold py-2 px-3 rounded-md text-sm disabled:opacity-50">
                                    <Icon name="Plus" className="w-4 h-4"/>
                                    Adicionar Selecionados
                                </button>
                            </div>
                         )}
                         <div className="flex-grow overflow-y-auto mt-4 pr-2 space-y-2">
                             {error && <p className="text-center text-red-400 p-4">{error}</p>}
                             {playlistResults.length > 0 ? playlistResults.map(video => (
                                 <div key={video.id} className={`flex items-center gap-4 p-2 rounded-lg bg-gray-800/50 cursor-pointer transition-colors ${selectedPlaylistVideos.has(video.id) ? 'ring-2 ring-brand-red' : 'hover:bg-gray-700/50'}`} onClick={() => handleToggleSelectVideo(video.id)}>
                                     <input
                                        type="checkbox"
                                        checked={selectedPlaylistVideos.has(video.id)}
                                        onChange={() => handleToggleSelectVideo(video.id)}
                                        className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-brand-red focus:ring-brand-red flex-shrink-0"
                                        onClick={e => e.stopPropagation()}
                                    />
                                     <img src={video.thumbnailUrl} alt={video.title} className="w-28 h-16 object-cover rounded flex-shrink-0" />
                                     <div className="min-w-0">
                                         <p className="text-sm font-semibold text-white line-clamp-2">{video.title}</p>
                                         <p className="text-xs text-gray-400">{video.duration}</p>
                                     </div>
                                 </div>
                             )) : !isLoading && !error && <p className="text-center text-gray-500 pt-8">Insira uma URL de playlist para importar vídeos.</p>}
                         </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AddVideoModal;