import React from 'react';
import type { IconName } from '../types';
import Icon from './Icons';

interface EbookCardProps {
    title: string;
    icon?: IconName;
    children: React.ReactNode;
    className?: string;
}

const EbookCard: React.FC<EbookCardProps> = ({ title, icon, children, className = '' }) => {
    return (
        <section className={`ebook-card bg-dark/50 border border-gray-800 rounded-lg p-8 md:p-12 shadow-lg ${className}`}>
            <div className="flex items-center gap-4 mb-6">
                {icon && <div className="w-12 h-12 flex-shrink-0 bg-brand-red/10 rounded-lg flex items-center justify-center border border-brand-red/20"><Icon name={icon} className="w-7 h-7 text-brand-red" /></div>}
                <h2 className="text-2xl md:text-3xl font-display tracking-wider text-white">{title}</h2>
            </div>
            <div className="prose-invert prose-p:text-gray-300 prose-p:leading-relaxed whitespace-pre-wrap">
                {children}
            </div>
        </section>
    );
};


export default EbookCard;
