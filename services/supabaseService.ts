import { supabase } from '../supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Project, Song, RadioState, Video } from '../types';

// Helper to format errors
export const formatSupabaseError = (error: PostgrestError | null, context: string): string => {
    if (!error) return '';
    console.error(`Supabase error in ${context}:`, error);
    return `Erro de banco de dados em ${context}: ${error.message || 'Erro desconhecido.'}`;
};

// --- Projects ---

const projectFromRow = (p: any): Project => ({
    id: p.id,
    name: p.name,
    introduction: p.introduction,
    chapters: p.chapters ?? [],
    conclusion: p.conclusion,
    createdBy: p.created_by,
    avatarUrl: p.avatar_url,
    createdAt: new Date(p.created_at).getTime(),
    coverImageUrl: p.cover_image_url,
});

export const setupProjectsListener = (callback: (projects: Project[], error: PostgrestError | null) => void) => {
    const fetchProjects = async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) {
            callback(data.map(projectFromRow), null);
        } else {
            callback([], error);
        }
    };
    
    fetchProjects();

    const channel = supabase.channel('projects-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
            fetchProjects();
        })
        .subscribe();
        
    return () => {
        supabase.removeChannel(channel).catch(console.error);
    };
};

export const createProject = async (projectData: Omit<Project, 'id' | 'createdAt'>): Promise<void> => {
    const { error } = await supabase.from('projects').insert({
        name: projectData.name,
        introduction: projectData.introduction,
        chapters: projectData.chapters,
        conclusion: projectData.conclusion,
        created_by: projectData.createdBy,
        avatar_url: projectData.avatarUrl,
        cover_image_url: projectData.coverImageUrl,
    });
    if (error) throw error;
};

export const updateProject = async (projectId: string, updatedData: Partial<Project>): Promise<void> => {
    const updatePayload: any = {};
    if (updatedData.name) updatePayload.name = updatedData.name;
    if (updatedData.introduction) updatePayload.introduction = updatedData.introduction;
    if (updatedData.conclusion) updatePayload.conclusion = updatedData.conclusion;
    if (updatedData.coverImageUrl) updatePayload.cover_image_url = updatedData.coverImageUrl;
    if (updatedData.chapters) updatePayload.chapters = updatedData.chapters;

    if (Object.keys(updatePayload).length === 0) return;

    const { error } = await supabase
        .from('projects')
        .update(updatePayload)
        .eq('id', projectId);
    if (error) throw error;
};

export const deleteProject = async (projectId: string): Promise<void> => {
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
    if (error) throw error;
};


// --- Meeting Chat ---

export const clearMeetingChat = async (): Promise<void> => {
    // This function was originally in firebaseService.ts, but is imported from supabaseService.
    // If chat is also migrated, this is the implementation.
    // For now, let's point to the firebase one or throw an error.
    // Given the AdminPanel imports it from here, we'll provide an implementation.
    const { error } = await supabase.from('meeting_messages').delete().neq('id', 0); // Delete all
    if (error) throw error;
};

// --- Learning Videos ---

export const fetchAllLearningVideos = async (): Promise<Record<string, Video[]>> => {
    const { data, error } = await supabase
        .from('learning_videos')
        .select('*');

    if (error) {
        console.error('Error fetching learning videos:', error);
        throw error;
    }
    
    const videosByCategory: Record<string, Video[]> = {};
    
    if (data) {
        for (const row of data) {
            const video: Video = {
                id: row.id,
                title: row.title,
                duration: row.duration,
                thumbnailUrl: row.thumbnail_url,
                platform: 'youtube',
            };
            const categoryId = row.category_id;
            if (!videosByCategory[categoryId]) {
                videosByCategory[categoryId] = [];
            }
            videosByCategory[categoryId].push(video);
        }
    }
    
    return videosByCategory;
};

