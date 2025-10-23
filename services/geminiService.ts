import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import type { ChatMessage, MeetingMessage, Project, QuizQuestion, VideoScript, YouTubeTrack, Video, ShortFormVideoScript, IconName, Slide, Chapter, YouTubePlaylist, YouTubeChannel } from "../types";
// Fix: Use a namespace import to correctly reference the exported functions from the mock service.
import * as mockService from './geminiServiceMocks';
// Fix: Import schemas from mock service to be used in Gemini API calls.
import { quizSchema, videoScriptSchema, shortFormVideoScriptSchema, presentationSchema } from './geminiServiceMocks';

let isGeminiQuotaExceeded = false;
let isApiKeyMissing = false; // New flag

class QuotaExceededError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'QuotaExceededError';
    }
}

let ai: GoogleGenAI;
try {
    if (process.env.API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
        console.warn("API_KEY environment variable not set. Using mock data for AI features.");
        isApiKeyMissing = true;
    }
} catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    isApiKeyMissing = true; // Also treat initialization errors as a missing key
}


async function handleApiCall<T>(apiCall: () => Promise<T>, functionName: string): Promise<T> {
    if (isApiKeyMissing) {
        // Trigger the mock data fallback in the calling functions.
        throw new QuotaExceededError("Chave de API não configurada. Usando dados de simulação.");
    }
    if (isGeminiQuotaExceeded) {
        throw new QuotaExceededError("A cota da API do Gemini já foi excedida nesta sessão.");
    }
    
    try {
        return await apiCall();
    } catch (error: any) {
        console.error(`Gemini API Error in ${functionName}:`, error);
        const errorMessage = error.message || (error.error && typeof error.error.message === 'string' ? error.error.message : '');
        const errorStatus = error.status || (error.error && error.error.status);

        if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('billing') || errorStatus === 'RESOURCE_EXHAUSTED' || errorMessage.includes("Requested entity was not found.")) {
            console.warn("Cota da API do Gemini excedida ou chave inválida. Ativando modo de simulação para IA.");
            isGeminiQuotaExceeded = true;
            
            if (errorMessage.includes("Requested entity was not found.")) {
                 throw new QuotaExceededError("Sua chave de API selecionada é inválida ou não tem acesso a este modelo. Por favor, selecione uma chave válida.");
            }
            throw new QuotaExceededError("A cota da API foi excedida. Esta função está temporariamente indisponível.");
        }
        throw new Error(`Erro na comunicação com a IA: ${errorMessage || 'Erro desconhecido.'}`);
    }
}

// --- Resilient Video & Music Search Service ---

// Helper to add a timeout to fetch requests, preventing infinite loading.
const fetchWithTimeout = (url: string, timeout = 5000): Promise<Response> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Request timed out'));
        }, timeout);

        fetch(url)
            .then(response => {
                clearTimeout(timer);
                resolve(response);
            })
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
    });
};

const formatSecondsDuration = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const totalSeconds = Math.floor(seconds);
    const displayMinutes = Math.floor(totalSeconds / 60);
    const displaySeconds = totalSeconds % 60;
    return `${displayMinutes}:${displaySeconds.toString().padStart(2, '0')}`;
};

// Helper to shuffle array for load balancing providers
const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};


// --- Video Search Providers ---

interface VideoProvider {
    name: string;
    searchUrl: (query: string) => string;
    parseResponse: (data: any, existingVideoIds: Set<string>) => Video[];
}

const parseInvidiousVideoResponse = (data: any, existingVideoIds: Set<string>): Video[] => {
    if (!Array.isArray(data)) return [];
    return data
        .map((item: any): Partial<Video> => {
            if (item.type !== 'video' || !item.videoId || !item.title) {
                return {};
            }
            return {
                id: item.videoId,
                title: item.title,
                duration: formatSecondsDuration(item.lengthSeconds),
                thumbnailUrl: item.videoThumbnails?.find((t: any) => t.quality === 'hqdefault')?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
                platform: 'youtube',
            };
        })
        .filter((video): video is Video => {
             return !!video.id && !existingVideoIds.has(video.id) && !!video.title && !!video.thumbnailUrl && video.thumbnailUrl.startsWith('http');
        });
};

