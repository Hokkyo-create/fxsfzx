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
    getMockTikTokVideos,
    getMockInstagramVideos,
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
                systemInstruction: "Você é um assistente IA chamado ARC7, focado em ajudar um time em uma reunião. Seja breve e direto."
            }
        });
        return response.text;
    }, getMockMeetingChatResponse);
};

export const getChatbotResponse = (text: string, currentHistory: ChatMessage[]): Promise<string> => {
    return handleApiCall(async () => {
        const contents = currentHistory.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));
        contents.push({ role: 'user', parts: [{ text }] });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Um usuário está perguntando sobre a plataforma ARC7HIVE. A pergunta é: "${text}". Responda de forma amigável e informativa. Use markdown para formatação (negrito, listas).`,
            config: {
                systemInstruction: "Você é o ARC7, o assistente IA da plataforma de aprendizado ARC7HIVE. Seu objetivo é ajudar os usuários a entenderem a plataforma, suas funcionalidades e o conteúdo disponível. A plataforma tem trilhas de conhecimento sobre IA, Marketing, Finanças, etc. Também tem uma área de projetos para criar ebooks com IA."
            }
        });
        return response.text;
    }, getMockChatbotResponse);
};

// --- Admin & Style Functions ---

export const generateLiveStyles = (prompt: string): Promise<string> => {
    return handleApiCall(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Gere apenas código CSS baseado no seguinte prompt. Não inclua a tag <style> ou qualquer explicação, apenas o CSS. O CSS será injetado diretamente em uma página com TailwindCSS, então use seletores que possam sobrescrever os estilos existentes, como IDs ou classes específicas (ex: .category-card, .dashboard-header, etc). Prompt: "${prompt}"`,
            config: {
                systemInstruction: "Você é um expert em CSS e TailwindCSS. Sua tarefa é gerar código CSS puro para customizar a aparência de um aplicativo web."
            }
        });
        // Clean up markdown code block if present
        return response.text.replace(/```css\n|```/g, '').trim();
    }, getMockLiveStyles);
};


// --- Project & Content Generation ---

export async function* generateEbookProjectStream(topic: string, chapters: number): AsyncGenerator<string> {
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
            contents: `Crie o conteúdo completo para um ebook sobre "${topic}". O ebook deve ter ${chapters} capítulos. Formate a saída estritamente da seguinte forma, usando estas tags exatas:
# [Título do Ebook]
[INTRODUÇÃO]
... conteúdo da introdução ...
[CAPÍTULO 1: Título do Capítulo 1]
... conteúdo do capítulo 1 ...
[CAPÍTULO 2: Título do Capítulo 2]
... conteúdo do capítulo 2 ...
... (e assim por diante para todos os capítulos) ...
[CONCLUSÃO]
... conteúdo da conclusão ...

Não adicione nenhuma outra formatação, explicação ou texto fora desta estrutura.`,
            config: {
                systemInstruction: "Você é um escritor especialista e criador de conteúdo digital. Sua tarefa é gerar o texto completo para um ebook baseado em um tópico fornecido."
            }
        });

        for await (const chunk of stream) {
            yield chunk.text;
        }
    } catch (error: any) {
        console.error("Gemini Stream Error:", error);
        // This is a special case for generators where handleApiCall doesn't wrap the whole thing
        if (error.message && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('billing'))) {
            window.dispatchEvent(new CustomEvent('quotaExceeded'));
            enableSimulationMode();
            for (const chunk of getMockEbookStream()) {
                await new Promise(resolve => setTimeout(resolve, 50));
                yield chunk;
            }
        } else {
             throw error;
        }
    }
}

