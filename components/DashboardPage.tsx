import React, { useState } from 'react';
import type { User, LearningCategory, NextVideoInfo } from '../types';
import CategoryCard from './CategoryCard';
import Icon from './Icons';
import Avatar from './Avatar';
import ContinueLearningCard from './ContinueLearningCard';

interface DashboardPageProps {
    user: User;
    onLogout: () => void;
    onSelectCategory: (category: LearningCategory, videoId?: string) => void;
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
    nextVideoInfo: NextVideoInfo | null;
    currentTrackInfo: { title: string; artist: string } | null;
}

const Widget: React.FC<{ title: string; children: React.ReactNode, className?: string, style?: React.CSSProperties }> = ({ title, children, className = '', style }) => (
    <div 
        style={style}
        className={`bg-dark/60 backdrop-blur-lg border border-gray-800/80 rounded-lg flex flex-col h-full shadow-2xl shadow-black/30 transition-all duration-300 hover:border-brand-red/50 group ${className}`}
    >
        <div className="flex-shrink-0 bg-black/30 border-b border-gray-800/80 px-4 py-2">
            <h2 className="text-sm font-mono text-gray-300 tracking-wider group-hover:text-white transition-colors">{title}</h2>
        </div>
        <div className="flex-grow p-4">
            {children}
        </div>
    </div>
);


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
    nextVideoInfo,
    currentTrackInfo,
}) => {
    const [showIosInstallMessage, setShowIosInstallMessage] = useState(false);

    const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window.navigator as any).standalone;
    
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
        <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
            {/* Taskbar Header */}
            <header className="bg-darker/80 backdrop-blur-lg border-b border-gray-900/50 sticky top-0 z-30 flex-shrink-0 animate-fade-in">
                <div className="container mx-auto px-4 sm:px-6 py-2 flex justify-between items-center gap-4">
                    <div className="text-2xl font-display tracking-widest text-white cursor-pointer hover:text-brand-red transition-colors [text-shadow:_0_0_8px_#E50914] hover:[text-shadow:_0_0_12px_#E50914] flex-shrink-0">
                        ARC<span className="text-brand-red">7</span>HIVE
                    </div>

                    <div className="flex-grow min-w-0 overflow-hidden hidden md:block mx-4">
                        {currentTrackInfo && (
                            <div className="animate-marquee whitespace-nowrap">
                                <span className="text-gray-400 font-mono text-sm">
                                    <span className="text-brand-red font-bold">♪ NOW PLAYING:</span> {currentTrackInfo.title} — {currentTrackInfo.artist}
                                </span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                         {canInstall && (
                            <button
                                onClick={handleInstallClick}
                                className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                                title="Instalar Aplicativo"
                            >
                                <Icon name="Download" className="w-5 h-5" />
                            </button>
                         )}
                         <button
                            onClick={onNavigateToProjects}
                            className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            title="Projetos"
                        >
                            <Icon name="BookOpen" className="w-5 h-5" />
                        </button>
                         <button
                            onClick={onNavigateToMeeting}
                            className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            title="Sala de Reunião"
                        >
                            <Icon name="UsersGroup" className="w-5 h-5" />
                        </button>
                         {user.name === 'Gustavo' && (
                            <button
                                onClick={onToggleAdminPanel}
                                className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                                title="Painel do Desenvolvedor"
                            >
                                <Icon name="Gear" className="w-5 h-5" />
                            </button>
                        )}
                        <div className="w-px h-6 bg-gray-700 mx-2"></div>
                        <button onClick={onOpenProfileModal} title="Alterar foto de perfil" className="transition-transform transform hover:scale-110">
                            <Avatar src={user.avatarUrl} name={user.name} />
                        </button>
                        <button 
                            onClick={onLogout}
                            className="bg-gray-800 hover:bg-brand-red text-white font-bold py-2 px-3 rounded-md transition-colors text-sm"
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            {/* Main "Desktop" Content */}
            <main className="container mx-auto px-4 sm:px-6 py-8 flex-grow">
                <div className="space-y-10">
                    {/* Welcome and Widgets Section */}
                    <section>
                        <div className="opacity-0 animate-stagger-in">
                            <h1 className="text-2xl font-mono text-gray-300">
                                Bem-vindo, {user.name}.
                            </h1>
                            <p className="text-gray-500 text-sm mt-1 font-mono">// Sistema ARC7HIVE operacional.</p>
                        </div>
                        
                        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 opacity-0 animate-stagger-in" style={{animationDelay: '150ms'}}>
                                <Widget title="[ Continuar Aprendendo ]" className="h-full">
                                    {nextVideoInfo ? (
                                        <ContinueLearningCard
                                            nextVideoInfo={nextVideoInfo}
                                            onClick={() => onSelectCategory(nextVideoInfo.category, nextVideoInfo.video.id)}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-center text-gray-500">
                                            <p>Ótimo trabalho! Você concluiu todos os vídeos.<br/>Explore as trilhas para encontrar mais conteúdo.</p>
                                        </div>
                                    )}
                                </Widget>
                            </div>
                            <div className="lg:col-span-1 opacity-0 animate-stagger-in" style={{animationDelay: '250ms'}}>
                                <Widget title="[ Progresso Geral ]" className="h-full">
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <div className="relative w-32 h-32">
                                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                                <path
                                                    className="text-gray-700/50"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none" stroke="currentColor" strokeWidth="2"
                                                />
                                                <path
                                                    className="text-brand-red drop-shadow-[0_0_5px_rgba(229,9,20,0.8)] transition-all duration-1000"
                                                    stroke="currentColor" strokeWidth="2"
                                                    strokeDasharray={`${overallProgress}, 100`}
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none" strokeLinecap="round" transform="rotate(-90 18 18)"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-3xl font-bold font-mono">{Math.round(overallProgress)}%</span>
                                            </div>
                                        </div>
                                        <p className="text-lg text-white mt-3 font-mono">{completedVideos} de {totalVideos} concluídos</p>
                                    </div>
                                </Widget>
                            </div>
                        </div>
                    </section>

                    {/* Desktop Icons Section */}
                     <section className="opacity-0 animate-stagger-in" style={{animationDelay: '350ms'}}>
                        <h2 className="text-2xl font-display tracking-wider text-white [text-shadow:_0_0_10px_rgba(255,255,255,0.4)]">TRILHAS DE CONHECIMENTO</h2>
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {categories.map((category, index) => {
                                const watchedInCategory = category.videos.filter(v => watchedVideos.has(v.id)).length;
                                const categoryProgress = category.videos.length > 0 ? (watchedInCategory / category.videos.length) * 100 : 0;
                                return (
                                    <CategoryCard 
                                        key={category.id} 
                                        category={category} 
                                        progress={categoryProgress}
                                        onClick={() => onSelectCategory(category)}
                                        style={{ animationDelay: `${400 + index * 50}ms` }}
                                    />
                                );
                            })}
                        </div>
                    </section>
                </div>
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