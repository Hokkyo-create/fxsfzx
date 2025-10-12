// services/geminiService.ts
// Fix: Import response types from @google/genai to properly type API call results.
import { GoogleGenAI, Type, GenerateContentResponse, GenerateImagesResponse, Operation } from "@google/genai";
import type { ChatMessage, MeetingMessage, Project, QuizQuestion, VideoScript, YouTubeTrack, Video } from "../types";
import { quizSchema, videoScriptSchema } from "./geminiServiceMocks";

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

// Internal wrapper to handle all Gemini API calls, centralizing error handling.
async function handleApiCall<T>(apiCall: () => Promise<T>, functionName: string): Promise<T> {
    if (!ai) {
        throw new Error("Serviço de IA não inicializado. Verifique a chave de API.");
    }
    try {
        return await apiCall();
    } catch (error: any) {
        console.error(`Gemini API Error in ${functionName}:`, error);
        if (error.message && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('billing'))) {
            throw new Error("A cota da API foi excedida. Esta função está temporariamente indisponível.");
        }
        throw new Error(`Erro na comunicação com a IA: ${error.message || 'Erro desconhecido.'}`);
    }
}

const cleanAndParseJson = (rawText: string): any => {
    const match = rawText.match(/```json\n([\s\S]*?)\n```/);
    if (!match || !match[1]) {
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
    // Fix: Specify GenerateContentResponse type for the API call.
    const response = await handleApiCall<GenerateContentResponse>(async () => {
        const existingIds = existingVideos.map(v => v.id).join(', ') || 'Nenhum';
        return ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Encontre 7 vídeos do YouTube sobre "${categoryTitle}" em português do Brasil. Os vídeos devem ser reais, públicos e ter thumbnails. Exclua estes IDs já existentes: ${existingIds}. Formate a resposta como um array JSON com objetos contendo: id (string de 11 caracteres), title (string) e duration (string 'MM:SS').`,
            config: { tools: [{ googleSearch: {} }] },
        });
    }, 'findMoreVideos');

    const jsonResponse = cleanAndParseJson(response.text);
    if (!Array.isArray(jsonResponse)) return [];

    const verificationPromises = jsonResponse.map(async (video: any): Promise<Video | null> => {
        if (typeof video.id !== 'string' || video.id.length !== 11) return null;
        try {
            const oEmbedResponse = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${video.id}&format=json`);
            if (!oEmbedResponse.ok) return null;
            const oEmbedData = await oEmbedResponse.json();
            if (!oEmbedData.thumbnail_url || oEmbedData.thumbnail_url.includes('vi_webp')) return null;
            return {
                id: video.id,
                title: oEmbedData.title || video.title,
                duration: video.duration,
                thumbnailUrl: oEmbedData.thumbnail_url,
                platform: 'youtube',
            };
        } catch (e) {
            return null;
        }
    });

    return (await Promise.all(verificationPromises)).filter((v): v is Video => v !== null);
};

