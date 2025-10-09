import React from 'react';
import type { Video } from '../types';
import Icon from './Icons';

interface VideoCardProps {
    video: Video;
    isPlaying: boolean;
    isWatched: boolean;
    onSelect: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, isPlaying, isWatched, onSelect }) => {
    return (
        <div
            onClick={onSelect}
            className={`flex items-center gap-4 p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                isPlaying ? 'bg-brand-red/20' : 'hover:bg-gray-800'
            }`}
        >
            <div className="w-2/5 flex-shrink-0 relative">
                <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full rounded-md aspect-video object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                    <div className="w-8 h-8 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                         <Icon name={isPlaying ? "Chart" : "Play"} className={`w-4 h-4 text-white ${isPlaying && 'text-brand-red'}`} />
                    </div>
                </div>
                 {isWatched && (
                    <div className="absolute top-1 right-1 bg-green-500 p-1 rounded-full">
                        <Icon name="Check" className="w-3 h-3 text-white" />
                    </div>
                )}
            </div>
            <div className="w-3/5">
                <h4 className={`font-semibold text-sm leading-tight ${isPlaying ? 'text-white' : 'text-gray-200'}`}>{video.title}</h4>
                <p className="text-xs text-gray-400 mt-1">{video.duration}</p>
            </div>
        </div>
    );
};

export default VideoCard;