export const generateImagePromptForText = (title: string, content: string): Promise<string> => {
    return handleApiCall(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie um prompt curto e descritivo (em inglês) para um gerador de imagens IA. O prompt deve capturar a essência do seguinte texto, com o título "${title}". O conteúdo é: "${content.substring(0, 500)}...". O prompt deve ser visualmente inspirador e focar em conceitos chave. Estilo: digital art, cinematic, high detail.`,
            config: {
                systemInstruction: "Você é um especialista em engenharia de prompts para modelos de geração de imagem. Sua tarefa é converter um trecho de texto em um prompt de imagem eficaz em inglês."
            }
        });
        return response.text;
    }, getMockImagePrompt);
};

export const generatePromptIdeas = (existingPrompt: string): Promise<string[]> => {
    return handleApiCall(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Dado o prompt de imagem IA: "${existingPrompt}", gere 3 variações ou alternativas criativas (em inglês). Retorne apenas as 3 sugestões, cada uma em uma nova linha, sem numeração ou marcadores.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        ideas: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        const result = JSON.parse(response.text.trim());
        return result.ideas || [];
    }, getMockPromptIdeas);
}

export const generateImage = (prompt: string): Promise<string> => {
    return handleApiCall(async () => {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png'
            }
        });
        return response.generatedImages[0].image.imageBytes;
    }, getMockImageBase64);
};

// --- Interactive & Video Content ---

export const generateEbookQuiz = (project: Project): Promise<QuizQuestion[]> => {
    return handleApiCall(async () => {
        const content = `Título: ${project.name}\nIntrodução: ${project.introduction}\n${project.chapters.map(c => `${c.title}: ${c.content}`).join('\n')}\nConclusão: ${project.conclusion}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Baseado no conteúdo do ebook a seguir, crie um quiz de ${Math.min(5, project.chapters.length)} perguntas de múltipla escolha para testar o conhecimento do leitor. Cada pergunta deve ter 4 opções e apenas uma correta.\n\nEBOOK:\n${content.substring(0, 8000)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema
            }
        });
        return JSON.parse(response.text.trim());
    }, getMockEbookQuiz);
};

export const generateVideoScript = (project: Project): Promise<VideoScript> => {
    return handleApiCall(async () => {
        const content = `Título: ${project.name}\nIntrodução: ${project.introduction}\n${project.chapters.map(c => `${c.title}: ${c.content}`).join('\n')}\nConclusão: ${project.conclusion}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie um roteiro para um vídeo curto (1-2 minutos) baseado no conteúdo do ebook a seguir. Divida o roteiro em ${Math.min(4, project.chapters.length)} cenas. Para cada cena, forneça uma narração curta e um prompt visual (em inglês) para gerar um clipe de vídeo que a represente. Combine todas as narrações em um único script de narração completo.\n\nEBOOK:\n${content.substring(0, 8000)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: videoScriptSchema
            }
        });
        return JSON.parse(response.text.trim());
    }, getMockVideoScript);
};

export const generateVideo = (prompt: string): Promise<any> => {
    return handleApiCall(async () => {
        return await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: prompt,
            config: { numberOfVideos: 1 }
        });
    }, getMockVideoOperation);
};

export const checkVideoOperationStatus = (operation: any): Promise<any> => {
     return handleApiCall(async () => {
        return await ai.operations.getVideosOperation({ operation });
    }, () => Promise.resolve({ done: true, response: operation.response })); // In mock, just return done
};

// --- Search Functions ---

export const searchYouTubeMusic = (query: string): Promise<YouTubeTrack[]> => {
    return handleApiCall(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `O usuário quer buscar por "${query}" no YouTube Music. Gere uma lista de 5 resultados de vídeo de música prováveis, incluindo um ID de vídeo do YouTube (formato de 11 caracteres), título, artista e URL da thumbnail (use URLs do i.ytimg.com).`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            artist: { type: Type.STRING },
                            thumbnailUrl: { type: Type.STRING }
                        },
                        required: ['id', 'title', 'artist', 'thumbnailUrl']
                    }
                }
            }
        });
        return JSON.parse(response.text.trim());
    }, getMockYouTubeMusic);
};


// This function is overhauled to be more reliable and produce higher quality results.
export const findMoreVideos = (categoryTitle: string, existingVideos: Video[]): Promise<Video[]> => {
    return handleApiCall(async () => {
        // Use IDs for exclusion, it's more reliable than titles.
        const existingIds = existingVideos.map(v => v.id);
        const existingIdsString = existingIds.length > 0 ? existingIds.join(', ') : 'Nenhum';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Encontre 7 vídeos REAIS e PÚBLICOS do YouTube sobre "${categoryTitle}".
            Requisitos Estritos:
            1. **Conteúdo**: O vídeo DEVE ser em Português do Brasil e relevante ao tópico.
            2. **Validade**: O vídeo DEVE existir e ser público. NÃO invente vídeos ou IDs.
            3. **ID do Vídeo**: O ID DEVE ser o ID real de 11 caracteres do YouTube (padrão: /^[a-zA-Z0-9_-]{11}$/).
            4. **Thumbnail**: A URL da thumbnail DEVE ser uma imagem VÁLIDA e REAL do vídeo, vinda do domínio i.ytimg.com. Não use placeholders.
            5. **Exclusão**: NÃO inclua os seguintes IDs de vídeo na resposta: ${existingIdsString}.`,
            config: {
                 responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING, description: "O ID real de 11 caracteres do vídeo do YouTube." },
                            title: { type: Type.STRING, description: "O título completo e exato do vídeo." },
                            duration: { type: Type.STRING, description: "A duração do vídeo no formato 'MM:SS'." },
                            thumbnailUrl: { type: Type.STRING, description: "A URL completa e válida da thumbnail, começando com https://i.ytimg.com/." }
                        },
                        required: ['id', 'title', 'duration', 'thumbnailUrl']
                    }
                }
            }
        });
        const results = JSON.parse(response.text.trim());

        // Stricter client-side validation to ensure no "ghost" videos get through.
        const validatedResults = results.filter((v: any) => {
            const isValidId = v.id && typeof v.id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(v.id);
            const hasTitle = v.title && typeof v.title === 'string' && v.title.trim() !== '';
            const hasValidThumbnail = v.thumbnailUrl && typeof v.thumbnailUrl === 'string' && v.thumbnailUrl.startsWith('https://i.ytimg.com/');
            
            // Final check to prevent duplicates that might have slipped through the AI prompt
            const isDuplicate = existingIds.includes(v.id);

            return isValidId && hasTitle && hasValidThumbnail && !isDuplicate;
        });

        // Add the platform property to the validated results.
        return validatedResults.map((v: any) => ({ ...v, platform: 'youtube' as const }));
    }, getMockFindMoreVideos);
};


