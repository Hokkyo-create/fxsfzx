import { GoogleGenAI, Type, GenerateContentResponse, GenerateImagesResponse, Modality } from "@google/genai";
import type { ChatMessage, MeetingMessage, Project, QuizQuestion, VideoScript, YouTubeTrack, Video, ShortFormVideoScript, IconName } from "../types";
// Fix: Use a namespace import to correctly reference the exported functions from the mock service.
import * as mockService from './geminiServiceMocks';

let isGeminiQuotaExceeded = false;

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
        console.warn("API_KEY environment variable not set. AI features will be unavailable.");
    }
} catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
}


async function handleApiCall<T>(apiCall: () => Promise<T>, functionName: string): Promise<T> {
    if (isGeminiQuotaExceeded) {
        throw new QuotaExceededError("A cota da API do Gemini já foi excedida nesta sessão.");
    }
    if (!ai) {
        throw new Error("Serviço de IA não inicializado. Verifique a chave de API.");
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
    if (!ai) throw new Error('Serviço de IA não inicializado.');
    try {
        if (isGeminiQuotaExceeded) {
             throw new QuotaExceededError("A cota da API do Gemini já foi excedida nesta sessão.");
        }
        const availableIcons: IconName[] = ['BookOpen', 'Brain', 'Chart', 'Dollar', 'Fire', 'Heart', 'Sparkles', 'Wrench', 'Film', 'Dumbbell', 'Cart'];
        const prompt = `Crie um ebook detalhado sobre "${topic}" com ${numChapters} capítulos. A resposta DEVE estar em markdown, seguindo estritamente esta estrutura:
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
    } catch (error: any) {
        if (error instanceof QuotaExceededError || (error.message && error.message.toLowerCase().includes('quota'))) {
            isGeminiQuotaExceeded = true;
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Cota de IA excedida. Usando dados de simulação.' }}));
            yield* mockService.getMockEbookStreamGenerator();
        } else {
            console.error(`Gemini API Error in generateEbookProjectStream:`, error);
            throw new Error(`Erro na comunicação com a IA: ${error.message}`);
        }
    }
};

export const generateImagePromptForText = async (title: string, content: string): Promise<string> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie um prompt curto e visual para gerar uma imagem para um texto com o título "${title}" e conteúdo "${content.substring(0, 300)}...". O prompt deve ser em inglês, focado em arte digital, cinematográfico e com cores vibrantes. Ex: 'digital art of a futuristic city at sunset, cinematic lighting, vibrant colors'.`,
            config: { systemInstruction: "Você é um especialista em criar prompts para IAs de geração de imagem." }
        }), 'generateImagePromptForText');
        return response.text.trim();
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            return mockService.getMockImagePrompt();
        }
        throw error;
    }
};

export const generateImage = async (prompt: string): Promise<string> => {
    try {
        const response = await handleApiCall<GenerateImagesResponse>(() => ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/png' }
        }), 'generateImage');
        return response.generatedImages[0].image.imageBytes;
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            return mockService.getMockImageBase64();
        }
        throw error;
    }
};

export const generatePromptIdeas = async (existingPrompt: string): Promise<string[]> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Baseado no prompt de imagem "${existingPrompt}", gere 3 variações ou melhorias alternativas. As respostas devem ser apenas os prompts, em uma lista.`,
            config: {
                systemInstruction: "Você é um assistente de IA que ajuda a refinar prompts de geração de imagem.",
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        }), 'generatePromptIdeas');
        return JSON.parse(response.text);
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            return mockService.getMockPromptIdeas();
        }
        throw error;
    }
}

export const generateEbookQuiz = async (project: Project): Promise<QuizQuestion[]> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => {
            const content = `Título: ${project.name}\nIntrodução: ${project.introduction}\nCapítulos: ${project.chapters.map(c => c.content).join('\n')}`;
            return ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Crie um quiz com ${Math.min(5, project.chapters.length)} perguntas de múltipla escolha (4 opções) baseado no conteúdo do ebook a seguir. Apenas uma resposta pode ser correta. O quiz deve testar o conhecimento chave do ebook. \n\nEBOOK:\n${content.substring(0, 8000)}`,
                config: { responseMimeType: "application/json", responseSchema: mockService.quizSchema }
            });
        }, 'generateEbookQuiz');
        return JSON.parse(response.text);
    } catch (error) {
         if (error instanceof QuotaExceededError) {
            return mockService.getMockEbookQuiz();
        }
        throw error;
    }
};

export const generateVideoScript = async (project: Project): Promise<VideoScript> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => {
            const content = `Título: ${project.name}\nIntrodução: ${project.introduction}\nCapítulos: ${project.chapters.map(c => `${c.title}: ${c.content}`).join('\n')}`;
            return ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Crie um roteiro para um vídeo curto (aproximadamente 1 minuto) baseado no conteúdo do ebook a seguir. Divida o roteiro em 3 a 5 cenas. Para cada cena, forneça um texto de narração conciso e um prompt de busca para encontrar um vídeo de estoque relevante no YouTube (em português). No final, forneça o roteiro de narração completo. \n\nEBOOK:\n${content.substring(0, 8000)}`,
                config: { responseMimeType: "application/json", responseSchema: mockService.videoScriptSchema }
            });
        }, 'generateVideoScript');
        return JSON.parse(response.text);
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            return mockService.getMockVideoScript();
        }
        throw error;
    }
};

export const generateShortFormVideoScript = async (project: Project): Promise<ShortFormVideoScript> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => {
            const content = `Título: ${project.name}\nIntrodução: ${project.introduction}\nCapítulos: ${project.chapters.map(c => `${c.title}: ${c.content}`).join('\n')}`;
            return ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Crie um roteiro para um vídeo curto (estilo TikTok/Reels, 15-30 segundos) baseado no conteúdo do ebook: "${project.name}". O vídeo deve ser rápido, cativante e visual. O roteiro deve ter: um 'hook' (frase inicial de impacto), 3-5 'scenes' (cenas) com uma narração curta e um 'imagePrompt' em inglês para cada, um 'cta' (chamada para ação), e uma 'musicSuggestion' (sugestão de estilo musical em inglês). O imagePrompt deve ser descritivo para gerar uma imagem de arte digital. \n\nEBOOK:\n${content.substring(0, 5000)}`,
                config: { responseMimeType: "application/json", responseSchema: mockService.shortFormVideoScriptSchema }
            });
        }, 'generateShortFormVideoScript');
        return JSON.parse(response.text);
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            return mockService.getMockShortFormVideoScript();
        }
        throw error;
    }
};

export const generateTtsAudio = async (text: string): Promise<string> => {
    try {
        const response = await handleApiCall<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // A natural-sounding voice
                    },
                },
            },
        }), 'generateTtsAudio');
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("A resposta da API de áudio não continha dados de áudio.");

        return base64Audio;
    } catch (error) {
        // Mock service for TTS is not defined, so just re-throw
        console.error("TTS generation failed:", error);
        throw error;
    }
};