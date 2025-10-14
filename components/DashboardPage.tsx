import React from 'react';
import type { User, LearningCategory, NextVideoInfo } from '../types';
import Icon from './Icons';
import Avatar from './Avatar';
import Section from './Section';
import ContinueLearningCard from './ContinueLearningCard';
import CategoryCard from './CategoryCard';

interface DashboardPageProps {
  user: User;
  categories: LearningCategory[];
  watchedVideos: Set<string>;
  nextVideoInfo: NextVideoInfo | null;
  onNavigate: (page: 'videos' | 'projects' | 'meeting', data?: any) => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenAdminPanel: () => void;
  onOpenMusicPlayer: () => void;
  nowPlaying: { title: string; artist: string } | null;
}

// Header as a sub-component
const DashboardHeader: React.FC<Pick<DashboardPageProps, 'user' | 'onLogout' | 'onOpenProfile' | 'onOpenAdminPanel' | 'onOpenMusicPlayer' | 'nowPlaying'>> = ({ user, onLogout, onOpenProfile, onOpenAdminPanel, onOpenMusicPlayer, nowPlaying }) => {
    return (
        <header className="bg-dark/80 backdrop-blur-sm border-b border-gray-900 sticky top-0 z-30">
            <div className="container mx-auto px-4 sm:px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <h1 className="text-3xl font-display tracking-[0.1em] text-white">
                            ARC<span className="text-brand-red">7</span>HIVE
                        </h1>
                        <button onClick={onOpenMusicPlayer} className="ml-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                            <Icon name="Heart" className="w-5 h-5 text-brand-red" />
                            <div className="hidden md:block">
                                {nowPlaying ? (
                                    <div className="marquee"><span>{nowPlaying.title} - {nowPlaying.artist}</span></div>
                                ) : "Rádio Colaborativa"}
                            </div>
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onOpenAdminPanel} className="p-2 rounded-full hover:bg-gray-800 transition-colors" title="Modo Desenvolvedor">
                           <Icon name="Gear" className="w-6 h-6" />
                        </button>
                        <button onClick={onLogout} className="p-2 rounded-full hover:bg-gray-800 transition-colors" title="Sair">
                           <Icon name="X" className="w-6 h-6" />
                        </button>
                        <div onClick={onOpenProfile} className="cursor-pointer">
                            <Avatar src={user.avatarUrl} name={user.name} size="md" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

const DashboardPage: React.FC<DashboardPageProps> = ({ user, categories, watchedVideos, nextVideoInfo, onNavigate, onLogout, onOpenProfile, onOpenAdminPanel, onOpenMusicPlayer, nowPlaying }) => {
    
    const calculateCategoryProgress = (category: LearningCategory): number => {
        const totalVideos = category.videos.length;
        if (totalVideos === 0) return 0;
        const watchedCount = category.videos.filter(v => watchedVideos.has(v.id)).length;
        return (watchedCount / totalVideos) * 100;
    };
    
    return (
        <div className="min-h-screen bg-darker text-white font-sans">
            <DashboardHeader user={user} onLogout={onLogout} onOpenProfile={onOpenProfile} onOpenAdminPanel={onOpenAdminPanel} onOpenMusicPlayer={onOpenMusicPlayer} nowPlaying={nowPlaying} />

            <main className="container mx-auto px-4 sm:px-6 py-8">
                <h2 className="text-4xl font-display tracking-wider text-white mb-8">Bem-vindo, <span className="text-brand-red">{user.name}</span>.</h2>
                
                {nextVideoInfo && (
                    <Section title="Continue de Onde Parou">
                        <ContinueLearningCard nextVideoInfo={nextVideoInfo} onClick={() => onNavigate('videos', { category: nextVideoInfo.category, videoId: nextVideoInfo.video.id })} />
                    </Section>
                )}
                
                <Section title="Trilhas de Conhecimento">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {categories.map((category, index) => (
                            <CategoryCard
                                key={category.id}
                                category={category}
                                progress={calculateCategoryProgress(category)}
                                onClick={() => onNavigate('videos', { category })}
                                style={{ animationDelay: `${index * 50}ms` }}
                            />
                        ))}
                    </div>
                </Section>
                
                <Section title="Acesso Rápido">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div onClick={() => onNavigate('meeting')} className="group relative bg-dark/50 border border-gray-800 rounded-lg p-6 flex items-center gap-6 cursor-pointer hover:bg-gray-800 transition-colors transform hover:-translate-y-1">
                            <Icon name="UsersGroup" className="w-12 h-12 text-brand-red flex-shrink-0" />
                            <div>
                                <h3 className="text-xl font-display text-white">Sala de Reunião</h3>
                                <p className="text-gray-400 text-sm mt-1">Colabore com sua equipe em tempo real.</p>
                            </div>
                        </div>
                         <div onClick={() => onNavigate('projects')} className="group relative bg-dark/50 border border-gray-800 rounded-lg p-6 flex items-center gap-6 cursor-pointer hover:bg-gray-800 transition-colors transform hover:-translate-y-1">
                            <Icon name="BookOpen" className="w-12 h-12 text-brand-red flex-shrink-0" />
                            <div>
                                <h3 className="text-xl font-display text-white">Área de Projetos</h3>
                                <p className="text-gray-400 text-sm mt-1">Crie e gerencie projetos com o poder da IA.</p>
                            </div>
                        </div>
                    </div>
                </Section>
            </main>
        </div>
    );
};

export default DashboardPage;
