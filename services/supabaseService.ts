import { supabase } from '../supabaseClient';
import type { MeetingMessage, OnlineUser, Project, Song, User, Video } from '../types';
import type { RealtimeChannel, PostgrestError } from '@supabase/supabase-js';

// --- Centralized Error Formatting ---
export const formatSupabaseError = (error: PostgrestError | Error | null, context: string): string | null => {
    if (!error) return null;

    console.error(`Error with ${context}:`, error);
    
    // Check for specific Supabase error codes
    if ('code' in error && error.code === 'PGRST205') {
        const tableNameMatch = error.message.match(/'public\.(.*?)'/);
        const tableName = tableNameMatch ? tableNameMatch[1] : context;
        return `A tabela "${tableName}" não foi encontrada. Verifique se ela foi criada corretamente no seu projeto Supabase, usando o SQL Editor.`;
    }
    
    if (error.message && (error.message.toLowerCase().includes('rls') || error.message.toLowerCase().includes('security policies') || ('code' in error && error.code === '42501'))) {
        let action = 'ler'; // Default action is read
        if (error.message.toLowerCase().includes('violates row-level security policy')) {
             action = 'gravar novos dados'; // This is an insert/update violation
        }
        return `Acesso negado para "${context}". Verifique se a política de RLS (Row Level Security) que permite ${action} está configurada no seu painel do Supabase.`;
    }
    
    return `Falha ao carregar ${context}. Detalhes: ${error.message}`;
}


// --- Listener Setup ---

// Meeting Chat
export const setupMessagesListener = (callback: (messages: MeetingMessage[], error: PostgrestError | null) => void) => {
    const handleMessageUpdates = async () => {
        const { data, error } = await supabase
            .from('meeting_messages')
            .select('*')
            .order('timestamp', { ascending: true });

        if (error) {
            callback([], error);
        } else {
            callback(data as MeetingMessage[], null);
        }
    };

    handleMessageUpdates(); // Initial fetch

    const channel = supabase.channel('public:meeting_messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_messages' }, handleMessageUpdates)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

// Projects
export const setupProjectsListener = (callback: (projects: Project[], error: PostgrestError | null) => void) => {
    const handleProjectUpdates = async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) {
            callback([], error);
        } else {
            callback(data as Project[], null);
        }
    };

    handleProjectUpdates();

    const channel = supabase.channel('public:projects')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, handleProjectUpdates)
        .subscribe();
        
    return () => { supabase.removeChannel(channel); };
};

// Music Playlist
export const setupPlaylistListener = (callback: (playlist: Song[], error: PostgrestError | null) => void) => {
    const handlePlaylistUpdates = async () => {
        const { data, error } = await supabase.from('songs').select('*');
        if (error) {
            callback([], error);
        } else {
            callback(data as Song[], null);
        }
    };

    handlePlaylistUpdates();

    const channel = supabase.channel('public:songs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, handlePlaylistUpdates)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

// Learning Videos
export const setupVideosListener = (callback: (videos: Record<string, Video[]>, error: PostgrestError | null) => void) => {
    const handleVideoUpdates = async () => {
        const { data, error } = await supabase.from('learning_videos').select('*');
        if (error) {
            callback({}, error);
        } else {
            const videosByCategory = (data as any[]).reduce((acc, video) => {
                const mappedVideo: Video = {
                    id: video.id,
                    title: video.title,
                    duration: video.duration,
                    thumbnailUrl: video.thumbnail_url,
                    platform: video.platform,
                };
                if (!acc[video.category_id]) {
                    acc[video.category_id] = [];
                }
                acc[video.category_id].push(mappedVideo);
                return acc;
            }, {} as Record<string, Video[]>);
            callback(videosByCategory, null);
        }
    };
    
    handleVideoUpdates();

    const channel = supabase.channel('public:learning_videos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'learning_videos' }, handleVideoUpdates)
        .subscribe();
        
    return () => { supabase.removeChannel(channel); };
};


// --- Presence (Online & Typing Status) ---
let presenceChannel: RealtimeChannel;

export const setupPresence = (
    user: User,
    onlineCallback: (users: OnlineUser[]) => void,
    typingCallback: (users: string[]) => void
) => {
    presenceChannel = supabase.channel(`meeting-presence`, {
        config: {
            presence: { key: user.name },
        },
    });

    const handlePresence = () => {
        const presenceState = presenceChannel.presenceState<{ name: string; avatarUrl: string; isTyping: boolean }>();
        const onlineUsers: OnlineUser[] = [];
        const typingUsers: string[] = [];

        Object.values(presenceState).forEach(presences => {
            const primaryPresence = presences[0];
            if (primaryPresence) {
                onlineUsers.push({ name: primaryPresence.name, avatarUrl: primaryPresence.avatarUrl });
                if (primaryPresence.isTyping) {
                    typingUsers.push(primaryPresence.name);
                }
            }
        });

        onlineCallback(onlineUsers);
        typingCallback(typingUsers);
    };

    presenceChannel
        .on('presence', { event: 'sync' }, handlePresence)
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({ name: user.name, avatarUrl: user.avatarUrl, isTyping: false });
            }
        });

    return () => {
        if (presenceChannel) {
            presenceChannel.untrack();
            supabase.removeChannel(presenceChannel);
        }
    };
};

