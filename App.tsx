import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { users, categories as initialCategories } from './data';
import type { LearningCategory, User, Video, MeetingMessage, OnlineUser, Project, ProjectGenerationConfig, Song, Notification } from './types';
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
import NotificationBanner from './components/NotificationBanner';
import { getMeetingChatResponse, enableSimulationMode as enableGeminiSimulationMode, findVideos } from './services/geminiService';
import {
    setupMessagesListener,
    setupPresence,
    sendMessage,
    updateTypingStatus,
    updateUserPresence,
    goOffline,
    setupPlaylistListener,
    formatSupabaseError
} from './services/supabaseService';
import Icon from './components/Icons';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const [learningCategories, setLearningCategories] = useState<LearningCategory[]>(initialCategories);
    const [selectedCategory, setSelectedCategory] = useState<LearningCategory | null>(null);
    const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    
    const [notification, setNotification] = useState<Notification | null>(null);
    // PWA Install Prompt
    const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
    const [isSimulationMode, setIsSimulationMode] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());


    // Meeting state
    const [isMeetingOpen, setIsMeetingOpen] = useState(false);
    const [meetingMessages, setMeetingMessages] = useState<MeetingMessage[]>([]);
    const [meetingError, setMeetingError] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [isMeetingAiActive, setIsMeetingAiActive] = useState(true);
    
    // Projects state
    const [isProjectsOpen, setIsProjectsOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [generatingProjectConfig, setGeneratingProjectConfig] = useState<ProjectGenerationConfig | null>(null);

    // Music Player state
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [playlistError, setPlaylistError] = useState<string | null>(null);


    useEffect(() => {
        // PWA install prompt handler
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        
        // Listener for API Quota errors
        const handleQuotaExceeded = () => {
            console.warn("Evento de cota excedida recebido. Ativando o modo de simulação global.");
            setIsSimulationMode(true);
            enableGeminiSimulationMode(); // Notify the service to use mocks for all subsequent calls
        };
        window.addEventListener('quotaExceeded', handleQuotaExceeded);

        // Listener for global app notifications from services
        const handleAppNotification = (e: Event) => {
            const detail = (e as CustomEvent).detail as Notification;
            setNotification(detail);
            
            // Auto-dismiss after 7 seconds
            setTimeout(() => {
                setNotification(current => (current?.message === detail.message ? null : current));
            }, 7000);
        };
        window.addEventListener('app-notification', handleAppNotification);


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

        // Load user from localStorage
        const storedUserName = localStorage.getItem('arc7hive_user');
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
            window.removeEventListener('quotaExceeded', handleQuotaExceeded);
            window.removeEventListener('app-notification', handleAppNotification);
        };
    }, []);

    // Effect for Real-time Supabase Chat Sync
    useEffect(() => {
        if (!currentUser) return;

        // Setup listeners
        const unsubscribeMessages = setupMessagesListener((messages, error) => {
            if (error) {
                setMeetingError(formatSupabaseError(error, 'mensagens do chat'));
                setMeetingMessages([]);
            } else {
                setMeetingMessages(messages);
                setMeetingError(null);
            }
        });

        const unsubscribePresence = setupPresence(
            currentUser,
            (onlineUsersData) => setOnlineUsers(onlineUsersData),
            (typingUsersData) => setTypingUsers(new Set(typingUsersData))
        );

        // Cleanup on logout or component unmount
        return () => {
            unsubscribeMessages();
            unsubscribePresence();
        };
    }, [currentUser]);

    // Effect for Supabase Playlist Sync
    useEffect(() => {
        const unsubscribe = setupPlaylistListener((playlistData, error) => {
             if (error) {
                setPlaylistError(formatSupabaseError(error, 'playlist de música'));
                setPlaylist([]);
            } else {
                setPlaylist(playlistData);
                setPlaylistError(null);
            }
        });
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

    const handleAddVideosToCategory = useCallback((categoryId: string, newVideos: Video[], platform: 'youtube' | 'tiktok' | 'instagram') => {
        setLearningCategories(prevCategories => {
            const updatedCategories = prevCategories.map(cat => {
                if (cat.id === categoryId) {
                    let updatedCat = { ...cat };
                    if (platform === 'youtube') {
                        const existingVideoIds = new Set(cat.videos.map(v => v.id));
                        const uniqueNewVideos = newVideos.filter(v => !existingVideoIds.has(v.id));
                        updatedCat.videos = [...cat.videos, ...uniqueNewVideos];
                    } else if (platform === 'tiktok') {
                        const existingVideoIds = new Set((cat.tiktokVideos || []).map(v => v.id));
                        const uniqueNewVideos = newVideos.filter(v => !existingVideoIds.has(v.id));
                        updatedCat.tiktokVideos = [...(cat.tiktokVideos || []), ...uniqueNewVideos];
                    } else if (platform === 'instagram') {
                        const existingVideoIds = new Set((cat.instagramVideos || []).map(v => v.id));
                        const uniqueNewVideos = newVideos.filter(v => !existingVideoIds.has(v.id));
                        updatedCat.instagramVideos = [...(cat.instagramVideos || []), ...uniqueNewVideos];
                    }
                    return updatedCat;
                }
                return cat;
            });

            if (selectedCategory?.id === categoryId) {
                const updatedCategory = updatedCategories.find(c => c.id === categoryId);
                if (updatedCategory) setSelectedCategory(updatedCategory);
            }
            return updatedCategories;
        });
    }, [selectedCategory]);

    // Effect to auto-populate empty categories with videos on login
    useEffect(() => {
        if (!currentUser) return;
    
        const populateEmptyCategories = async () => {
            // Check session storage to run this only once per session
            const populated = sessionStorage.getItem('arc7hive_populated_categories');
            if (populated) return;
    
            // Use a functional update to get the latest categories without adding it to dependency array
            setLearningCategories(currentCategories => {
                const categoriesToUpdate = currentCategories.filter(cat => cat.videos.length === 0);
                if (categoriesToUpdate.length === 0) {
                    sessionStorage.setItem('arc7hive_populated_categories', 'true');
                    return currentCategories; // No change needed
                }
                
                setLoadingCategories(new Set(categoriesToUpdate.map(c => c.id)));
                
                const searchPromises = categoriesToUpdate.map(category =>
                    findVideos(category.title, 'youtube')
                        .then(newVideos => ({ categoryId: category.id, newVideos, success: true }))
                        .catch(error => {
                            console.error(`Falha ao buscar vídeos para ${category.title}:`, error);
                            return { categoryId: category.id, newVideos: [], success: false };
                        })
                );
    
                Promise.all(searchPromises).then(results => {
                    results.forEach(result => {
                        if (result.success && result.newVideos.length > 0) {
                            handleAddVideosToCategory(result.categoryId, result.newVideos, 'youtube');
                        }
                    });
                    setLoadingCategories(new Set());
                    sessionStorage.setItem('arc7hive_populated_categories', 'true');
                });
    
                return currentCategories; // Return original while async operation is running
            });
        };
    
        populateEmptyCategories();
    }, [currentUser, handleAddVideosToCategory]);


    const handleLogin = (user: User) => {
        const storedAvatar = localStorage.getItem(`arc7hive_avatar_${user.name}`);
        const userToLogin = { ...user, avatarUrl: storedAvatar || user.avatarUrl };
        setCurrentUser(userToLogin);
        localStorage.setItem('arc7hive_user', user.name);
        setShowWelcome(true);
        const storedProgress = localStorage.getItem(`arc7hive_progress_${user.name}`);
        setWatchedVideos(new Set(storedProgress ? JSON.parse(storedProgress) : []));
    };

    const handleLogout = () => {
        if (currentUser) {
            goOffline(currentUser.name);
        }
        localStorage.removeItem('arc7hive_user');
        sessionStorage.removeItem('arc7hive_populated_categories');
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

        try {
            await sendMessage(currentUser.name, text, currentUser.avatarUrl);

            if (isMeetingAiActive && text.toLowerCase().startsWith('@arc7')) {
                 const aiPrompt = text.substring(5).trim();
                 const responseText = await getMeetingChatResponse(aiPrompt, [...meetingMessages]);
                 // The AI avatar is fixed
                 await sendMessage('ARC7', responseText, 'https://placehold.co/100x100/71717A/FFFFFF?text=AI');
            }
        } catch (error) {
            setNotification({ type: 'error', message: `Falha ao enviar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}` });
        }
    }, [currentUser, isMeetingAiActive, meetingMessages]);
    
    const handleTypingChange = useCallback((isTyping: boolean) => {
        if (!currentUser) return;
        updateTypingStatus(currentUser, isTyping);
    }, [currentUser]);

    const handleToggleAi = useCallback(() => {
        setIsMeetingAiActive(prev => !prev);
    }, []);
    
    const handleWelcomeFinish = () => setShowWelcome(false);

    const handleSelectCategory = (category: LearningCategory) => setSelectedCategory(category);
    
    const handleBackToDashboard = () => setSelectedCategory(null);

    const handleUpdateAvatar = async (newAvatarUrl: string) => {
        if (!currentUser) return;
        const updatedUser = { ...currentUser, avatarUrl: newAvatarUrl };
        setCurrentUser(updatedUser);
        localStorage.setItem(`arc7hive_avatar_${currentUser.name}`, newAvatarUrl);
        // Update presence in Supabase with new avatar
        await updateUserPresence(updatedUser);
    };
    
    const handleToggleVideoWatched = (videoId: string) => {
        setWatchedVideos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(videoId)) newSet.delete(videoId);
            else newSet.add(videoId);
            return newSet;
        });
    };
    
    const totalVideos = useMemo(() => learningCategories.reduce((acc, cat) => acc + cat.videos.length, 0), [learningCategories]);
    const completedVideos = watchedVideos.size;
    const overallProgress = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
    
    const SimulationModeBanner = () => (
        <div className="bg-yellow-500/20 border-b-2 border-yellow-600 text-yellow-200 text-sm text-center p-2 z-50 sticky top-0">
            <Icon name="Wrench" className="w-4 h-4 inline-block mr-2 -mt-1" />
            <b>Modo de Simulação Ativado:</b> A cota da API foi excedida. A aplicação está usando dados de exemplo.
        </div>
    );

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
                    error={meetingError}
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
                loadingCategories={loadingCategories}
            />
        );
    };
    
    const showChatbot = currentUser && !showWelcome && !isAdminPanelOpen && !isMeetingOpen && !isProjectsOpen && !selectedProject && !generatingProjectConfig;
    const showMusicPlayer = currentUser && !showWelcome;

    return (
        <>
            {isSimulationMode && <SimulationModeBanner />}
            {notification && (
                <NotificationBanner 
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)} />
            )}
            {renderContent()}
            {showChatbot && <Chatbot />}
            {showMusicPlayer && <MusicPlayer playlist={playlist} error={playlistError} />}
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
        </>
    );
};

export default App;