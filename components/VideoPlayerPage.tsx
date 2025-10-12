import React, { useState, useEffect } from 'react';
import type { LearningCategory, Video } from '../types';
import Icon from './Icons';
import VideoCard from './VideoCard';
import SocialMediaModal from './SocialMediaModal';
import { findVideos } from '../services/geminiService';
import SocialEmbed from './SocialEmbed';

interface VideoPlayerPageProps {
    category: LearningCategory;
    watchedVideos: Set<string>;
    onToggleVideoWatched: (videoId: string) => void;
    onAddVideos: (categoryId: string, newVideos: Video[], platform: 'youtube' | 'tiktok' | 'instagram') => void;
    onBack: () => void;
}

const VideoPlayerPage: React.FC<VideoPlayerPageProps> = ({
    category,
    watchedVideos,
    onToggleVideoWatched,
    onAddVideos,
    onBack,
}) => {
    const [activePlatform, setActivePlatform] = useState<'youtube' | 'tiktok' | 'instagram'>('youtube');
    
    const youtubeVideos = category.videos || [];
    const tiktokVideos = category.tiktokVideos || [];
    const instagramVideos = category.instagramVideos || [];

    const videoLists = {
        youtube: youtubeVideos,
        tiktok: tiktokVideos,
        instagram: instagramVideos,
    };
    
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(videoLists[activePlatform][0] || null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isLoadingNewVideos, setIsLoadingNewVideos] = useState(false);
    const [searchError, setSearchError] = useState('');

    // Effect to update selected video when platform or category changes
    useEffect(() => {
        const currentList = videoLists[activePlatform];
        setSelectedVideo(currentList[0] || null);
        setSearchError(''); // Clear error on platform switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePlatform, category]);


    const handleFindMore = async () => {
        setIsLoadingNewVideos(true);
        setSearchError('');
        try {
            const newVideos = await findVideos(category.title, activePlatform);
            if (newVideos && newVideos.length >= 5) {
                onAddVideos(category.id, newVideos, activePlatform);
            } else if (newVideos && newVideos.length > 0) {
                 onAddVideos(category.id, newVideos, activePlatform);
                 setSearchError(`A busca com IA encontrou apenas ${newVideos.length} vídeos. Tente novamente mais tarde.`);
            } else {
                setSearchError(`Nenhum vídeo novo encontrado para ${activePlatform}. A IA não conseguiu encontrar conteúdo relevante.`);
            }
        } catch (error) {
            console.error(`Failed to find more videos for ${activePlatform}:`, error);
            const message = error instanceof Error ? error.message : 'Ocorreu um erro ao buscar novos vídeos.';
            setSearchError(message);
        } finally {
            setIsLoadingNewVideos(false);
        }
    };
    
    const getShareUrl = () => {
        if (!selectedVideo) return '';
        if (activePlatform === 'youtube') return `https://www.youtube.com/watch?v=${selectedVideo.id}`;
        if (activePlatform === 'tiktok') return `https://www.tiktok.com/@placeholder/video/${selectedVideo.id}`;
        if (activePlatform === 'instagram') return `https://www.instagram.com/p/${selectedVideo.id}/`;
        return '';
    };

    const renderPlayer = () => {
        if (!selectedVideo) {
            return (
                <div className="w-full h-full bg-black flex flex-col items-center justify-center text-gray-500 rounded-lg">
                    <Icon name="Film" className="w-24 h-24 mb-4" />
                    <p className="text-xl">Selecione um vídeo para começar</p>
                </div>
            );
        }

        if (activePlatform === 'youtube') {
            return (
                <iframe
                    key={selectedVideo.id}
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0`}
                    title={selectedVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            );
        }
        
        return <SocialEmbed video={selectedVideo} platform={activePlatform} />;
    };

    const renderPlaylist = () => {
        const currentList = videoLists[activePlatform];
        if (currentList.length === 0) {
            return (
                <div className="text-center py-8 text-gray-500">
                    <Icon name="Film" className="w-12 h-12 mx-auto mb-2" />
                    <p>Nenhum vídeo nesta seção ainda.</p>
                </div>
            );
        }
        return currentList.map(video => (
            <VideoCard
                key={`${activePlatform}-${video.id}`}
                video={video}
                isPlaying={selectedVideo?.id === video.id}
                isWatched={watchedVideos.has(video.id)}
                onSelect={() => setSelectedVideo(video)}
            />
        ));
    };

    return (
        <>
            <div className="min-h-screen bg-darker text-white font-sans flex flex-col animate-fade-in">
                {/* Header */}
                <header className="bg-dark border-b border-gray-900 sticky top-0 z-20 flex-shrink-0">
                    <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
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
                {/* Main Content */}
                <main className="flex-grow container mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Player Section */}
                    <div className="lg:col-span-2">
                        <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl shadow-brand-red/10">
                           {renderPlayer()}
                        </div>
                        <div className="mt-4 p-4 bg-dark/50 border border-gray-800 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-display text-white">{selectedVideo?.title || 'Nenhum vídeo selecionado'}</h2>
                                    <p className="text-sm text-gray-400 mt-1">{selectedVideo?.duration}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                     <button
                                        onClick={() => selectedVideo && onToggleVideoWatched(selectedVideo.id)}
                                        disabled={!selectedVideo}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 ${
                                            selectedVideo && watchedVideos.has(selectedVideo.id) ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
                                        }`}
                                    >
                                        <Icon name="Check" className="w-4 h-4" />
                                        <span>{selectedVideo && watchedVideos.has(selectedVideo.id) ? 'Concluído' : 'Concluir'}</span>
                                    </button>
                                     <button onClick={() => setIsShareModalOpen(true)} disabled={!selectedVideo} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50">
                                        <Icon name="Share" className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Playlist Section */}
                    <div className="lg:col-span-1 bg-dark/50 border border-gray-800 rounded-lg flex flex-col max-h-[85vh]">
                        <div className="flex-shrink-0 p-2 border-b border-gray-700">
                             <div className="flex bg-gray-900/80 rounded-md p-1">
                                <button onClick={() => setActivePlatform('youtube')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${activePlatform === 'youtube' ? 'bg-brand-red text-white' : 'text-gray-400 hover:bg-gray-800'}`}>YouTube</button>
                                <button onClick={() => setActivePlatform('tiktok')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${activePlatform === 'tiktok' ? 'bg-brand-red text-white' : 'text-gray-400 hover:bg-gray-800'}`}>TikTok</button>
                                <button onClick={() => setActivePlatform('instagram')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${activePlatform === 'instagram' ? 'bg-brand-red text-white' : 'text-gray-400 hover:bg-gray-800'}`}>Instagram</button>
                            </div>
                        </div>
                        <div className="flex-grow p-2 space-y-2 overflow-y-auto">
                           {renderPlaylist()}
                           {searchError && (
                               <div className="p-4 text-center text-sm text-yellow-400 bg-yellow-900/30 rounded-lg mx-2">
                                   {searchError}
                               </div>
                           )}
                        </div>
                        <div className="flex-shrink-0 p-3 border-t border-gray-700">
                             <button
                                onClick={handleFindMore}
                                disabled={isLoadingNewVideos}
                                className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-brand-red text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                            >
                                {isLoadingNewVideos ? 'Buscando...' : 'Encontrar Mais Vídeos com IA'}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
            {selectedVideo && (
                <SocialMediaModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    videoUrl={getShareUrl()}
                    videoTitle={selectedVideo.title}
                />
            )}
        </>
    );
};

export default VideoPlayerPage;