const parsePipedVideoResponse = (data: any, existingVideoIds: Set<string>): Video[] => {
    if (!data.items || !Array.isArray(data.items)) return [];
    return data.items
        .map((item: any): Partial<Video> => {
            if (item.type !== 'stream' || !item.url || !item.title) return {};
            const videoIdMatch = item.url.match(/v=([^&]+)/);
            if (!videoIdMatch || !videoIdMatch[1]) return {};
            
            const videoId = videoIdMatch[1];
            return {
                id: videoId,
                title: item.title,
                duration: formatSecondsDuration(item.duration),
                thumbnailUrl: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                platform: 'youtube',
            };
        })
        .filter((video): video is Video => {
            return !!video.id && !existingVideoIds.has(video.id) && !!video.title && !!video.thumbnailUrl && video.thumbnailUrl.startsWith('http');
        });
};

// Curated list of public instances (Updated for reliability on Vercel)
const invidiousApiInstances = [
    'https://vid.puffyan.us',
    'https://invidious.lunar.icu',
    'https://invidious.protokoll.fi',
    'https://iv.melmac.space',
    'https://invidious.projectsegfau.lt',
    'https://invidious.incogniweb.net',
];

const pipedApiInstances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.smnz.de',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.in.projectsegau.lt',
    'https://pipedapi.frontend.la',
];


const videoProviders: VideoProvider[] = [
    ...invidiousApiInstances.map(instance => ({
        name: `Invidious (${new URL(instance).hostname})`,
        searchUrl: (query: string) => `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&region=BR&sort_by=relevance`,
        parseResponse: parseInvidiousVideoResponse
    })),
    ...pipedApiInstances.map(instance => ({
        name: `Piped (${new URL(instance).hostname})`,
        searchUrl: (query: string) => `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`,
        parseResponse: parsePipedVideoResponse
    }))
];

async function searchVideosFromProviders(searchQuery: string, existingVideoIds: Set<string>): Promise<Video[]> {
    const shuffledProviders = shuffleArray(videoProviders);

    for (const provider of shuffledProviders) {
        console.log(`Attempting video search with: ${provider.name}`);
        try {
            const response = await fetchWithTimeout(provider.searchUrl(searchQuery));
            if (!response.ok) throw new Error(`Response not OK: ${response.status}`);
            
            const data = await response.json();
            const videos = provider.parseResponse(data, existingVideoIds);

            if (videos.length > 0) {
                console.log(`Found ${videos.length} videos with ${provider.name}`);
                return videos;
            }
        } catch (e) {
            console.error(`Provider ${provider.name} failed:`, e);
        }
    }
    throw new Error('Todos os provedores de busca de vídeo falharam.');
}


// --- Music Search Providers ---

interface MusicProvider {
    name: string;
    searchUrl: (query: string) => string;
    parseResponse: (data: any) => YouTubeTrack[];
}

const sanitizeTitle = (title: string): string => {
     return title.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/official video/i, '').replace(/music video/i, '').replace(/lyrics/i, '').trim();
};

const parseInvidiousMusicResponse = (data: any): YouTubeTrack[] => {
    if (!Array.isArray(data)) return [];
    return data
        .map((item: any): Partial<YouTubeTrack> => {
            if (item.type !== 'video' || !item.videoId || !item.title) return {};
            return {
                id: item.videoId,
                title: sanitizeTitle(item.title),
                artist: item.author,
                thumbnailUrl: item.videoThumbnails?.find((t: any) => t.quality === 'hqdefault')?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
            };
        })
        .filter((track): track is YouTubeTrack => !!track.id && !!track.title && !!track.thumbnailUrl && track.thumbnailUrl.startsWith('http'));
};

const parsePipedMusicResponse = (data: any): YouTubeTrack[] => {
    if (!data.items || !Array.isArray(data.items)) return [];
    return data.items
        .map((item: any): Partial<YouTubeTrack> => {
            if (item.type !== 'stream' || !item.url || !item.title) return {};
            const videoIdMatch = item.url.match(/v=([^&]+)/);
            if (!videoIdMatch || !videoIdMatch[1]) return {};
            const videoId = videoIdMatch[1];
            return {
                id: videoId,
                title: sanitizeTitle(item.title),
                artist: item.uploaderName,
                thumbnailUrl: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            };
        })
        .filter((track): track is YouTubeTrack => !!track.id && !!track.title && !!track.thumbnailUrl && track.thumbnailUrl.startsWith('http'));
};


const musicProviders: MusicProvider[] = [
    ...invidiousApiInstances.map(instance => ({
        name: `Invidious Music (${new URL(instance).hostname})`,
        searchUrl: (query: string) => `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&features=music&sort_by=relevance`,
        parseResponse: parseInvidiousMusicResponse
    })),
    ...pipedApiInstances.map(instance => ({
        name: `Piped Music (${new URL(instance).hostname})`,
        searchUrl: (query: string) => `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`,
        parseResponse: parsePipedMusicResponse
    }))
];


