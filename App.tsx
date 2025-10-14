import React, { useState, useEffect, useMemo } from 'react';

// Components
import LoginPage from './components/LoginPage';
import WelcomeScreen from './components/WelcomeScreen';
import DashboardPage from './components/DashboardPage';
import VideoPlayerPage from './components/VideoPlayerPage';
import ProjectsPage from './components/ProjectsPage';
import ProjectGenerationPage from './components/ProjectGenerationPage';
import ProjectViewerPage from './components/ProjectViewerPage';
import MeetingPage from './components/Header'; // The component is named MeetingPage inside Header.tsx
import AdminPanel from './components/AdminPanel';
import ProfileModal from './components/ProfileModal';
import MusicPlayer from './components/MusicPlayer';
import Chatbot from './components/Chatbot';
import NotificationBanner from './components/NotificationBanner';

// Data and Services
import { categories as initialCategories } from './data';
import * as firebaseService from './services/firebaseService';
import * as supabaseService from './services/supabaseService';
import { getMeetingChatResponse } from './services/geminiService';

// Types
import type { User, LearningCategory, Video, NextVideoInfo, Project, ProjectGenerationConfig, MeetingMessage, OnlineUser, Notification, Song } from './types';

const APP_STATE_KEY = 'arc7hive_app_state';

