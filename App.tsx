import React, { useState, useEffect, useCallback } from 'react';
import type { User, LearningCategory, NextVideoInfo, Video, Project, MeetingMessage, OnlineUser, Notification, Song } from './types';
import { categories as initialCategories, users } from './data';

// --- Page Components ---
import LoginPage from './components/LoginPage';
import WelcomeScreen from './components/WelcomeScreen';
import DashboardPage from './components/DashboardPage';
// Fix: The file name is Header.tsx but it contains the MeetingPage component.
import MeetingPage from './components/Header';
import VideoPlayerPage from './components/VideoPlayerPage';
import ProjectsPage from './components/ProjectsPage';
import ProjectViewerPage from './components/ProjectViewerPage';

// --- UI Components & Modals ---
import AdminPanel from './components/AdminPanel';
import ProfileModal from './components/ProfileModal';
import MusicPlayer from './components/MusicPlayer';
import Chatbot from './components/Chatbot';
import NotificationBanner from './components/NotificationBanner';

// --- Services ---
import * as firebaseService from './services/firebaseService';
import * as supabaseService from './services/supabaseService';


const App: React.FC = () => {
    // --- App State ---
    const [appState, setAppState] = useState<'login' | 'welcome' | 'dashboard'>('login');
    const [user, setUser] = useState<User | null>(null);
    const [page, setPage] = useState<'dashboard' | 'videos' | 'projects' | 'meeting' | 'project-viewer'>('dashboard');
    const [pageData, setPageData] = useState<any>(null);

    // --- Data State ---
    const [categories, setCategories] = useState<LearningCategory[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
    const [meetingMessages, setMeetingMessages] = useState<MeetingMessage[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [meetingError, setMeetingError] = useState<string | null>(null);
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [nowPlaying, setNowPlaying] = useState<{ title: string; artist: string } | null>(null);
    const [musicError, setMusicError] = useState<string | null>(null);


    // --- UI Modals & Popups State ---
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);

    // --- Effects ---

    // Load saved state from localStorage
    useEffect(() => {
        const savedUser = localStorage.getItem('arc7hive_user');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            const fullUser = users.find(u => u.name === parsedUser.name) || parsedUser;
            setUser(fullUser);
            setAppState('dashboard');
        }

        const savedWatched = localStorage.getItem('arc7hive_watchedVideos');
        if (savedWatched) {
            setWatchedVideos(new Set(JSON.parse(savedWatched)));
        }

        const loadPlaylists = async () => {
            const videosByCategory = await supabaseService.getLearningPlaylists();
            if (videosByCategory) {
                 const categoriesWithSavedVideos = initialCategories.map(cat => ({
                    ...cat,
                    videos: videosByCategory[cat.id] || cat.videos,
                }));
                setCategories(categoriesWithSavedVideos);
            } else {
                 setCategories(initialCategories);
            }
        };

        loadPlaylists();
        
        const customStyles = localStorage.getItem('arc7hive_custom_styles');
        if (customStyles) {
            const styleElement = document.createElement('style');
            styleElement.id = 'custom-admin-styles';
            styleElement.innerHTML = customStyles;
            document.head.appendChild(styleElement);
        }
    }, []);

    // Firebase/Supabase Listeners
    useEffect(() => {
        if (!user) return;

        const unsubMessages = firebaseService.setupMessagesListener(setMeetingMessages);
        const unsubTyping = firebaseService.setupTypingListener(users => setTypingUsers(new Set(users)));
        const unsubOnline = firebaseService.setupOnlineStatusListener(setOnlineUsers);
        const unsubProjects = firebaseService.setupProjectsListener(setProjects);
        
        const unsubPlaylist = supabaseService.setupPlaylistListener((data, err) => {
            if (err) setMusicError(supabaseService.formatSupabaseError(err, 'playlist listener'));
            else setPlaylist(data);
        });

        firebaseService.updateUserPresence(user.name, user.avatarUrl);

        return () => {
            unsubMessages();
            unsubTyping();
            unsubOnline();
            unsubProjects();
            unsubPlaylist();
            firebaseService.goOffline(user.name);
        };
    }, [user]);
    
    // Custom notification event listener
    useEffect(() => {
        const handleNotification = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            setNotification(detail);
            setTimeout(() => setNotification(null), 5000);
        };
        window.addEventListener('app-notification', handleNotification);
        return () => window.removeEventListener('app-notification', handleNotification);
    }, []);

    // --- Handlers ---

    const handleLogin = (loggedInUser: User) => {
        const fullUser = users.find(u => u.name === loggedInUser.name) || loggedInUser;
        setUser(fullUser);
        setAppState('welcome');
        localStorage.setItem('arc7hive_user', JSON.stringify(fullUser));
    };

    const handleLogout = () => {
        if (user) firebaseService.goOffline(user.name);
        setUser(null);
        setAppState('login');
        setPage('dashboard');
        localStorage.removeItem('arc7hive_user');
    };

    const handleNavigate = (targetPage: 'videos' | 'projects' | 'meeting' | 'project-viewer', data?: any) => {
        setPage(targetPage);
        setPageData(data);
    };

    const handleToggleVideoWatched = (videoId: string) => {
        setWatchedVideos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(videoId)) {
                newSet.delete(videoId);
            } else {
                newSet.add(videoId);
            }
            localStorage.setItem('arc7hive_watchedVideos', JSON.stringify(Array.from(newSet)));
            return newSet;
        });
    };
    
    const persistCategories = async (updatedCategories: LearningCategory[], successMessage: string, failureMessage: string, revertState: () => void) => {
        const videosByCategory = updatedCategories.reduce((acc, cat) => {
            acc[cat.id] = cat.videos;
            return acc;
        }, {} as Record<string, Video[]>);

        try {
            await supabaseService.saveLearningPlaylists(videosByCategory);
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: successMessage } }));
        } catch (error) {
            const message = error instanceof Error ? error.message : failureMessage;
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'error', message } }));
            revertState();
        }
    };
    
    const handleAddVideos = (categoryId: string, newVideos: Video[]) => {
        const originalCategories = [...categories];
        let hasChanges = false;
        
        const updatedCategories = categories.map(cat => {
            if (cat.id === categoryId) {
                const existingVideoIds = new Set(cat.videos.map(v => v.id));
                const uniqueNewVideos = newVideos.filter(v => !existingVideoIds.has(v.id));
                if (uniqueNewVideos.length > 0) {
                    hasChanges = true;
                    return { ...cat, videos: [...cat.videos, ...uniqueNewVideos] };
                }
            }
            return cat;
        });

        if (hasChanges) {
            setCategories(updatedCategories);
            persistCategories(updatedCategories, 'Playlist atualizada com sucesso!', 'Falha ao salvar a playlist.', () => setCategories(originalCategories));
        }
    };
    
    const handleRemoveVideo = (categoryId: string, videoId: string) => {
        if (!window.confirm("Tem certeza que deseja remover este vídeo da trilha?")) return;

        const originalCategories = [...categories];
        
        const updatedCategories = categories.map(cat => {
            if (cat.id === categoryId) {
                return { ...cat, videos: cat.videos.filter(v => v.id !== videoId) };
            }
            return cat;
        });

        setCategories(updatedCategories);
        persistCategories(updatedCategories, 'Vídeo removido com sucesso!', 'Falha ao remover o vídeo.', () => setCategories(originalCategories));
    };
    
    const handleUpdateProject = (projectId: string, updates: Partial<Project>) => {
        firebaseService.updateProject(projectId, updates);
        // The listener will handle the state update
    };

    const handleSaveAvatar = (newAvatarUrl: string) => {
        if (user) {
            const updatedUser = { ...user, avatarUrl: newAvatarUrl };
            setUser(updatedUser);
            localStorage.setItem('arc7hive_user', JSON.stringify(updatedUser));
            setIsProfileModalOpen(false);
        }
    };
    
    // Calculate next video to watch
    const nextVideoInfo: NextVideoInfo | null = (() => {
        for (const category of categories) {
            for (const video of category.videos) {
                if (!watchedVideos.has(video.id)) {
                    return { video, category };
                }
            }
        }
        return null;
    })();

    // --- Render Logic ---

    if (!user || appState === 'login') {
        return <LoginPage onLogin={handleLogin} />;
    }

    if (appState === 'welcome') {
        return <WelcomeScreen user={user} onFinish={() => setAppState('dashboard')} />;
    }

    const renderPage = () => {
        switch (page) {
            case 'videos':
                return <VideoPlayerPage 
                            category={pageData.category}
                            initialVideoId={pageData.videoId || null}
                            watchedVideos={watchedVideos} 
                            onToggleVideoWatched={handleToggleVideoWatched}
                            onAddVideos={handleAddVideos}
                            onRemoveVideo={handleRemoveVideo}
                            onBack={() => setPage('dashboard')} 
                            allCategories={categories}
                        />;
            case 'projects':
                return <ProjectsPage 
                            user={user} 
                            projects={projects} 
                            onBack={() => setPage('dashboard')} 
                            onViewProject={(project) => handleNavigate('project-viewer', project)}
                            onProjectCreated={() => { /* Listener handles update */}}
                        />;
            case 'project-viewer':
                 return <ProjectViewerPage 
                            project={pageData} 
                            onBack={() => setPage('projects')} 
                            onUpdateProject={handleUpdateProject}
                        />
            case 'meeting':
                return <MeetingPage
                            user={user}
                            messages={meetingMessages}
                            onlineUsers={onlineUsers}
                            typingUsers={typingUsers}
                            error={meetingError}
                            isAiActive={true} // Simplified for now
                            onToggleAi={() => {}} // Simplified for now
                            onSendMessage={(text) => firebaseService.sendMessage(user.name, text, user.avatarUrl)}
                            onTypingChange={(isTyping) => firebaseService.updateTypingStatus(user.name, isTyping)}
                            onBack={() => setPage('dashboard')}
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
            <AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
            <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentAvatar={user.avatarUrl} onSave={handleSaveAvatar} />
            <MusicPlayer 
                isOpen={isMusicPlayerOpen} 
                onClose={() => setIsMusicPlayerOpen(false)} 
                user={user} 
                playlist={playlist}
                error={musicError} 
                onTrackChange={setNowPlaying}
            />
            {notification && <NotificationBanner message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};

export default App;
