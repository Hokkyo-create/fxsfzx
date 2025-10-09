import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import Icon from './Icons';
import { getChatbotResponse } from '../services/geminiService';

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAiEnabled, setIsAiEnabled] = useState(false);
    const chatContentRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (isOpen) {
            const key = localStorage.getItem('arc7hive_admin_api_key');
            setIsAiEnabled(!!key && key.trim().length > 0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setIsLoading(true);
            setTimeout(() => {
                if (isAiEnabled) {
                    setMessages([{
                        role: 'model',
                        text: "Olá! Eu sou o ARC7, seu assistente de IA na plataforma ARC7HIVE. Como posso ajudar você a explorar nossas trilhas de conhecimento hoje?"
                    }]);
                    setSuggestions([
                        "O que é o Projeto Evolution?",
                        "Fale sobre as categorias",
                        "Qual a última atualização?"
                    ]);
                } else {
                    setMessages([{
                        role: 'model',
                        text: "Assistente de IA desativado. Para ativá-lo, o administrador ('Gustavo') precisa configurar uma chave de API válida no 'Modo Desenvolvedor'."
                    }]);
                }
                setIsLoading(false);
            }, 500);
        }
    }, [isOpen, isAiEnabled]);

    useEffect(() => {
        // Scroll to the bottom of the chat window when new messages are added
        if (chatContentRef.current) {
            chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
        }
    }, [messages, suggestions]);
    
    const handleToggleChat = () => {
        setIsOpen(prev => !prev);
    };
    
    const submitMessage = async (text: string) => {
        if (!text.trim() || isLoading || !isAiEnabled) return;

        const userMessage: ChatMessage = { role: 'user', text };
        
        // Add user message and clear suggestions
        setMessages(prev => [...prev, userMessage]);
        setSuggestions([]); 
        setIsLoading(true);
        
        const currentHistory = [...messages, userMessage]; 
        const responseText = await getChatbotResponse(text, currentHistory);
        
        const modelMessage: ChatMessage = { role: 'model', text: responseText };
        setMessages(prev => [...prev, modelMessage]);
        setIsLoading(false);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitMessage(inputValue);
        setInputValue('');
    };

    const handleSuggestionClick = (suggestion: string) => {
        submitMessage(suggestion);
    };
    
    const ChatWindow = () => (
        <div className="fixed bottom-24 right-4 sm:right-8 w-[calc(100%-2rem)] max-w-md h-[70vh] max-h-[600px] bg-dark border border-gray-800 rounded-lg shadow-2xl shadow-brand-red/20 flex flex-col z-40 animate-slide-in-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Icon name="Brain" className="w-6 h-6 text-brand-red" />
                    <h3 className="text-lg font-display tracking-wider text-white">Assistente ARC7</h3>
                </div>
                <button onClick={handleToggleChat} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                    <Icon name="X" className="w-5 h-5" />
                </button>
            </div>
            {/* Messages */}
            <div ref={chatContentRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       {msg.role === 'model' && (
                           <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600">
                               <Icon name="Brain" className="w-5 h-5 text-brand-red" />
                           </div>
                       )}
                        <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-brand-red text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}`}>
                            <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }}></p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-end gap-2 justify-start">
                        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600">
                           <Icon name="Brain" className="w-5 h-5 text-brand-red" />
                        </div>
                        <div className="max-w-[80%] p-3 rounded-xl bg-gray-800 text-gray-200 rounded-bl-none">
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></span>
                            </div>
                        </div>
                    </div>
                )}
                 {suggestions.length > 0 && !isLoading && (
                    <div className="flex flex-wrap gap-2 justify-start pt-2 pl-12">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="px-3 py-1 bg-gray-700 text-sm text-gray-200 rounded-full hover:bg-brand-red transition-colors animate-fade-in"
                                style={{animationDelay: `${index * 100}ms`}}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {/* Input */}
            <form onSubmit={handleFormSubmit} className="p-4 border-t border-gray-800 flex-shrink-0">
                <div className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isAiEnabled ? "Pergunte sobre a plataforma..." : "Assistente desativado"}
                        className="w-full bg-gray-900 border border-gray-700 rounded-full py-2 pl-4 pr-12 text-white focus:ring-2 focus:ring-brand-red focus:border-brand-red transition"
                        aria-label="Sua mensagem"
                        disabled={isLoading || !isAiEnabled}
                    />
                    <button type="submit" className="absolute inset-y-0 right-0 flex items-center justify-center w-10 h-10 text-gray-400 hover:text-brand-red disabled:text-gray-600 transition-colors" disabled={isLoading || !inputValue.trim() || !isAiEnabled}>
                         <Icon name="Send" className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );

    return (
        <>
            {isOpen && <ChatWindow />}
            <button
                onClick={handleToggleChat}
                className="fixed bottom-4 right-4 sm:right-8 w-16 h-16 bg-brand-red rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 z-50"
                aria-label={isOpen ? "Fechar chat" : "Abrir chat com assistente IA"}
            >
                <Icon name={isOpen ? "X" : "Brain"} className="w-8 h-8 text-white" />
            </button>
        </>
    );
};

export default Chatbot;