async function searchMusicFromProviders(searchQuery: string): Promise<YouTubeTrack[]> {
    const shuffledProviders = shuffleArray(musicProviders);

    for (const provider of shuffledProviders) {
        console.log(`Attempting music search with: ${provider.name}`);
        try {
            const response = await fetchWithTimeout(provider.searchUrl(searchQuery));
            if (!response.ok) throw new Error(`Response not OK: ${response.status}`);
            
            const data = await response.json();
            const tracks = provider.parseResponse(data);

            if (tracks.length > 0) {
                console.log(`Found ${tracks.length} tracks with ${provider.name}`);
                return tracks;
            }
        } catch (e) {
            console.error(`Provider ${provider.name} failed:`, e);
        }
    }
    throw new Error('Todos os provedores de busca de música falharam.');
}

// --- Playlist Search Providers ---

interface PlaylistSearchProvider {
    name: string;
    searchUrl: (query: string) => string;
    parseResponse: (data: any) => YouTubePlaylist[];
}

const parseInvidiousPlaylistSearchResponse = (data: any): YouTubePlaylist[] => {
    if (!Array.isArray(data)) return [];
    return data
        .map((item: any): Partial<YouTubePlaylist> => {
            if (item.type !== 'playlist' || !item.playlistId || !item.title) return {};
            
            const firstVideoThumbnail = item.videos?.[0]?.videoThumbnails?.find((t: any) => t.quality === 'hqdefault')?.url;
            
            return {
                id: item.playlistId,
                title: item.title,
                thumbnailUrl: firstVideoThumbnail || `https://i.ytimg.com/vi/${item.videos?.[0]?.videoId}/hqdefault.jpg`,
                videoCount: item.videoCount,
                uploaderName: item.author,
            };
        })
        .filter((playlist): playlist is YouTubePlaylist => !!playlist.id && !!playlist.title && !!playlist.thumbnailUrl);
};

const parsePipedPlaylistSearchResponse = (data: any): YouTubePlaylist[] => {
    if (!data.items || !Array.isArray(data.items)) return [];
    return data.items
        .map((item: any): Partial<YouTubePlaylist> => {
            if (item.type !== 'playlist' || !item.url || !item.name) return {};
            const playlistIdMatch = item.url.match(/list=([^&]+)/);
            if (!playlistIdMatch || !playlistIdMatch[1]) return {};
            
            return {
                id: playlistIdMatch[1],
                title: item.name,
                thumbnailUrl: item.thumbnail,
                videoCount: item.videos,
                uploaderName: item.uploaderName,
            };
        })
        .filter((playlist): playlist is YouTubePlaylist => !!playlist.id && !!playlist.title && !!playlist.thumbnailUrl);
};

const playlistSearchProviders: PlaylistSearchProvider[] = [
    ...invidiousApiInstances.map(instance => ({
        name: `Invidious Playlist Search (${new URL(instance).hostname})`,
        searchUrl: (query: string) => `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=playlist&region=BR`,
        parseResponse: parseInvidiousPlaylistSearchResponse
    })),
    ...pipedApiInstances.map(instance => ({
        name: `Piped Playlist Search (${new URL(instance).hostname})`,
        searchUrl: (query: string) => `${instance}/search?q=${encodeURIComponent(query)}&filter=playlists`,
        parseResponse: parsePipedPlaylistSearchResponse
    }))
];

async function searchPlaylistsFromProviders(searchQuery: string): Promise<YouTubePlaylist[]> {
    const shuffledProviders = shuffleArray(playlistSearchProviders);

    for (const provider of shuffledProviders) {
        console.log(`Attempting playlist search with: ${provider.name}`);
        try {
            const response = await fetchWithTimeout(provider.searchUrl(searchQuery));
            if (!response.ok) throw new Error(`Response not OK: ${response.status}`);
            
            const data = await response.json();
            const playlists = provider.parseResponse(data);

            if (playlists.length > 0) {
                console.log(`Found ${playlists.length} playlists with ${provider.name}`);
                return playlists;
            }
        } catch (e) {
            console.error(`Provider ${provider.name} failed:`, e);
        }
    }
    throw new Error('Todos os provedores de busca de playlist falharam.');
}


// --- Playlist Fetching Providers ---

const playlistIdRegex = /(?:list=)([\w-]+)/;

interface PlaylistProvider {
    name: string;
    playlistUrl: (playlistId: string) => string;
    parseResponse: (data: any, existingVideoIds: Set<string>) => Video[];
}

