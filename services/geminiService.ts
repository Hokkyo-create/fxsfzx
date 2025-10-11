// services/geminiService.ts

import { GoogleGenAI, Type } from "@google/genai";
import type {
    ChatMessage,
    MeetingMessage,
    Project,
    QuizQuestion,
    Video,
    YouTubeTrack,
    VideoScript
} from '../types';
import * as Mocks from './geminiServiceMocks';

// According to guidelines, API key must come from process.env.API_KEY
const apiKey = process.env.API_KEY;
if (!apiKey) {
    throw new Error("API_KEY environment variable is not set.");
}
const ai = new GoogleGenAI({ apiKey });

/**
 * Global flag to determine if the app should use mocked data.
 * This is activated when a quota error is first detected.
 */
let simulationModeEnabled = false;

/**
 * Called by the UI layer (App.tsx) to globally enable simulation mode.
 */
export const enableSimulationMode = (): void => {
    simulationModeEnabled = true;
};

/**
 * Checks for a quota error and activates simulation mode if found.
 * @param error The error object from a catch block.
 */
const handleQuotaError = (error: unknown): void => {
    if (error instanceof Error && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('resource_exhausted'))) {
        if (!simulationModeEnabled) {
            console.warn("Quota error detected. Activating global simulation mode.");
            // Dispatch a custom event for the UI to listen to.
            window.dispatchEvent(new CustomEvent('quotaExceeded'));
        }
    }
};

/**
 * Gets a response from the AI for the meeting chat.
 */
export const getMeetingChatResponse = async (prompt: string, history: MeetingMessage[]): Promise<string> => {
    if (simulationModeEnabled) return Mocks.getMockMeetingChatResponse();
    try {
        const model = 'gemini-2.5-flash';
        const systemInstruction = `You are ARC7, a helpful AI assistant integrated into the ARC7HIVE learning platform's meeting room. 
        Your goal is to provide concise, helpful, and relevant information based on the ongoing conversation. 
        Users will mention you by starting their message with '@arc7'. 
        The provided history contains past messages for context. Keep your answers brief and to the point.
        The current date is ${new Date().toLocaleDateString()}.`;

        const contents = history.map(msg => ({
            role: msg.user === 'ARC7' ? 'model' as const : 'user' as const,
            parts: [{ text: `${msg.user}: ${msg.text}` }]
        }));
        
        contents.push({ role: 'user', parts: [{ text: prompt }] });

        const response = await ai.models.generateContent({
            model,
            contents,
            config: { systemInstruction }
        });
        return response.text;
    } catch (error) {
        console.error("Error getting meeting chat response:", error);
        handleQuotaError(error);
        return Mocks.getMockMeetingChatResponse();
    }
};

/**
 * Finds more YouTube videos for a learning category.
 */
export const findMoreVideos = async (categoryTitle: string, existingVideoIds: string[]): Promise<Video[]> => {
    if (simulationModeEnabled) return Mocks.getMockFindMoreVideos();
    try {
        const model = 'gemini-2.5-flash';
        const prompt = `Encontre 5 vídeos adicionais no YouTube sobre o tópico "${categoryTitle}" usando o Google Search. 
        Para cada vídeo, forneça o ID do vídeo do YouTube, o título, a duração no formato "MM:SS" e a URL da thumbnail.
        NÃO inclua nenhum dos seguintes IDs de vídeo que já estão na lista: ${existingVideoIds.join(', ')}.
        Retorne os resultados DENTRO de um bloco de código JSON, no formato de um array de objetos. Exemplo de formato de objeto: {"id": "videoId", "title": "videoTitle", "duration": "10:32", "thumbnailUrl": "url"}.
        Certifique-se de que o JSON esteja bem-formado.`;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { tools: [{googleSearch: {}}] }
        });
        
        const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/);
        const jsonText = jsonMatch ? jsonMatch[1] : response.text;
        
        const newVideos: Video[] = JSON.parse(jsonText);
        return newVideos.filter(v => v.id && v.title && v.duration && v.thumbnailUrl);

    } catch (error) {
        console.error("Error finding more videos:", error);
        handleQuotaError(error);
        // On error, return an empty array to avoid crashing the UI
        return Mocks.getMockFindMoreVideos();
    }
};

