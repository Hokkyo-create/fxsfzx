import React, { useState } from 'react';
import Icon from './Icons';
import type { User, ProjectGenerationConfig } from '../types';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onStartGeneration: (config: ProjectGenerationConfig) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onStartGeneration }) => {
    const [topic, setTopic] = useState('');
    const [error, setError] = useState('');
    
    if (!isOpen) return null;

    const handleStart = (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) {
            setError('Por favor, insira um tópico para o projeto.');
            return;
        }
        setError('');
        onStartGeneration({ topic, chapters: 10 }); // Always generate a detailed ebook
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
                <p className="text-gray-400 mb-6">Descreva o tópico e a IA cuidará da estrutura e do conteúdo inicial para você, criando um ebook completo.</p>
                
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
                </div>

                <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-900/50 rounded-md border border-gray-800">
                    <strong>Nota:</strong> A IA agora criará um ebook mais completo, com 10 a 12 capítulos, para garantir um conteúdo mais aprofundado.
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