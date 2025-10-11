import React, { useState } from 'react';
import Icon from './Icons';
import type { User } from '../types';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onStartGeneration: (topic: string, chapters: number) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onStartGeneration }) => {
    const [topic, setTopic] = useState('');
    const [chapters, setChapters] = useState(5);
    const [error, setError] = useState('');
    
    if (!isOpen) return null;

    const handleStart = (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) {
            setError('Por favor, insira um tópico para o projeto.');
            return;
        }
        if (chapters < 1 || chapters > 100) {
            setError('O número de capítulos deve estar entre 1 e 100.');
            return;
        }
        setError('');
        onStartGeneration(topic, chapters);
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <form 
                onSubmit={handleStart}
                className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-lg mx-4 p-8 flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-4">
                    <Icon name="Brain" className="w-6 h-6 text-brand-red" />
                    <h3 className="text-xl font-display tracking-wider text-white">Criar Novo Projeto com IA</h3>
                </div>
                <p className="text-gray-400 mb-6">Descreva o tópico e defina o número de capítulos. A IA cuidará da estrutura e do conteúdo inicial para você.</p>
                
                 <div className="space-y-4">
                    <div>
                        <label htmlFor="topic" className="text-sm font-medium text-gray-300 block mb-2">Tópico do Ebook</label>
                        <input
                           id="topic"
                           type="text"
                           value={topic}
                           onChange={(e) => setTopic(e.target.value)}
                           placeholder="Ex: Estratégias de Marketing para Instagram"
                           className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-4 text-white focus:ring-2 focus:ring-brand-red focus:border-brand-red transition"
                       />
                    </div>
                    <div>
                        <label htmlFor="chapters" className="text-sm font-medium text-gray-300 block mb-2">Número de Capítulos</label>
                        <input
                           id="chapters"
                           type="number"
                           value={chapters}
                           onChange={(e) => setChapters(parseInt(e.target.value, 10))}
                           min="1"
                           max="100"
                           className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-4 text-white focus:ring-2 focus:ring-brand-red focus:border-brand-red transition"
                       />
                    </div>
                </div>

                {error && <p className="text-sm text-center text-red-400 mt-4">{error}</p>}

                <div className="flex gap-4 mt-8">
                     <button type="button" onClick={onClose} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-md transition-colors">
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105"
                    >
                        Iniciar Geração
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateProjectModal;