// Fix: Provide the full implementation for the Supabase service.
import { supabase } from '../supabaseClient';
import type { PostgrestError, RealtimeChannel } from '@supabase/supabase-js';
import type { Project, Song, RadioState, Video, LearningCategory, MeetingMessage, User, OnlineUser } from '../types';

const MUSIC_TABLE = 'music_playlist';
const PROJECTS_TABLE = 'projects';
const MEETING_CHAT_TABLE = 'meeting_messages';
const RADIO_STATE_TABLE = 'radio_state';
const LEARNING_PLAYLISTS_TABLE = 'learning_videos';
const RADIO_STATE_ID = 1;

const MEETING_ROOM_CHANNEL = 'meeting-room';

export const formatSupabaseError = (error: PostgrestError | null, context: string): string => {
    if (!error) return `An unknown error occurred in ${context}.`;
    console.error(`Supabase Error in ${context}:`, error);
    return `${error.message} (Code: ${error.code})`;
};

// --- Project Actions ---

export const setupProjectsListener = (
    callback: (projects: Project[]) => void, 
    onError: (error: PostgrestError) => void
) => {
    const channel = supabase
        .channel('public:projects')
        .on<Project>('postgres_changes', { event: '*', schema: 'public', table: PROJECTS_TABLE }, async () => {
             const { data, error } = await supabase.from(PROJECTS_TABLE).select('*').order('created_at', { ascending: false });
            if (error) onError(error);
            else if (data) callback(data);
        })
        .subscribe();
        
    // Initial fetch
    (async () => {
        const { data, error } = await supabase.from(PROJECTS_TABLE).select('*').order('created_at', { ascending: false });
        if (error) onError(error);
        else if (data) callback(data);
    })();

    return () => {
        supabase.removeChannel(channel);
    };
};


export const createProject = async (projectData: Omit<Project, 'id' | 'created_at'>): Promise<Project> => {
    const { data, error } = await supabase
        .from(PROJECTS_TABLE)
        .insert([{ ...projectData, createdBy: projectData.createdBy, avatarUrl: projectData.avatarUrl }])
        .select()
        .single();
    if (error) throw new Error(formatSupabaseError(error, 'createProject'));
    return data as Project;
};

export const updateProject = async (projectId: string, updates: Partial<Project>) => {
    const { error } = await supabase
        .from(PROJECTS_TABLE)
        .update(updates)
        .eq('id', projectId);
    
    if (error) {
        console.error(formatSupabaseError(error, 'updateProject'));
    }
};


// --- Meeting Chat & Presence ---

export const setupMessagesListener = (
    // Fix: Correctly type the callback as a React state setter, which can accept a value or an updater function.
    callback: (value: MeetingMessage[] | ((prevState: MeetingMessage[]) => MeetingMessage[])) => void, 
    onError: (error: PostgrestError) => void
) => {
    const channel = supabase
        .channel('public:meeting_messages')
        .on<MeetingMessage>('postgres_changes', { event: 'INSERT', schema: 'public', table: MEETING_CHAT_TABLE }, payload => {
            // Fix: Use the functional update form of the state setter to correctly append the new message.
            callback((prev: MeetingMessage[]) => [...prev, payload.new as MeetingMessage]);
        })
        .subscribe();

    // Initial fetch
    (async () => {
        const { data, error } = await supabase.from(MEETING_CHAT_TABLE).select('*').order('created_at', { ascending: true });
        if (error) onError(error);
        else if(data) callback(data);
    })();
    
    return () => {
        supabase.removeChannel(channel);
    };
};

export const sendMessage = async (user: string, text: string, avatarUrl: string) => {
    const { error } = await supabase
        .from(MEETING_CHAT_TABLE)
        .insert({ user, text, avatarUrl });

    if (error) console.error(formatSupabaseError(error, 'sendMessage'));
};

export const clearMeetingChat = async () => {
    const { error } = await supabase
        .from(MEETING_CHAT_TABLE)
        .delete()
        .gt('id', 0); // Deletes all rows
    if (error) throw new Error(formatSupabaseError(error, 'clearMeetingChat'));
};

export const initializeMeetingPresence = (user: User, onPresenceChange: (newState: any) => void): RealtimeChannel => {
    const channel = supabase.channel(MEETING_ROOM_CHANNEL, {
        config: {
            presence: {
                key: user.name,
            },
        },
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState();
            onPresenceChange(presenceState);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ user: user.name, avatarUrl: user.avatarUrl, is_typing: false });
            }
        });

    return channel;
};

export const updateMeetingPresence = (channel: RealtimeChannel, isTyping: boolean) => {
    const user = (channel.presenceState()[channel.presenceKey()] as any)[0];
    channel.track({ ...user, is_typing: isTyping });
};

export const leaveMeetingPresence = (channel: RealtimeChannel) => {
    supabase.removeChannel(channel);
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

    const { error: deleteError } = await supabase
        .from(LEARNING_PLAYLISTS_TABLE)
        .delete()
        .neq('id', `a-value-that-is-never-present-${Date.now()}`); 

    if (deleteError) {
        throw new Error(formatSupabaseError(deleteError, 'saveLearningPlaylists (delete step)'));
    }

    if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
            .from(LEARNING_PLAYLISTS_TABLE)
            .insert(rowsToInsert);

        if (insertError) {
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

    const { error: uploadError } = await supabase.storage.from('music').upload(storagePath, file);
    if (uploadError) throw new Error(uploadError.message);
    
    const { data: urlData } = supabase.storage.from('music').getPublicUrl(storagePath);
    if (!urlData) throw new Error("Could not get public URL for the song.");
    
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
    const { error: storageError } = await supabase.storage.from('music').remove([song.storagePath]);
    if (storageError) console.error("Supabase storage error on delete:", storageError.message);

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