
import React, { useState, useEffect } from 'react';
import Icon from './Icons';
import type { Song } from '../types';
import { generateLiveStyles } from '../services/geminiService';
import { clearMeetingChat, uploadSong, setupPlaylistListener, deleteSong, formatSupabaseError } from '../services/supabaseService';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Music states
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [songFile, setSongFile] = useState<File | null>(null);
    const [songTitle, setSongTitle] = useState('');
    const [songArtist, setSongArtist] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    
    useEffect(() => {
        if (!isOpen) return; // Don't set up listener if the panel is not open

        const unsubscribe = setupPlaylistListener((playlistData, err) => {
            if (err) {
                setError(formatSupabaseError(err, 'playlist listener'));
            } else {
                setPlaylist(playlistData);
            }
        });
        return () => unsubscribe();
    }, [isOpen]); // Re-run effect if isOpen changes

    const applyStyles = (css: string) => {
        const styleId = 'custom-admin-styles';
        let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }
        styleElement.innerHTML = css;
    };

    const handleApplyStyles = async () => {
        if (!prompt.trim()) {
            setError('O prompt não pode estar vazio.');
            return;
        }
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            const generatedCss = await generateLiveStyles(prompt);
            applyStyles(generatedCss);
            localStorage.setItem('arc7hive_custom_styles', generatedCss);
            setMessage('Estilos aplicados com sucesso!');
             setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleResetStyles = () => {
        applyStyles('');
        localStorage.removeItem('arc7hive_custom_styles');
        setMessage('Estilos personalizados foram removidos.');
        setTimeout(() => setMessage(''), 3000);
    }

    const handleClearChat = async () => {
        if (window.confirm("Você tem certeza que deseja apagar TODAS as mensagens do chat da reunião? Esta ação é irreversível.")) {
            try {
                // This function is in supabaseService, but the original implementation was in Firebase.
                // Assuming the supabase one is now the source of truth.
                await clearMeetingChat();
                setMessage('O histórico do chat da reunião foi limpo com sucesso!');
                setTimeout(() => setMessage(''), 3000);
            } catch (err) {
                 const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
                 setError(`Falha ao limpar o chat: ${errorMessage}`);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files && e.target.files[0]) {
            setSongFile(e.target.files[0]);
        }
    }

    const handleUploadSong = async () => {
        if (!songFile || !songTitle || !songArtist) {
            setError("Por favor, preencha todos os campos da música.");
            return;
        }
        setIsUploading(true);
        setError('');
        try {
            await uploadSong(songFile, songTitle, songArtist);
            setMessage("Música enviada com sucesso!");
            setSongFile(null);
            setSongTitle('');
            setSongArtist('');
            // Clear the file input visually
            const fileInput = document.getElementById('song-file-input') as HTMLInputElement;
            if(fileInput) fileInput.value = '';

            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Falha no upload.';
            setError(errorMessage);
        } finally {
            setIsUploading(false);
        }
    }

    const handleDeleteSong = async (song: Song) => {
        if (window.confirm(`Tem certeza que deseja apagar a música "${song.title}"?`)) {
            try {
                await deleteSong(song);
                setMessage("Música apagada com sucesso.");
                setTimeout(() => setMessage(''), 3000);
            } catch (err) {
                 const errorMessage = err instanceof Error ? err.message : 'Falha ao apagar.';
                 setError(errorMessage);
            }
        }
    }

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl shadow-brand-red/20 w-full max-w-2xl mx-4 p-6 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-800 flex-shrink-0 mb-4">
                    <div className="flex items-center gap-3">
                        <Icon name="Gear" className="w-6 h-6 text-brand-red" />
                        <h3 className="text-xl font-display tracking-wider text-white">Modo Desenvolvedor</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <Icon name="X" className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Content */}
                <div className="space-y-6 overflow-y-auto pr-2">
                    {/* Style Editor */}
                     <div>
                        <h4 className="text-lg font-display tracking-wider text-white mb-2">Editor de Estilo (IA)</h4>
                        <textarea
                            id="prompt"
                            rows={3}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ex: Mude a cor de fundo dos cards para um gradiente de azul escuro e adicione uma borda branca..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-4 text-white focus:ring-2 focus:ring-brand-red focus:border-brand-red transition"
                        />
                         <div className="flex flex-col sm:flex-row gap-4 mt-2">
                            <button 
                                onClick={handleApplyStyles}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:scale-100 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Gerando...' : "Aplicar Estilos"}
                            </button>
                            <button 
                                onClick={handleResetStyles}
                                className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                            >
                                Resetar
                            </button>
                        </div>
                    </div>

                    {/* Music Management */}
                    <div className="border-t border-gray-800 pt-6 mt-6">
                        <h4 className="text-lg font-display tracking-wider text-white mb-2">Gerenciamento de Músicas</h4>
                        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input type="text" value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="Título da Música" className="bg-gray-800 border border-gray-700 rounded-md p-2 text-white" />
                                <input type="text" value={songArtist} onChange={e => setSongArtist(e.target.value)} placeholder="Nome do Artista" className="bg-gray-800 border border-gray-700 rounded-md p-2 text-white" />
                            </div>
                            <input id="song-file-input" type="file" onChange={handleFileChange} accept="audio/mp3,audio/mpeg" className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-red file:text-white hover:file:bg-red-700"/>
                             <button onClick={handleUploadSong} disabled={isUploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600">
                                {isUploading ? "Enviando..." : "Enviar Música"}
                             </button>
                        </div>
                        <div className="mt-4 max-h-40 overflow-y-auto space-y-2">
                            {playlist.map(song => (
                                <div key={song.id} className="flex justify-between items-center bg-gray-800 p-2 rounded-md">
                                    <div>
                                        <p className="font-semibold text-sm">{song.title}</p>
                                        <p className="text-xs text-gray-400">{song.artist}</p>
                                    </div>
                                    <button onClick={() => handleDeleteSong(song)} className="p-2 text-gray-400 hover:text-red-500 rounded-full">
                                        <Icon name="Trash" className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {error && <p className="text-sm text-center text-red-400 mt-2">{error}</p>}
                    {message && <p className="text-sm text-center text-green-400 mt-2">{message}</p>}

                    {/* Dangerous Actions */}
                    <div className="border-t border-gray-800 pt-6 mt-6">
                        <h4 className="text-lg font-display tracking-wider text-red-500 mb-2">Ações Perigosas</h4>
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                            <p className="text-sm text-gray-300 mb-4">
                                Esta ação é irreversível e afetará todos os usuários. Use com cuidado.
                            </p>
                            <button 
                                onClick={handleClearChat}
                                className="w-full sm:w-auto bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                            >
                                Limpar Histórico do Chat da Reunião
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
