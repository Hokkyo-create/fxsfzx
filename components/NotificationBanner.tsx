import React from 'react';
import Icon from './Icons';

interface NotificationBannerProps {
    message: string;
    type: 'error' | 'info';
    onClose: () => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ message, type, onClose }) => {
    const baseClasses = "p-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in-up";
    const typeClasses = {
        error: "bg-red-800/90 backdrop-blur-sm border border-red-600/50 text-white",
        info: "bg-blue-800/90 backdrop-blur-sm border border-blue-600/50 text-white",
    };
    const iconName = type === 'error' ? 'Fire' : 'Info';

    return (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl z-[100] p-4 pointer-events-none">
            <div className={`${baseClasses} ${typeClasses[type]} pointer-events-auto`}>
                <div className="flex items-center justify-between">
                     <span className="flex items-center gap-2">
                        <Icon name={iconName} className="w-5 h-5"/>
                        {message}
                     </span>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-black/20">
                        <Icon name="X" className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationBanner;
