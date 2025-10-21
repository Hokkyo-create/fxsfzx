
// Fix: Provide the full implementation for the Supabase service.
import { supabase } from '../supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Project, Song, RadioState, Video, LearningCategory } from '../types';

const MUSIC_TABLE = 'music_playlist';
const PROJECTS_TABLE = 'projects';
const MEETING_CHAT_TABLE = 'meeting_messages';
const RADIO_STATE_TABLE = 'radio_state';
const LEARNING_PLAYLISTS_TABLE = 'learning_playlists';
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
    const { data, error } = await supabase
        .from(LEARNING_PLAYLISTS_TABLE)
        .select('data')
        .eq('id', 1) // Using a single row with ID 1 to store the entire JSON object
        .single();
    if (error) {
        // Ignore 'multiple (or no) rows returned' error, which happens on first run before data exists.
        if (error.code !== 'PGRST116') { 
             console.error(formatSupabaseError(error, 'getLearningPlaylists'));
        }
        return null;
    }
    return data ? data.data : null;
};

export const saveLearningPlaylists = async (playlists: Record<string, Video[]>) => {
    const { error } = await supabase
        .from(LEARNING_PLAYLISTS_TABLE)
        .upsert({ id: 1, data: playlists });
    if (error) throw new Error(formatSupabaseError(error, 'saveLearningPlaylists'));
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