const parseInvidiousPlaylistResponse = (data: any, existingVideoIds: Set<string>): Video[] => {
    if (!data.videos || !Array.isArray(data.videos)) return [];
    return data.videos
        .map((item: any): Partial<Video> => {
            if (!item.videoId || !item.title) return {};
            return {
                id: item.videoId,
                title: item.title,
                duration: formatSecondsDuration(item.lengthSeconds),
                thumbnailUrl: item.videoThumbnails?.find((t: any) => t.quality === 'hqdefault')?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
                platform: 'youtube',
            };
        })
        .filter((video): video is Video => {
             return !!video.id && !existingVideoIds.has(video.id) && !!video.title && !!video.thumbnailUrl && video.thumbnailUrl.startsWith('http');
        });
};

const parsePipedPlaylistResponse = (data: any, existingVideoIds: Set<string>): Video[] => {
    if (!data.relatedStreams || !Array.isArray(data.relatedStreams)) return [];
    return data.relatedStreams
        .map((item: any): Partial<Video> => {
            if (item.type !== 'stream' || !item.url || !item.title) return {};
            const videoIdMatch = item.url.match(/v=([^&]+)/);
            if (!videoIdMatch || !videoIdMatch[1]) return {};
            
            const videoId = videoIdMatch[1];
            return {
                id: videoId,
                title: item.title,
                duration: formatSecondsDuration(item.duration),
                thumbnailUrl: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                platform: 'youtube',
            };
        })
        .filter((video): video is Video => {
            return !!video.id && !existingVideoIds.has(video.id) && !!video.title && !!video.thumbnailUrl && video.thumbnailUrl.startsWith('http');
        });
};

const playlistProviders: PlaylistProvider[] = [
    ...invidiousApiInstances.map(instance => ({
        name: `Invidious Playlist (${new URL(instance).hostname})`,
        playlistUrl: (playlistId: string) => `${instance}/api/v1/playlists/${playlistId}`,
        parseResponse: parseInvidiousPlaylistResponse
    })),
    ...pipedApiInstances.map(instance => ({
        name: `Piped Playlist (${new URL(instance).hostname})`,
        playlistUrl: (playlistId: string) => `${instance}/playlists/${playlistId}`,
        parseResponse: parsePipedPlaylistResponse
    }))
];

async function getVideosFromPlaylistProviders(playlistId: string, existingVideoIds: Set<string>): Promise<Video[]> {
    const shuffledProviders = shuffleArray(playlistProviders);

    for (const provider of shuffledProviders) {
        console.log(`Attempting playlist fetch with: ${provider.name}`);
        try {
            const response = await fetchWithTimeout(provider.playlistUrl(playlistId), 10000); // Longer timeout for playlists
            if (!response.ok) throw new Error(`Response not OK: ${response.status}`);
            
            const data = await response.json();
            const videos = provider.parseResponse(data, existingVideoIds);

            if (videos.length > 0) {
                console.log(`Found ${videos.length} videos in playlist with ${provider.name}`);
                return videos;
            }
        } catch (e) {
            console.error(`Provider ${provider.name} failed:`, e);
        }
    }
    throw new Error('Todos os provedores de busca de playlist falharam.');
}


// --- Main Exported Service Functions ---

export const searchYouTubePlaylists = async (categoryTitle: string): Promise<YouTubePlaylist[]> => {
    const searchQuery = `${categoryTitle} tutorial playlist`;
    try {
        return await searchPlaylistsFromProviders(searchQuery);
    } catch (error) {
        console.error("An unexpected error occurred during the playlist search:", error);
        if (error instanceof Error) {
            throw new Error(`Busca de playlists indisponível: ${error.message}`);
        }
        throw new Error("Falha ao se comunicar com os serviços de busca de playlists.");
    }
};

export const getVideosFromPlaylistUrl = async (url: string, existingVideoIds: Set<string>): Promise<Video[]> => {
    const match = url.match(playlistIdRegex);
    if (!match || !match[1]) {
        throw new Error("URL da playlist do YouTube inválida ou não suportada.");
    }
    const playlistId = match[1];

    try {
        return await getVideosFromPlaylistProviders(playlistId, existingVideoIds);
    } catch (error) {
         console.error("An unexpected error occurred during the playlist fetch:", error);
        if (error instanceof Error) {
            throw new Error(`Busca de playlist indisponível: ${error.message}`);
        }
        throw new Error("Falha ao se comunicar com o serviço de busca de playlists.");
    }
};

export const searchYouTubeVideos = async (query: string): Promise<Video[]> => {
    try {
        return await searchVideosFromProviders(query, new Set());
    } catch (error) {
        console.error("An unexpected error occurred during the YouTube video search:", error);
        if (error instanceof Error) {
            throw new Error(`Busca de vídeos indisponível: ${error.message}`);
        }
        throw new Error("Falha ao se comunicar com o serviço de busca de vídeos.");
    }
};

