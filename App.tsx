import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { users, categories as initialCategoriesData } from './data';
import type { User, LearningCategory, Video, NextVideoInfo, MeetingMessage, OnlineUser, Project, ProjectGenerationConfig, Notification, Song } from './types';
import * as supabaseService from './services/supabaseService';
import * as firebaseService from './services/firebaseService';

import LoginPage from './components/LoginPage';
import WelcomeScreen from './components/WelcomeScreen';
import DashboardPage from './components/DashboardPage';
import VideoPlayerPage from './components/VideoPlayerPage';
import MeetingPage from './components/Header';
import ProjectsPage from './components/ProjectsPage';
import ProjectViewerPage from './components/ProjectViewerPage';
import CreateProjectModal from './components/CreateProjectModal';
import ProjectGenerationPage from './components/ProjectGenerationPage';
import Chatbot from './components/Chatbot';
import NotificationBanner from './components/NotificationBanner';
import ProfileModal from './components/ProfileModal';
import AdminPanel from './components/AdminPanel';
import MusicPlayer from './components/MusicPlayer';

type Page = 'login' | 'welcome' | 'dashboard' | 'videos' | 'meeting' | 'projects' | 'project-viewer' | 'project-generation';

const App: React.FC = () => {
    // Authentication & Navigation
    const [user, setUser] = useState<User | null>(null);
    const [page, setPage] = useState<Page>('login');
    const [pageData, setPageData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Modals & Overlays
    const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);

    // Data State
    const [categories, setCategories] = useState<LearningCategory[]>(initialCategoriesData);
    const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [meetingMessages, setMeetingMessages] = useState<MeetingMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [meetingError, setMeetingError] = useState<string | null>(null);
    
    // Music Player State
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [playlistError, setPlaylistError] = useState<string | null>(null);
    const [nowPlaying, setNowPlaying] = useState<{ title: string; artist: string } | null>(null);

    // --- Effects ---

    // Initial load: Check for logged in user and load watched videos
    useEffect(() => {
        try {
            const savedUserJson = localStorage.getItem('arc7hive_user');
            if (savedUserJson) {
                const savedUser: User = JSON.parse(savedUserJson);
                const fullUser = users.find(u => u.name === savedUser.name);
                if (fullUser) {
                    setUser({ ...fullUser, avatarUrl: savedUser.avatarUrl || fullUser.avatarUrl });
                    setPage('dashboard');
                }
            }

            const watchedVideosJson = localStorage.getItem('arc7hive_watched_videos');
            if (watchedVideosJson) {
                setWatchedVideos(new Set(JSON.parse(watchedVideosJson)));
            }
            
            const customStyles = localStorage.getItem('arc7hive_custom_styles');
            if(customStyles) {
                const styleElement = document.createElement('style');
                styleElement.id = 'custom-admin-styles';
                styleElement.innerHTML = customStyles;
                document.head.appendChild(styleElement);
            }

        } catch (error) {
            console.error("Failed to load data from localStorage", error);
            localStorage.clear();
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch initial video data from Supabase
    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const videosByCat = await supabaseService.fetchAllLearningVideos();
                setCategories(prevCats => prevCats.map(cat => ({
                    ...cat,
                    videos: videosByCat[cat.id] || []
                })));
            } catch (error) {
                handleNotification({type: 'error', message: 'Falha ao carregar vídeos das trilhas.'});
            }
        };
        fetchVideos();
    }, []);

    // Realtime listeners setup on user login
    useEffect(() => {
        if (!user) return;

        const unsubMessages = firebaseService.setupMessagesListener(setMeetingMessages);
        const unsubTyping = firebaseService.setupTypingListener(users => setTypingUsers(new Set(users)));
        const unsubOnline = firebaseService.setupOnlineStatusListener(setOnlineUsers);
        firebaseService.updateUserPresence(user.name, user.avatarUrl);

        setIsLoadingProjects(true);
        const unsubProjects = supabaseService.setupProjectsListener((data, error) => {
            if (error) handleNotification({ type: 'error', message: supabaseService.formatSupabaseError(error, 'projects')});
            else setProjects(data);
            setIsLoadingProjects(false);
        });
        
        const unsubPlaylist = supabaseService.setupPlaylistListener((data, error) => {
            if (error) setPlaylistError(supabaseService.formatSupabaseError(error, 'playlist'));
            else setPlaylist(data);
        });

        const handleBeforeUnload = () => firebaseService.goOffline(user.name);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            unsubMessages();
            unsubTyping();
            unsubOnline();
            unsubProjects();
            unsubPlaylist();
            firebaseService.goOffline(user.name);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [user]);

    // Notification listener
    useEffect(() => {
        const handleAppNotification = (event: Event) => {
            const customEvent = event as CustomEvent<Notification>;
            handleNotification(customEvent.detail);
        };
        window.addEventListener('app-notification', handleAppNotification);
        return () => window.removeEventListener('app-notification', handleAppNotification);
    }, []);

    // --- Handlers ---

    const handleLogin = (loggedInUser: User) => {
        localStorage.setItem('arc7hive_user', JSON.stringify(loggedInUser));
        setUser(loggedInUser);
        setPage('welcome');
    };

    const handleLogout = () => {
        if (user) firebaseService.goOffline(user.name);
        localStorage.removeItem('arc7hive_user');
        setUser(null);
        setPage('login');
    };
    
    const handleSaveProfile = (newAvatarUrl: string) => {
        if (user) {
            const updatedUser = { ...user, avatarUrl: newAvatarUrl };
            setUser(updatedUser);
            localStorage.setItem('arc7hive_user', JSON.stringify(updatedUser));
            firebaseService.updateUserPresence(user.name, newAvatarUrl);
        }
    };
    
    const handleNotification = (notif: Notification) => {
        setNotification(notif);
        setTimeout(() => setNotification(null), 5000);
    };

    const handleNavigate = (targetPage: Page, data: any = null) => {
        setPage(targetPage);
        setPageData(data);
    };

    const handleToggleVideoWatched = useCallback((videoId: string) => {
        setWatchedVideos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(videoId)) {
                newSet.delete(videoId);
            } else {
                newSet.add(videoId);
            }
            localStorage.setItem('arc7hive_watched_videos', JSON.stringify(Array.from(newSet)));
            return newSet;
        });
    }, []);
    
    const handleAddVideos = useCallback(async (categoryId: string, newVideos: Video[]) => {
        const currentCategory = categories.find(c => c.id === categoryId);
        if (!currentCategory) return;
        
        const videosToAdd = newVideos.filter(nv => !currentCategory.videos.some(ev => ev.id === nv.id));
        if(videosToAdd.length === 0) return;

        setCategories(prev => prev.map(cat => 
            cat.id === categoryId ? { ...cat, videos: [...cat.videos, ...videosToAdd] } : cat
        ));

        try {
            await supabaseService.addLearningVideos(videosToAdd.map(v => ({...v, category_id: categoryId})));
        } catch (error) {
            handleNotification({type: 'error', message: 'Falha ao salvar novos vídeos no banco de dados.'});
            // Revert state on failure
            setCategories(prev => prev.map(cat => 
                cat.id === categoryId ? { ...cat, videos: cat.videos.filter(v => !videosToAdd.some(nv => nv.id === v.id)) } : cat
            ));
        }
    }, [categories]);

    const handleSendMessage = (text: string) => {
        if (user) firebaseService.sendMessage(user.name, text, user.avatarUrl);
    };

    const handleTypingChange = (isTyping: boolean) => {
        if (user) firebaseService.updateTypingStatus(user.name, isTyping);
    };
    
    const handleStartProjectGeneration = (config: ProjectGenerationConfig) => {
        setIsCreateProjectModalOpen(false);
        handleNavigate('project-generation', config);
    };
    
    const handleGenerationComplete = async (newProjectData: Omit<Project, 'id' | 'createdAt'>) => {
        try {
            await supabaseService.createProject(newProjectData);
            handleNotification({ type: 'info', message: 'Projeto criado com sucesso!' });
        } catch (error: any) {
            handleNotification({ type: 'error', message: `Falha ao salvar o projeto: ${error.message}` });
        }
        handleNavigate('projects');
    };

    const handleDeleteProject = async (projectId: string) => {
        try {
            await supabaseService.deleteProject(projectId);
            handleNotification({ type: 'info', message: 'Projeto apagado com sucesso.' });
            // The real-time listener will update the 'projects' state automatically.
        } catch (error) {
            handleNotification({ type: 'error', message: 'Falha ao apagar o projeto.' });
        }
    };
    
    const nextVideoInfo = useMemo<NextVideoInfo | null>(() => {
        for (const category of categories) {
            const firstUnwatched = category.videos.find(v => !watchedVideos.has(v.id));
            if (firstUnwatched) {
                return { video: firstUnwatched, category };
            }
        }
        return null;
    }, [categories, watchedVideos]);
    
    // --- Render Logic ---

    const renderPage = () => {
        if (isLoading) return <div className="min-h-screen bg-darker" />; // Or a proper loading spinner

        switch (page) {
            case 'login': return <LoginPage onLogin={handleLogin} />;
            case 'welcome': return user && <WelcomeScreen user={user} onFinish={() => setPage('dashboard')} />;
            case 'dashboard': return user && <DashboardPage user={user} categories={categories} watchedVideos={watchedVideos} nextVideoInfo={nextVideoInfo} onNavigate={handleNavigate} onLogout={handleLogout} onOpenProfile={() => setIsProfileModalOpen(true)} onOpenAdminPanel={() => setIsAdminPanelOpen(true)} onOpenMusicPlayer={() => setIsMusicPlayerOpen(true)} nowPlaying={nowPlaying} />;
            case 'videos': return <VideoPlayerPage category={pageData.category} initialVideoId={pageData.videoId || null} watchedVideos={watchedVideos} onToggleVideoWatched={handleToggleVideoWatched} onAddVideos={handleAddVideos} onBack={() => handleNavigate('dashboard')} />;
            case 'meeting': return user && <MeetingPage user={user} messages={meetingMessages} onSendMessage={handleSendMessage} onBack={() => handleNavigate('dashboard')} typingUsers={typingUsers} onlineUsers={onlineUsers} onTypingChange={handleTypingChange} isAiActive={true} onToggleAi={() => {}} error={meetingError} />;
            case 'projects': return <ProjectsPage projects={projects} isLoading={isLoadingProjects} onBack={() => handleNavigate('dashboard')} onSelectProject={(p) => handleNavigate('project-viewer', p)} onCreateProject={() => setIsCreateProjectModalOpen(true)} onDeleteProject={handleDeleteProject} />;
            case 'project-viewer': return <ProjectViewerPage project={pageData} onBack={() => handleNavigate('projects')} />;
            case 'project-generation': return user && <ProjectGenerationPage user={user} config={pageData} onGenerationComplete={handleGenerationComplete} onCancel={() => handleNavigate('projects')} />;
            default: return <LoginPage onLogin={handleLogin} />;
        }
    };
    
    return (
        <>
            {renderPage()}
            {user && <Chatbot />}
            {notification && <NotificationBanner message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            {user && isCreateProjectModalOpen && <CreateProjectModal isOpen={isCreateProjectModalOpen} onClose={() => setIsCreateProjectModalOpen(false)} user={user} onStartGeneration={handleStartProjectGeneration} />}
            {user && isProfileModalOpen && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentAvatar={user.avatarUrl} onSave={handleSaveProfile} />}
            {isAdminPanelOpen && <AdminPanel onClose={() => setIsAdminPanelOpen(false)} />}
            {user && <MusicPlayer user={user} playlist={playlist} error={playlistError} onTrackChange={setNowPlaying} isOpen={isMusicPlayerOpen} onClose={() => setIsMusicPlayerOpen(false)} />}
        </>
    );
};

export default App;