// components/Avatar.tsx
import React, { useState } from 'react';

interface AvatarProps {
  src: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
}

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className = '' }) => {
    const [hasError, setHasError] = useState(false);
    const initials = (name || '').charAt(0).toUpperCase();

    const handleError = () => {
        setHasError(true);
    };

    if (!src || hasError) {
        return (
            <div className={`rounded-full flex items-center justify-center bg-gray-700 text-white font-bold ${sizeMap[size]} ${className}`}>
                <span>{initials}</span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name}
            onError={handleError}
            className={`rounded-full object-cover ${sizeMap[size]} ${className}`}
        />
    );
};

export default Avatar;