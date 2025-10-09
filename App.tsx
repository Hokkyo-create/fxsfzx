import React, { useState, useEffect, useMemo } from 'react';
import { users, categories as initialCategories } from './data';
import type { LearningCategory, User, Video } from './types';
import LoginPage from './components/LoginPage';
import WelcomeScreen from './components/WelcomeScreen';
import DashboardPage from './components/DashboardPage';
import VideoPlayerPage from './components/VideoPlayerPage';
import Chatbot from './components/Chatbot';
import AdminPanel from './components/AdminPanel';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const [learningCategories, setLearningCategories] = useState<LearningCategory[]>(initialCategories);
    const [selectedCategory, setSelectedCategory] = useState<LearningCategory | null>(null);
    const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

    useEffect(() => {
        // Apply custom admin styles on initial load
        const customStyles = localStorage.getItem('arc7hive_custom_styles');
        if (customStyles) {
            const styleElement = document.createElement('style');
            styleElement.id = 'custom-admin-styles';
            styleElement.innerHTML = customStyles;
            document.head.appendChild(styleElement);
        }

        // Load categories from localStorage, falling back to initial data
        try {
            const storedCategories = localStorage.getItem('arc7hive_categories');
            if (storedCategories) {
                setLearningCategories(JSON.parse(storedCategories));
            }
        } catch (error) {
            console.error("Failed to parse categories from localStorage", error);
            setLearningCategories(initialCategories); // Fallback
        }

        // Load current user and their progress from localStorage for persistence
        const storedUser = localStorage.getItem('arc7hive_user');
        if (storedUser) {
            const foundUser = users.find(u => u.name === storedUser);
            if (foundUser) {
                setCurrentUser(foundUser);
                const storedProgress = localStorage.getItem(`arc7hive_progress_${foundUser.name}`);
                if (storedProgress) {
                    try {
                        setWatchedVideos(new Set(JSON.parse(storedProgress)));
                    } catch (error) {
                        console.error("Failed to parse progress from localStorage", error);
                        setWatchedVideos(new Set());
                    }
                }
            }
        }
    }, []);
    
    // Persist watched videos progress to localStorage
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`arc7hive_progress_${currentUser.name}`, JSON.stringify(Array.from(watchedVideos)));
        }
    }, [watchedVideos, currentUser]);

    // Persist the entire category list (with new videos) to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('arc7hive_categories', JSON.stringify(learningCategories));
        } catch (error) {
            console.error("Failed to save categories to localStorage", error);
        }
    }, [learningCategories]);


    const handleLogin = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('arc7hive_user', user.name);
        setShowWelcome(true);
        const storedProgress = localStorage.getItem(`arc7hive_progress_${user.name}`);
        setWatchedVideos(new Set(storedProgress ? JSON.parse(storedProgress) : []));
    };

    const handleLogout = () => {
        localStorage.removeItem('arc7hive_user');
        setCurrentUser(null);
        setSelectedCategory(null);
        setWatchedVideos(new Set());
        setIsAdminPanelOpen(false); // Close admin panel on logout
    };
    
    const handleToggleAdminPanel = () => {
        setIsAdminPanelOpen(prev => !prev);
    }

    const handleWelcomeFinish = () => {
        setShowWelcome(false);
    };

    const handleSelectCategory = (category: LearningCategory) => {
        setSelectedCategory(category);
    };
    
    const handleBackToDashboard = () => {
        setSelectedCategory(null);
    };
    
    const handleToggleVideoWatched = (videoId: string) => {
        setWatchedVideos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(videoId)) {
                newSet.delete(videoId);
            } else {
                newSet.add(videoId);
            }
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

            // Also update the selectedCategory state if it's the one being modified
            if (selectedCategory?.id === categoryId) {
                const updatedCategory = updatedCategories.find(c => c.id === categoryId);
                if (updatedCategory) {
                    setSelectedCategory(updatedCategory);
                }
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
            />
        );
    };
    
    const showChatbot = currentUser && !showWelcome && !isAdminPanelOpen;

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