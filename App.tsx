import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { users, categories as initialCategories } from './data';
import type { LearningCategory, User, Video, MeetingMessage } from './types';
import LoginPage from './components/LoginPage';
import WelcomeScreen from './components/WelcomeScreen';
import DashboardPage from './components/DashboardPage';
import VideoPlayerPage from './components/VideoPlayerPage';
import MeetingPage from './components/Header'; // Re-using Header.tsx for MeetingPage
import Chatbot from './components/Chatbot';
import AdminPanel from './components/AdminPanel';
import { getMeetingChatResponse } from './services/geminiService';

// Define the structure for messages sent through the BroadcastChannel
type BroadcastPayload = 
    | { type: 'new_message'; payload: MeetingMessage }
    | { type: 'typing_start'; payload: { user: string } }
    | { type: 'typing_stop'; payload: { user: string } }
    | { type: 'toggle_ai'; payload: { isActive: boolean } }
    | { type: 'user_online'; payload: { user: string } }
    | { type: 'user_offline'; payload: { user: string } };


const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const [learningCategories, setLearningCategories] = useState<LearningCategory[]>(initialCategories);
    const [selectedCategory, setSelectedCategory] = useState<LearningCategory | null>(null);
    const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    
    // Meeting state
    const [isMeetingOpen, setIsMeetingOpen] = useState(false);
    const [meetingMessages, setMeetingMessages] = useState<MeetingMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [isMeetingAiActive, setIsMeetingAiActive] = useState(true);

    // Use a BroadcastChannel for real-time, cross-tab communication
    const channel = useMemo(() => new BroadcastChannel('arc7hive-meeting-chat'), []);

    useEffect(() => {
        // Apply custom admin styles on initial load
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
        } catch (error) {
            console.error("Failed to parse categories from localStorage", error);
        }

        // Load user from localStorage
        const storedUser = localStorage.getItem('arc7hive_user');
        if (storedUser) {
            const foundUser = users.find(u => u.name === storedUser);
            if (foundUser) {
                setCurrentUser(foundUser);
                try {
                    const storedProgress = localStorage.getItem(`arc7hive_progress_${foundUser.name}`);
                    if (storedProgress) setWatchedVideos(new Set(JSON.parse(storedProgress)));
                } catch (error) {
                    console.error("Failed to parse progress from localStorage", error);
                }
            }
        }

        // Load meeting messages from localStorage (for persistence)
        try {
            const storedMessages = localStorage.getItem('arc7hive_meeting_chat');
            if (storedMessages) setMeetingMessages(JSON.parse(storedMessages));
        } catch (error) {
            console.error("Failed to parse meeting messages from localStorage", error);
        }

        // Load AI state from localStorage
        try {
            const storedAiActive = localStorage.getItem('arc7hive_meeting_ai_active');
            if (storedAiActive) setIsMeetingAiActive(JSON.parse(storedAiActive));
        } catch (error) {
             console.error("Failed to parse AI active state from localStorage", error);
        }

        // Listener for real-time messages from other tabs
        const handleChannelMessage = (event: MessageEvent<BroadcastPayload>) => {
            const { type, payload } = event.data;
            switch (type) {
                case 'new_message':
                    setMeetingMessages(prev => [...prev, payload]);
                    break;
                case 'typing_start':
                    setTypingUsers(prev => new Set(prev).add(payload.user));
                    break;
                case 'typing_stop':
                    setTypingUsers(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(payload.user);
                        return newSet;
                    });
                    break;
                case 'toggle_ai':
                    setIsMeetingAiActive(payload.isActive);
                    break;
                case 'user_online':
                    setOnlineUsers(prev => new Set(prev).add(payload.user));
                    break;
                case 'user_offline':
                    setOnlineUsers(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(payload.user);
                        return newSet;
                    });
                    break;
            }
        };

        channel.addEventListener('message', handleChannelMessage);
        return () => channel.removeEventListener('message', handleChannelMessage);
    }, [channel]);
    
    // Persist watched videos progress
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`arc7hive_progress_${currentUser.name}`, JSON.stringify(Array.from(watchedVideos)));
        }
    }, [watchedVideos, currentUser]);

    // Persist categories list
    useEffect(() => {
        try {
            localStorage.setItem('arc7hive_categories', JSON.stringify(learningCategories));
        } catch (error) { console.error("Failed to save categories", error); }
    }, [learningCategories]);

    // Persist meeting messages, but only keep the last 50 to avoid bloating localStorage
    useEffect(() => {
        try {
            const recentMessages = meetingMessages.slice(-50);
            localStorage.setItem('arc7hive_meeting_chat', JSON.stringify(recentMessages));
        } catch (error) { console.error("Failed to save meeting messages", error); }
    }, [meetingMessages]);


    const handleLogin = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('arc7hive_user', user.name);
        setShowWelcome(true);
        const storedProgress = localStorage.getItem(`arc7hive_progress_${user.name}`);
        setWatchedVideos(new Set(storedProgress ? JSON.parse(storedProgress) : []));
    };

    const handleLogout = () => {
        if(currentUser) {
            channel.postMessage({ type: 'user_offline', payload: { user: currentUser.name } });
        }
        localStorage.removeItem('arc7hive_user');
        setCurrentUser(null);
        setSelectedCategory(null);
        setWatchedVideos(new Set());
        setIsAdminPanelOpen(false);
        setIsMeetingOpen(false);
    };
    
    const handleToggleAdminPanel = () => setIsAdminPanelOpen(prev => !prev);
    
    const handleNavigateToMeeting = () => {
        setIsMeetingOpen(true);
        // Clear any stale online users when opening the meeting room
        setOnlineUsers(new Set(currentUser ? [currentUser.name] : []));
    };

    const handleBackFromMeeting = () => setIsMeetingOpen(false);
    
    const handleSendMessage = useCallback(async (text: string) => {
        if (!currentUser) return;

        const newMessage: MeetingMessage = {
            id: `${Date.now()}-${currentUser.name}`,
            user: currentUser.name,
            text,
            timestamp: Date.now(),
        };

        // Post to channel. The listener will update the state for everyone, including the sender.
        channel.postMessage({ type: 'new_message', payload: newMessage });

        if (isMeetingAiActive && text.toLowerCase().startsWith('@arc7')) {
             const aiPrompt = text.substring(5).trim();
             // Pass a snapshot of messages up to the current one for context
             const responseText = await getMeetingChatResponse(aiPrompt, [...meetingMessages, newMessage]);
             
             const aiMessage: MeetingMessage = {
                 id: `${Date.now()}-ARC7`,
                 user: 'ARC7',
                 text: responseText,
                 timestamp: Date.now(),
             };
             
             channel.postMessage({ type: 'new_message', payload: aiMessage });
        }
    }, [currentUser, meetingMessages, channel, isMeetingAiActive]);
    
    const handleTypingChange = useCallback((isTyping: boolean) => {
        if (!currentUser) return;
        const type = isTyping ? 'typing_start' : 'typing_stop';
        channel.postMessage({ type, payload: { user: currentUser.name } });
    }, [channel, currentUser]);

    const handleToggleAi = useCallback(() => {
        const newIsActive = !isMeetingAiActive;
        setIsMeetingAiActive(newIsActive);
        localStorage.setItem('arc7hive_meeting_ai_active', JSON.stringify(newIsActive));
        channel.postMessage({ type: 'toggle_ai', payload: { isActive: newIsActive } });
    }, [isMeetingAiActive, channel]);

    const handlePresenceChange = useCallback((status: 'online' | 'offline') => {
        if (!currentUser) return;
        const type = status === 'online' ? 'user_online' : 'user_offline';
        channel.postMessage({ type, payload: { user: currentUser.name } });
    }, [channel, currentUser]);

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
                    onPresenceChange={handlePresenceChange}
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