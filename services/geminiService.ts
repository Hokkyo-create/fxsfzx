import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { ChatMessage, LearningCategory, MeetingMessage, Project, QuizQuestion, Video, VideoScript, YouTubeTrack, Notification } from "../types";
import {
    getMockChatbotResponse,
    getMockEbookQuiz,
    getMockEbookStream,
    getMockImageBase64,
    getMockImagePrompt,
    getMockInstagramVideos,
    getMockLiveStyles,
    getMockMeetingChatResponse,
    getMockPromptIdeas,
    getMockTikTokVideos,
    getMockVideoOperation,
    getMockVideoScript,
    getMockYouTubeMusic,
    quizSchema,
    videoScriptSchema
} from "./geminiServiceMocks";

let isSimulationMode = false;
let apiKey: string | undefined;

try {
    apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set or accessible.");
    }
} catch (error) {
    console.warn("Could not retrieve API_KEY, proceeding without it. Simulation mode may be activated if needed.", error);
}


let ai: GoogleGenAI;
if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
} else {
    console.warn("GoogleGenAI not initialized due to missing API Key. Entering simulation mode.");
    isSimulationMode = true;
    window.dispatchEvent(new CustomEvent('quotaExceeded'));
}

const handleApiError = (error: any) => {
    console.error("Google GenAI API Error:", error);
    if (error.message && typeof error.message === 'string' && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('api key not valid'))) {
        console.warn("API quota exceeded or key invalid. Enabling simulation mode.");
        enableSimulationMode();
        window.dispatchEvent(new CustomEvent('quotaExceeded'));
    }
    throw error;
};

export const enableSimulationMode = () => {
    isSimulationMode = true;
};

// --- API Functions ---

export const getMeetingChatResponse = async (prompt: string, history: MeetingMessage[]): Promise<string> => {
    if (isSimulationMode || !ai) return getMockMeetingChatResponse();
    const formattedHistory = history.map(msg => ({
        role: msg.user === 'ARC7' ? 'model' : 'user',
        parts: [{ text: msg.text }],
    }));
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [ ...formattedHistory, { role: 'user', parts: [{ text: prompt }] } ],
            config: { systemInstruction: "You are ARC7, an AI assistant in a team meeting. Be concise, helpful, and professional. Your name is ARC7." }
        });
        return response.text;
    } catch (error) {
        handleApiError(error);
        return getMockMeetingChatResponse();
    }
};

export const getChatbotResponse = async (prompt: string, history: ChatMessage[]): Promise<string> => {
    if (isSimulationMode || !ai) return getMockChatbotResponse();
    const formattedHistory = history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [...formattedHistory, {role: 'user', parts: [{text: prompt}]}],
            config: { systemInstruction: `You are ARC7, a helpful AI assistant for the ARC7HIVE learning platform. Your goal is to guide users and answer questions about the platform's features and content. The platform has categories like 'Inteligência Artificial', 'Marketing Digital', 'Mercado Financeiro', etc. It also has a 'Projects' area where users can create ebooks with AI. Be friendly and informative. Use markdown for formatting, like **bold** for emphasis.` }
        });
        return response.text;
    } catch (error) {
        handleApiError(error);
        return getMockChatbotResponse(true);
    }
};

const extractJson = (text: string): any[] | null => {
    const startIndex = text.indexOf('[');
    const endIndex = text.lastIndexOf(']');
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        console.warn("Could not find a JSON array in the AI response.", text);
        return null;
    }
    const jsonString = text.substring(startIndex, endIndex + 1);
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON from AI response:", e);
        console.error("Original text:", text);
        return null;
    }
};

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;

async function verifyYouTubeVideo(videoId: string): Promise<boolean> {
  // A simple check for a valid video ID format can prevent unnecessary fetches.
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return false;
  }
  try {
    // The oEmbed endpoint is a great public way to check for a video's existence and public availability.
    // It does not require an API key. A 404 means it doesn't exist, and 401/403 means it's private.
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    return response.ok;
  } catch (error) {
    // This catches network errors etc.
    console.warn(`Verification check via oEmbed failed for video ID ${videoId}`, error);
    return false;
  }
}

