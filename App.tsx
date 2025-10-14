import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LoginPage from './components/LoginPage';
import WelcomeScreen from './components/WelcomeScreen';
import DashboardPage from './components/DashboardPage';
import VideoPlayerPage from './components/VideoPlayerPage';
import ProjectsPage from './components/ProjectsPage';
import ProjectViewerPage from './components/ProjectViewerPage';
import ProjectGenerationPage from './components/ProjectGenerationPage';
import MeetingPage from './components/Header'; // The file is named Header.tsx but exports MeetingPage component
import Chatbot from './components/Chatbot';
import MusicPlayer from './components/MusicPlayer';
import AdminPanel from './components/AdminPanel';
import NotificationBanner from './components/NotificationBanner';
import ProfileModal from './components/ProfileModal';
import type { User, LearningCategory, Video, Project, NextVideoInfo, ProjectGenerationConfig, Notification, MeetingMessage, OnlineUser, Song } from './types';
import { categories as initialCategoriesData } from './data';
import { 
    setupPresence, 
    goOffline,
    setupMessagesListener, 
    sendMessage as sendDbMessage,
    updateTypingStatus as updateDbTypingStatus,
    updateUserPresence,
    setupVideosListener,
    addVideos as addVideosToDb,
    getUserProgress,
    updateUserProgress,
    setupProjectsListener,
    setupPlaylistListener,
    formatSupabaseError
} from './services/supabaseService';
import { getMeetingChatResponse } from './services/geminiService';

