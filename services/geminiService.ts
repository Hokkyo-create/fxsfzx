// services/geminiService.ts

import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import type { ChatMessage, MeetingMessage, Project, QuizQuestion, VideoScript, YouTubeTrack, Video } from "../types";
import {
    getMockChatbotResponse,
    getMockEbookQuiz,
    getMockEbookStream,
    getMockImageBase64,
    getMockImagePrompt,
    getMockLiveStyles,
    getMockMeetingChatResponse,
    getMockPromptIdeas,
    getMockVideoOperation,
    getMockVideoScript,
    getMockYouTubeMusic,
    getMockFindMoreVideos,
    quizSchema,
    videoScriptSchema
} from "./geminiServiceMocks";

let isSimulationMode = false;

// Function to enable simulation mode globally within this service
export const enableSimulationMode = () => {
    isSimulationMode = true;
    console.warn("Gemini Service: Simulation mode has been enabled due to API quota limits.");
};

// Helper to dispatch a global event for quota errors and check for simulation mode
const handleApiCall = async <T>(apiCall: () => Promise<T>, mockData: () => T | Promise<T>): Promise<T> => {
    if (isSimulationMode) {
        // In simulation mode, add a small delay to mimic network latency
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
        return await Promise.resolve(mockData());
    }
    try {
        return await apiCall();
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        if (error.message && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('billing'))) {
            window.dispatchEvent(new CustomEvent('quotaExceeded'));
            enableSimulationMode();
            return await Promise.resolve(mockData());
        }
        window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'error', message: `Erro da API Gemini: ${error.message}` }}));
        throw error; // Re-throw the error to be handled by the caller
    }
};

// Initialize Gemini AI Client
let ai: GoogleGenAI;
try {
    if (!process.env.API_KEY) {
        console.warn("API_KEY environment variable not set. Forcing simulation mode.");
        enableSimulationMode();
    } else {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
} catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    enableSimulationMode();
}

// Helper function to extract and parse JSON from a markdown code block
const cleanAndParseJson = (rawText: string): any => {
    const match = rawText.match(/```json\n([\s\S]*?)\n```/);
    if (!match || !match[1]) {
        // Fallback for cases where the model doesn't use a code block but returns raw JSON
        try {
            return JSON.parse(rawText.trim());
        } catch {
            throw new Error("A IA retornou uma resposta em formato inválido e não pôde ser analisada.");
        }
    }
    try {
        return JSON.parse(match[1]);
    } catch (e) {
        console.error("Failed to parse JSON from code block:", e);
        throw new Error("A IA retornou um JSON malformatado dentro do bloco de código.");
    }
};

export const findMoreVideos = async (categoryTitle: string, existingVideos: Video[]): Promise<Video[]> => {
    return handleApiCall(async () => {
        const existingIds = existingVideos.map(v => v.id).join(', ') || 'Nenhum';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Encontre 7 vídeos do YouTube sobre "${categoryTitle}" em português do Brasil. Os vídeos devem ser reais, públicos e ter thumbnails. Exclua estes IDs já existentes: ${existingIds}. Formate a resposta como um array JSON com objetos contendo: id (string de 11 caracteres), title (string) e duration (string 'MM:SS').`,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const jsonResponse = cleanAndParseJson(response.text);

        if (!Array.isArray(jsonResponse)) {
            console.warn("AI response was not a valid array:", jsonResponse);
            return [];
        }

        const verificationPromises = jsonResponse.map(async (video: any): Promise<Video | null> => {
            if (typeof video.id !== 'string' || video.id.length !== 11) {
                return null; // Invalid ID format
            }
            try {
                // Use YouTube's public oEmbed endpoint. It returns 404 for non-existent/private videos.
                const oEmbedResponse = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${video.id}&format=json`);
                if (!oEmbedResponse.ok) {
                    return null; // Video does not exist or is private
                }
                const oEmbedData = await oEmbedResponse.json();
                
                // Ensure thumbnail is valid and not a placeholder
                if (!oEmbedData.thumbnail_url || oEmbedData.thumbnail_url.includes('vi_webp')) {
                    return null;
                }

                return {
                    id: video.id,
                    title: oEmbedData.title || video.title, // Prefer official title
                    duration: video.duration,
                    thumbnailUrl: oEmbedData.thumbnail_url,
                    platform: 'youtube',
                };
            } catch (e) {
                console.warn(`Error verifying video ID ${video.id}:`, e);
                return null;
            }
        });

        const verifiedVideos = (await Promise.all(verificationPromises)).filter((v): v is Video => v !== null);
        
        return verifiedVideos;
    }, getMockFindMoreVideos);
};

// --- Chat Functions ---

export const getMeetingChatResponse = (aiPrompt: string, meetingMessages: MeetingMessage[]): Promise<string> => {
    return handleApiCall(async () => {
        const history = meetingMessages
            .map(msg => `${msg.user}: ${msg.text}`)
            .join('\n');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Histórico da conversa:\n${history}\n\nO usuário @arc7 te perguntou: "${aiPrompt}". Responda de forma concisa e útil.`,
            config: {
                systemInstruction: "Você é um assistente IA chamado ARC7, focado em ajudar um time em uma reunião. Seja direto e informativo.",
            },
        });
        return response.text;
    }, getMockMeetingChatResponse);
};

export const getChatbotResponse = (prompt: string, history: ChatMessage[]): Promise<string> => {
    return handleApiCall(async () => {
        const chatHistory = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                role: 'user',
                parts: [{ text: prompt }],
            },
            config: {
                systemInstruction: "Você é o ARC7, um assistente IA da plataforma ARC7HIVE. Seu objetivo é ajudar os usuários a navegar e entender a plataforma. A plataforma possui trilhas de conhecimento sobre IA, Marketing, Finanças e mais. Os usuários podem conversar em uma sala de reunião, criar projetos de ebooks com IA e ouvir uma rádio. Seja amigável e informativo. Responda em markdown.",
            },
            history: chatHistory.slice(0, -1) // Send all but the current message
        });
        return response.text;
    }, () => getMockChatbotResponse(false));
};

// --- Admin & Dev Functions ---
export const generateLiveStyles = (prompt: string): Promise<string> => {
    return handleApiCall(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Baseado no seguinte pedido: "${prompt}", gere apenas o código CSS para estilizar os seguintes componentes da aplicação ARC7HIVE:
            - body (backgrounds, fontes)
            - .dashboard-header (cabeçalho principal)
            - .progress-summary-card (card de progresso)
            - .category-card (cards das trilhas de conhecimento)
            O CSS deve ser moderno, usar variáveis se possível, e seguir a estética da Netflix/ARC7HIVE (cores escuras, vermelho como destaque). Não inclua a tag <style> ou qualquer outra coisa além do CSS.`,
            config: {
                systemInstruction: "Você é um especialista em CSS que gera código limpo e moderno.",
            }
        });
        const cssCode = response.text.replace(/```css\n?|```/g, '').trim();
        return cssCode;
    }, getMockLiveStyles);
};