export const searchVideosByAI = async (query: string, allVideos: Video[]): Promise<Video[]> => {
    if (allVideos.length === 0) {
        return [];
    }
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => {
            const videoDataForPrompt = allVideos.map(v => ({ id: v.id, title: v.title }));
            const prompt = `Você é um assistente de busca inteligente para uma plataforma de vídeos.
O usuário está buscando por: "${query}".
Aqui está uma lista de vídeos disponíveis em formato JSON:
${JSON.stringify(videoDataForPrompt)}

Analise a busca do usuário e os títulos dos vídeos para encontrar os mais relevantes semanticamente.
Retorne APENAS um array JSON com os 'id' dos vídeos que melhor correspondem à busca, ordenados por relevância.`;

            return ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });
        }, 'searchVideosByAI');

        const matchedIds = JSON.parse(response.text) as string[];
        const videoMap = new Map(allVideos.map(v => [v.id, v]));
        // Retorna os vídeos na ordem que a IA decidiu
        return matchedIds.map(id => videoMap.get(id)).filter((v): v is Video => !!v);

    } catch (error) {
        if (error instanceof QuotaExceededError) {
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Cota de IA excedida. Usando busca de simulação.' }}));
            return allVideos.filter(v => v.title.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
        }
        throw error;
    }
};

export const searchYouTubeMusic = async (query: string): Promise<YouTubeTrack[]> => {
    const searchQuery = `${query} official audio | ${query} lyrics | ${query} music`;

    try {
        return await searchMusicFromProviders(searchQuery);
    } catch (error) {
        console.error("An unexpected error occurred during the YouTube Music API search:", error);
        if (error instanceof Error) {
            throw new Error(`Busca de músicas indisponível: ${error.message}`);
        }
        throw new Error("Falha ao se comunicar com o serviço de busca de músicas.");
    }
};

export const getMeetingChatResponse = async (aiPrompt: string, meetingMessages: MeetingMessage[]): Promise<string> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => {
            const history = meetingMessages.map(msg => `${msg.user}: ${msg.text}`).join('\n');
            return ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Histórico da conversa:\n${history}\n\nO usuário @arc7 te perguntou: "${aiPrompt}". Responda de forma concisa e útil.`,
                config: { systemInstruction: "Você é um assistente IA chamado ARC7, focado em ajudar um time em uma reunião. Seja direto e informativo." },
            });
        }, 'getMeetingChatResponse');
        return response.text;
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            return mockService.getMockMeetingChatResponse();
        }
        throw error;
    }
};

export const getChatbotResponse = async (prompt: string, history: ChatMessage[]): Promise<string> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => {
            const chatHistory = history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
            return ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { role: 'user', parts: [{ text: prompt }] },
                config: { systemInstruction: "Você é o ARC7, um assistente IA da plataforma ARC7HIVE. Seu objetivo é ajudar os usuários a navegar e entender a plataforma. A plataforma possui trilhas de conhecimento sobre IA, Marketing, Finanças e mais. Os usuários podem conversar em uma sala de reunião, criar projetos de ebooks com IA e ouvir uma rádio. Seja amigável e informativo. Responda em markdown." },
                history: chatHistory.slice(0, -1)
            });
        }, 'getChatbotResponse');
        return response.text;
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            return mockService.getMockChatbotResponse(true);
        }
        throw error;
    }
};

export const generateLiveStyles = async (prompt: string): Promise<string> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Baseado no seguinte pedido: "${prompt}", gere apenas o código CSS para estilizar os seguintes componentes da aplicação ARC7HIVE:
            - body (backgrounds, fontes)
            - .dashboard-header (cabeçalho principal)
            - .progress-summary-card (card de progresso)
            - .category-card (cards das trilhas de conhecimento)
            O CSS deve ser moderno, usar variáveis se possível, e seguir a estética da Netflix/ARC7HIVE (cores escuras, vermelho como destaque). Não inclua a tag <style> ou qualquer outra coisa além do CSS.`,
            config: { systemInstruction: "Você é um especialista em CSS que gera código limpo e moderno." }
        }), 'generateLiveStyles');
        return response.text.replace(/```css\n?|```/g, '').trim();
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            return mockService.getMockLiveStyles();
        }
        throw error;
    }
};

