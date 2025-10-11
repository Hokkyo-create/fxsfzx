import React, { useEffect } from 'react';
import type { User } from '../types';
import Icon from './Icons';

interface WelcomeScreenProps {
    user: User;
    onFinish: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ user, onFinish }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onFinish();
        }, 3500); // Display time remains the same

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className="min-h-screen bg-darker flex flex-col items-center justify-center overflow-hidden">
            <div className="text-center">
                <div 
                    className="mx-auto mb-4 animate-flame-burst"
                    style={{ animationDelay: '0.1s' }}
                >
                    <Icon name="Fire" className="w-28 h-28 text-brand-red animate-glow welcome-fire-icon" />
                </div>
                
                <h1 
                    className="text-7xl md:text-9xl font-display tracking-widest text-white my-4 flex items-center justify-center opacity-0 animate-tudum-glitch"
                    style={{ animationDelay: '0.5s' }}
                >
                    <span>
                        ARC
                    </span>
                    <span className="text-brand-red">
                        7
                    </span>
                    <span>
                        HIVE
                    </span>
                </h1>

                <div 
                    className="w-48 h-1 bg-brand-red mx-auto origin-center opacity-0 animate-line-grow"
                    style={{ animationDelay: '1s' }}
                ></div>

                <p 
                    className="text-xl font-sans tracking-widest text-gray-300 mt-6 opacity-0 animate-fade-in-up"
                    style={{ animationDelay: '1.4s' }}
                >
                    BEM-VINDO, {user.name.toUpperCase()}
                </p>
            </div>
        </div>
    );
};

export default WelcomeScreen;