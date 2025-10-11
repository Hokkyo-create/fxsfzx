// components/EditImageModal.tsx
import React, { useState, useEffect } from 'react';
import Icon from './Icons';
import { generatePromptIdeas } from '../services/geminiService';

interface EditImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl?: string;
    getInitialPrompt: () => Promise<string>;
    onRegenerate: (newPrompt: string) => Promise<string>;
    onSave: (newImageUrl: string) => void;
}

const EditImageModal: React.FC<EditImageModalProps> = ({ isOpen, onClose, imageUrl, getInitialPrompt, onRegenerate, onSave }) => {
    const [prompt, setPrompt] = useState('');
    const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setSuggestions([]); // Reset suggestions on open
            getInitialPrompt().then(p => {
                setPrompt(p);
                setIsLoading(false);
            });
            setCurrentImageUrl(imageUrl);
        }
    }, [isOpen, imageUrl, getInitialPrompt]);

    if (!isOpen) return null;

    const handleRegenerate = async () => {
        setIsLoading(true);
        setSuggestions([]); // Clear old suggestions
        try {
            const newUrl = await onRegenerate(prompt);
            setCurrentImageUrl(newUrl);
        } catch (e) {
            console.error(e);
            alert("Falha ao regenerar imagem.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateSuggestions = async () => {
        setIsSuggesting(true);
        try {
            const ideas = await generatePromptIdeas(prompt);
            setSuggestions(ideas);
        } catch (e) {
            console.error(e);
            alert("Falha ao gerar ideias de prompt.");
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleSave = () => {
        if (currentImageUrl) {
            onSave(currentImageUrl);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div 
                className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-2xl mx-4 p-6 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-4 border-b border-gray-800 flex-shrink-0 mb-4">
                    <div className="flex items-center gap-3">
                        <Icon name="Pencil" className="w-6 h-6 text-brand-red" />
                        <h3 className="text-xl font-display tracking-wider text-white">Editar Imagem com IA</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <Icon name="X" className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-6 overflow-hidden">
                    <div className="md:w-1/2 h-full flex items-center justify-center bg-gray-900/50 rounded-lg p-2 min-h-[200px]">
                         {isLoading && !currentImageUrl ? (
                            <div className="flex flex-col items-center gap-2 text-gray-400">
                                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Carregando...
                            </div>
                         ) : currentImageUrl ? (
                            <div className="relative w-full h-full">
                                <img src={currentImageUrl} alt="Preview da imagem" className="max-h-full max-w-full object-contain rounded-md" />
                                {isLoading && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-md">
                                         <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    </div>
                                )}
                            </div>
                         ) : (
                             <p className="text-gray-500">Sem imagem</p>
                         )}
                    </div>
                    <div className="md:w-1/2 flex flex-col">
                        <label htmlFor="prompt" className="text-sm font-medium text-gray-300 block mb-2">Prompt da Imagem (em inglês)</label>
                        <textarea
                            id="prompt"
                            rows={4}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Descreva a imagem que você deseja gerar..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-4 text-white focus:ring-2 focus:ring-brand-red focus:border-brand-red transition"
                            disabled={isLoading || isSuggesting}
                        />
                         <div className="flex gap-2 mt-2">
                            <button 
                                onClick={handleGenerateSuggestions}
                                disabled={isLoading || isSuggesting}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-md transition-colors text-sm disabled:opacity-50"
                            >
                                <Icon name="Brain" className="w-4 h-4" />
                                {isSuggesting ? 'Analisando...' : 'Gerar Ideias'}
                            </button>
                            <button 
                                onClick={handleRegenerate}
                                disabled={isLoading || isSuggesting}
                                className="flex-1 flex items-center justify-center gap-2 bg-brand-red/80 hover:bg-brand-red text-white font-semibold py-2 px-3 rounded-md transition-colors text-sm disabled:opacity-50"
                            >
                                Regenerar
                            </button>
                         </div>
                         {suggestions.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs text-gray-400">Sugestões da IA:</p>
                                {suggestions.map((s, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => setPrompt(s)}
                                        className="w-full text-left text-xs p-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors text-gray-300"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                         )}
                    </div>
                </div>
                
                <div className="flex gap-4 mt-6 pt-4 border-t border-gray-800">
                     <button type="button" onClick={onClose} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-md transition-colors">
                        Cancelar
                    </button>
                    <button 
                        type="button"
                        onClick={handleSave}
                        className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105"
                    >
                        Salvar Imagem
                    </button>
                </div>

            </div>
        </div>
    );
};

export default EditImageModal;