export const getMeetingChatResponse = async (aiPrompt: string, meetingMessages: MeetingMessage[]): Promise<string> => {
    // Fix: Specify GenerateContentResponse type for the API call.
    const response = await handleApiCall<GenerateContentResponse>(() => {
        const history = meetingMessages.map(msg => `${msg.user}: ${msg.text}`).join('\n');
        return ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Histórico da conversa:\n${history}\n\nO usuário @arc7 te perguntou: "${aiPrompt}". Responda de forma concisa e útil.`,
            config: { systemInstruction: "Você é um assistente IA chamado ARC7, focado em ajudar um time em uma reunião. Seja direto e informativo." },
        });
    }, 'getMeetingChatResponse');
    return response.text;
};

export const getChatbotResponse = async (prompt: string, history: ChatMessage[]): Promise<string> => {
    // Fix: Specify GenerateContentResponse type for the API call.
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
};

export const generateLiveStyles = async (prompt: string): Promise<string> => {
    // Fix: Specify GenerateContentResponse type for the API call.
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
};

export const searchYouTubeMusic = async (query: string): Promise<YouTubeTrack[]> => {
    // Fix: Specify GenerateContentResponse type for the API call.
    const response = await handleApiCall<GenerateContentResponse>(() => ai.models.generateContent({
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
    }), 'searchYouTubeMusic');
    return JSON.parse(response.text) as YouTubeTrack[];
};

export const generateEbookProjectStream = async function* (topic: string, numChapters: number): AsyncGenerator<string> {
    if (!ai) throw new Error('Serviço de IA não inicializado.');
    try {
        const stream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: `Crie um ebook detalhado sobre "${topic}" com ${numChapters} capítulos. Formate a resposta em markdown. Comece com '# ' para o título. Use '[INTRODUÇÃO]' antes da introdução, '[CAPÍTULO X: Título do Capítulo]' para cada capítulo, e '[CONCLUSÃO]' para a conclusão. Escreva conteúdo substancial para cada seção.`,
            config: { systemInstruction: "Você é um escritor especialista em criar conteúdo educacional estruturado em formato de ebook." }
        });
        for await (const chunk of stream) {
            yield chunk.text;
        }
    } catch (error: any) {
        console.error(`Gemini API Error in generateEbookProjectStream:`, error);
        if (error.message && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('billing'))) {
            throw new Error("A cota da API foi excedida. Esta função está temporariamente indisponível.");
        }
        throw new Error(`Erro na comunicação com a IA: ${error.message}`);
    }
};

export const generateImagePromptForText = async (title: string, content: string): Promise<string> => {
    // Fix: Specify GenerateContentResponse type for the API call.
    const response = await handleApiCall<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Crie um prompt curto e visual para gerar uma imagem para um texto com o título "${title}" e conteúdo "${content.substring(0, 300)}...". O prompt deve ser em inglês, focado em arte digital, cinematográfico e com cores vibrantes. Ex: 'digital art of a futuristic city at sunset, cinematic lighting, vibrant colors'.`,
        config: { systemInstruction: "Você é um especialista em criar prompts para IAs de geração de imagem." }
    }), 'generateImagePromptForText');
    return response.text.trim();
};

export const generateImage = async (prompt: string): Promise<string> => {
    // Fix: Specify GenerateImagesResponse type for the API call.
    const response = await handleApiCall<GenerateImagesResponse>(() => ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png' }
    }), 'generateImage');
    return response.generatedImages[0].image.imageBytes;
};

export const generatePromptIdeas = async (existingPrompt: string): Promise<string[]> => {
    // Fix: Specify GenerateContentResponse type for the API call.
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
}

export const generateEbookQuiz = async (project: Project): Promise<QuizQuestion[]> => {
    // Fix: Specify GenerateContentResponse type for the API call.
    const response = await handleApiCall<GenerateContentResponse>(() => {
        const content = `Título: ${project.name}\nIntrodução: ${project.introduction}\nCapítulos: ${project.chapters.map(c => c.content).join('\n')}`;
        return ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie um quiz com ${Math.min(5, project.chapters.length)} perguntas de múltipla escolha (4 opções) baseado no conteúdo do ebook a seguir. Apenas uma resposta pode ser correta. O quiz deve testar o conhecimento chave do ebook. \n\nEBOOK:\n${content.substring(0, 8000)}`,
            config: { responseMimeType: "application/json", responseSchema: quizSchema }
        });
    }, 'generateEbookQuiz');
    return JSON.parse(response.text);
};

export const generateVideoScript = async (project: Project): Promise<VideoScript> => {
    // Fix: Specify GenerateContentResponse type for the API call.
    const response = await handleApiCall<GenerateContentResponse>(() => {
        const content = `Título: ${project.name}\nIntrodução: ${project.introduction}\nCapítulos: ${project.chapters.map(c => `${c.title}: ${c.content}`).join('\n')}`;
        return ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie um roteiro para um vídeo curto (aproximadamente 1 minuto) baseado no conteúdo do ebook a seguir. Divida o roteiro em 3 a 5 cenas. Para cada cena, forneça um texto de narração conciso e um prompt de imagem (em inglês) para gerar uma cena de vídeo visualmente atraente. No final, forneça o roteiro de narração completo. \n\nEBOOK:\n${content.substring(0, 8000)}`,
            config: { responseMimeType: "application/json", responseSchema: videoScriptSchema }
        });
    }, 'generateVideoScript');
    return JSON.parse(response.text);
};

export const generateVideo = async (prompt: string): Promise<Operation> => {
    // Fix: Specify Operation type for the API call and return type.
    return handleApiCall<Operation>(() => ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        config: { numberOfVideos: 1 }
    }), 'generateVideo');
};

export const checkVideoOperationStatus = async (operation: any): Promise<Operation> => {
    // Fix: Specify Operation type for the API call and return type.
    return handleApiCall<Operation>(() => ai.operations.getVideosOperation({ operation: operation }), 'checkVideoOperationStatus');
};
