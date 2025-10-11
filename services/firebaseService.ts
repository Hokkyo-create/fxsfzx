// services/firebaseService.ts
import { database, storage } from '../firebaseConfig';
import { ref, onValue, push, set, serverTimestamp, onDisconnect, remove, update } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { MeetingMessage, OnlineUser, Project, Song } from '../types';

const MEETING_CHAT_REF = 'meeting_room/messages';
const TYPING_STATUS_REF = 'meeting_room/typing';
const ONLINE_STATUS_REF = 'meeting_room/online';
const PROJECTS_REF = 'projects';
const MUSIC_PLAYLIST_REF = 'music/playlist';

// --- Listener Setup ---

export const setupMessagesListener = (callback: (messages: MeetingMessage[]) => void) => {
    const messagesRef = ref(database, MEETING_CHAT_REF);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        const messagesArray = data ? Object.entries(data).map(([id, msg]) => ({
            id,
            ...(msg as Omit<MeetingMessage, 'id'>)
        })).sort((a, b) => a.timestamp - b.timestamp) : [];
        callback(messagesArray);
    });
    return unsubscribe;
};

export const setupTypingListener = (callback: (typingUsers: string[]) => void) => {
    const typingRef = ref(database, TYPING_STATUS_REF);
    const unsubscribe = onValue(typingRef, (snapshot) => {
        const data = snapshot.val();
        const users = data ? Object.keys(data) : [];
        callback(users);
    });
    return unsubscribe;
}

export const setupOnlineStatusListener = (callback: (onlineUsers: OnlineUser[]) => void) => {
    const onlineRef = ref(database, ONLINE_STATUS_REF);
    const unsubscribe = onValue(onlineRef, (snapshot) => {
        const data = snapshot.val();
        const users = data ? Object.values(data) as OnlineUser[] : [];
        callback(users);
    });
    return unsubscribe;
};

export const setupProjectsListener = (callback: (projects: Project[]) => void) => {
    const projectsRef = ref(database, PROJECTS_REF);
    const unsubscribe = onValue(projectsRef, (snapshot) => {
        const data = snapshot.val();
        const projectsArray: Project[] = data ? Object.entries(data).map(([id, project]) => ({
            id,
            ...(project as Omit<Project, 'id'>)
        })).sort((a,b) => b.createdAt - a.createdAt) : [];
        callback(projectsArray);
    });
    return unsubscribe;
};

export const setupPlaylistListener = (callback: (playlist: Song[]) => void) => {
    const playlistRef = ref(database, MUSIC_PLAYLIST_REF);
    const unsubscribe = onValue(playlistRef, (snapshot) => {
        const data = snapshot.val();
        const playlistArray: Song[] = data ? Object.entries(data).map(([id, song]) => ({
            id,
            ...(song as Omit<Song, 'id'>)
        })) : [];
        callback(playlistArray);
    });
    return unsubscribe;
}

// --- Actions ---

export const createProject = (projectData: Omit<Project, 'id' | 'createdAt'>) => {
    const projectsRef = ref(database, PROJECTS_REF);
    const newProjectRef = push(projectsRef);
    return set(newProjectRef, {
        ...projectData,
        createdAt: serverTimestamp()
    });
};

export const updateProject = (projectId: string, updatedData: Partial<Project>) => {
    const projectRef = ref(database, `${PROJECTS_REF}/${projectId}`);
    return update(projectRef, updatedData);
};

export const sendMessage = (user: string, text: string, avatarUrl: string) => {
    const messagesRef = ref(database, MEETING_CHAT_REF);
    push(messagesRef, {
        user,
        text,
        avatarUrl,
        timestamp: serverTimestamp()
    });
};

/**
 * Clears all messages and typing indicators from the meeting room chat.
 * This is an irreversible action.
 */
export const clearMeetingChat = () => {
    const messagesRef = ref(database, MEETING_CHAT_REF);
    remove(messagesRef);
    const typingRef = ref(database, TYPING_STATUS_REF);
    remove(typingRef);
};

export const updateTypingStatus = (userName: string, isTyping: boolean) => {
    const userTypingRef = ref(database, `${TYPING_STATUS_REF}/${userName}`);
    if (isTyping) {
        set(userTypingRef, true);
    } else {
        remove(userTypingRef);
    }
};

export const updateUserPresence = (userName: string, avatarUrl: string) => {
    const userStatusRef = ref(database, `${ONLINE_STATUS_REF}/${userName}`);
    
    const presenceData = {
        name: userName,
        avatarUrl: avatarUrl
    };

    const connectedRef = ref(database, '.info/connected');
    onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === false) {
            return;
        }
        onDisconnect(userStatusRef).remove().then(() => {
            set(userStatusRef, presenceData);
        });
    });
};

export const goOffline = (userName: string) => {
    const userStatusRef = ref(database, `${ONLINE_STATUS_REF}/${userName}`);
    remove(userStatusRef);
}

// --- Music Actions ---
export const uploadSong = async (file: File, title: string, artist: string): Promise<void> => {
    if (!file.type.startsWith('audio/')) throw new Error("File is not an audio type.");

    const storagePath = `music/${Date.now()}_${file.name}`;
    const songStorageRef = storageRef(storage, storagePath);

    // 1. Upload the file
    const uploadResult = await uploadBytes(songStorageRef, file);
    
    // 2. Get the download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // 3. Save metadata to Realtime Database
    const playlistRef = ref(database, MUSIC_PLAYLIST_REF);
    const newSongRef = push(playlistRef);
    await set(newSongRef, {
        title,
        artist,
        url: downloadURL,
        storagePath: storagePath
    });
};

export const deleteSong = async (song: Song): Promise<void> => {
    // 1. Delete from Storage
    const songStorageRef = storageRef(storage, song.storagePath);
    await deleteObject(songStorageRef);

    // 2. Delete from Realtime Database
    const songDbRef = ref(database, `${MUSIC_PLAYLIST_REF}/${song.id}`);
    await remove(songDbRef);
};