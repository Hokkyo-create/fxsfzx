// components/VideoPlayerPage.tsx
import React, { useState, useEffect } from 'react';
import YouTube from 'react-youtube';
import type { LearningCategory, Video } from '../types';
import Icon from './Icons';
import VideoCard from './VideoCard';
import SocialMediaModal from './SocialMediaModal';
import AddVideoModal from './AddVideoModal';

interface VideoPlayerPageProps {
    category: LearningCategory;
    watchedVideos: Set<string>;
    onToggleVideoWatched: (videoId: string) => void;
    onAddVideos: (categoryId: string, newVideos: Video[]) => void;
    onBack: () => void;
    initialVideoId: string | null;
}

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
    const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false);
    
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
    
    const isCurrentVideoWatched = currentVideo ? watchedVideos.has(currentVideo.id) : false;
    const currentVideoUrl = currentVideo ? `https://www.youtube.com/watch?v=${currentVideo.id}` : '';

    const PlayerContent = () => {
        if (!currentVideo) {
            return (
                <div className="w-full h-full bg-black flex flex-col items-center justify-center text-gray-400">
                    <Icon name="Film" className="w-16 h-16 mb-4" />
                    <p className="px-4 text-center">
                        {category.videos.length > 0
                            ? "Selecione um vídeo da lista para começar."
                            : "Esta trilha ainda não tem vídeos. Clique em 'Adicionar Vídeo' para começar a montar a playlist!"
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
                         <div className="flex-grow overflow-y-auto p-2 space-y-2">
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
                         </div>
                         <div className="flex-shrink-0 p-2 border-t border-gray-800">
                            <button 
                                onClick={() => setIsAddVideoModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-semibold py-2 px-4 rounded-md transition-colors"
                            >
                                <Icon name="Plus" className="w-5 h-5" />
                                Adicionar Vídeo
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
            <AddVideoModal
                isOpen={isAddVideoModalOpen}
                onClose={() => setIsAddVideoModalOpen(false)}
                onAddVideos={(videos) => {
                    onAddVideos(category.id, videos);
                    const message = videos.length > 1 
                        ? `${videos.length} vídeos adicionados com sucesso!`
                        : 'Vídeo adicionado com sucesso!';
                    window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message }}));
                }}
                existingVideoIds={new Set(category.videos.map(v => v.id))}
            />
        </>
    );
};

export default VideoPlayerPage;