async function findSocialVideosWithGemini(platform: 'tiktok' | 'instagram', categoryTitle: string): Promise<Video[]> {
    if (isSimulationMode || !ai) {
        return platform === 'tiktok' ? getMockTikTokVideos() : getMockInstagramVideos();
    }

    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    const prompt = `Usando a busca do Google, encontre 7 vídeos populares e recentes em português do Brasil sobre "${categoryTitle}" no ${platformName}.
Priorize conteúdo educativo como tutoriais, aulas, ou dicas.
Para cada vídeo, forneça a URL completa e um título descritivo.
Responda APENAS com um array JSON válido contendo objetos com as chaves "url" e "title".
Exemplo de formato: [{ "url": "https://www.tiktok.com/@user/video/123", "title": "Tutorial Incrível" }]`;

    try {
        const TIMEOUT_MS = 15000; // 15 seconds
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`A busca por vídeos no ${platformName} demorou demais.`)), TIMEOUT_MS)
        );

        const apiPromise = ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] },
        });

        const response = await Promise.race([apiPromise, timeoutPromise]) as GenerateContentResponse;

        const parsedJson = extractJson(response.text);
        if (!parsedJson) return [];

        return parsedJson.map((item: { url: string; title: string }) => {
            let videoId: string | null = null;
            try {
                const url = new URL(item.url);
                if (platform === 'tiktok' && url.pathname.includes('/video/')) {
                    videoId = url.pathname.split('/video/')[1].split('/')[0];
                } else if (platform === 'instagram' && (url.pathname.startsWith('/p/') || url.pathname.startsWith('/reel/'))) {
                    const parts = url.pathname.split('/');
                    if (parts.length > 2) videoId = parts[2];
                }
            } catch(e) {
                console.warn(`Could not parse ID from ${platform} URL:`, item.url);
            }
            
            if (!videoId) return null;

            const thumbnailUrl = `https://placehold.co/480x360/141414/E50914?text=${platformName}`;
            return {
                id: videoId,
                title: item.title,
                duration: '??:??',
                thumbnailUrl,
            };
        }).filter((v): v is Video => v !== null);

    } catch (error) {
        console.error(`Error finding ${platform} videos for "${categoryTitle}" with Gemini:`, error);
        if (error instanceof Error && error.message.includes('demorou demais')) {
             throw error;
        }
        handleApiError(error);
        throw new Error(`A busca com IA para ${platformName} falhou.`);
    }
}

async function findYouTubeVideosWithGeminiFallback(categoryTitle: string, count: number = 7): Promise<Video[]> {
    if (isSimulationMode || !ai) return [];
    console.log(`Iniciando busca com fallback da IA para "${categoryTitle}"...`);
    const numCandidates = 25; // Increase candidate pool for better results
    const prompt = `Sua tarefa é encontrar vídeos do YouTube sobre "${categoryTitle}". Siga estas regras ESTritamente:
1. Usando a Busca Google, encontre ${numCandidates} URLs de vídeos brasileiros, públicos e relevantes.
2. O conteúdo deve ser educativo (tutoriais, aulas, dicas de alta qualidade).
3. **CRÍTICO**: Verifique se cada URL leva a um vídeo real e que pode ser assistido. Não invente URLs. A precisão é mais importante que a quantidade.
4. Retorne APENAS um array JSON com objetos no formato [{ "url": "url_completa_do_video", "title": "titulo_do_video" }]. Não inclua nenhum outro texto, markdown, ou explicações fora do JSON.`;
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] },
        });
        
        const candidates = extractJson(response.text);
        if (!candidates || candidates.length === 0) {
            console.warn("IA não retornou candidatos ou o JSON é inválido na tentativa de fallback.");
            return [];
        }

        const verificationPromises = candidates.map(async (candidate: any) => {
            const videoUrl = candidate?.url;
            if (videoUrl && typeof videoUrl === 'string') {
                let videoId: string | null = null;
                try {
                    const urlObj = new URL(videoUrl);
                    if (urlObj.hostname.includes('youtube.com')) {
                        videoId = urlObj.searchParams.get('v');
                    } else if (urlObj.hostname === 'youtu.be') {
                        videoId = urlObj.pathname.substring(1);
                    }
                } catch (e) { return null; }

                if (videoId) {
                     const isValid = await verifyYouTubeVideo(videoId);
                     if (isValid) {
                         return {
                             id: videoId,
                             title: candidate.title || "Título indisponível",
                             duration: '??:??',
                             thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                         };
                     }
                }
            }
            return null;
        });

        const verifiedResults = await Promise.all(verificationPromises);
        const validVideos = verifiedResults.filter((v): v is Video => v !== null);
        console.log(`Busca de fallback concluída. Encontrados ${validVideos.length} vídeos válidos de ${candidates.length} candidatos.`);
        return validVideos.slice(0, count);

    } catch(error) {
        console.error("Erro durante a chamada da IA na busca de fallback:", error);
        handleApiError(error);
        return [];
    }
}

