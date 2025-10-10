import React, { useState, useRef, useEffect } from 'react';
import type { User, MeetingMessage } from '../types';
import Icon from './Icons';

interface MeetingPageProps {
    user: User;
    messages: MeetingMessage[];
    onSendMessage: (text: string) => void;
    onBack: () => void;
    typingUsers: Set<string>;
    onlineUsers: Set<string>;
    onTypingChange: (isTyping: boolean) => void;
    isAiActive: boolean;
    onToggleAi: () => void;
}

const MeetingPage: React.FC<MeetingPageProps> = ({ 
    user, 
    messages, 
    onSendMessage, 
    onBack, 
    typingUsers, 
    onlineUsers,
    onTypingChange, 
    isAiActive, 
    onToggleAi 
}) => {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<number | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onSendMessage(inputValue);
            setInputValue('');
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            onTypingChange(false);
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        if(!typingTimeoutRef.current) {
            onTypingChange(true);
        } else {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = window.setTimeout(() => {
            onTypingChange(false);
            typingTimeoutRef.current = null;
        }, 2000);
    };

    const isCurrentUser = (messageUser: string) => user.name === messageUser;
    
    const typingNames = Array.from(typingUsers).filter(name => name !== user.name);
    const onlineNames = Array.from(onlineUsers).filter(name => name !== user.name);
    const onlineCount = Array.from(onlineUsers).length;

    return (
        <div className="min-h-screen bg-darker text-white font-sans flex flex-col">
            {/* Header */}
            <header className="bg-dark border-b border-gray-900 sticky top-0 z-20 flex-shrink-0">
                <div className="container mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center">
                            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors mr-4">
                                <Icon name="ChevronLeft" className="w-6 h-6" />
                            </button>
                            <div className="flex items-center gap-3">
                                <Icon name="UsersGroup" className="w-8 h-8 text-brand-red" />
                                <div>
                                    <h1 className="text-xl font-display tracking-wider text-white">Sala de Reunião</h1>
                                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                                        <span className="relative flex h-2 w-2">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${onlineCount > 0 ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                                            <span className={`relative inline-flex rounded-full h-2 w-2 ${onlineCount > 0 ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                        </span>
                                        {onlineCount} online: {onlineNames.join(', ')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3" title={isAiActive ? "Desativar IA" : "Ativar IA"}>
                            <span className={`text-sm font-medium ${isAiActive ? 'text-gray-300' : 'text-gray-500'}`}>IA (@ARC7)</span>
                            <button
                                onClick={onToggleAi}
                                role="switch"
                                aria-checked={isAiActive}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark focus:ring-brand-red ${isAiActive ? 'bg-brand-red' : 'bg-gray-600'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAiActive ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <main className="flex-grow container mx-auto px-4 sm:px-6 py-4 flex flex-col overflow-y-hidden">
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex items-end gap-2 ${isCurrentUser(msg.user) ? 'justify-end' : 'justify-start'}`}>
                            {!isCurrentUser(msg.user) && (
                                <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center border border-gray-600 ${msg.user === 'ARC7' ? 'bg-gray-700' : 'bg-indigo-600'}`}>
                                    <Icon name={msg.user === 'ARC7' ? 'Brain' : 'User'} className={`w-5 h-5 ${msg.user === 'ARC7' ? 'text-brand-red' : 'text-white'}`} />
                                </div>
                            )}
                            <div className={`max-w-[70%]`}>
                                {!isCurrentUser(msg.user) && (
                                     <p className="text-xs text-gray-400 mb-1 ml-2">{msg.user}</p>
                                )}
                                <div className={`p-3 rounded-xl ${isCurrentUser(msg.user) ? 'bg-brand-red text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}`}>
                                    <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <div className="h-6 px-4 text-sm text-gray-400 italic transition-opacity duration-300">
                    {typingNames.length > 0 &&
                        `${typingNames.join(', ')} ${typingNames.length > 1 ? 'estão digitando' : 'está digitando'}...`
                    }
                </div>
            </main>

            {/* Input Form */}
            <footer className="bg-dark/80 backdrop-blur-sm border-t border-gray-900 p-4 sticky bottom-0 flex-shrink-0">
                <form onSubmit={handleFormSubmit} className="container mx-auto">
                    <div className="relative">
                        <textarea
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleFormSubmit(e);
                                }
                            }}
                            placeholder={isAiActive ? "Digite sua mensagem... (@ARC7 para ajuda)" : "Digite sua mensagem..."}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-4 pr-12 text-white focus:ring-2 focus:ring-brand-red focus:border-brand-red transition resize-none"
                            rows={1}
                            style={{minHeight: '44px', maxHeight: '150px'}}
                            aria-label="Sua mensagem"
                        />
                        <button type="submit" className="absolute bottom-2 right-2 flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-brand-red disabled:text-gray-600 transition-colors" disabled={!inputValue.trim()}>
                            <Icon name="Send" className="w-5 h-5" />
                        </button>
                    </div>
                </form>
            </footer>
        </div>
    );
};

export default MeetingPage;