const App: React.FC = () => {
    // Core App State
    const [user, setUser] = useState<User | null>(null);
    const [appState, setAppState] = useState<'loading' | 'login' | 'welcome' | 'app'>('loading');
    const [currentPage, setCurrentPage] = useState<'dashboard' | 'videos' | 'projects' | 'project-viewer' | 'project-generation' | 'meeting'>('dashboard');
    const [notification, setNotification] = useState<Notification | null>(null);

    // Page-specific State
    const [selectedCategory, setSelectedCategory] = useState<LearningCategory | null>(null);
    const [initialVideoId, setInitialVideoId] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectGenerationConfig, setProjectGenerationConfig] = useState<ProjectGenerationConfig | null>(null);

    // Data State
    const [categories, setCategories] = useState<LearningCategory[]>(initialCategoriesData);
    const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
    const [projects, setProjects] = useState<Project[]>([]);
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [dbError, setDbError] = useState<string | null>(null);

    // Realtime State
    const [meetingMessages, setMeetingMessages] = useState<MeetingMessage[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [isAiActive, setIsAiActive] = useState(true);

    // UI Modals / Panels State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
    const [nowPlaying, setNowPlaying] = useState<{ title: string; artist: string } | null>(null);
    
    // Notification handler
    useEffect(() => {
        const handleNotification = (event: CustomEvent<Notification>) => {
            setNotification(event.detail);
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        };
        window.addEventListener('app-notification', handleNotification as EventListener);
        return () => window.removeEventListener('app-notification', handleNotification as EventListener);
    }, []);

    // Session Management
    useEffect(() => {
        const storedUser = localStorage.getItem('arc7hive_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
            setAppState('app');
        } else {
            setAppState('login');
        }
    }, []);

    // Supabase Listeners
    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const presenceUnsubscribe = setupPresence(
            user,
            (users) => { if(isMounted) setOnlineUsers(users) },
            (users) => { if(isMounted) setTypingUsers(new Set(users)) }
        );
        const messagesUnsubscribe = setupMessagesListener((msgs, err) => {
            if (isMounted) {
                if (err) setDbError(formatSupabaseError(err, 'chat da reunião')); else setMeetingMessages(msgs);
            }
        });
        const projectsUnsubscribe = setupProjectsListener((projs, err) => {
             if (isMounted) {
                if (err) setDbError(formatSupabaseError(err, 'projetos')); else setProjects(projs);
             }
        });
        const playlistUnsubscribe = setupPlaylistListener((songs, err) => {
            if (isMounted) {
                if (err) setDbError(formatSupabaseError(err, 'playlist de música')); else setPlaylist(songs);
            }
        });
        const videosUnsubscribe = setupVideosListener((videosByCat, err) => {
            if (isMounted) {
                if (err) {
                    setDbError(formatSupabaseError(err, 'vídeos das trilhas'));
                } else {
                    setCategories(prev => prev.map(cat => ({ ...cat, videos: videosByCat[cat.id] || [] })));
                }
            }
        });

        getUserProgress(user.name).then(progress => { if (isMounted) setWatchedVideos(progress) });

        return () => {
            isMounted = false;
            presenceUnsubscribe();
            messagesUnsubscribe();
            projectsUnsubscribe();
            playlistUnsubscribe();
            videosUnsubscribe();
            goOffline(user.name);
        };
    }, [user]);
    
    // Save user progress
    useEffect(() => {
        if (user && watchedVideos.size > 0) {
            updateUserProgress(user.name, watchedVideos);
        }
    }, [watchedVideos, user]);
    
    // Handlers
    const handleLogin = (loggedInUser: User) => {
        localStorage.setItem('arc7hive_user', JSON.stringify(loggedInUser));
        setUser(loggedInUser);
        setAppState('welcome');
    };

    const handleLogout = () => {
        localStorage.removeItem('arc7hive_user');
        if (user) goOffline(user.name);
        setUser(null);
        setAppState('login');
        setCurrentPage('dashboard');
    };

    const handleWelcomeFinish = () => setAppState('app');
    
    const handleNavigate = (page: 'dashboard' | 'videos' | 'projects' | 'project-viewer' | 'project-generation' | 'meeting', data?: any) => {
        if (page === 'videos' && data.category) {
            setSelectedCategory(data.category);
            setInitialVideoId(data.videoId || null);
        } else if (page === 'project-viewer' && data.project) {
            setSelectedProject(data.project);
        }
        setCurrentPage(page);
    };

    const handleStartProjectGeneration = (config: ProjectGenerationConfig) => {
        setProjectGenerationConfig(config);
        setCurrentPage('project-generation');
    };

    const handleToggleVideoWatched = (videoId: string) => {
        setWatchedVideos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(videoId)) newSet.delete(videoId);
            else newSet.add(videoId);
            return newSet;
        });
    };
    
    const handleAddVideos = (categoryId: string, newVideos: Video[]) => {
        addVideosToDb(categoryId, 'youtube', newVideos); // DB will trigger listener to update state
    };
    
    const handleSendMessage = async (text: string) => {
        if (!user) return;
        await sendDbMessage(user.name, text, user.avatarUrl);
        
        // AI response logic
        if (isAiActive && text.toLowerCase().includes('@arc7')) {
            const aiPrompt = text.replace(/@arc7/i, '').trim();
            if (aiPrompt) {
                try {
                    const aiResponse = await getMeetingChatResponse(aiPrompt, meetingMessages);
                    await sendDbMessage('ARC7', aiResponse, 'https://placehold.co/100x100/1E40AF/FFFFFF?text=AI');
                } catch (error) {
                    console.error("Error getting AI response:", error);
                     window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'error', message: 'IA não pôde responder.' }}));
                }
            }
        }
    };
    
    const handleTypingChange = (isTyping: boolean) => {
        if (user) updateDbTypingStatus(user, isTyping);
    };

    const handleSaveProfile = (newAvatarUrl: string) => {
        if (!user) return;
        const updatedUser = { ...user, avatarUrl: newAvatarUrl };
        localStorage.setItem('arc7hive_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        updateUserPresence(updatedUser);
        setIsProfileModalOpen(false);
    };
    
    const nextVideoInfo = useMemo((): NextVideoInfo | null => {
        for (const category of categories) {
            const unwatched = category.videos.find(v => !watchedVideos.has(v.id));
            if (unwatched) return { video: unwatched, category };
        }
        return null;
    }, [categories, watchedVideos]);

    // Render Logic
    const renderPage = () => {
        if (!user) return <LoginPage onLogin={handleLogin} />;
        
        switch (currentPage) {
            case 'videos':
                return selectedCategory && <VideoPlayerPage category={selectedCategory} watchedVideos={watchedVideos} onToggleVideoWatched={handleToggleVideoWatched} onAddVideos={handleAddVideos} onBack={() => setCurrentPage('dashboard')} initialVideoId={initialVideoId} />;
            case 'projects':
                return <ProjectsPage user={user} onBack={() => setCurrentPage('dashboard')} onSelectProject={(p) => handleNavigate('project-viewer', { project: p })} onStartGeneration={handleStartProjectGeneration} />;
            case 'project-viewer':
                return selectedProject && <ProjectViewerPage project={selectedProject} onBack={() => setCurrentPage('projects')} />;
            case 'project-generation':
                return projectGenerationConfig && <ProjectGenerationPage config={projectGenerationConfig} user={user} onFinish={() => setCurrentPage('projects')} />;
            case 'meeting':
                 return <MeetingPage user={user} messages={meetingMessages} onSendMessage={handleSendMessage} onBack={() => setCurrentPage('dashboard')} typingUsers={typingUsers} onlineUsers={onlineUsers} onTypingChange={handleTypingChange} isAiActive={isAiActive} onToggleAi={() => setIsAiActive(!isAiActive)} error={dbError} />;
            case 'dashboard':
            default:
                return <DashboardPage user={user} categories={categories} watchedVideos={watchedVideos} nextVideoInfo={nextVideoInfo} onNavigate={handleNavigate} onLogout={handleLogout} onOpenProfile={() => setIsProfileModalOpen(true)} onOpenAdminPanel={() => setIsAdminPanelOpen(true)} onOpenMusicPlayer={() => setIsMusicPlayerOpen(true)} nowPlaying={nowPlaying} />;
        }
    };
    
    if (appState === 'loading') return <div className="min-h-screen bg-darker" />;
    if (appState === 'login') return <LoginPage onLogin={handleLogin} />;
    if (appState === 'welcome' && user) return <WelcomeScreen user={user} onFinish={handleWelcomeFinish} />;

    return (
        user && appState === 'app' ? (
            <>
                {renderPage()}
                <Chatbot />
                <MusicPlayer user={user} playlist={playlist} error={dbError} onTrackChange={setNowPlaying} isOpen={isMusicPlayerOpen} onClose={() => setIsMusicPlayerOpen(false)}/>
                {isProfileModalOpen && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentAvatar={user.avatarUrl} onSave={handleSaveProfile} />}
                {isAdminPanelOpen && <AdminPanel onClose={() => setIsAdminPanelOpen(false)} />}
                {notification && <NotificationBanner message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            </>
        ) : <LoginPage onLogin={handleLogin} /> // Fallback to login
    );
};

export default App;