export const findVideos = async (categoryTitle: string, platform: 'youtube' | 'tiktok' | 'instagram'): Promise<Video[]> => {
    if (isSimulationMode) return [];
    
    if (platform === 'youtube') {
        if (!YOUTUBE_API_KEY) {
            console.warn("A chave da API do YouTube não está configurada. Usando fallback de IA.");
            return findYouTubeVideosWithGeminiFallback(categoryTitle);
        }
        
        const query = encodeURIComponent(`${categoryTitle} tutoriais aulas dicas em português`);
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&maxResults=7&type=video&videoEmbeddable=true&key=${YOUTUBE_API_KEY}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (!response.ok) {
                console.error("YouTube API Error:", JSON.stringify(data, null, 2));
                const notification: Notification = {
                    type: 'info',
                    message: 'API do YouTube indisponível. Usando busca alternativa com IA.'
                };
                window.dispatchEvent(new CustomEvent('app-notification', { detail: notification }));
                if (data?.error?.message.includes('are blocked')) {
                    console.warn('Direct YouTube API call failed, falling back to Gemini search.');
                    return findYouTubeVideosWithGeminiFallback(categoryTitle);
                }
                throw new Error(data.error?.message || "Ocorreu um erro ao buscar vídeos no YouTube.");
            }
            if (!data.items || data.items.length === 0) return [];
            return data.items.map((item: any) => ({
                id: item.id.videoId,
                title: item.snippet.title,
                duration: '??:??',
                thumbnailUrl: item.snippet.thumbnails.medium.url,
            }));
        } catch (error) {
            console.error(`Error finding YouTube videos for "${categoryTitle}":`, error);
            const notification: Notification = {
                type: 'info',
                message: 'Falha na busca do YouTube. Usando busca alternativa com IA.'
            };
            window.dispatchEvent(new CustomEvent('app-notification', { detail: notification }));
            console.warn('Fallback to Gemini search due to an unexpected error.');
            return findYouTubeVideosWithGeminiFallback(categoryTitle);
        }
    }

    return findSocialVideosWithGemini(platform, categoryTitle);
};

export const generateLiveStyles = async (prompt: string): Promise<string> => {
    if (isSimulationMode || !ai) return getMockLiveStyles();
    const fullPrompt = `Based on the user prompt "${prompt}", generate only the CSS code to style the web application. The application has a dark theme. Common class names are .category-card, .progress-summary-card, .dashboard-header. Do not include any explanations, just the raw CSS code inside a \`\`\`css block.`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: fullPrompt });
        let css = response.text.trim();
        if (css.startsWith('```css')) css = css.substring(5);
        if (css.endsWith('```')) css = css.slice(0, -3);
        return css.trim();
    } catch (error) {
        handleApiError(error);
        return getMockLiveStyles();
    }
};

export async function* generateEbookProjectStream(topic: string, numChapters: number): AsyncGenerator<string> {
    if (isSimulationMode || !ai) {
        for (const chunk of getMockEbookStream()) {
            yield chunk;
            await new Promise(res => setTimeout(res, 50));
        }
        return;
    }
    const prompt = `Generate a short ebook about "${topic}". It should have an introduction, ${numChapters} chapters, and a conclusion.
    Structure the response clearly using these exact markers:
    # [Ebook Title Here]
    [INTRODUÇÃO]
    ...content...
    [CAPÍTULO 1: Chapter Title Here]
    ...content...
    ... and so on for all chapters ...
    [CONCLUSÃO]
    ...content...
    
    Ensure the content is detailed and well-written. The response must follow this structure precisely.`;
    try {
        const stream = await ai.models.generateContentStream({ model: 'gemini-2.5-flash', contents: prompt });
        for await (const chunk of stream) {
            yield chunk.text;
        }
    } catch (error) {
        handleApiError(error);
        for (const chunk of getMockEbookStream()) {
            yield chunk;
            await new Promise(res => setTimeout(res, 50));
        }
    }
}

