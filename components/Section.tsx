// Fix: Implement the Section component.
import React from 'react';

interface SectionProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

const Section: React.FC<SectionProps> = ({ title, children, className = '' }) => (
    <section className={`mb-12 ${className}`}>
        <h2 className="text-2xl font-display tracking-wider text-white mb-6">{title}</h2>
        {children}
    </section>
);

export default Section;