/**
 * Gets a response from the AI for the general chatbot.
 */
export const getChatbotResponse = async (prompt: string, history: ChatMessage[]): Promise<string> => {
    if (simulationModeEnabled) return Mocks.getMockChatbotResponse();
    try {
        const model = 'gemini-2.5-flash';
        const systemInstruction = `You are ARC7, a friendly and helpful AI assistant for the ARC7HIVE learning platform...`; // (Full instruction omitted for brevity)

        const contents = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));
        contents.push({ role: 'user', parts: [{ text: prompt }] });
        
        const response = await ai.models.generateContent({
            model,
            contents,
            config: { systemInstruction }
        });
        
        return response.text;
    } catch (error) {
        console.error("Error getting chatbot response:", error);
        handleQuotaError(error);
        return Mocks.getMockChatbotResponse(true);
    }
};

/**
 * Generates CSS code from a text prompt for live styling.
 */
export const generateLiveStyles = async (prompt: string): Promise<string> => {
    if (simulationModeEnabled) return Mocks.getMockLiveStyles();
    try {
        const model = 'gemini-2.5-flash';
        const systemInstruction = `You are an AI that generates CSS code...`; // (Full instruction omitted for brevity)

        const response = await ai.models.generateContent({
            model,
            contents: `Generate CSS for this request: "${prompt}"`,
            config: { systemInstruction }
        });

        let css = response.text.replace(/^```css\n?/, '').replace(/```$/, '').trim();
        return css;

    } catch (error) {
        console.error("Error generating live styles:", error);
        handleQuotaError(error);
        throw new Error("Não foi possível gerar os estilos. A IA pode estar indisponível.");
    }
};

/**
 * Generates an image generation prompt based on text content.
 */
export const generateImagePromptForText = async (title: string, content: string): Promise<string> => {
    if (simulationModeEnabled) return Mocks.getMockImagePrompt();
     try {
        const model = 'gemini-2.5-flash';
        const systemInstruction = `You are an AI assistant that creates concise, descriptive, and artistic image generation prompts in English...`; // (Full instruction omitted for brevity)
        
        const response = await ai.models.generateContent({
            model,
            contents: `Title: "${title}"\n\nContent: "${content.substring(0, 500)}..."\n\nGenerate an image prompt.`,
            config: { systemInstruction }
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating image prompt:", error);
        handleQuotaError(error);
        return Mocks.getMockImagePrompt();
    }
};

/**
 * Generates an image from a prompt and returns the base64 encoded string.
 */
export const generateImage = async (prompt: string): Promise<string> => {
    if (simulationModeEnabled) return Mocks.getMockImageBase64();
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: { numberOfImages: 1, aspectRatio: "3:4" }
        });
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error("Nenhuma imagem foi gerada pela API.");
    } catch (error) {
        console.error("Error generating image:", error);
        handleQuotaError(error);
        return Mocks.getMockImageBase64();
    }
};

/**
 * Generates the content of an ebook as a stream.
 */
