import React, { useState, useEffect } from 'react';
import Icon from './Icons';
import { generateLiveStyles } from '../services/geminiService';

interface AdminPanelProps {
    onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
    const [apiKey, setApiKey] = useState('');
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const storedKey = localStorage.getItem('arc7hive_admin_api_key');
        if (storedKey) {
            setApiKey(storedKey);
        }
    }, []);

    const handleSaveKey = () => {
        localStorage.setItem('arc7hive_admin_api_key', apiKey);
        setMessage('Chave de API salva com sucesso no seu navegador.');
        setTimeout(() => setMessage(''), 3000);
    };

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
            const generatedCss = await generateLiveStyles(prompt, apiKey);
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

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl shadow-brand-red/20 w-full max-w-2xl mx-4 p-6 flex flex-col">
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
                <div className="space-y-6">
                    <div>
                        <label htmlFor="api-key" className="text-sm font-medium text-gray-300 block mb-2">Sua Chave de API (OpenAI, Gemini, etc.)</label>
                        <div className="flex gap-2">
                           <input
                                id="api-key"
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Cole sua chave de API aqui"
                                className="flex-grow w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-4 text-white focus:ring-2 focus:ring-brand-red focus:border-brand-red transition"
                            />
                            <button onClick={handleSaveKey} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                Salvar
                            </button>
                        </div>
                         <p className="text-xs text-gray-500 mt-2">Sua chave é salva apenas no seu navegador e nunca é exposta.</p>
                    </div>

                     <div>
                        <label htmlFor="prompt" className="text-sm font-medium text-gray-300 block mb-2">Comando de Estilo (Prompt)</label>
                        <textarea
                            id="prompt"
                            rows={4}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ex: Mude a cor de fundo dos cards para um gradiente de azul escuro e adicione uma borda branca..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-4 text-white focus:ring-2 focus:ring-brand-red focus:border-brand-red transition"
                        />
                    </div>
                    
                    {error && <p className="text-sm text-center text-red-400">{error}</p>}
                    {message && <p className="text-sm text-center text-green-400">{message}</p>}

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                            onClick={handleApplyStyles}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:scale-100 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Gerando...
                                </>
                            ) : "Aplicar Estilos com IA"}
                        </button>
                        <button 
                            onClick={handleResetStyles}
                            className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-md transition-colors"
                        >
                            Resetar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
