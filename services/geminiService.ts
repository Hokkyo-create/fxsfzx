// services/geminiService.ts

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

// --- Helper Functions ---

const cleanAndParseJson = (rawText: string): any => {
    let jsonText = rawText.trim();
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7).trim();
    }
    if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3).trim();
    }
    try {
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse JSON from Gemini response:", jsonText);
        throw new Error("A resposta da IA não estava no formato JSON esperado.");
    }
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

async function findSocialVideosWithGemini(platform: 'tiktok' | 'instagram', categoryTitle: string): Promise<Video[]> {
    if (isSimulationMode || !ai) {
        return platform === 'tiktok' ? getMockTikTokVideos() : getMockInstagramVideos();
    }

    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    const prompt = `Usando a busca do Google, encontre 7 vídeos populares e recentes em português do Brasil sobre "${categoryTitle}" no ${platformName}.
Priorize conteúdo educativo como tutoriais, aulas, ou dicas.
Para cada vídeo, forneça a URL completa e um título descritivo.
Responda APENAS com um objeto JSON contendo uma chave "videos", que é um array de objetos com chaves "url" e "title".`;

    try {
        const TIMEOUT_MS = 20000; // 20 seconds
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`A busca por vídeos no ${platformName} demorou demais.`)), TIMEOUT_MS)
        );

        const apiPromise = ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }],
            },
        });

        const response = await Promise.race([apiPromise, timeoutPromise]) as GenerateContentResponse;

        const parsedJson = cleanAndParseJson(response.text);
        const candidates: { url: string; title: string }[] = parsedJson.videos || [];
        if (!candidates) return [];

        // FIX: Add explicit return type `Video | null` to the map callback to ensure type compatibility with the `v is Video` type predicate in the subsequent filter.
        return candidates.map((item): Video | null => {
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
                platform: platform,
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

async function findYouTubeVideosWithGemini(categoryTitle: string, count: number = 7): Promise<Video[]> {
    if (isSimulationMode || !ai) {
        console.log(`Modo de simulação ou IA não inicializada. A busca por "${categoryTitle}" não será executada.`);
        return [];
    }
    console.log(`Iniciando busca com IA para "${categoryTitle}"...`);
    
    const prompt = `Sua tarefa é encontrar exatamente ${count} vídeos do YouTube sobre "${categoryTitle}". Siga estas regras CRÍTICAS:
1.  Use a ferramenta de Busca Google para encontrar vídeos REAIS, PÚBLICOS e em PORTUGUÊS DO BRASIL.
2.  O conteúdo DEVE ser educativo: tutoriais, aulas, dicas de alta qualidade.
3.  **VERIFIQUE CADA VÍDEO**: Certifique-se de que os vídeos existem e não são privados antes de responder. A precisão é fundamental.
4.  Extraia o ID de 11 caracteres de cada vídeo (ex: 'dQw4w9WgXcQ').
5.  Responda APENAS com um objeto JSON contendo uma chave "videos", que é um array de objetos com chaves "videoId" e "title". Não inclua texto adicional.`;
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }],
            },
        });
        
        const parsedJson = cleanAndParseJson(response.text);
        const candidates: { videoId: string; title: string }[] = parsedJson.videos || [];

        if (!candidates || candidates.length === 0) {
            console.warn("IA não retornou candidatos válidos.");
            return [];
        }

        // Remove the slow and flaky oEmbed verification. Trust Gemini's search but validate the ID format.
        const validVideos = candidates
            // FIX: Explicitly setting the return type to `Video | null` tells TypeScript
            // that the returned objects conform to the `Video` interface, resolving the
            // type predicate error in the subsequent `.filter()` call.
            .map((candidate): Video | null => {
                if (candidate.videoId && candidate.title && /^[a-zA-Z0-9_-]{11}$/.test(candidate.videoId)) {
                    return {
                        id: candidate.videoId,
                        title: candidate.title,
                        duration: '??:??', // Duration is not available without another API call, so we keep the placeholder.
                        thumbnailUrl: `https://i.ytimg.com/vi/${candidate.videoId}/mqdefault.jpg`,
                        platform: 'youtube' as const,
                    };
                }
                return null;
            })
            .filter((v): v is Video => v !== null);
        
        console.log(`Busca com IA concluída. Encontrados ${validVideos.length} vídeos válidos de ${candidates.length} candidatos.`);
        return validVideos.slice(0, count);

    } catch(error) {
        console.error("Erro durante a chamada da IA na busca de vídeos:", error);
        handleApiError(error); // This might enable simulation mode globally
        // Re-throw a user-friendly error to be displayed in the UI.
        throw new Error(`A busca com IA para "${categoryTitle}" falhou. Verifique a conexão ou a cota da API.`);
    }
}

export const findVideos = async (categoryTitle: string, platform: 'youtube' | 'tiktok' | 'instagram'): Promise<Video[]> => {
    if (isSimulationMode) return [];
    
    if (platform === 'youtube') {
        // ALWAYS use the Gemini search as the primary, more reliable method.
        return findYouTubeVideosWithGemini(categoryTitle);
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
