import React, { useState, useEffect } from 'react';
import type { User, LearningCategory } from '../types';
import CategoryCard from './CategoryCard';
import Icon from './Icons';
import Avatar from './Avatar';

interface DashboardPageProps {
    user: User;
    onLogout: () => void;
    onSelectCategory: (category: LearningCategory) => void;
    overallProgress: number;
    completedVideos: number;
    totalVideos: number;
    watchedVideos: Set<string>;
    categories: LearningCategory[];
    onToggleAdminPanel: () => void;
    onNavigateToMeeting: () => void;
    onNavigateToProjects: () => void;
    onOpenProfileModal: () => void;
    installPrompt: Event | null;
    loadingCategories: Set<string>;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
    user,
    onLogout,
    onSelectCategory,
    overallProgress,
    completedVideos,
    totalVideos,
    watchedVideos,
    categories,
    onToggleAdminPanel,
    onNavigateToMeeting,
    onNavigateToProjects,
    onOpenProfileModal,
    installPrompt,
    loadingCategories,
}) => {
    const [showIosInstallMessage, setShowIosInstallMessage] = useState(false);

    const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window.navigator as any).standalone;
    
    // The button should be shown if an install prompt is available OR if the user is on iOS
    const canInstall = installPrompt || isIos();

    const handleInstallClick = async () => {
        if (installPrompt) {
            // @ts-ignore
            installPrompt.prompt();
        } else if (isIos()) {
            setShowIosInstallMessage(true);
        }
    };

    return (
        <>
        <div className="min-h-screen bg-transparent text-white font-sans">
            {/* Header */}
            <header className="dashboard-header bg-darker/70 backdrop-blur-lg border-b border-gray-900/50 sticky top-0 z-10">
                <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
                    <div className="text-2xl font-display tracking-widest text-white">
                        ARC<span className="text-brand-red">7</span>HIVE
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-gray-300 hidden sm:block">Olá, {user.name}</span>
                            <button onClick={onOpenProfileModal} title="Alterar foto de perfil" className="transition-transform transform hover:scale-110">
                                <Avatar src={user.avatarUrl} name={user.name} />
                            </button>
                        </div>
                         {canInstall && (
                            <button
                                onClick={handleInstallClick}
                                className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                                title="Instalar Aplicativo"
                                aria-label="Instalar Aplicativo"
                            >
                                <Icon name="Download" className="w-6 h-6" />
                            </button>
                         )}
                         <button
                            onClick={onNavigateToProjects}
                            className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            title="Projetos"
                            aria-label="Abrir área de projetos"
                        >
                            <Icon name="BookOpen" className="w-6 h-6" />
                        </button>
                         <button
                            onClick={onNavigateToMeeting}
                            className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            title="Sala de Reunião"
                            aria-label="Abrir sala de reunião"
                        >
                            <Icon name="UsersGroup" className="w-6 h-6" />
                        </button>
                         {user.name === 'Gustavo' && (
                            <button
                                onClick={onToggleAdminPanel}
                                className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                                title="Painel do Desenvolvedor"
                            >
                                <Icon name="Gear" className="w-6 h-6" />
                            </button>
                        )}
                        <button 
                            onClick={onLogout}
                            className="bg-gray-800 hover:bg-brand-red text-white font-bold py-2 px-4 rounded-md transition-colors"
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 sm:px-6 py-8">
                {/* Progress Summary */}
                <section className="progress-summary-card bg-dark/50 backdrop-blur-lg border border-gray-800/60 rounded-lg p-6 mb-8 shadow-2xl shadow-black/30">
                    <h1 className="text-3xl font-display tracking-wider text-white mb-2">Seu Progresso</h1>
                    <p className="text-gray-400 mb-6">Continue aprendendo e expandindo seus conhecimentos.</p>
                    
                    <div className="flex items-center gap-6">
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path
                                    className="text-gray-700/50"
                                    d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                />
                                <path
                                    className="text-brand-red drop-shadow-[0_0_5px_rgba(229,9,20,0.5)]"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeDasharray={`${overallProgress}, 100`}
                                    d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    strokeLinecap="round"
                                    transform="rotate(-90 18 18)"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-3xl font-bold">{Math.round(overallProgress)}%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xl text-white">{completedVideos} de {totalVideos} vídeos concluídos</p>
                            <p className="text-gray-400 mt-1">Ótimo trabalho! Continue assim.</p>
                        </div>
                    </div>
                </section>

                {/* Categories Grid */}
                <section>
                    <h2 className="text-2xl font-display tracking-wider text-white mb-6">Trilhas de Conhecimento</h2>
                    <div className="categories-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map(category => {
                            const watchedInCategory = category.videos.filter(v => watchedVideos.has(v.id)).length;
                            const categoryProgress = category.videos.length > 0 ? (watchedInCategory / category.videos.length) * 100 : 0;
                            return (
                                <CategoryCard 
                                    key={category.id} 
                                    category={category} 
                                    progress={categoryProgress}
                                    onClick={() => onSelectCategory(category)} 
                                    isLoading={loadingCategories.has(category.id)}
                                />
                            );
                        })}
                    </div>
                </section>
            </main>
        </div>
        {showIosInstallMessage && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowIosInstallMessage(false)}>
                <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-sm mx-4 p-6 text-center" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-display tracking-wider text-white mb-4">Instalar no iPhone</h3>
                    <p className="text-gray-300 mb-4">
                        Para instalar, toque no ícone de Compartilhar <Icon name="Share" className="w-5 h-5 inline-block -mt-1 mx-1" /> na barra de ferramentas do Safari.
                    </p>
                    <p className="text-gray-300">
                        Depois, role para baixo e selecione <span className="font-bold">"Adicionar à Tela de Início"</span>.
                    </p>
                    <button onClick={() => setShowIosInstallMessage(false)} className="w-full mt-6 bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Entendi
                    </button>
                </div>
            </div>
        )}
        </>
    );
};

export default DashboardPage;