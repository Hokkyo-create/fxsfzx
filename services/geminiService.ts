import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { ChatMessage, LearningCategory, MeetingMessage, Project, QuizQuestion, Video, VideoScript, YouTubeTrack } from "../types";
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
    // This approach is safer for environments where process.env might not be defined (like Vercel).
    apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set or accessible.");
    }
} catch (error) {
    console.warn("Could not retrieve API_KEY, proceeding without it. Simulation mode may be activated if needed.", error);
}


// Initialize the Google AI client
let ai: GoogleGenAI;
if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
} else {
    console.warn("GoogleGenAI not initialized due to missing API Key. Entering simulation mode.");
    isSimulationMode = true;
    window.dispatchEvent(new CustomEvent('quotaExceeded'));
}

// Function to handle API call errors and trigger simulation mode if quota is exceeded
const handleApiError = (error: any) => {
    console.error("Google GenAI API Error:", error);
    if (error.message && typeof error.message === 'string' && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('api key not valid'))) {
        console.warn("API quota exceeded or key invalid. Enabling simulation mode.");
        enableSimulationMode();
        window.dispatchEvent(new CustomEvent('quotaExceeded'));
    }
    // Re-throw the error so the calling function can handle it
    throw error;
};

// Global function to enable simulation mode, e.g., on API quota error
export const enableSimulationMode = () => {
    isSimulationMode = true;
};

// --- API Functions ---

// 1. Get Meeting Chat Response
export const getMeetingChatResponse = async (prompt: string, history: MeetingMessage[]): Promise<string> => {
    if (isSimulationMode || !ai) return getMockMeetingChatResponse();

    const formattedHistory = history.map(msg => ({
        role: msg.user === 'ARC7' ? 'model' : 'user',
        parts: [{ text: msg.text }],
    }));

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                ...formattedHistory,
                { role: 'user', parts: [{ text: prompt }] }
            ],
            config: {
                systemInstruction: "You are ARC7, an AI assistant in a team meeting. Be concise, helpful, and professional. Your name is ARC7.",
            }
        });
        return response.text;
    } catch (error) {
        handleApiError(error);
        return getMockMeetingChatResponse();
    }
};

// 2. Get Chatbot Response
export const getChatbotResponse = async (prompt: string, history: ChatMessage[]): Promise<string> => {
    if (isSimulationMode || !ai) return getMockChatbotResponse();
    
    const formattedHistory = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [...formattedHistory, {role: 'user', parts: [{text: prompt}]}],
            config: {
                systemInstruction: `You are ARC7, a helpful AI assistant for the ARC7HIVE learning platform. Your goal is to guide users and answer questions about the platform's features and content. The platform has categories like 'Inteligência Artificial', 'Marketing Digital', 'Mercado Financeiro', etc. It also has a 'Projects' area where users can create ebooks with AI. Be friendly and informative. Use markdown for formatting, like **bold** for emphasis.`,
            }
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


const YOUTUBE_API_KEY = "AIzaSyD3S9GO5qWWtfr934yAjt4YJ0qN6itMYqs";

/**
 * Verifies if a YouTube video ID is valid by checking its thumbnail endpoint.
 * This is a more reliable method than third-party services and does not require a full API key.
 * @param videoId The YouTube video ID.
 * @returns True if the video exists, false otherwise.
 */
async function verifyYouTubeVideo(videoId: string): Promise<boolean> {
  try {
    // YouTube returns a 404 Not Found for thumbnails of non-existent or private videos.
    // We can use this as a simple, key-less verification method. A HEAD request is faster.
    const response = await fetch(`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, { method: 'HEAD' });
    return response.ok; // response.ok is true if the status is 200-299
  } catch (error) {
    console.warn(`Verification check failed for video ID ${videoId}`, error);
    return false; // Network error or other issue
  }
}

async function findSocialVideosWithGemini(platform: 'tiktok' | 'instagram', categoryTitle: string): Promise<Video[]> {
    if (isSimulationMode || !ai) {
        return platform === 'tiktok' ? getMockTikTokVideos() : getMockInstagramVideos();
    }
    
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    const idField = platform === 'instagram' ? 'shortcode' : 'ID do vídeo';

    const prompt = `Encontre 7 vídeos brasileiros REAIS, PÚBLICOS e relevantes sobre "${categoryTitle}" na plataforma ${platformName}.
    Foque em conteúdo educativo de alta qualidade, como tutoriais, aulas ou dicas.
    Para cada vídeo, forneça o ${idField} e um título claro e conciso.
    Responda APENAS com um array JSON no seguinte formato: [{ "id": "videoId", "title": "Video Title" }, ...]. NÃO inclua texto adicional, explicações ou markdown.`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        
        const parsedJson = extractJson(response.text);

        if (!parsedJson || parsedJson.length === 0) {
            console.warn(`AI response for ${platform} did not contain valid JSON or was empty.`, response.text);
            return [];
        }

        return parsedJson.map((item: { id: string; title: string }) => {
            const thumbnailUrl = `https://placehold.co/480x360/141414/E50914?text=${platformName}`;
            return {
                id: item.id,
                title: item.title,
                duration: '??:??',
                thumbnailUrl,
            };
        });
    } catch (error) {
        console.error(`Error finding ${platform} videos for "${categoryTitle}" with Gemini:`, error);
        handleApiError(error);
        throw new Error(`A busca com IA para ${platformName} falhou.`);
    }
}

