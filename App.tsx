import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { users, categories as initialCategories } from './data';
import type { LearningCategory, User, Video, MeetingMessage } from './types';
import LoginPage from './components/LoginPage';
import WelcomeScreen from './components/WelcomeScreen';
import DashboardPage from './components/DashboardPage';
import VideoPlayerPage from './components/VideoPlayerPage';
import MeetingPage from './components/Header';
import Chatbot from './components/Chatbot';
import AdminPanel from './components/AdminPanel';
import { getMeetingChatResponse } from './services/geminiService';
import {
    setupMessagesListener,
    setupTypingListener,
    setupOnlineStatusListener,
    sendMessage,
    updateTypingStatus,
    updateUserPresence,
    goOffline
} from './services/firebaseService';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const [learningCategories, setLearningCategories] = useState<LearningCategory[]>(initialCategories);
    const [selectedCategory, setSelectedCategory] = useState<LearningCategory | null>(null);
    const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    
    // Meeting state now powered by Firebase
    const [isMeetingOpen, setIsMeetingOpen] = useState(false);
    const [meetingMessages, setMeetingMessages] = useState<MeetingMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [isMeetingAiActive, setIsMeetingAiActive] = useState(true);

    useEffect(() => {
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
        const storedUser = localStorage.getItem('arc7hive_user');
        if (storedUser) {
            const foundUser = users.find(u => u.name === storedUser);
            if (foundUser) {
                setCurrentUser(foundUser);
                try {
                    const storedProgress = localStorage.getItem(`arc7hive_progress_${foundUser.name}`);
                    if (storedProgress) setWatchedVideos(new Set(JSON.parse(storedProgress)));
                } catch (error) { console.error("Failed to parse progress", error); }
            }
        }
    }, []);

    // Effect for Real-time Firebase Chat Sync
    useEffect(() => {
        if (!currentUser) return;

        // Setup presence
        updateUserPresence(currentUser.name);

        // Setup listeners
        const unsubscribeMessages = setupMessagesListener((messages) => {
            setMeetingMessages(messages);
        });

        const unsubscribeTyping = setupTypingListener((users) => {
            setTypingUsers(new Set(users));
        });

        const unsubscribeOnline = setupOnlineStatusListener((onlineUserNames) => {
            setOnlineUsers(new Set(onlineUserNames));
        });

        // Cleanup on logout or component unmount
        return () => {
            unsubscribeMessages();
            unsubscribeTyping();
            unsubscribeOnline();
            goOffline(currentUser.name); // Explicitly set user to offline
        };
    }, [currentUser]);
    
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
        setCurrentUser(user);
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
        setCurrentUser(null);
        setSelectedCategory(null);
        setWatchedVideos(new Set());
        setIsAdminPanelOpen(false);
        setIsMeetingOpen(false);
    };
    
    const handleToggleAdminPanel = () => setIsAdminPanelOpen(prev => !prev);
    
    const handleNavigateToMeeting = () => setIsMeetingOpen(true);

    const handleBackFromMeeting = () => setIsMeetingOpen(false);
    
    const handleSendMessage = useCallback(async (text: string) => {
        if (!currentUser) return;

        sendMessage(currentUser.name, text);

        if (isMeetingAiActive && text.toLowerCase().startsWith('@arc7')) {
             const aiPrompt = text.substring(5).trim();
             // Pass a snapshot of messages for context
             const responseText = await getMeetingChatResponse(aiPrompt, [...meetingMessages]);
             sendMessage('ARC7', responseText);
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
            />
        );
    };
    
    const showChatbot = currentUser && !showWelcome && !isAdminPanelOpen && !isMeetingOpen;

    return (
        <>
            {renderContent()}
            {showChatbot && <Chatbot />}
            {currentUser?.name === 'Gustavo' && isAdminPanelOpen && (
                <AdminPanel onClose={handleToggleAdminPanel} />
            )}
        </>
    );
};

export default App;