export const addLearningVideos = async (videos: (Video & { category_id: string })[]): Promise<void> => {
    const videosToInsert = videos.map(v => ({
        id: v.id,
        category_id: v.category_id,
        platform: v.platform,
        title: v.title,
        duration: v.duration,
        thumbnail_url: v.thumbnailUrl,
    }));
    const { error } = await supabase.from('learning_videos').insert(videosToInsert);
    if (error) {
        console.error("Supabase insert error in addLearningVideos:", error);
        throw error;
    }
};

// --- Music ---
const songFromRow = (s: any): Song => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    url: s.url,
    storagePath: s.storagePath,
});


export const setupPlaylistListener = (callback: (playlist: Song[], error: PostgrestError | null) => void) => {
     const fetchPlaylist = async () => {
        const { data, error } = await supabase
            .from('songs')
            .select('*')
            .order('created_at', { ascending: true });
        
        callback(data ? data.map(songFromRow) : [], error);
    };

    fetchPlaylist();
    
    const channel = supabase.channel('songs-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, fetchPlaylist)
        .subscribe();

    return () => {
        supabase.removeChannel(channel).catch(console.error);
    };
};

export const uploadSong = async (file: File, title: string, artist: string): Promise<void> => {
    if (!file.type.startsWith('audio/')) throw new Error("File is not an audio type.");

    const sanitizeFilename = (filename: string) => {
        // Replace spaces with underscores and remove characters that are problematic for URLs/paths
        return filename.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    };
    
    const sanitizedName = sanitizeFilename(file.name);
    const storagePath = `public/${Date.now()}_${sanitizedName}`;
    
    const { error: uploadError } = await supabase.storage
        .from('music') // Bucket name
        .upload(storagePath, file);

    if (uploadError) {
         // Try to provide a more specific error message if possible
        if (uploadError.message.includes("Bucket not found")) {
             throw new Error('Erro de Configuração: O "bucket" de armazenamento \'music\' não foi encontrado. COMO RESOLVER: 1. Vá para seu painel do Supabase. 2. Clique em \'Storage\' no menu lateral. 3. Clique em \'New bucket\'. 4. Dê o nome \'music\' (exatamente) e ative a opção \'Public bucket\'. 5. Vá para \'Bucket settings\' -> \'Policies\' e adicione uma nova política para permitir uploads públicos (INSERT).');
        }
        throw uploadError;
    }

    const { data: urlData } = supabase.storage.from('music').getPublicUrl(storagePath);
    if (!urlData) throw new Error("Could not get public URL for song.");

    const { error: insertError } = await supabase.from('songs').insert({
        title,
        artist,
        url: urlData.publicUrl,
        storagePath: storagePath
    });
    if (insertError) throw insertError;
};

export const deleteSong = async (song: Song): Promise<void> => {
    const { error: storageError } = await supabase.storage.from('music').remove([song.storagePath]);
    if (storageError) {
        console.error("Error deleting from storage (might be ok if file was already gone):", storageError);
    }

    const { error: dbError } = await supabase.from('songs').delete().eq('id', song.id);
    if (dbError) throw dbError;
};


// --- Radio State ---

export const setupRadioStateListener = (callback: (state: RadioState | null, error: PostgrestError | null) => void) => {
     const fetchState = async () => {
        const { data, error } = await supabase
            .from('radio_state')
            .select('*')
            .eq('id', 1)
            .single();

        callback(data, error);
    };
    
    fetchState();

    const channel = supabase.channel('radio-state-channel')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'radio_state', filter: 'id=eq.1' }, (payload) => {
            callback(payload.new as RadioState, null);
        })
        .subscribe();
        
    return () => {
        supabase.removeChannel(channel).catch(console.error);
    };
};

export const updateRadioState = async (newState: Partial<Omit<RadioState, 'id'>>): Promise<void> => {
    const { error } = await supabase.from('radio_state').update(newState).eq('id', 1);
    if (error) throw error;
};

// --- Presence (Placeholder) ---
// Note: The original app uses Firebase for presence. This is a placeholder.
export const goOffline = (userName: string) => {
    console.log(`[Supabase] User ${userName} going offline (no-op). See firebaseService.ts for actual implementation.`);
};