async function findYouTubeVideosWithGeminiFallback(categoryTitle: string, count: number = 7): Promise<Video[]> {
    if (isSimulationMode || !ai) return [];
    
    console.log(`Iniciando busca com fallback da IA para "${categoryTitle}"...`);
    
    // Ask for more candidates than needed to account for invalid/hallucinated ones.
    const numCandidates = 15; 

    const prompt = `Usando a Busca Google, encontre ${numCandidates} vídeos brasileiros REAIS, PÚBLICOS e relevantes sobre "${categoryTitle}" no YouTube.
    Foque em conteúdo educativo de alta qualidade, como tutoriais, aulas ou dicas.
    Para cada vídeo, forneça o ID do vídeo (o código de 11 caracteres na URL, ex: dQw4w9WgXcQ) e um título claro e conciso.
    É EXTREMAMENTE IMPORTANTE que os IDs sejam de vídeos que existem de verdade e não sejam inventados.
    Responda APENAS com um array JSON no seguinte formato: [{ "id": "videoId", "title": "Video Title" }]. NÃO inclua texto adicional, explicações ou markdown.`;
    
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

        // Verify candidates in parallel for speed
        const verificationPromises = candidates.map(async (candidate: any) => {
            const videoId = candidate?.id;
            // Basic validation for video ID format
            if (videoId && typeof videoId === 'string' && videoId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(videoId)) {
                const isValid = await verifyYouTubeVideo(videoId);
                if (isValid) {
                    return { // Return the full video object if valid
                        id: videoId,
                        title: candidate.title || "Título indisponível",
                        duration: '??:??',
                        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                    };
                }
            }
            return null; // Return null for invalid candidates
        });

        const verifiedResults = await Promise.all(verificationPromises);
        
        // Filter out the nulls (invalid videos) and take the desired count
        const validVideos = verifiedResults.filter((v): v is Video => v !== null);

        console.log(`Busca de fallback concluída. Encontrados ${validVideos.length} vídeos válidos de ${candidates.length} candidatos.`);
        
        // Return the first 'count' valid videos
        return validVideos.slice(0, count);

    } catch(error) {
        console.error("Erro durante a chamada da IA na busca de fallback:", error);
        handleApiError(error);
        return []; // Return empty on error
    }
}


export const findVideos = async (categoryTitle: string, platform: 'youtube' | 'tiktok' | 'instagram'): Promise<Video[]> => {
    if (isSimulationMode) {
        return [];
    }
    
    if (platform === 'youtube') {
        if (!YOUTUBE_API_KEY) {
            console.warn("A chave da API do YouTube não está configurada. Usando fallback de IA.");
            return findYouTubeVideosWithGeminiFallback(categoryTitle);
        }
        
        const query = encodeURIComponent(`${categoryTitle} tutoriais e aulas em português`);
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&maxResults=7&type=video&videoEmbeddable=true&key=${YOUTUBE_API_KEY}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                console.error("YouTube API Error:", data);
                // If the API call is blocked, use the fallback
                if (data?.error?.message.includes('are blocked')) {
                    console.warn('Direct YouTube API call failed, falling back to Gemini search.');
                    return findYouTubeVideosWithGeminiFallback(categoryTitle);
                }
                throw new Error(data.error?.message || "Ocorreu um erro ao buscar vídeos no YouTube.");
            }

            if (!data.items || data.items.length === 0) {
                return [];
            }
            
            return data.items.map((item: any) => ({
                id: item.id.videoId,
                title: item.snippet.title,
                duration: '??:??',
                thumbnailUrl: item.snippet.thumbnails.medium.url,
            }));

        } catch (error) {
            console.error(`Error finding YouTube videos for "${categoryTitle}":`, error);
            console.warn('Fallback to Gemini search due to an unexpected error.');
            return findYouTubeVideosWithGeminiFallback(categoryTitle);
        }
    }

    // --- TikTok & Instagram Logic using Gemini ---
    return findSocialVideosWithGemini(platform, categoryTitle);
};

