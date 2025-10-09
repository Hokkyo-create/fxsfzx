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
        }, 3000); // Display for 3 seconds

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className="min-h-screen bg-darker flex flex-col items-center justify-center animate-fade-in">
            <div className="text-center">
                <Icon name="Fire" className="w-24 h-24 mx-auto text-brand-red animate-glow" />
                <h1 className="text-7xl md:text-9xl font-display tracking-widest text-white my-4">
                    ARC<span className="text-brand-red">7</span>HIVE
                </h1>
                <div className="w-48 h-1 bg-brand-red mx-auto"></div>
                <p className="text-xl font-sans tracking-widest text-gray-300 mt-6">
                    BEM-VINDO, {user.name.toUpperCase()}
                </p>
            </div>
        </div>
    );
};

export default WelcomeScreen;