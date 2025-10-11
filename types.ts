// types.ts

import type { IconName as OriginalIconName } from './components/Icons';

// Add new icons to the type
export type IconName = OriginalIconName | 'Dumbbell' | 'Wrench' | 'Cart' | 'Dollar' | 'Brain' | 'X' | 'Send' | 'Gear' | 'UsersGroup' | 'Upload' | 'BookOpen' | 'Download' | 'Pencil';

export interface User {
  name: string;
  password?: string;
  avatarUrl: string; // Added for profile pictures
}

export interface OnlineUser {
    name: string;
    avatarUrl: string;
}

export interface Video {
  id: string; // youtube video ID
  title: string;
  duration: string; // e.g. "10:32"
  thumbnailUrl: string;
}

export interface LearningCategory {
  id: string; // e.g. "frontend-dev"
  title: string;
  description: string;
  icon: IconName;
  color: 'red' | 'orange' | 'green' | 'cyan' | 'blue' | 'indigo' | 'yellow' | 'rose';
  videos: Video[];
}

export interface Chapter {
    title: string;
    content: string;
    imageUrl?: string;
}

export interface Project {
    id: string;
    name: string; // Ebook title
    introduction: string;
    chapters: Chapter[];
    conclusion: string;
    createdBy: string;
    avatarUrl: string;
    createdAt: number;
    coverImageUrl?: string; // URL for the AI-generated cover image
}

export interface ProjectGenerationConfig {
    topic: string;
    chapters: number;
    generateImages: boolean;
}

export interface SocialMediaIdea {
    title: string;
    script: string;
    audio: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface MeetingMessage {
    id:string;
    user: string;
    text: string;
    timestamp: number;
    avatarUrl: string; // Added for profile pictures
}