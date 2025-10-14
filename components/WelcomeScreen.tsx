import React, { useEffect } from 'react';
import type { User } from '../types';

interface WelcomeScreenProps {
    user: User;
    onFinish: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ user, onFinish }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onFinish();
        }, 4000); 

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className="min-h-screen bg-darker flex flex-col items-center justify-center overflow-hidden p-4">
            <div className="text-center font-mono text-green-400 text-sm animate-fade-in">
                <p>&gt; INICIANDO SISTEMA ARC7HIVE...</p>
                <p>&gt; AUTENTICAÇÃO CONFIRMADA.</p>
            </div>
            
            <div className="my-8">
                <h1 
                    className="text-7xl md:text-9xl font-display tracking-widest text-white opacity-0 animate-logo-glitch-scan"
                    style={{ animationDelay: '0.5s' }}
                >
                    <span>ARC</span>
                    <span className="text-brand-red">7</span>
                    <span>HIVE</span>
                </h1>
            </div>

            <div 
                className="font-mono text-gray-300 text-lg opacity-0 animate-fade-in-up"
                style={{ animationDelay: '2.5s' }}
            >
                <span className="text-green-400">&gt;</span> BEM-VINDO, <span className="text-white font-bold">{user.name.toUpperCase()}</span>
                <span className="animate-blinking-cursor text-green-400">_</span>
            </div>
        </div>
    );
};

export default WelcomeScreen;