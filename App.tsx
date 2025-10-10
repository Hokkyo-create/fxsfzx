// FIX: Imported `useMemo` from react to fix 'Cannot find name' error.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    }, []);

    // Effect for real-time chat sync using localStorage
    useEffect(() => {
        // Clear previous chat history on app load, as requested.
        localStorage.removeItem('arc7hive_meeting_chat');
        localStorage.removeItem('arc7hive_meeting_typing');
        localStorage.removeItem('arc7hive_meeting_online');
        
        // Reset state for a clean start
        setMeetingMessages([]);
        setTypingUsers(new Set());
        setOnlineUsers(currentUser ? new Set([currentUser.name]) : new Set());

        // Load AI state from localStorage
        try {
            const storedAiActive = localStorage.getItem('arc7hive_meeting_ai_active');
            if (storedAiActive) setIsMeetingAiActive(JSON.parse(storedAiActive));
            else setIsMeetingAiActive(true); // Default to true if not set
        } catch (error) {
             console.error("Failed to parse AI active state from localStorage", error);
        }

        const handleStorageChange = (event: StorageEvent) => {
            if (!event.key || !event.newValue) return;
            try {
                switch (event.key) {
                    case 'arc7hive_meeting_chat':
                        setMeetingMessages(JSON.parse(event.newValue));
                        break;
                    case 'arc7hive_meeting_typing':
                        setTypingUsers(new Set(JSON.parse(event.newValue)));
                        break;
                    case 'arc7hive_meeting_online':
                        setOnlineUsers(new Set(JSON.parse(event.newValue)));
                        break;
                    case 'arc7hive_meeting_ai_active':
                        setIsMeetingAiActive(JSON.parse(event.newValue));
                        break;
                }
            } catch(e) {
                console.error("Failed to parse storage update", e);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Announce current user is online when app loads and is logged in
        if (currentUser) {
            const currentOnline = JSON.parse(localStorage.getItem('arc7hive_meeting_online') || '[]');
            const onlineSet = new Set<string>(currentOnline);
            onlineSet.add(currentUser.name);
            localStorage.setItem('arc7hive_meeting_online', JSON.stringify(Array.from(onlineSet)));
            setOnlineUsers(onlineSet); // Update own state
        }

        return () => {
            // When component unmounts (e.g., page close), announce offline status
            if(currentUser) {
                 const currentOnline = JSON.parse(localStorage.getItem('arc7hive_meeting_online') || '[]');
                 const onlineSet = new Set<string>(currentOnline);
                 onlineSet.delete(currentUser.name);
                 localStorage.setItem('arc7hive_meeting_online', JSON.stringify(Array.from(onlineSet)));
            }
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [currentUser]); // This effect now correctly depends on the user session
    
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


    const handleLogin = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('arc7hive_user', user.name);
        setShowWelcome(true);
        const storedProgress = localStorage.getItem(`arc7hive_progress_${user.name}`);
        setWatchedVideos(new Set(storedProgress ? JSON.parse(storedProgress) : []));
    };

    const handleLogout = () => {
        if(currentUser) {
            const currentOnline = JSON.parse(localStorage.getItem('arc7hive_meeting_online') || '[]');
            const onlineSet = new Set<string>(currentOnline);
            onlineSet.delete(currentUser.name);
            setOnlineUsers(new Set()); // Clear local state
            localStorage.setItem('arc7hive_meeting_online', JSON.stringify(Array.from(onlineSet)));
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

        const newMessage: MeetingMessage = {
            id: `${Date.now()}-${currentUser.name}`,
            user: currentUser.name,
            text,
            timestamp: Date.now(),
        };

        // Read -> Modify -> Write pattern to ensure sync
        const currentMessages = JSON.parse(localStorage.getItem('arc7hive_meeting_chat') || '[]');
        let updatedMessages = [...currentMessages, newMessage].slice(-50);
        
        localStorage.setItem('arc7hive_meeting_chat', JSON.stringify(updatedMessages));
        setMeetingMessages(updatedMessages); // Manually update self, others get 'storage' event

        if (isMeetingAiActive && text.toLowerCase().startsWith('@arc7')) {
             const aiPrompt = text.substring(5).trim();
             const responseText = await getMeetingChatResponse(aiPrompt, updatedMessages);
             
             const aiMessage: MeetingMessage = {
                 id: `${Date.now()}-ARC7`,
                 user: 'ARC7',
                 text: responseText,
                 timestamp: Date.now(),
             };
             
             // Read again in case another message arrived during the AI's response time
             const messagesAfterAiRequest = JSON.parse(localStorage.getItem('arc7hive_meeting_chat') || '[]');
             const finalMessages = [...messagesAfterAiRequest, aiMessage].slice(-50);
             
             localStorage.setItem('arc7hive_meeting_chat', JSON.stringify(finalMessages));
             setMeetingMessages(finalMessages); // Manually update self again
        }
    }, [currentUser, isMeetingAiActive]);
    
    const handleTypingChange = useCallback((isTyping: boolean) => {
        if (!currentUser) return;

        // Read -> Modify -> Write pattern
        const storedTyping = JSON.parse(localStorage.getItem('arc7hive_meeting_typing') || '[]');
        const newTypingUsers = new Set<string>(storedTyping);
        
        let hasChanged = false;
        if (isTyping) {
            if (!newTypingUsers.has(currentUser.name)) {
                newTypingUsers.add(currentUser.name);
                hasChanged = true;
            }
        } else {
            if (newTypingUsers.has(currentUser.name)) {
                newTypingUsers.delete(currentUser.name);
                hasChanged = true;
            }
        }
        
        if (hasChanged) {
            const asArray = Array.from(newTypingUsers);
            localStorage.setItem('arc7hive_meeting_typing', JSON.stringify(asArray));
            setTypingUsers(newTypingUsers); // Manually update self
        }
    }, [currentUser]);

    const handleToggleAi = useCallback(() => {
        const newIsActive = !isMeetingAiActive;
        setIsMeetingAiActive(newIsActive); // Update self
        localStorage.setItem('arc7hive_meeting_ai_active', JSON.stringify(newIsActive)); // Update others
    }, [isMeetingAiActive]);

    const handlePresenceChange = useCallback((status: 'online' | 'offline') => {
        if (!currentUser) return;
        
        // Read -> Modify -> Write pattern
        const storedOnline = JSON.parse(localStorage.getItem('arc7hive_meeting_online') || '[]');
        const newOnlineUsers = new Set<string>(storedOnline);

        if (status === 'online') {
            newOnlineUsers.add(currentUser.name);
        } else {
            newOnlineUsers.delete(currentUser.name);
        }
        
        const asArray = Array.from(newOnlineUsers);
        localStorage.setItem('arc7hive_meeting_online', JSON.stringify(asArray));
        setOnlineUsers(newOnlineUsers); // Manually update self
    }, [currentUser]);

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