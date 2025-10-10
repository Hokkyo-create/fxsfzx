// services/firebaseService.ts
import { database } from '../firebaseConfig';
import { ref, onValue, push, set, serverTimestamp, onDisconnect, remove } from "firebase/database";
import type { MeetingMessage } from '../types';

const MEETING_CHAT_REF = 'meeting_room/messages';
const TYPING_STATUS_REF = 'meeting_room/typing';
const ONLINE_STATUS_REF = 'meeting_room/online';

// --- Listener Setup ---

export const setupMessagesListener = (callback: (messages: MeetingMessage[]) => void) => {
    const messagesRef = ref(database, MEETING_CHAT_REF);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        const messagesArray = data ? Object.entries(data).map(([id, msg]) => ({
            id,
            ...(msg as Omit<MeetingMessage, 'id'>)
        })) : [];
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

export const setupOnlineStatusListener = (callback: (onlineUsers: string[]) => void) => {
    const onlineRef = ref(database, ONLINE_STATUS_REF);
    const unsubscribe = onValue(onlineRef, (snapshot) => {
        const data = snapshot.val();
        // Firebase now only stores online users, so we can just take the keys.
        const users = data ? Object.keys(data) : [];
        callback(users);
    });
    return unsubscribe;
};

// --- Actions ---

export const sendMessage = (user: string, text: string) => {
    const messagesRef = ref(database, MEETING_CHAT_REF);
    push(messagesRef, {
        user,
        text,
        timestamp: serverTimestamp()
    });
};

export const updateTypingStatus = (userName: string, isTyping: boolean) => {
    const userTypingRef = ref(database, `${TYPING_STATUS_REF}/${userName}`);
    if (isTyping) {
        set(userTypingRef, true);
    } else {
        remove(userTypingRef);
    }
};

export const updateUserPresence = (userName: string) => {
    const userStatusRef = ref(database, `${ONLINE_STATUS_REF}/${userName}`);
    const isOnlineForDatabase = true;

    const connectedRef = ref(database, '.info/connected');
    onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === false) {
            return;
        }
        // When the client disconnects, remove their presence entry entirely.
        onDisconnect(userStatusRef).remove().then(() => {
            // Set presence to true when connected.
            set(userStatusRef, isOnlineForDatabase);
        });
    });
};

export const goOffline = (userName: string) => {
    const userStatusRef = ref(database, `${ONLINE_STATUS_REF}/${userName}`);
    // Remove the user from the online list when they log out.
    remove(userStatusRef);
}