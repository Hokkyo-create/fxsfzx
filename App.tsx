import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { users, categories as initialCategories } from './data';
import type { LearningCategory, User, Video, MeetingMessage, OnlineUser, Project, ProjectGenerationConfig, Song, Notification, NextVideoInfo } from './types';
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
import { getMeetingChatResponse } from './services/geminiService';
import {
    setupMessagesListener,
    setupPresence,
    sendMessage,
    updateTypingStatus,
    updateUserPresence,
    goOffline,
    setupPlaylistListener,
    formatSupabaseError,
    setupVideosListener,
    addVideos,
    getUserProgress,
    updateUserProgress,
} from './services/supabaseService';
import type { PostgrestError } from '@supabase/supabase-js';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const [learningCategories, setLearningCategories] = useState<LearningCategory[]>(initialCategories);
    const [selectedCategory, setSelectedCategory] = useState<LearningCategory | null>(null);
    const [initialVideoId, setInitialVideoId] = useState<string | null>(null);
    const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    
    // PWA Install Prompt
    const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

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
    
    const isInitialProgressLoad = useRef(true); // To prevent writing progress back on initial load

    // Initial setup and auto-login
    useEffect(() => {
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

        // Auto-login user from localStorage
        const autoLogin = async () => {
            const storedUserName = localStorage.getItem('arc7hive_user');
            if (storedUserName) {
                const foundUser = users.find(u => u.name === storedUserName);
                if (foundUser) {
                    const storedAvatar = localStorage.getItem(`arc7hive_avatar_${foundUser.name}`);
                    const userWithAvatar = { ...foundUser, avatarUrl: storedAvatar || foundUser.avatarUrl };
                    setCurrentUser(userWithAvatar);
                    
                    const progress = await getUserProgress(foundUser.name);
                    setWatchedVideos(progress);
                    isInitialProgressLoad.current = true;
                }
            }
        };
        autoLogin();
        
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
    
    // Effect to persist watched videos progress to Supabase (debounced)
    useEffect(() => {
        if (isInitialProgressLoad.current) {
            isInitialProgressLoad.current = false;
            return;
        }

        if (!currentUser) return;

        const handler = setTimeout(() => {
            updateUserProgress(currentUser.name, watchedVideos).catch(err => {
                console.error("Failed to sync progress:", err);
                // Here you might want a small, non-intrusive indicator of sync failure
            });
        }, 1500);

        return () => {
            clearTimeout(handler);
        };
    }, [watchedVideos, currentUser]);
    
    // Effect for Supabase Learning Videos Sync
    useEffect(() => {
        if (!currentUser) return;
        
        const unsubscribe = setupVideosListener((videosByCategory, error) => {
            if (error) {
                 // Errors are now handled locally in components that need this data, like Dashboard.
                 // For now, we can just log it or set a fallback state.
                 console.error(formatSupabaseError(error, 'trilhas de conhecimento'));
            } else {
                setLearningCategories(currentCategories => 
                    currentCategories.map(cat => ({
                        ...cat,
                        videos: videosByCategory[cat.id] || [],
                    }))
                );
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleLogin = async (user: User) => {
        const storedAvatar = localStorage.getItem(`arc7hive_avatar_${user.name}`);
        const userToLogin = { ...user, avatarUrl: storedAvatar || user.avatarUrl };
        setCurrentUser(userToLogin);
        localStorage.setItem('arc7hive_user', user.name);
        setShowWelcome(true);
        
        const progress = await getUserProgress(user.name);
        setWatchedVideos(progress);
        isInitialProgressLoad.current = true;
    };

    const handleLogout = () => {
        if (currentUser) {
            goOffline(currentUser.name);
        }
        localStorage.removeItem('arc7hive_user');
        setCurrentUser(null);
        setSelectedCategory(null);
        setWatchedVideos(new Set());
        setIsAdminPanelOpen(false);
        setIsMeetingOpen(false);
        setIsProjectsOpen(false);
        setSelectedProject(null);
        setGeneratingProjectConfig(null);
        // Reset categories to initial state to clear video data
        setLearningCategories(initialCategories);
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
            // Handle send message error locally if needed, e.g., show a small 'x' next to the message
            console.error(`Falha ao enviar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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

    const handleSelectCategory = (category: LearningCategory, videoId?: string) => {
        setSelectedCategory(category);
        setInitialVideoId(videoId || null);
    };
    
    const handleBackToDashboard = () => {
        setSelectedCategory(null);
        setInitialVideoId(null);
    };

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
    
    const handleAddVideosToCategory = useCallback(async (categoryId: string, newVideos: Video[]) => {
        try {
            // Perform the database update
            await addVideos(categoryId, 'youtube', newVideos);
            
            // Optimistically update the local state to reflect the change immediately.
            // The real-time listener will eventually sync with the database, ensuring consistency.
            setLearningCategories(currentCategories => 
                currentCategories.map(cat => {
                    if (cat.id === categoryId) {
                        // Create a set of existing video IDs for quick lookup to prevent duplicates
                        const existingVideoIds = new Set(cat.videos.map(v => v.id));
                        // Filter out any new videos that might already be in the state
                        const uniqueNewVideos = newVideos.filter(v => !existingVideoIds.has(v.id));
                        
                        // Return the category with the combined list of old and new videos
                        return { ...cat, videos: [...cat.videos, ...uniqueNewVideos] };
                    }
                    return cat;
                })
            );
        } catch (error) {
            console.error(error); // The component calling this should handle the user-facing error.
            // Re-throw the error so the calling component knows the operation failed.
            throw error;
        }
    }, []);

    const totalVideos = useMemo(() => learningCategories.reduce((acc, cat) => acc + cat.videos.length, 0), [learningCategories]);
    const completedVideos = watchedVideos.size;
    const overallProgress = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

    const nextVideoInfo: NextVideoInfo | null = useMemo(() => {
        // Find the first category with partial progress
        const partiallyWatchedCategory = learningCategories.find(cat => {
            const total = cat.videos.length;
            if (total === 0) return false;
            const watchedCount = cat.videos.filter(v => watchedVideos.has(v.id)).length;
            return watchedCount > 0 && watchedCount < total;
        });
    
        const categoryToSearch = partiallyWatchedCategory || learningCategories.find(c => c.videos.length > 0);
    
        if (categoryToSearch) {
            const nextVideo = categoryToSearch.videos.find(v => !watchedVideos.has(v.id));
            if (nextVideo) {
                return { video: nextVideo, category: categoryToSearch };
            }
        }
    
        // Fallback: if all videos in partially watched categories are watched,
        // or if no videos are watched at all, suggest the first video of the first category.
        const firstCategoryWithVideos = learningCategories.find(c => c.videos.length > 0);
        if (firstCategoryWithVideos && firstCategoryWithVideos.videos[0]) {
            // Only suggest if it's not already watched (covers case where everything is watched)
            if (!watchedVideos.has(firstCategoryWithVideos.videos[0].id)) {
                return { video: firstCategoryWithVideos.videos[0], category: firstCategoryWithVideos };
            }
        }
    
        return null;
    }, [learningCategories, watchedVideos]);
    
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
                    initialVideoId={initialVideoId}
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
                nextVideoInfo={nextVideoInfo}
            />
        );
    };
    
    const showChatbot = currentUser && !showWelcome && !isAdminPanelOpen && !isMeetingOpen && !isProjectsOpen && !selectedProject && !generatingProjectConfig;
    const showMusicPlayer = currentUser && !showWelcome;

    return (
        <>
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