export const generateEbookProjectStream = async function* (topic: string, numChapters: number): AsyncGenerator<string> {
    if (isApiKeyMissing) {
        window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Chave de API não configurada. Usando dados de simulação.' }}));
        yield* mockService.getMockEbookStreamGenerator();
        return; // Stop execution
    }

    try {
        if (isGeminiQuotaExceeded) {
             throw new QuotaExceededError("A cota da API do Gemini já foi excedida nesta sessão.");
        }
        const availableIcons: IconName[] = ['BookOpen', 'Brain', 'Chart', 'Dollar', 'Fire', 'Heart', 'Sparkles', 'Wrench', 'Film', 'Dumbbell', 'Cart'];
        const prompt = `Crie um ebook detalhado sobre "${topic}" com 10 a 12 capítulos. A resposta DEVE estar em markdown, seguindo estritamente esta estrutura:
- Título do Ebook: Comece a primeira linha com "# "
- Introdução: Comece com a tag "[INTRODUÇÃO]"
- Capítulos: Use o formato "[CAPÍTULO X: Título do Capítulo][ÍCONE: NomeDoIcone]"
- Conclusão: Comece com a tag "[CONCLUSÃO]"

Para cada tag "[ÍCONE: NomeDoIcone]", escolha um e apenas um nome de ícone da seguinte lista que melhor represente o conteúdo do capítulo: ${availableIcons.join(', ')}.
Exemplo de capítulo: "[CAPÍTULO 1: Fundamentos da IA][ÍCONE: Brain]"
Escreva conteúdo substancial e detalhado para cada seção. Não adicione nenhum texto ou formatação fora desta estrutura.`;

        const stream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: "Você é um escritor especialista em criar conteúdo educacional estruturado em formato de ebook, seguindo rigorosamente as instruções de formatação." }
        });
        for await (const chunk of stream) {
            yield chunk.text;
        }
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Cota de IA excedida. Usando dados de simulação.' }}));
            yield* mockService.getMockEbookStreamGenerator();
            return;
        }
        console.error("generateEbookProjectStream error:", error);
        throw new Error("Falha ao gerar o projeto do ebook. " + (error as Error).message);
    }
};

// Fix: Implement `extendEbookProjectStream` to add more chapters to an existing project.
export const extendEbookProjectStream = async function* (project: Project): AsyncGenerator<string> {
    if (isApiKeyMissing) {
        window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Chave de API não configurada. Usando dados de simulação.' }}));
        yield* mockService.getMockExtendEbookStreamGenerator();
        return;
    }
    try {
        if (isGeminiQuotaExceeded) {
             throw new QuotaExceededError("A cota da API do Gemini já foi excedida nesta sessão.");
        }
        const availableIcons: IconName[] = ['BookOpen', 'Brain', 'Chart', 'Dollar', 'Fire', 'Heart', 'Sparkles', 'Wrench', 'Film', 'Dumbbell', 'Cart', 'UsersGroup', 'Pencil'];
        const lastChapterNumber = project.chapters.length;
        const projectSummary = `
Título: ${project.name}
Introdução: ${project.introduction}
${project.chapters.map((c, i) => `Resumo do Capítulo ${i + 1}: ${c.title}`).join('\n')}
Conclusão (até agora): ${project.conclusion}
`;

        const prompt = `Você está continuando a escrever um ebook. O ebook já tem ${lastChapterNumber} capítulos.
Aqui está um resumo do conteúdo existente:
${projectSummary}

Continue o ebook escrevendo mais 10 capítulos, começando pelo capítulo ${lastChapterNumber + 1}.
A resposta DEVE estar em markdown, seguindo estritamente esta estrutura para os novos capítulos:
- Capítulos: Use o formato "[CAPÍTULO X: Título do Capítulo][ÍCONE: NomeDoIcone]"
- NÃO inclua uma nova introdução ou conclusão.
- NÃO repita os capítulos existentes.

Para cada tag "[ÍCONE: NomeDoIcone]", escolha um e apenas um nome de ícone da seguinte lista que melhor represente o conteúdo do capítulo: ${availableIcons.join(', ')}.
Exemplo de capítulo: "[CAPÍTULO ${lastChapterNumber + 1}: Tópico Avançado][ÍCONE: Brain]"
Escreva conteúdo substancial e detalhado para cada novo capítulo. Não adicione nenhum texto ou formatação fora desta estrutura. Comece diretamente com o primeiro novo capítulo.`;

        const stream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: "Você é um escritor especialista em continuar conteúdo educacional estruturado, seguindo rigorosamente as instruções de formatação." }
        });

        for await (const chunk of stream) {
            yield chunk.text;
        }
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Cota de IA excedida. Usando dados de simulação.' }}));
            yield* mockService.getMockExtendEbookStreamGenerator();
            return;
        }
        console.error("extendEbookProjectStream error:", error);
        throw new Error("Falha ao estender o ebook. " + (error as Error).message);
    }
};