export const findTikTokVideos = (categoryTitle: string): Promise<Video[]> => {
    return handleApiCall(async () => {
        // Since we can't browse TikTok, we'll generate plausible-looking data
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Gere 3 ideias de vídeos populares do TikTok sobre "${categoryTitle}". Para cada um, forneça um ID de vídeo falso (um número longo), um título cativante, duração (ex: "0:45") e uma URL de thumbnail de placeholder (use placehold.co).`,
             config: {
                 responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            duration: { type: Type.STRING },
                            thumbnailUrl: { type: Type.STRING }
                        },
                        required: ['id', 'title', 'duration', 'thumbnailUrl']
                    }
                }
            }
        });
        const results = JSON.parse(response.text.trim());
        return results.map((v: any) => ({ ...v, platform: 'tiktok' }));
    }, getMockTikTokVideos);
};

export const findInstagramVideos = (categoryTitle: string): Promise<Video[]> => {
    return handleApiCall(async () => {
         // Since we can't browse Instagram, we'll generate plausible-looking data
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Gere 3 ideias de Reels populares do Instagram sobre "${categoryTitle}". Para cada um, forneça um "shortcode" falso (ex: CqXyZ-1aBcD), um título cativante, duração (ex: "0:59") e uma URL de thumbnail de placeholder (use placehold.co).`,
             config: {
                 responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING }, // This will be the shortcode
                            title: { type: Type.STRING },
                            duration: { type: Type.STRING },
                            thumbnailUrl: { type: Type.STRING }
                        },
                        required: ['id', 'title', 'duration', 'thumbnailUrl']
                    }
                }
            }
        });
        const results = JSON.parse(response.text.trim());
        return results.map((v: any) => ({ ...v, platform: 'instagram' }));
    }, getMockInstagramVideos);
};