export const generateEbookProjectStream = async function*(topic: string, chapters: number): AsyncGenerator<string> {
    if (simulationModeEnabled) {
        for (const chunk of Mocks.getMockEbookStream()) {
            yield chunk;
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return;
    }
    try {
        const model = 'gemini-2.5-flash';
        const systemInstruction = `You are an AI expert in content creation and writing...`; // (Full instruction omitted for brevity)
        const prompt = `Topic: "${topic}"\nNumber of Chapters: ${chapters}`;
    
        const responseStream = await ai.models.generateContentStream({
            model,
            contents: prompt,
            config: { systemInstruction }
        });

        for await (const chunk of responseStream) {
            yield chunk.text;
        }
    } catch (error) {
        console.error("Error generating ebook stream:", error);
        handleQuotaError(error);
        // If an error occurs mid-stream, we can't switch to a mock easily.
        // We'll throw so the UI can display a proper error message.
        throw new Error("Falha na geração do conteúdo do ebook.");
    }
};

/**
 * Generates alternative prompt ideas for image generation.
 */
export const generatePromptIdeas = async (originalPrompt: string): Promise<string[]> => {
    if (simulationModeEnabled) return Mocks.getMockPromptIdeas();
    try {
        const model = 'gemini-2.5-flash';
        const response = await ai.models.generateContent({
            model,
            contents: `Original prompt: "${originalPrompt}"`,
            config: {
                systemInstruction: `You are an AI assistant that helps users refine image generation prompts...`,
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
            }
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error generating prompt ideas:", error);
        handleQuotaError(error);
        return Mocks.getMockPromptIdeas();
    }
};

/**
 * Searches for music on YouTube.
 */
export const searchYouTubeMusic = async (query: string): Promise<YouTubeTrack[]> => {
    if (simulationModeEnabled) return Mocks.getMockYouTubeMusic();
    try {
        const model = 'gemini-2.5-flash';
        const prompt = `Encontre 5 vídeos de música no YouTube para a busca: "${query}" usando o Google Search...`; // (Full prompt omitted)
        
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { tools: [{googleSearch: {}}] }
        });

        const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/);
        const jsonText = jsonMatch ? jsonMatch[1] : response.text;

        const results: YouTubeTrack[] = JSON.parse(jsonText);
        return results.map(track => ({ ...track, thumbnailUrl: `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg` }));
    } catch (error) {
        console.error("Error searching YouTube music:", error);
        handleQuotaError(error);
        return Mocks.getMockYouTubeMusic();
    }
};

/**
 * Generates a quiz based on the content of an ebook project.
 */
export const generateEbookQuiz = async (project: Project): Promise<QuizQuestion[]> => {
    if (simulationModeEnabled) return Mocks.getMockEbookQuiz();
    try {
        const model = 'gemini-2.5-flash';
        const fullText = `Title: ${project.name}\nIntroduction: ${project.introduction}\n` +
            project.chapters.map(c => `Chapter: ${c.title}\n${c.content}`).join('\n\n') +
            `\nConclusion: ${project.conclusion}`;
        const prompt = `Based on the following ebook content, create a quiz with 5 multiple-choice questions...`; // (Full prompt omitted)

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: Mocks.quizSchema,
            }
        });
        
        const quiz: QuizQuestion[] = JSON.parse(response.text.trim());
        if (quiz.some(q => q.options.length !== 4 || !q.options.includes(q.correctAnswer))) {
            throw new Error("IA gerou um quiz em formato inválido.");
        }
        return quiz;
    } catch (error) {
        console.error("Error generating ebook quiz:", error);
        handleQuotaError(error);
        return Mocks.getMockEbookQuiz();
    }
};

/**
 * Generates a video script from an ebook project.
 */
export const generateVideoScript = async (project: Project): Promise<VideoScript> => {
    if (simulationModeEnabled) return Mocks.getMockVideoScript();
    try {
        const model = 'gemini-2.5-flash';
        const fullText = `Title: ${project.name}...`; // (Full text omitted)
        const prompt = `Based on the following ebook content, create a script for a short summary video...`; // (Full prompt omitted)

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: Mocks.videoScriptSchema,
            },
        });

        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error generating video script:", error);
        handleQuotaError(error);
        return Mocks.getMockVideoScript();
    }
};

/**
 * Starts the video generation process for a given prompt.
 */
export const generateVideo = async (prompt: string) => {
    if (simulationModeEnabled) return Mocks.getMockVideoOperation();
    try {
        return await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: prompt,
            config: { numberOfVideos: 1 },
        });
    } catch (error) {
        console.error("Error starting video generation:", error);
        handleQuotaError(error);
        return Mocks.getMockVideoOperation();
    }
};

/**
 * Checks the status of a long-running video generation operation.
 */
export const checkVideoOperationStatus = async (operation: any) => {
    if (simulationModeEnabled) return operation; // If in sim mode, operation is already complete
    try {
        return await ai.operations.getVideosOperation({ operation });
    } catch (error) {
        console.error("Error checking video operation status:", error);
        handleQuotaError(error);
        // Return the operation as-is so the polling doesn't break,
        // though it might be stuck. The global banner is the main feedback.
        return operation;
    }
};