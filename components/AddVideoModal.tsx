// components/AddVideoModal.tsx
import React, { useState } from 'react';
import type { Video } from '../types';
import Icon from './Icons';
import { searchYouTubeVideos, getVideosFromPlaylistUrl } from '../services/geminiService';

interface AddVideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddVideos: (videos: Video[]) => void;
    existingVideoIds: Set<string>;
}

const AddVideoModal: React.FC<AddVideoModalProps> = ({ isOpen, onClose, onAddVideos, existingVideoIds }) => {
    const [mode, setMode] = useState<'search' | 'playlist'>('search');
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Video[]>([]);
    const [playlistResults, setPlaylistResults] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;
    
    const resetState = () => {
        setQuery('');
        setPlaylistUrl('');
        setSearchResults([]);
        setPlaylistResults([]);
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

    const handleImportPlaylist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!playlistUrl.trim()) return;

        setIsLoading(true);
        setError('');
        setPlaylistResults([]);
        try {
            const videos = await getVideosFromPlaylistUrl(playlistUrl, existingVideoIds);
            setPlaylistResults(videos);
            if (videos.length === 0) {
                 setError("Nenhum vídeo novo encontrado nesta playlist. Eles podem já estar na trilha ou a playlist está vazia/privada.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao importar a playlist.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSingleVideo = (video: Video) => {
        onAddVideos([video]);
    };
    
    const handleAddAllFromPlaylist = () => {
        if(playlistResults.length > 0) {
            onAddVideos(playlistResults);
            setPlaylistResults([]); // Clear results after adding to prevent re-adding
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
                
                 <div className="flex-shrink-0 flex items-center p-1 rounded-lg bg-gray-900 mb-4">
                    <button onClick={() => { setMode('search'); resetState(); }} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${mode === 'search' ? 'text-white bg-brand-red' : 'text-gray-400 hover:bg-gray-800'}`}>Buscar Vídeo</button>
                    <button onClick={() => { setMode('playlist'); resetState(); }} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${mode === 'playlist' ? 'text-white bg-brand-red' : 'text-gray-400 hover:bg-gray-800'}`}>Importar Playlist</button>
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
                ) : (
                     <>
                        <form onSubmit={handleImportPlaylist} className="relative flex-shrink-0 flex gap-2">
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
                                <span className="text-sm font-semibold text-gray-300">{playlistResults.length} vídeos novos encontrados.</span>
                                <button onClick={handleAddAllFromPlaylist} className="flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-semibold py-2 px-3 rounded-md text-sm">
                                    <Icon name="Plus" className="w-4 h-4"/>
                                    Adicionar Todos
                                </button>
                            </div>
                         )}
                         <div className="flex-grow overflow-y-auto mt-4 pr-2 space-y-2">
                             {error && <p className="text-center text-red-400 p-4">{error}</p>}
                             {playlistResults.length > 0 ? playlistResults.map(video => (
                                 <div key={video.id} className="flex items-center gap-4 p-2 rounded-lg bg-gray-800/50">
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