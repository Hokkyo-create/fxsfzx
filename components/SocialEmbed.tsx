import React, { useEffect } from 'react';
import type { Video } from '../types';

interface SocialEmbedProps {
    video: Video;
    platform: 'tiktok' | 'instagram';
}

declare global {
    interface Window {
        instgrm?: { Embeds: { process: () => void } };
    }
}

const SocialEmbed: React.FC<SocialEmbedProps> = ({ video, platform }) => {

    useEffect(() => {
        // When the component mounts or the video changes,
        // tell Instagram's script to scan the page and render any new embeds.
        if (platform === 'instagram' && typeof window.instgrm !== 'undefined') {
            window.instgrm.Embeds.process();
        }
    }, [video, platform]);

    const containerClasses = "flex justify-center items-start pt-4 bg-black rounded-lg min-h-[500px] border border-gray-800";

    if (platform === 'tiktok') {
        return (
            <div className={containerClasses}>
                <blockquote
                    className="tiktok-embed"
                    data-video-id={video.id}
                    style={{ maxWidth: '325px', minWidth: '325px', margin: '0 auto', background: 'transparent' }}
                >
                    <section>
                        <a target="_blank" rel="noopener noreferrer" href={`https://www.tiktok.com`}>&nbsp;</a>
                    </section>
                </blockquote>
            </div>
        );
    }
    
    if (platform === 'instagram') {
        const permalink = `https://www.instagram.com/p/${video.id}/`;
        return (
            <div className={containerClasses}>
                <blockquote
                    className="instagram-media"
                    data-instgrm-permalink={permalink}
                    data-instgrm-version="14"
                    style={{ width: '100%', maxWidth: '328px', margin: '0 auto', background: '#FFF', border: '0', borderRadius: '3px', boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)' }}
                >
                </blockquote>
            </div>
        );
    }

    return null;
}

export default SocialEmbed;
