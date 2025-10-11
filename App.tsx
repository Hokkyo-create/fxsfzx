import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { users, categories as initialCategories } from './data';
import type { LearningCategory, User, Video, MeetingMessage, OnlineUser, Project, ProjectGenerationConfig, Song } from './types';
import LoginPage from './components/LoginPage';
import WelcomeScreen from './components/WelcomeScreen';
import DashboardPage from './components/DashboardPage';
import VideoPlayerPage from './components/VideoPlayerPage';
import MeetingPage from './components/Header';
import ProjectsPage from './components/ProjectsPage';
import ProjectViewerPage from './components/ProjectViewerPage';
import ProjectGenerationPage from './components/ProjectGenerationPage';
import Chatbot from './components/Chatbot';
import AdminPanel from './components/AdminPanel';
import ProfileModal from './components/ProfileModal';
import MusicPlayer from './components/MusicPlayer';
import Icon from './components/Icons';
import { getMeetingChatResponse } from './services/geminiService';
import {
    setupMessagesListener,
    setupTypingListener,
    setupOnlineStatusListener,
    sendMessage,
    updateTypingStatus,
    updateUserPresence,
    goOffline,
    setupPlaylistListener
} from './services/firebaseService';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const [learningCategories, setLearningCategories] = useState<LearningCategory[]>(initialCategories);
    const [selectedCategory, setSelectedCategory] = useState<LearningCategory | null>(null);
    const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    
    // PWA Install & Update state
    const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
    const newWorkerRef = useRef<ServiceWorker | null>(null);


    // Meeting state
    const [isMeetingOpen, setIsMeetingOpen] = useState(false);
    const [meetingMessages, setMeetingMessages] = useState<MeetingMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [isMeetingAiActive, setIsMeetingAiActive] = useState(true);
    
    // Projects state
    const [isProjectsOpen, setIsProjectsOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [generatingProjectConfig, setGeneratingProjectConfig] = useState<ProjectGenerationConfig | null>(null);

    // Music Player state
    const [playlist, setPlaylist] = useState<Song[]>([]);

    const handleUpdate = () => {
        if (newWorkerRef.current) {
            newWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
            // The page will reload once the new worker takes control.
            // We listen for the 'controllerchange' event to force a reload.
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                window.location.reload();
                refreshing = true;
            });
        }
    };

    useEffect(() => {
        // PWA update handler
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (!reg) return;
                // This fires when the service worker controlling this page changes.
                reg.addEventListener('updatefound', () => {
                    newWorkerRef.current = reg.installing;
                    if (newWorkerRef.current) {
                         newWorkerRef.current.addEventListener('statechange', () => {
                             if (newWorkerRef.current?.state === 'installed') {
                                 // New service worker is installed and waiting.
                                 setIsUpdateAvailable(true);
                             }
                         });
                    }
                });
            });
        }
        
        // PWA install prompt handler
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Apply custom admin styles
        const customStyles = localStorage.getItem('arc7hive_custom_styles');
        if (customStyles) {
            const styleElement = document.createElement('style');
            styleElement.id = 'custom-admin-styles';
            styleElement.innerHTML = customStyles;
            document.head.appendChild(styleElement);
        }

        // Load categories from localStorage
        try {
            const storedCategories = localStorage.getItem('arc7hive_categories');
            if (storedCategories) setLearningCategories(JSON.parse(storedCategories));
        } catch (error) { console.error("Failed to parse categories", error); }

        // Load user from sessionStorage for enhanced security
        const storedUserName = sessionStorage.getItem('arc7hive_user');
        if (storedUserName) {
            const foundUser = users.find(u => u.name === storedUserName);
            if (foundUser) {
                const storedAvatar = localStorage.getItem(`arc7hive_avatar_${foundUser.name}`);
                const userWithAvatar = { ...foundUser, avatarUrl: storedAvatar || foundUser.avatarUrl };
                setCurrentUser(userWithAvatar);
                
                try {
                    const storedProgress = localStorage.getItem(`arc7hive_progress_${foundUser.name}`);
                    if (storedProgress) setWatchedVideos(new Set(JSON.parse(storedProgress)));
                } catch (error) { console.error("Failed to parse progress", error); }
            }
        }
        
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    // Effect for Real-time Firebase Chat Sync
    useEffect(() => {
        if (!currentUser) return;

        // Setup presence
        updateUserPresence(currentUser.name, currentUser.avatarUrl);

        // Setup listeners
        const unsubscribeMessages = setupMessagesListener((messages) => {
            setMeetingMessages(messages);
        });

        const unsubscribeTyping = setupTypingListener((users) => {
            setTypingUsers(new Set(users));
        });

        const unsubscribeOnline = setupOnlineStatusListener((onlineUsersData) => {
            setOnlineUsers(onlineUsersData);
        });

        // Cleanup on logout or component unmount
        return () => {
            unsubscribeMessages();
            unsubscribeTyping();
            unsubscribeOnline();
            goOffline(currentUser.name);
        };
    }, [currentUser]);

    // Effect for Firebase Playlist Sync
    useEffect(() => {
        const unsubscribe = setupPlaylistListener(setPlaylist);
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`arc7hive_progress_${currentUser.name}`, JSON.stringify(Array.from(watchedVideos)));
        }
    }, [watchedVideos, currentUser]);

    useEffect(() => {
        try {
            localStorage.setItem('arc7hive_categories', JSON.stringify(learningCategories));
        } catch (error) { console.error("Failed to save categories", error); }
    }, [learningCategories]);


    const handleLogin = (user: User) => {
        const storedAvatar = localStorage.getItem(`arc7hive_avatar_${user.name}`);
        const userToLogin = { ...user, avatarUrl: storedAvatar || user.avatarUrl };
        setCurrentUser(userToLogin);
        sessionStorage.setItem('arc7hive_user', user.name); // Use sessionStorage
        setShowWelcome(true);
        const storedProgress = localStorage.getItem(`arc7hive_progress_${user.name}`);
        setWatchedVideos(new Set(storedProgress ? JSON.parse(storedProgress) : []));
    };

    const handleLogout = () => {
        if (currentUser) {
            goOffline(currentUser.name);
        }
        sessionStorage.removeItem('arc7hive_user'); // Use sessionStorage
        setCurrentUser(null);
        setSelectedCategory(null);
        setWatchedVideos(new Set());
        setIsAdminPanelOpen(false);
        setIsMeetingOpen(false);
        setIsProjectsOpen(false);
        setSelectedProject(null);
        setGeneratingProjectConfig(null);
    };
    
    const handleToggleAdminPanel = () => setIsAdminPanelOpen(prev => !prev);
    
    // Meeting navigation
    const handleNavigateToMeeting = () => setIsMeetingOpen(true);
    const handleBackFromMeeting = () => setIsMeetingOpen(false);
    
    // Project navigation
    const handleNavigateToProjects = () => setIsProjectsOpen(true);
    const handleBackFromProjects = () => {
        setIsProjectsOpen(false);
        setGeneratingProjectConfig(null); // Ensure we exit generation mode
    }
    const handleSelectProject = (project: Project) => setSelectedProject(project);
    const handleBackFromProjectViewer = () => setSelectedProject(null);
    const handleStartProjectGeneration = (config: ProjectGenerationConfig) => setGeneratingProjectConfig(config);
    const handleFinishProjectGeneration = () => setGeneratingProjectConfig(null);


    const handleSendMessage = useCallback(async (text: string) => {
        if (!currentUser) return;

        sendMessage(currentUser.name, text, currentUser.avatarUrl);

        if (isMeetingAiActive && text.toLowerCase().startsWith('@arc7')) {
             const aiPrompt = text.substring(5).trim();
             const responseText = await getMeetingChatResponse(aiPrompt, [...meetingMessages]);
             // The AI avatar is fixed
             sendMessage('ARC7', responseText, 'https://placehold.co/100x100/71717A/FFFFFF?text=AI');
        }
    }, [currentUser, isMeetingAiActive, meetingMessages]);
    
    const handleTypingChange = useCallback((isTyping: boolean) => {
        if (!currentUser) return;
        updateTypingStatus(currentUser.name, isTyping);
    }, [currentUser]);

    const handleToggleAi = useCallback(() => {
        setIsMeetingAiActive(prev => !prev);
    }, []);
    
    const handleWelcomeFinish = () => setShowWelcome(false);

    const handleSelectCategory = (category: LearningCategory) => setSelectedCategory(category);
    
    const handleBackToDashboard = () => setSelectedCategory(null);

    const handleUpdateAvatar = (newAvatarUrl: string) => {
        if (!currentUser) return;
        const updatedUser = { ...currentUser, avatarUrl: newAvatarUrl };
        setCurrentUser(updatedUser);
        localStorage.setItem(`arc7hive_avatar_${currentUser.name}`, newAvatarUrl);
        // Update presence in Firebase with new avatar
        updateUserPresence(currentUser.name, newAvatarUrl);
    };
    
    const handleToggleVideoWatched = (videoId: string) => {
        setWatchedVideos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(videoId)) newSet.delete(videoId);
            else newSet.add(videoId);
            return newSet;
        });
    };
    
    const handleAddVideosToCategory = (categoryId: string, newVideos: Video[]) => {
        setLearningCategories(prevCategories => {
            const updatedCategories = prevCategories.map(cat => {
                if (cat.id === categoryId) {
                    const existingVideoIds = new Set(cat.videos.map(v => v.id));
                    const uniqueNewVideos = newVideos.filter(v => !existingVideoIds.has(v.id));
                    return { ...cat, videos: [...cat.videos, ...uniqueNewVideos] };
                }
                return cat;
            });
            if (selectedCategory?.id === categoryId) {
                const updatedCategory = updatedCategories.find(c => c.id === categoryId);
                if (updatedCategory) setSelectedCategory(updatedCategory);
            }
            return updatedCategories;
        });
    };

    const totalVideos = useMemo(() => learningCategories.reduce((acc, cat) => acc + cat.videos.length, 0), [learningCategories]);
    const completedVideos = watchedVideos.size;
    const overallProgress = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

    const renderContent = () => {
        if (!currentUser) {
            return <LoginPage onLogin={handleLogin} />;
        }

        if (showWelcome) {
            return <WelcomeScreen user={currentUser} onFinish={handleWelcomeFinish} />;
        }

        if (generatingProjectConfig) {
            return <ProjectGenerationPage 
                config={generatingProjectConfig}
                user={currentUser}
                onFinish={handleFinishProjectGeneration} 
            />;
        }

        if (selectedProject) {
            return <ProjectViewerPage project={selectedProject} onBack={handleBackFromProjectViewer} />;
        }

        if (isProjectsOpen) {
            return <ProjectsPage 
                user={currentUser} 
                onBack={handleBackFromProjects} 
                onSelectProject={handleSelectProject} 
                onStartGeneration={handleStartProjectGeneration}
            />;
        }

        if (isMeetingOpen) {
            return (
                <MeetingPage
                    user={currentUser}
                    messages={meetingMessages}
                    onSendMessage={handleSendMessage}
                    onBack={handleBackFromMeeting}
                    typingUsers={typingUsers}
                    onlineUsers={onlineUsers}
                    onTypingChange={handleTypingChange}
                    isAiActive={isMeetingAiActive}
                    onToggleAi={handleToggleAi}
                />
            );
        }
        
        if (selectedCategory) {
            const currentCategoryState = learningCategories.find(c => c.id === selectedCategory.id) || selectedCategory;
            return (
                <VideoPlayerPage
                    category={currentCategoryState}
                    watchedVideos={watchedVideos}
                    onToggleVideoWatched={handleToggleVideoWatched}
                    onAddVideos={handleAddVideosToCategory}
                    onBack={handleBackToDashboard}
                />
            );
        }

        return (
            <DashboardPage
                user={currentUser}
                onLogout={handleLogout}
                onSelectCategory={handleSelectCategory}
                overallProgress={overallProgress}
                completedVideos={completedVideos}
                totalVideos={totalVideos}
                watchedVideos={watchedVideos}
                categories={learningCategories}
                onToggleAdminPanel={handleToggleAdminPanel}
                onNavigateToMeeting={handleNavigateToMeeting}
                onNavigateToProjects={handleNavigateToProjects}
                onOpenProfileModal={() => setIsProfileModalOpen(true)}
                installPrompt={installPrompt}
            />
        );
    };
    
    const showChatbot = currentUser && !showWelcome && !isAdminPanelOpen && !isMeetingOpen && !isProjectsOpen && !selectedProject && !generatingProjectConfig;
    const showMusicPlayer = currentUser && !showWelcome;

    return (
        <>
            {renderContent()}
            {showChatbot && <Chatbot />}
            {showMusicPlayer && <MusicPlayer playlist={playlist} />}
            {currentUser?.name === 'Gustavo' && isAdminPanelOpen && (
                <AdminPanel onClose={handleToggleAdminPanel} />
            )}
            {currentUser && isProfileModalOpen && (
                <ProfileModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    currentAvatar={currentUser.avatarUrl}
                    onSave={handleUpdateAvatar}
                />
            )}
            {isUpdateAvailable && (
                <div className="fixed bottom-20 sm:bottom-4 right-4 sm:right-8 bg-dark border-2 border-brand-red rounded-lg shadow-lg p-4 flex items-center gap-4 z-50 animate-slide-in-up">
                    <Icon name="Upload" className="w-6 h-6 text-brand-red" />
                    <div>
                        <p className="font-semibold text-white">Atualização disponível!</p>
                        <p className="text-sm text-gray-300">Uma nova versão do app está pronta.</p>
                    </div>
                    <button 
                        onClick={handleUpdate}
                        className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                    >
                        Atualizar
                    </button>
                </div>
            )}
        </>
    );
};

export default App;