// Fix: Implement `generateImagePromptForText` to create prompts for AI image generators.
export const generateImagePromptForText = async (text: string, context: string): Promise<string> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => {
            const prompt = `Crie um prompt em inglês para um gerador de imagens de IA (como Imagen ou Midjourney) que capture a essência do seguinte conteúdo.
O prompt deve ser descritivo, evocativo e focado em elementos visuais.
Título/Tópico Principal: "${text}"
Contexto Adicional: "${context}"
Retorne APENAS o prompt.`;

            return ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { systemInstruction: "Você é um especialista em criar prompts para geradores de imagem de IA. Seus prompts são concisos e artisticamente descritivos." }
            });
        }, 'generateImagePromptForText');
        return response.text.replace(/["`]/g, '').trim();
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Cota de IA excedida. Usando prompt de simulação.' }}));
            return mockService.getMockImagePrompt();
        }
        throw error;
    }
};

// Fix: Implement `generateImage` to generate images using Imagen model.
export const generateImage = async (prompt: string, aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1'): Promise<string> => {
    try {
        const response = await handleApiCall<any>(() => {
            return ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/png',
                    aspectRatio: aspectRatio,
                },
            });
        }, 'generateImage');
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error("A IA não retornou nenhuma imagem.");
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Cota de IA excedida. Usando imagem de simulação.' }}));
            return mockService.getMockImageBase64();
        }
        throw error;
    }
};

// Fix: Implement `generateWebpageFromProject` to convert an ebook project into a styled HTML page.
export const generateWebpageFromProject = async (project: Project): Promise<string> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => {
            const projectContent = `
Título: ${project.name}
Autor: ${project.createdBy}
Introdução: ${project.introduction}
${project.chapters.map((c, i) => `Capítulo ${i + 1}: ${c.title}\n${c.content}`).join('\n\n')}
Conclusão: ${project.conclusion}
`;
            const prompt = `Transforme o seguinte conteúdo de um ebook em uma única página HTML estilizada, similar à estética do Gamma.app.
- Use um design moderno, limpo e de modo escuro.
- O HTML deve ser autônomo, com CSS em uma tag <style> no <head>.
- Use fontes legíveis do Google Fonts.
- Crie uma paleta de cores agradável, possivelmente baseada no tema do ebook, mas mantendo a estética escura e premium.
- Estruture o conteúdo de forma lógica com cabeçalhos, parágrafos e talvez seções distintas para cada capítulo.
- Retorne APENAS o código HTML completo, começando com <!DOCTYPE html> e terminando com </html>. Não inclua markdown ou explicações.

Conteúdo do Ebook:
${projectContent}
`;
            return ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { systemInstruction: "Você é um desenvolvedor web especialista em criar páginas de destino bonitas e responsivas a partir de conteúdo de texto." },
            });
        }, 'generateWebpageFromProject');
        return response.text.replace(/```html\n?|```/g, '').trim();
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Cota de IA excedida. Usando layout de simulação.' }}));
            return mockService.getMockWebpage();
        }
        throw error;
    }
};

// Fix: Implement `generatePromptIdeas` to generate alternative image prompt ideas.
export const generatePromptIdeas = async (prompt: string): Promise<string[]> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Dado o seguinte prompt para um gerador de imagens: "${prompt}". Gere 3 variações ou ideias alternativas criativas. As novas ideias devem manter o tema central, mas explorar diferentes estilos, composições ou elementos. Retorne APENAS um array JSON de strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        }), 'generatePromptIdeas');
        return JSON.parse(response.text);
    } catch (error) {
        if (error instanceof QuotaExceededError) {
             window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Cota de IA excedida. Usando sugestões de simulação.' }}));
            return mockService.getMockPromptIdeas();
        }
        throw error;
    }
};

// Fix: Implement `generateEbookQuiz` to create a quiz from a project's content.
export const generateEbookQuiz = async (project: Project): Promise<QuizQuestion[]> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => {
            const projectContent = `Título: ${project.name}\n${project.chapters.map(c => c.content).join('\n')}`;
            const prompt = `Crie um quiz com 5 perguntas de múltipla escolha para testar o conhecimento sobre o conteúdo do ebook a seguir.
Para cada pergunta, forneça 4 opções e indique a resposta correta.
Retorne a resposta no formato JSON especificado.

Conteúdo do Ebook:
${projectContent}`;

            return ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: quizSchema
                }
            });
        }, 'generateEbookQuiz');
        return JSON.parse(response.text);
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Cota de IA excedida. Usando quiz de simulação.' }}));
            return mockService.getMockEbookQuiz();
        }
        throw error;
    }
};

