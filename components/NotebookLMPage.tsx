import React from 'react';
import Icon from './Icons';

interface NotebookLMPageProps {
    onBack: () => void;
}

const NotebookLMPage: React.FC<NotebookLMPageProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-darker text-white font-sans flex flex-col">
            {/* Header */}
            <header className="bg-dark border-b border-gray-900 sticky top-0 z-20 flex-shrink-0">
                <div className="container mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors mr-4">
                                <Icon name="ChevronLeft" className="w-6 h-6" />
                            </button>
                            <div className="flex items-center gap-3">
                                <Icon name="Pencil" className="w-8 h-8 text-brand-red" />
                                <div>
                                    <h1 className="text-xl font-display tracking-wider text-white">Modo Notebook LM</h1>
                                    <p className="text-xs text-gray-400">Seu assistente de pesquisa e escrita</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-grow container mx-auto px-4 sm:px-6 py-8 flex items-center justify-center">
                <div className="text-center">
                    <Icon name="Wrench" className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h2 className="text-3xl font-display text-white">Em Desenvolvimento</h2>
                    <p className="text-gray-400 mt-2 max-w-md">
                        Esta área será seu espaço dedicado para pesquisar tópicos, fazer anotações e estruturar seus projetos com a ajuda da IA, similar ao NotebookLM.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default NotebookLMPage;
