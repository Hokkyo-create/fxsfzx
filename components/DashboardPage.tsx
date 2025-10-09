import React from 'react';
import type { User, LearningCategory } from '../types';
import CategoryCard from './CategoryCard';
import Icon from './Icons';

interface DashboardPageProps {
    user: User;
    onLogout: () => void;
    onSelectCategory: (category: LearningCategory) => void;
    overallProgress: number;
    completedVideos: number;
    totalVideos: number;
    watchedVideos: Set<string>;
    categories: LearningCategory[];
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
}) => {
    return (
        <div className="min-h-screen bg-darker text-white font-sans">
            {/* Header */}
            <header className="bg-dark border-b border-gray-900 sticky top-0 z-10">
                <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
                    <div className="text-2xl font-display tracking-widest text-white">
                        ARC<span className="text-brand-red">7</span>HIVE
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-300">Olá, {user.name}</span>
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
                <section className="bg-dark border border-gray-800 rounded-lg p-6 mb-8 shadow-lg">
                    <h1 className="text-3xl font-display tracking-wider text-white mb-2">Seu Progresso</h1>
                    <p className="text-gray-400 mb-6">Continue aprendendo e expandindo seus conhecimentos.</p>
                    
                    <div className="flex items-center gap-6">
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path
                                    className="text-gray-700"
                                    d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                />
                                <path
                                    className="text-brand-red"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map(category => {
                            const watchedInCategory = category.videos.filter(v => watchedVideos.has(v.id)).length;
                            const categoryProgress = category.videos.length > 0 ? (watchedInCategory / category.videos.length) * 100 : 0;
                            return (
                                <CategoryCard 
                                    key={category.id} 
                                    category={category} 
                                    progress={categoryProgress}
                                    onClick={() => onSelectCategory(category)} 
                                />
                            );
                        })}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default DashboardPage;