const App: React.FC = () => {
    // User and Auth State
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);

    // Navigation State
    const [page, setPage] = useState<'dashboard' | 'videos' | 'projects' | 'project-generation' | 'project-viewer' | 'meeting'>('dashboard');
    const [pageData, setPageData] = useState<any>(null);

    // Data State
    const [categories, setCategories] = useState<LearningCategory[]>(initialCategories);
    const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
    const [lastWatchedVideo, setLastWatchedVideo] = useState<{ categoryId: string, videoId: string } | null>(null);

    // Meeting State (using Firebase)
    const [meetingMessages, setMeetingMessages] = useState<MeetingMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [isAiActive, setIsAiActive] = useState(true);
    const [meetingError, setMeetingError] = useState<string | null>(null);

    // UI State
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);
    
    // Music Player State (using Supabase)
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [radioError, setRadioError] = useState<string | null>(null);
    const [nowPlaying, setNowPlaying] = useState<{ title: string; artist: string } | null>(null);

    // --- Effects ---

    // Load initial state and setup listeners
    useEffect(() => {
        const initializeApp = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch videos from Supabase and populate categories
                const videosByCat = await supabaseService.fetchAllLearningVideos();
                const categoriesWithVideos = initialCategories.map(cat => ({
                    ...cat,
                    videos: videosByCat[cat.id] || [],
                }));
                setCategories(categoriesWithVideos);

                // 2. Load user state from localStorage
                const savedState = localStorage.getItem(APP_STATE_KEY);
                if (savedState) {
                    const { user: savedUser, watchedVideos: savedWatched, lastWatchedVideo: savedLastWatched } = JSON.parse(savedState);
                    if (savedUser) setUser(savedUser);
                    if (savedWatched) setWatchedVideos(new Set(savedWatched));
                    if (savedLastWatched) setLastWatchedVideo(savedLastWatched);
                }
            } catch (error) {
                console.error("Failed to initialize app data from Supabase/LocalStorage", error);
                window.dispatchEvent(new CustomEvent('app-notification', { 
                    detail: { type: 'error', message: 'Falha ao carregar dados das trilhas.' }
                }));
            } finally {
                setIsLoading(false);
            }
        };

        initializeApp();

        // Custom event listener for notifications
        const handleNotification = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            setNotification(detail);
            setTimeout(() => setNotification(null), 5000);
        };
        window.addEventListener('app-notification', handleNotification);

        // Apply custom styles
        const customStyles = localStorage.getItem('arc7hive_custom_styles');
        if (customStyles) {
            const styleElement = document.createElement('style');
            styleElement.id = 'custom-admin-styles';
            styleElement.innerHTML = customStyles;
            document.head.appendChild(styleElement);
        }
        
        // Music Playlist Listener (Supabase)
        const unsubscribePlaylist = supabaseService.setupPlaylistListener((playlistData, err) => {
             if (err) {
                 setRadioError(supabaseService.formatSupabaseError(err, 'playlist'));
             } else {
                 setPlaylist(playlistData);
                 setRadioError(null);
             }
        });

        return () => {
            window.removeEventListener('app-notification', handleNotification);
            unsubscribePlaylist();
        };
    }, []);

    // Save state to localStorage on change
    useEffect(() => {
        try {
            const stateToSave = {
                user,
                watchedVideos: Array.from(watchedVideos),
                lastWatchedVideo
            };
            localStorage.setItem(APP_STATE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Failed to save state to localStorage", error);
        }
    }, [user, watchedVideos, lastWatchedVideo]);

    // Firebase listeners for meeting chat and presence
    useEffect(() => {
        if (!user) return;

        firebaseService.updateUserPresence(user.name, user.avatarUrl);

        const unsubMessages = firebaseService.setupMessagesListener(setMeetingMessages);
        const unsubTyping = firebaseService.setupTypingListener(users => setTypingUsers(new Set(users)));
        const unsubOnline = firebaseService.setupOnlineStatusListener(setOnlineUsers);

        return () => {
            unsubMessages();
            unsubTyping();
            unsubOnline();
            firebaseService.goOffline(user.name);
        };
    }, [user]);

    // --- Handlers ---

    const handleLogin = (loggedInUser: User) => {
        setUser(loggedInUser);
        setShowWelcome(true);
    };

    const handleLogout = () => {
        if (user) {
            firebaseService.goOffline(user.name);
        }
        setUser(null);
        setPage('dashboard');
    };

    const handleNavigate = (newPage: typeof page, data?: any) => {
        setPage(newPage);
        setPageData(data);
    };

    const handleToggleVideoWatched = (videoId: string) => {
        const newWatchedVideos = new Set(watchedVideos);
        if (newWatchedVideos.has(videoId)) {
            newWatchedVideos.delete(videoId);
        } else {
            newWatchedVideos.add(videoId);
        }
        setWatchedVideos(newWatchedVideos);

        const videoPageData = pageData as { category: LearningCategory };
        if (videoPageData?.category) {
            setLastWatchedVideo({ categoryId: videoPageData.category.id, videoId });
        }
    };
    
     const handleAddVideos = async (categoryId: string, newVideos: Video[]) => {
        if (newVideos.length === 0) return;

        try {
            // 1. Persist to DB
            const videosForDb = newVideos.map(v => ({...v, category_id: categoryId}));
            await supabaseService.addLearningVideos(videosForDb);

            // 2. Update local state for immediate UI feedback
            setCategories(prevCategories => {
                return prevCategories.map(cat => {
                    if (cat.id === categoryId) {
                        const existingVideoIds = new Set(cat.videos.map(v => v.id));
                        const uniqueNewVideos = newVideos.filter(v => !existingVideoIds.has(v.id));
                        return { ...cat, videos: [...cat.videos, ...uniqueNewVideos] };
                    }
                    return cat;
                });
            });
        } catch (error) {
            console.error("Failed to add new videos:", error);
            window.dispatchEvent(new CustomEvent('app-notification', { 
                detail: { type: 'error', message: 'Falha ao salvar os novos vídeos.' }
            }));
        }
    };
    
    const handleSendMessage = async (text: string) => {
        if (!user) return;
        
        firebaseService.sendMessage(user.name, text, user.avatarUrl);

        if (isAiActive && text.includes('@ARC7')) {
            try {
                const aiPrompt = text.replace(/@ARC7/g, '').trim();
                const response = await getMeetingChatResponse(aiPrompt, meetingMessages);
                firebaseService.sendMessage('ARC7', response, 'https://placehold.co/100x100/1E40AF/FFFFFF?text=AI');
            } catch (error) {
                 const errorMessage = error instanceof Error ? error.message : 'Falha ao se comunicar com a IA.';
                 firebaseService.sendMessage('ARC7-System', `Error: ${errorMessage}`, 'https://placehold.co/100x100/E50914/FFFFFF?text=!');
            }
        }
    };
    
    const handleUpdateAvatar = (newAvatarUrl: string) => {
        if (user) {
            setUser({ ...user, avatarUrl: newAvatarUrl });
        }
        setIsProfileModalOpen(false);
    };

    // --- Logic for derived state ---
    const nextVideoInfo = useMemo((): NextVideoInfo | null => {
        if (!lastWatchedVideo) return null;
        const category = categories.find(c => c.id === lastWatchedVideo.categoryId);
        if (!category) return null;
        const lastVideoIndex = category.videos.findIndex(v => v.id === lastWatchedVideo.videoId);
        if (lastVideoIndex === -1 || lastVideoIndex === category.videos.length - 1) return null;
        return { category, video: category.videos[lastVideoIndex + 1] };
    }, [lastWatchedVideo, categories]);


    // --- Render ---

    if (isLoading) {
        return <div className="min-h-screen bg-darker flex items-center justify-center text-white">Carregando...</div>;
    }

    if (!user) {
        return <LoginPage onLogin={handleLogin} />;
    }
    
    if (showWelcome) {
        return <WelcomeScreen user={user} onFinish={() => setShowWelcome(false)} />;
    }

    const renderPage = () => {
        switch (page) {
            case 'videos':
                const currentCategory = categories.find(c => c.id === pageData.category.id);
                if (!currentCategory) {
                    console.warn(`Category with id ${pageData.category.id} not found in state. Navigating back.`);
                    setTimeout(() => setPage('dashboard'), 0);
                    return null;
                }
                return <VideoPlayerPage 
                            category={currentCategory} 
                            initialVideoId={pageData.videoId}
                            watchedVideos={watchedVideos}
                            onToggleVideoWatched={handleToggleVideoWatched}
                            onAddVideos={handleAddVideos}
                            onBack={() => setPage('dashboard')} 
                        />;
            case 'projects':
                return <ProjectsPage 
                            user={user} 
                            onBack={() => setPage('dashboard')} 
                            onSelectProject={(project) => handleNavigate('project-viewer', project)}
                            onStartGeneration={(config) => handleNavigate('project-generation', config)}
                        />;
            case 'project-generation':
                return <ProjectGenerationPage 
                            config={pageData} 
                            user={user} 
                            onFinish={() => setPage('projects')}
                        />;
            case 'project-viewer':
                return <ProjectViewerPage project={pageData} onBack={() => setPage('projects')} />;
            case 'meeting':
                 return <MeetingPage 
                            user={user} 
                            messages={meetingMessages} 
                            onSendMessage={handleSendMessage} 
                            onBack={() => setPage('dashboard')}
                            typingUsers={typingUsers}
                            onlineUsers={onlineUsers}
                            onTypingChange={(isTyping) => firebaseService.updateTypingStatus(user.name, isTyping)}
                            isAiActive={isAiActive}
                            onToggleAi={() => setIsAiActive(!isAiActive)}
                            error={meetingError}
                        />;
            case 'dashboard':
            default:
                return <DashboardPage 
                            user={user}
                            categories={categories}
                            watchedVideos={watchedVideos}
                            nextVideoInfo={nextVideoInfo}
                            onNavigate={handleNavigate}
                            onLogout={handleLogout}
                            onOpenProfile={() => setIsProfileModalOpen(true)}
                            onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
                            onOpenMusicPlayer={() => setIsMusicPlayerOpen(true)}
                            nowPlaying={nowPlaying}
                        />;
        }
    };

    return (
        <>
            {renderPage()}
            <Chatbot />

            {isAdminPanelOpen && <AdminPanel onClose={() => setIsAdminPanelOpen(false)} />}
            {isProfileModalOpen && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentAvatar={user.avatarUrl} onSave={handleUpdateAvatar} />}
            
            {isMusicPlayerOpen && <MusicPlayer 
                user={user} 
                playlist={playlist} 
                error={radioError} 
                onTrackChange={setNowPlaying} 
                isOpen={isMusicPlayerOpen} 
                onClose={() => setIsMusicPlayerOpen(false)} 
            />}

            {notification && <NotificationBanner message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};

export default App;