// 4. Generate Live CSS Styles
export const generateLiveStyles = async (prompt: string): Promise<string> => {
    if (isSimulationMode || !ai) return getMockLiveStyles();

    const fullPrompt = `Based on the user prompt "${prompt}", generate only the CSS code to style the web application. The application has a dark theme. Common class names are .category-card, .progress-summary-card, .dashboard-header. Do not include any explanations, just the raw CSS code inside a \`\`\`css block.`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt
        });
        let css = response.text.trim();
        if (css.startsWith('```css')) {
            css = css.substring(5);
        }
        if (css.endsWith('```')) {
            css = css.slice(0, -3);
        }
        return css.trim();
    } catch (error) {
        handleApiError(error);
        return getMockLiveStyles();
    }
};

// 5. Generate Ebook Project Stream
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
    [CAPÍTULO 2: Chapter Title Here]
    ...content...
    ... and so on for all chapters ...
    [CONCLUSÃO]
    ...content...
    
    Ensure the content is detailed and well-written. The response must follow this structure precisely.`;

    try {
        const stream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        for await (const chunk of stream) {
            yield chunk.text;
        }
    } catch (error) {
        handleApiError(error);
        // In case of error, yield a mock stream
        for (const chunk of getMockEbookStream()) {
            yield chunk;
            await new Promise(res => setTimeout(res, 50));
        }
    }
}

// 6. Generate Image Prompt from Text
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

// 7. Generate Image
export const generateImage = async (prompt: string): Promise<string> => {
    if (isSimulationMode || !ai) return getMockImageBase64();
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: '3:4',
            },
        });
        return response.generatedImages[0].image.imageBytes;
    } catch (error) {
        handleApiError(error);
        return getMockImageBase64();
    }
};

// 8. Generate Prompt Ideas
export const generatePromptIdeas = async (currentPrompt: string): Promise<string[]> => {
    if (isSimulationMode || !ai) return getMockPromptIdeas();

    const prompt = `Given the image generation prompt "${currentPrompt}", suggest 3 alternative or improved versions. The suggestions should be creative and enhance the original idea. Return the result as a JSON array of strings. Example: ["idea 1", "idea 2", "idea 3"]`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        });
        
        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error);
        return getMockPromptIdeas();
    }
};

// 9. Search YouTube Music
export const searchYouTubeMusic = async (query: string): Promise<YouTubeTrack[]> => {
    if (isSimulationMode || !ai) return getMockYouTubeMusic();

    const prompt = `Find 5 music videos on YouTube for the search query "${query}". For each video, provide the video ID, title, artist, and thumbnail URL. Respond with a JSON array of objects.`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            artist: { type: Type.STRING },
                            thumbnailUrl: { type: Type.STRING },
                        },
                        required: ["id", "title", "artist", "thumbnailUrl"],
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

// 10. Generate Ebook Quiz
export const generateEbookQuiz = async (project: Project): Promise<QuizQuestion[]> => {
    if (isSimulationMode || !ai) return getMockEbookQuiz();
    const content = `${project.introduction} ${project.chapters.map(c => c.content).join(' ')} ${project.conclusion}`;
    const prompt = `Based on the following ebook content, create a quiz with 5 multiple-choice questions to test understanding. Each question should have 4 options.
    Content: "${content.substring(0, 4000)}..."`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: quizSchema,
            },
        });
        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error);
        return getMockEbookQuiz();
    }
};

// 11. Generate Video Script
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
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: videoScriptSchema,
            },
        });
        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error);
        return getMockVideoScript();
    }
};

// 12. Generate Video
export const generateVideo = async (prompt: string): Promise<any> => {
    if (isSimulationMode || !ai) return getMockVideoOperation();
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: prompt,
            config: { numberOfVideos: 1 }
        });
        return operation;
    } catch (error) {
        handleApiError(error);
        return getMockVideoOperation();
    }
};

// 13. Check Video Operation Status
export const checkVideoOperationStatus = async (operation: any): Promise<any> => {
    if (isSimulationMode || !ai) return getMockVideoOperation(); // The mock resolves instantly
    try {
        const updatedOperation = await ai.operations.getVideosOperation({ operation: operation });
        return updatedOperation;
    } catch (error) {
        handleApiError(error);
        throw error; // Let the caller handle the check failure
    }
};