// --- Actions ---

export const createProject = async (projectData: Omit<Project, 'id' | 'createdAt'>) => {
    const { error } = await supabase.from('projects').insert({ ...projectData, createdAt: new Date().toISOString() });
    if (error) throw error;
};

export const updateProject = async (projectId: string, updatedData: Partial<Project>) => {
    const { error } = await supabase.from('projects').update(updatedData).eq('id', projectId);
    if (error) throw error;
};

export const sendMessage = async (user: string, text: string, avatarUrl: string) => {
    const { error } = await supabase.from('meeting_messages').insert({
        user,
        text,
        avatarUrl,
        timestamp: new Date().toISOString()
    });
    if (error) {
        console.error('Error sending message:', error);
        throw new Error("A mensagem não pôde ser enviada.");
    }
};

export const clearMeetingChat = async () => {
    const { error } = await supabase.from('meeting_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
        console.error("Error clearing chat:", error);
        throw error;
    }
};

export const updateTypingStatus = async (user: User, isTyping: boolean) => {
    if (presenceChannel) {
        const status = await presenceChannel.track({ name: user.name, avatarUrl: user.avatarUrl, isTyping });
        if (status !== 'ok') {
             console.warn(`Failed to update typing status for ${user.name}: ${status}`);
        }
    }
};

export const updateUserPresence = async (user: User) => {
    if (presenceChannel) {
        // Assume user is not typing when their avatar changes.
        const status = await presenceChannel.track({ name: user.name, avatarUrl: user.avatarUrl, isTyping: false });
        if (status !== 'ok') {
            console.warn(`Failed to update presence for ${user.name}: ${status}`);
        }
    }
};

export const goOffline = (userName: string) => {
    if(presenceChannel) {
        presenceChannel.untrack();
    }
};

// Learning Videos Actions
export const addVideos = async (categoryId: string, platform: string, videos: Video[]) => {
    const videosToInsert = videos.map(video => ({
        id: video.id,
        category_id: categoryId,
        platform: platform,
        title: video.title,
        duration: video.duration,
        thumbnail_url: video.thumbnailUrl,
    }));

    const { error } = await supabase.from('learning_videos').upsert(videosToInsert);
    if (error) {
        console.error("Error adding videos to Supabase:", error);
        throw error;
    }
};

// User Progress Actions
export const getUserProgress = async (userName: string): Promise<Set<string>> => {
    const { data, error } = await supabase
        .from('user_progress')
        .select('watched_video_ids')
        .eq('user_name', userName)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: "object not found" - this is fine for new users
        console.error('Error fetching user progress:', error);
        return new Set();
    }
    return new Set(data?.watched_video_ids || []);
};

export const updateUserProgress = async (userName: string, watchedVideos: Set<string>): Promise<void> => {
    const { error } = await supabase
        .from('user_progress')
        .upsert({ 
            user_name: userName, 
            watched_video_ids: Array.from(watchedVideos),
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_name' });

    if (error) {
        console.error("Error updating user progress:", error);
        throw error;
    }
};


// Music Actions
export const uploadSong = async (file: File, title: string, artist: string): Promise<void> => {
    if (!file.type.startsWith('audio/')) throw new Error("File is not an audio type.");

    const storagePath = `public/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('music').upload(storagePath, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('music').getPublicUrl(storagePath);
    const downloadURL = data.publicUrl;

    const { error: dbError } = await supabase.from('songs').insert({ title, artist, url: downloadURL, storagePath: storagePath });
    if (dbError) throw dbError;
};

export const deleteSong = async (song: Song): Promise<void> => {
    const { error: storageError } = await supabase.storage.from('music').remove([song.storagePath]);
    if (storageError) {
        console.warn(`Could not delete song from storage (path: ${song.storagePath}):`, storageError.message);
    }

    const { error: dbError } = await supabase.from('songs').delete().eq('id', song.id);
    if (dbError) throw dbError;
};