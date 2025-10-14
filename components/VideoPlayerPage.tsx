// components/VideoPlayerPage.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import YouTube from 'react-youtube';
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
    initialVideoId: string | null;
}

const MAX_VIDEOS_PER_CATEGORY = 100;

const VideoPlayerPage: React.FC<VideoPlayerPageProps> = ({
    category,
    watchedVideos,
    onToggleVideoWatched,
    onAddVideos,
    onBack,
    initialVideoId,
}) => {
    const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isLoadingNewVideos, setIsLoadingNewVideos] = useState(false);
    
    // Refs for managing scroll and loading state to avoid stale closures in event handlers
    const playlistRef = useRef<HTMLDivElement>(null);
    const isLoadingRef = useRef(false);

    useEffect(() => {
        // On mount, set the initial video
        if (initialVideoId) {
            const video = category.videos.find(v => v.id === initialVideoId);
            if (video) {
                setCurrentVideo(video);
            } else if (category.videos.length > 0) {
                 setCurrentVideo(category.videos[0]);
            }
        } else if (category.videos.length > 0) {
            setCurrentVideo(category.videos[0]);
        }

    }, [category, initialVideoId]);

    const handleSelectVideo = (video: Video) => {
        setCurrentVideo(video);
    };
    
    // This function fetches new videos using the AI service.
    const fetchMoreVideos = useCallback(async () => {
        if (category.videos.length >= MAX_VIDEOS_PER_CATEGORY) {
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Limite de 100 vídeos por categoria atingido.' }}));
            return;
        }
        // Prevent multiple simultaneous fetches
        if (isLoadingRef.current) return;
        
        isLoadingRef.current = true;
        setIsLoadingNewVideos(true);
        
        try {
            const newVideos = await findMoreVideos(category.title, category.videos || []);
            
            if (newVideos.length > 0) {
                onAddVideos(category.id, newVideos);
                window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: `${newVideos.length} novos vídeos adicionados!` }}));
            } else {
                window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Nenhum vídeo novo encontrado pela IA. Tente novamente.' }}));
            }
        } catch (error) {
            console.error("Failed to find more videos:", error);
            const errorMessage = error instanceof Error ? error.message : 'Falha ao buscar novos vídeos.';
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'error', message: errorMessage }}));
        } finally {
            isLoadingRef.current = false;
            setIsLoadingNewVideos(false);
        }
    }, [category.title, category.videos, category.id, onAddVideos]);
    
    // Effect to handle the infinite scroll logic
    useEffect(() => {
        const target = playlistRef.current;

        const handleScroll = () => {
            if (target) {
                const isNearBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 200; // 200px threshold
                if (isNearBottom && !isLoadingRef.current && category.videos.length < MAX_VIDEOS_PER_CATEGORY) {
                    fetchMoreVideos();
                }
            }
        };

        if (target) {
            target.addEventListener('scroll', handleScroll);
            return () => {
                target.removeEventListener('scroll', handleScroll);
            };
        }
    }, [fetchMoreVideos, category.videos.length]);

    const isCurrentVideoWatched = currentVideo ? watchedVideos.has(currentVideo.id) : false;
    const currentVideoUrl = currentVideo ? `https://www.youtube.com/watch?v=${currentVideo.id}` : '';
    const hasReachedLimit = category.videos.length >= MAX_VIDEOS_PER_CATEGORY;

    const PlayerContent = () => {
        if (!currentVideo) {
            return (
                <div className="w-full h-full bg-black flex flex-col items-center justify-center text-gray-400">
                    <Icon name="Film" className="w-16 h-16 mb-4" />
                    <p className="px-4 text-center">
                        {category.videos.length > 0
                            ? "Selecione um vídeo da lista para começar."
                            : "Esta trilha ainda não tem vídeos. Clique em 'Carregar Mais' para que a IA encontre conteúdo relevante!"
                        }
                    </p>
                </div>
            )
        }
        
        return (
            <YouTube 
                videoId={currentVideo.id}
                opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1, modestbranding: 1, rel: 0 } }}
                className="w-full h-full"
                onEnd={() => onToggleVideoWatched(currentVideo.id)}
            />
        )
    };
    
    return (
        <>
            <div className="min-h-screen bg-darker text-white font-sans flex flex-col">
                <header className="bg-dark border-b border-gray-900 sticky top-0 z-20 flex-shrink-0">
                    <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors mr-2">
                                <Icon name="ChevronLeft" className="w-6 h-6" />
                            </button>
                            <Icon name={category.icon} className="w-8 h-8 text-brand-red" />
                            <div>
                                <h1 className="text-xl font-display tracking-wider text-white">{category.title}</h1>
                                <p className="text-xs text-gray-400">{category.description}</p>
                            </div>
                        </div>
                    </div>
                </header>
                
                <div className="flex-grow container mx-auto flex flex-col lg:flex-row gap-6 p-4 sm:p-6 overflow-hidden">
                    {/* Main Content: Video Player */}
                    <main className="flex-grow flex flex-col bg-dark border border-gray-800 rounded-lg">
                         <div className="w-full aspect-video bg-black rounded-t-lg">
                            <PlayerContent />
                         </div>
                         <div className="p-4">
                             <h2 className="text-lg font-bold text-white">{currentVideo?.title || 'Nenhum vídeo selecionado'}</h2>
                             <div className="flex items-center justify-between mt-3">
                                <button
                                     onClick={() => currentVideo && onToggleVideoWatched(currentVideo.id)}
                                     disabled={!currentVideo}
                                     className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
                                 >
                                    <Icon name="Check" className={`w-5 h-5 ${isCurrentVideoWatched ? 'text-green-400' : 'text-gray-500'}`} />
                                     <span>{isCurrentVideoWatched ? 'Concluído' : 'Marcar como concluído'}</span>
                                 </button>
                                 <button
                                     onClick={() => setIsShareModalOpen(true)}
                                     disabled={!currentVideo}
                                     className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
                                 >
                                     <Icon name="Share" className="w-5 h-5" />
                                     <span>Compartilhar</span>
                                 </button>
                             </div>
                         </div>
                    </main>

                    {/* Sidebar: Playlist */}
                    <aside className="w-full lg:w-1/3 lg:max-w-sm flex-shrink-0 bg-dark border border-gray-800 rounded-lg flex flex-col h-full max-h-[calc(100vh-150px)]">
                        <div className="flex-shrink-0 border-b border-gray-800 flex p-3">
                           <h3 className="font-display tracking-wider text-white text-lg">Próximos Vídeos</h3>
                        </div>
                         <div ref={playlistRef} className="flex-grow overflow-y-auto p-2 space-y-2">
                             {category.videos.length > 0 ? (
                                category.videos.map(video => (
                                    <VideoCard 
                                        key={video.id}
                                        video={video}
                                        isPlaying={currentVideo?.id === video.id}
                                        isWatched={watchedVideos.has(video.id)}
                                        onSelect={() => handleSelectVideo(video)}
                                    />
                                ))
                             ) : (
                                <div className="p-8 text-center text-gray-500">
                                    <p>Nenhum vídeo nesta categoria ainda.</p>
                                </div>
                             )}
                            {isLoadingNewVideos && (
                                <div className="flex justify-center items-center p-4">
                                    <svg className="animate-spin h-6 w-6 text-brand-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <span className="ml-2 text-gray-400">Buscando mais vídeos...</span>
                                </div>
                            )}
                         </div>
                         <div className="flex-shrink-0 p-2 border-t border-gray-800">
                            <button 
                                onClick={fetchMoreVideos} 
                                disabled={isLoadingNewVideos || hasReachedLimit}
                                className="w-full flex items-center justify-center gap-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                 {isLoadingNewVideos ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Buscando...
                                    </>
                                 ) : hasReachedLimit ? (
                                    'Limite de vídeos atingido'
                                 ) : (
                                    <>
                                        <Icon name="Plus" className="w-5 h-5" />
                                        Carregar Mais
                                    </>
                                 )}
                            </button>
                         </div>
                    </aside>
                </div>
            </div>
            {currentVideo && (
                 <SocialMediaModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    videoUrl={currentVideoUrl}
                    videoTitle={currentVideo.title}
                />
            )}
        </>
    );
};

export default VideoPlayerPage;