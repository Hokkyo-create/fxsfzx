import React, { useState, useCallback } from 'react';
import type { LearningCategory, Video } from '../types';
import Icon from './Icons';
import VideoCard from './VideoCard';
import SocialMediaModal from './SocialMediaModal';
import { findMoreVideos } from '../services/geminiService';

interface VideoPlayerPageProps {
    category: LearningCategory;
    watchedVideos: Set<string>;
    onToggleVideoWatched: (videoId: string) => void;
    onAddVideos: (categoryId: string, newVideos: Video[]) => void;
    onBack: () => void;
}

const VideoPlayerPage: React.FC<VideoPlayerPageProps> = ({
    category,
    watchedVideos,
    onToggleVideoWatched,
    onAddVideos,
    onBack,
}) => {
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(category.videos[0] || null);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSelectVideo = (video: Video) => {
        setSelectedVideo(video);
    };

    const handleFindMoreVideos = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const existingVideoIds = category.videos.map(v => v.id);
            const newVideos = await findMoreVideos(category.title, existingVideoIds);
            if (newVideos.length > 0) {
                onAddVideos(category.id, newVideos);
            } else {
                setError("Não foram encontrados novos vídeos no momento.");
                setTimeout(() => setError(null), 5000);
            }
        } catch (err) {
            console.error("Failed to fetch new videos:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido ao buscar vídeos.";
            setError(errorMessage);
            // Don't auto-hide the specific API key error message.
            if (!errorMessage.includes("API do YouTube está bloqueada")) {
                setTimeout(() => setError(null), 5000);
            }
        } finally {
            setIsLoading(false);
        }
    }, [category, onAddVideos]);

    return (
        <div className="min-h-screen bg-darker text-white font-sans flex flex-col">
            {/* Header */}
            <header className="bg-dark border-b border-gray-900 sticky top-0 z-20">
                <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors mr-4">
                        <Icon name="ChevronLeft" className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <Icon name={category.icon} className="w-8 h-8" />
                        <h1 className="text-2xl font-display tracking-wider text-white">{category.title}</h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-4 sm:px-6 py-8 flex-grow flex flex-col lg:flex-row gap-8">
                {/* Video Player */}
                <main className="lg:w-2/3 flex-shrink-0">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl shadow-brand-red/10 border border-gray-800">
                        {selectedVideo ? (
                            <iframe
                                key={selectedVideo.id}
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0`}
                                title={selectedVideo.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-dark">
                                <p className="text-gray-400">Selecione um vídeo para começar.</p>
                            </div>
                        )}
                    </div>
                    {selectedVideo && (
                        <div className="mt-6">
                            <h2 className="text-3xl font-display tracking-wide text-white">{selectedVideo.title}</h2>
                            <div className="flex items-center justify-between mt-4">
                                <button
                                    onClick={() => onToggleVideoWatched(selectedVideo.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-colors ${
                                        watchedVideos.has(selectedVideo.id)
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-gray-700 hover:bg-gray-600'
                                    }`}
                                >
                                    <Icon name={watchedVideos.has(selectedVideo.id) ? "Check" : "Play"} className="w-5 h-5" />
                                    <span>{watchedVideos.has(selectedVideo.id) ? 'Concluído' : 'Marcar como concluído'}</span>
                                </button>
                                <button 
                                    onClick={() => setIsModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
                                >
                                    <Icon name="Share" className="w-5 h-5" />
                                    <span>Compartilhar</span>
                                </button>
                            </div>
                        </div>
                    )}
                </main>
                
                {/* Playlist */}
                <aside className="lg:w-1/3 lg:max-h-[calc(100vh-120px)] flex flex-col">
                    <h3 className="text-xl font-display tracking-wider text-white mb-4">Playlist da Trilha</h3>
                    <div className="flex-grow overflow-y-auto bg-dark border border-gray-800 rounded-lg p-2 space-y-2 custom-scrollbar">
                        {category.videos.map(video => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                isPlaying={selectedVideo?.id === video.id}
                                isWatched={watchedVideos.has(video.id)}
                                onSelect={() => handleSelectVideo(video)}
                            />
                        ))}
                         {category.videos.length === 0 && (
                            <p className="text-center text-gray-500 py-8">Ainda não há vídeos nesta trilha.</p>
                        )}
                    </div>
                    <div className="mt-4">
                         <button
                            onClick={handleFindMoreVideos}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:scale-100 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Buscando...
                                </>
                            ) : (
                                <>
                                    <Icon name="Plus" className="w-5 h-5" />
                                    Encontrar mais vídeos com IA
                                </>
                            )}
                        </button>
                        {error && <p className="text-sm text-center text-red-400 mt-2">{error}</p>}
                    </div>
                </aside>
            </div>
            
            {selectedVideo && (
                 <SocialMediaModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    videoUrl={`https://www.youtube.com/watch?v=${selectedVideo.id}`}
                    videoTitle={selectedVideo.title}
                />
            )}
        </div>
    );
};

export default VideoPlayerPage;