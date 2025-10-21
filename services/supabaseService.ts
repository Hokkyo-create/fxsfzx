// Fix: Provide the full implementation for the Supabase service.
import { supabase } from '../supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Project, Song, RadioState, Video, LearningCategory } from '../types';

const MUSIC_TABLE = 'music_playlist';
const PROJECTS_TABLE = 'projects';
const MEETING_CHAT_TABLE = 'meeting_messages';
const RADIO_STATE_TABLE = 'radio_state';
const LEARNING_PLAYLISTS_TABLE = 'learning_videos'; // Corrected table name
const RADIO_STATE_ID = 1; // Assuming a single radio state row

export const formatSupabaseError = (error: PostgrestError | null, context: string): string => {
    if (!error) return `An unknown error occurred in ${context}.`;
    console.error(`Supabase Error in ${context}:`, error);
    return `${error.message} (Code: ${error.code})`;
};

// --- Project Actions ---

export const createProject = async (projectData: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
    const { data, error } = await supabase
        .from(PROJECTS_TABLE)
        .insert([{ ...projectData, createdBy: projectData.createdBy, avatarUrl: projectData.avatarUrl }])
        .select()
        .single();
    if (error) throw new Error(formatSupabaseError(error, 'createProject'));
    return data as Project;
};

// --- Meeting Chat ---
export const clearMeetingChat = async () => {
    const { error } = await supabase
        .from(MEETING_CHAT_TABLE)
        .delete()
        .gt('id', 0); // Deletes all rows
    if (error) throw new Error(formatSupabaseError(error, 'clearMeetingChat'));
};

// --- Learning Playlists ---

export const getLearningPlaylists = async (): Promise<Record<string, Video[]> | null> => {
    // Fetches all learning videos and organizes them by category.
    const { data: videoRows, error } = await supabase
        .from(LEARNING_PLAYLISTS_TABLE)
        .select('id, title, duration, thumbnail_url, platform, category_id');

    if (error) {
        // This error can occur if the table is empty. In that case, we return an empty object, which is valid.
        if (error.code === 'PGRST116') {
             return {};
        }
        console.error(formatSupabaseError(error, 'getLearningPlaylists'));
        return null;
    }

    if (!videoRows) return {};

    // Group the flat list of videos into a dictionary keyed by category ID.
    const videosByCategory = videoRows.reduce((acc, row) => {
        const categoryId = row.category_id;
        if (!categoryId) return acc;

        const video: Video = {
            id: row.id,
            title: row.title,
            duration: row.duration,
            thumbnailUrl: row.thumbnail_url,
            platform: row.platform,
        };

        if (!acc[categoryId]) {
            acc[categoryId] = [];
        }
        acc[categoryId].push(video);
        return acc;
    }, {} as Record<string, Video[]>);

    return videosByCategory;
};


export const saveLearningPlaylists = async (playlists: Record<string, Video[]>) => {
    // This function synchronizes the database with the provided playlist state.
    // It uses a "delete and replace" strategy for simplicity, which is effective
    // but could be optimized for very large playlists in the future.

    // First, flatten the new playlist state into a format suitable for insertion.
    const rowsToInsert = Object.entries(playlists).flatMap(([categoryId, videos]) =>
        videos.map(video => ({
            category_id: categoryId,
            id: video.id, // YouTube video ID
            title: video.title,
            duration: video.duration,
            thumbnail_url: video.thumbnailUrl,
            platform: video.platform,
        }))
    );

    // To ensure consistency, we first delete all existing videos.
    // This handles additions, removals, and re-ordering in one go.
    const { error: deleteError } = await supabase
        .from(LEARNING_PLAYLISTS_TABLE)
        .delete()
        .neq('id', `a-value-that-is-never-present-${Date.now()}`); // .delete() requires a filter.

    if (deleteError) {
        throw new Error(formatSupabaseError(deleteError, 'saveLearningPlaylists (delete step)'));
    }

    // If there are any videos to save, insert them all.
    if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
            .from(LEARNING_PLAYLISTS_TABLE)
            .insert(rowsToInsert);

        if (insertError) {
            // This could leave the database empty if deletion succeeded but insertion failed.
            // For a production app, a transaction or RPC function would be safer.
            throw new Error(formatSupabaseError(insertError, 'saveLearningPlaylists (insert step)'));
        }
    }
};


// --- Music & Radio Actions ---

export const setupPlaylistListener = (callback: (data: Song[], error: PostgrestError | null) => void) => {
    const channel = supabase
        .channel('public:music_playlist')
        .on<Song>('postgres_changes', { event: '*', schema: 'public', table: MUSIC_TABLE }, async () => {
            const { data, error } = await supabase.from(MUSIC_TABLE).select('*').order('created_at', { ascending: false });
            if (data) {
                callback(data as Song[], error);
            }
        })
        .subscribe();
        
    // Initial fetch
    (async () => {
        const { data, error } = await supabase.from(MUSIC_TABLE).select('*').order('created_at', { ascending: false });
        if (data) {
           callback(data as Song[], error);
        }
    })();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const uploadSong = async (file: File, title: string, artist: string): Promise<void> => {
    if (!file.type.startsWith('audio/')) throw new Error("File is not an audio type.");

    const storagePath = `music/${Date.now()}_${file.name}`;

    // 1. Upload the file to Storage
    const { error: uploadError } = await supabase.storage.from('music').upload(storagePath, file);
    if (uploadError) throw new Error(uploadError.message);
    
    // 2. Get public URL
    const { data: urlData } = supabase.storage.from('music').getPublicUrl(storagePath);
    if (!urlData) throw new Error("Could not get public URL for the song.");
    
    // 3. Save metadata to the database
    const { error: insertError } = await supabase
        .from(MUSIC_TABLE)
        .insert({
            title,
            artist,
            url: urlData.publicUrl,
            storagePath: storagePath
        });

    if (insertError) throw new Error(formatSupabaseError(insertError, 'uploadSong'));
};

export const deleteSong = async (song: Song): Promise<void> => {
    // 1. Delete from Storage
    const { error: storageError } = await supabase.storage.from('music').remove([song.storagePath]);
    if (storageError) console.error("Supabase storage error on delete:", storageError.message); // Log but don't throw, to allow DB deletion

    // 2. Delete from Database
    const { error: dbError } = await supabase
        .from(MUSIC_TABLE)
        .delete()
        .eq('id', song.id);

    if (dbError) throw new Error(formatSupabaseError(dbError, 'deleteSong'));
};

export const setupRadioStateListener = (callback: (state: RadioState | null, error: PostgrestError | null) => void) => {
    const channel = supabase
        .channel('public:radio_state')
        .on<RadioState>('postgres_changes', { event: 'UPDATE', schema: 'public', table: RADIO_STATE_TABLE, filter: `id=eq.${RADIO_STATE_ID}` }, payload => {
            callback(payload.new as RadioState, null);
        })
        .subscribe();

    // Initial fetch
    (async () => {
        const { data, error } = await supabase
            .from(RADIO_STATE_TABLE)
            .select('*')
            .eq('id', RADIO_STATE_ID)
            .single();
        callback(data, error);
    })();
    
    return () => {
        supabase.removeChannel(channel);
    };
};

export const updateRadioState = async (newState: Partial<RadioState>) => {
    const { error } = await supabase
        .from(RADIO_STATE_TABLE)
        .update({ ...newState, id: RADIO_STATE_ID })
        .eq('id', RADIO_STATE_ID);
    
    if (error) console.error("Failed to update radio state:", formatSupabaseError(error, 'updateRadioState'));
};