// --- Music Functions ---
export const searchYouTubeMusic = (query: string): Promise<YouTubeTrack[]> => {
    return handleApiCall(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Encontre 5 músicas no YouTube relacionadas a: "${query}". Para cada música, forneça o ID do vídeo, título, nome do artista e a URL da thumbnail. Responda em formato JSON.`,
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
        const parsedJson = JSON.parse(response.text);
        return parsedJson as YouTubeTrack[];
    }, getMockYouTubeMusic);
};


// --- Ebook/Project Generation ---

export const generateEbookProjectStream = async function* (topic: string, numChapters: number): AsyncGenerator<string> {
    if (isSimulationMode) {
        for (const chunk of getMockEbookStream()) {
            await new Promise(resolve => setTimeout(resolve, 50));
            yield chunk;
        }
        return;
    }
    try {
        const stream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: `Crie um ebook detalhado sobre "${topic}" com ${numChapters} capítulos. Formate a resposta em markdown. Comece com '# ' para o título. Use '[INTRODUÇÃO]' antes da introdução, '[CAPÍTULO X: Título do Capítulo]' para cada capítulo, e '[CONCLUSÃO]' para a conclusão. Escreva conteúdo substancial para cada seção.`,
            config: {
                systemInstruction: "Você é um escritor especialista em criar conteúdo educacional estruturado em formato de ebook.",
            }
        });
        for await (const chunk of stream) {
            yield chunk.text;
        }
    } catch(e: any) {
        console.error("Gemini stream error:", e);
        if (e.message.toLowerCase().includes('quota')) {
            window.dispatchEvent(new CustomEvent('quotaExceeded'));
            // Yield a mock stream on quota failure during generation
            for (const chunk of getMockEbookStream()) {
                await new Promise(resolve => setTimeout(resolve, 50));
                yield chunk;
            }
        } else {
             window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'error', message: `Erro da API Gemini: ${e.message}` }}));
             throw e;
        }
    }
};

export const generateImagePromptForText = (title: string, content: string): Promise<string> => {
     return handleApiCall(async () => {
         const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: `Crie um prompt curto e visual para gerar uma imagem para um texto com o título "${title}" e conteúdo "${content.substring(0, 300)}...". O prompt deve ser em inglês, focado em arte digital, cinematográfico e com cores vibrantes. Ex: 'digital art of a futuristic city at sunset, cinematic lighting, vibrant colors'.`,
             config: {
                 systemInstruction: "Você é um especialista em criar prompts para IAs de geração de imagem.",
             }
         });
         return response.text.trim();
     }, getMockImagePrompt);
};

export const generateImage = (prompt: string): Promise<string> => {
    return handleApiCall(async () => {
         const response = await ai.models.generateImages({
             model: 'imagen-4.0-generate-001',
             prompt: prompt,
             config: {
                 numberOfImages: 1,
                 outputMimeType: 'image/png',
             }
         });
         return response.generatedImages[0].image.imageBytes;
    }, getMockImageBase64);
};

export const generatePromptIdeas = (existingPrompt: string): Promise<string[]> => {
    return handleApiCall(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Baseado no prompt de imagem "${existingPrompt}", gere 3 variações ou melhorias alternativas. As respostas devem ser apenas os prompts, em uma lista.`,
            config: {
                systemInstruction: "Você é um assistente de IA que ajuda a refinar prompts de geração de imagem.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        return JSON.parse(response.text);
    }, getMockPromptIdeas);
}

export const generateEbookQuiz = (project: Project): Promise<QuizQuestion[]> => {
    return handleApiCall(async () => {
        const content = `Título: ${project.name}\nIntrodução: ${project.introduction}\nCapítulos: ${project.chapters.map(c => c.content).join('\n')}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie um quiz com ${Math.min(5, project.chapters.length)} perguntas de múltipla escolha (4 opções) baseado no conteúdo do ebook a seguir. Apenas uma resposta pode ser correta. O quiz deve testar o conhecimento chave do ebook. \n\nEBOOK:\n${content.substring(0, 8000)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema,
            }
        });
        return JSON.parse(response.text);
    }, getMockEbookQuiz);
};

export const generateVideoScript = (project: Project): Promise<VideoScript> => {
     return handleApiCall(async () => {
        const content = `Título: ${project.name}\nIntrodução: ${project.introduction}\nCapítulos: ${project.chapters.map(c => `${c.title}: ${c.content}`).join('\n')}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie um roteiro para um vídeo curto (aproximadamente 1 minuto) baseado no conteúdo do ebook a seguir. Divida o roteiro em 3 a 5 cenas. Para cada cena, forneça um texto de narração conciso e um prompt de imagem (em inglês) para gerar uma cena de vídeo visualmente atraente. No final, forneça o roteiro de narração completo. \n\nEBOOK:\n${content.substring(0, 8000)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: videoScriptSchema,
            }
        });
        return JSON.parse(response.text);
    }, getMockVideoScript);
};

export const generateVideo = (prompt: string) => {
    return handleApiCall(async () => {
        const operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
            }
        });
        return operation;
    }, getMockVideoOperation);
};

export const checkVideoOperationStatus = (operation: any) => {
    return handleApiCall(
        () => ai.operations.getVideosOperation({ operation: operation }),
        () => operation // In mock, assume it's done instantly
    );
};