// Fix: Implement `generateVideoScript` to create a video script from a project.
export const generateVideoScript = async (project: Project): Promise<VideoScript> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => {
            const projectContent = `Título: ${project.name}\n${project.chapters.map(c => c.content).join('\n')}`;
            const prompt = `Analise o conteúdo deste ebook e crie um roteiro para um vídeo curto (1-2 minutos).
O roteiro deve ter de 3 a 5 cenas. Para cada cena, forneça:
1.  'narration': Um texto curto e cativante para ser narrado.
2.  'prompt': Uma descrição concisa em inglês para um gerador de imagens de IA criar um visual para a cena.
3.  'fullNarrationScript': Um script completo juntando todas as narrações.
Retorne a resposta no formato JSON especificado.

Conteúdo do Ebook:
${projectContent}`;

            return ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: videoScriptSchema
                }
            });
        }, 'generateVideoScript');
        return JSON.parse(response.text);
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Cota de IA excedida. Usando roteiro de simulação.' }}));
            return mockService.getMockVideoScript();
        }
        throw error;
    }
};

// Fix: Implement `generateShortFormVideoScript` for creating TikTok/Reels style video scripts.
export const generateShortFormVideoScript = async (project: Project): Promise<ShortFormVideoScript> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => {
            const projectContent = `Título: ${project.name}\nIntrodução: ${project.introduction}\n${project.chapters.map(c => c.content).join('\n')}`;
            const prompt = `Analise o conteúdo deste ebook e crie um roteiro para um vídeo curto vertical (estilo TikTok/Reels) de 15-20 segundos.
O roteiro deve incluir:
1.  'hook': Uma frase de impacto para os primeiros 2 segundos.
2.  'scenes': Uma lista de 3 cenas. Cada cena deve ter:
    - 'narration': Um texto curto para a legenda/narração.
    - 'imagePrompt': Um prompt em inglês para um gerador de imagem de IA criar um visual dinâmico para a cena.
3.  'cta': Uma chamada para ação curta no final.
4.  'musicSuggestion': Palavras-chave para o estilo da música de fundo (ex: 'upbeat electronic', 'lo-fi').
Retorne a resposta no formato JSON especificado.

Conteúdo do Ebook:
${projectContent}`;

            return ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: shortFormVideoScriptSchema
                }
            });
        }, 'generateShortFormVideoScript');
        return JSON.parse(response.text);
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Cota de IA excedida. Usando roteiro de simulação.' }}));
            return mockService.getMockShortFormVideoScript();
        }
        throw error;
    }
};

// Fix: Implement `generateTtsAudio` to convert text to speech.
export const generateTtsAudio = async (text: string): Promise<string> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => {
            return ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: 'Kore' }, // A neutral, clear voice
                        },
                    },
                },
            });
        }, 'generateTtsAudio');

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return base64Audio;
        }
        throw new Error("A IA não retornou dados de áudio.");

    } catch (error) {
        if (error instanceof QuotaExceededError) {
             window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'error', message: 'Cota de IA excedida para TTS. Função indisponível.' }}));
             throw error; // No mock for this, so we re-throw to let the caller handle it.
        }
        throw error;
    }
};

// Fix: Implement `generatePresentationFromProject` to summarize a project into slides.
export const generatePresentationFromProject = async (project: Project): Promise<Slide[]> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => {
            const projectContent = `Título: ${project.name}\n${project.chapters.map(c => `Capítulo: ${c.title}\n${c.content}`).join('\n\n')}`;
            const prompt = `Analise o conteúdo deste ebook e resuma-o em uma apresentação de slides concisa (cerca de 5-7 slides).
Para cada slide, forneça:
1.  'title': Um título claro e curto.
2.  'content': Uma lista (array de strings) com 2 a 4 pontos chave em formato de bullet points.
3.  'imagePrompt': Um prompt em inglês para um gerador de imagens de IA criar uma imagem de fundo relevante para o slide.
Retorne a resposta como um array de objetos JSON, seguindo o schema.

Conteúdo do Ebook:
${projectContent}`;

            return ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: presentationSchema
                }
            });
        }, 'generatePresentationFromProject');
        return JSON.parse(response.text);
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Cota de IA excedida. Usando apresentação de simulação.' }}));
            return mockService.getMockPresentation();
        }
        throw error;
    }
};