export const generateImagePromptForText = async (title: string, text: string): Promise<string> => {
    if (isSimulationMode || !ai) return getMockImagePrompt();
    const prompt = `Based on the following title and text, create a concise, descriptive, and visually compelling prompt (in English) for an AI image generator. The prompt should capture the essence of the content.
    Title: "${title}"
    Text: "${text.substring(0, 500)}..."
    
    The prompt should be in a "cinematic, photorealistic" style. Provide only the prompt text.`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (error) {
        handleApiError(error);
        return getMockImagePrompt();
    }
};

export const generateImage = async (prompt: string): Promise<string> => {
    if (isSimulationMode || !ai) return getMockImageBase64();
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: '3:4' },
        });
        return response.generatedImages[0].image.imageBytes;
    } catch (error) {
        handleApiError(error);
        return getMockImageBase64();
    }
};

export const generatePromptIdeas = async (currentPrompt: string): Promise<string[]> => {
    if (isSimulationMode || !ai) return getMockPromptIdeas();
    const prompt = `Given the image generation prompt "${currentPrompt}", suggest 3 alternative or improved versions. The suggestions should be creative and enhance the original idea. Return the result as a JSON array of strings. Example: ["idea 1", "idea 2", "idea 3"]`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error);
        return getMockPromptIdeas();
    }
};

export const searchYouTubeMusic = async (query: string): Promise<YouTubeTrack[]> => {
    if (isSimulationMode || !ai) return getMockYouTubeMusic();
    const prompt = `Find 5 music videos on YouTube for the search query "${query}". For each video, provide the video ID, title, artist, and thumbnail URL. Respond with a JSON array of objects.`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY, items: {
                        type: Type.OBJECT, properties: {
                            id: { type: Type.STRING }, title: { type: Type.STRING }, artist: { type: Type.STRING }, thumbnailUrl: { type: Type.STRING },
                        }, required: ["id", "title", "artist", "thumbnailUrl"],
                    }
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error);
        return getMockYouTubeMusic();
    }
};

export const generateEbookQuiz = async (project: Project): Promise<QuizQuestion[]> => {
    if (isSimulationMode || !ai) return getMockEbookQuiz();
    const content = `${project.introduction} ${project.chapters.map(c => c.content).join(' ')} ${project.conclusion}`;
    const prompt = `Based on the following ebook content, create a quiz with 5 multiple-choice questions to test understanding. Each question should have 4 options.
    Content: "${content.substring(0, 4000)}..."`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema: quizSchema },
        });
        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error);
        return getMockEbookQuiz();
    }
};

export const generateVideoScript = async (project: Project): Promise<VideoScript> => {
    if (isSimulationMode || !ai) return getMockVideoScript();
    const content = `${project.introduction}\n${project.chapters.map(c => `${c.title}\n${c.content}`).join('\n')}\n${project.conclusion}`;
    const prompt = `Create a script for a short video based on this ebook content. The total video should be around 1 minute.
    1. Break down the content into 3-5 short scenes.
    2. For each scene, write a short narration (1-2 sentences).
    3. For each scene, create a descriptive prompt (in English) for an AI video generator.
    4. Combine all narrations into a single 'fullNarrationScript'.
    Ebook content: "${content.substring(0, 4000)}"`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema: videoScriptSchema },
        });
        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error);
        return getMockVideoScript();
    }
};

export const generateVideo = async (prompt: string): Promise<any> => {
    if (isSimulationMode || !ai) return getMockVideoOperation();
    try {
        return await ai.models.generateVideos({ model: 'veo-2.0-generate-001', prompt: prompt, config: { numberOfVideos: 1 } });
    } catch (error) {
        handleApiError(error);
        return getMockVideoOperation();
    }
};

export const checkVideoOperationStatus = async (operation: any): Promise<any> => {
    if (isSimulationMode || !ai) return getMockVideoOperation();
    try {
        return await ai.operations.getVideosOperation({ operation: operation });
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};