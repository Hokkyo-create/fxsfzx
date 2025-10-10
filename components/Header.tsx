import React, { useState, useRef, useEffect } from 'react';
import type { User, MeetingMessage } from '../types';
import Icon from './Icons';

interface MeetingPageProps {
    user: User;
    messages: MeetingMessage[];
    onSendMessage: (text: string) => void;
    onBack: () => void;
}

const MeetingPage: React.FC<MeetingPageProps> = ({ user, messages, onSendMessage, onBack }) => {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        }
    };

    const isCurrentUser = (messageUser: string) => user.name === messageUser;

    return (
        <div className="min-h-screen bg-darker text-white font-sans flex flex-col">
            {/* Header */}
            <header className="bg-dark border-b border-gray-900 sticky top-0 z-20 flex-shrink-0">
                <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors mr-4">
                        <Icon name="ChevronLeft" className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <Icon name="UsersGroup" className="w-8 h-8 text-brand-red" />
                        <h1 className="text-2xl font-display tracking-wider text-white">Sala de Reunião</h1>
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
            </main>

            {/* Input Form */}
            <footer className="bg-dark/80 backdrop-blur-sm border-t border-gray-900 p-4 sticky bottom-0 flex-shrink-0">
                <form onSubmit={handleFormSubmit} className="container mx-auto">
                    <div className="relative">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleFormSubmit(e);
                                }
                            }}
                            placeholder="Digite sua mensagem... (@ARC7 para ajuda)"
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
