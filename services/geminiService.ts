// services/geminiService.ts
// Fix: Import response types from @google/genai to properly type API call results.
import { GoogleGenAI, Type, GenerateContentResponse, GenerateImagesResponse, Operation } from "@google/genai";
import type { ChatMessage, MeetingMessage, Project, QuizQuestion, VideoScript, YouTubeTrack, Video } from "../types";
import { quizSchema, videoScriptSchema } from "./geminiServiceMocks";

const YOUTUBE_API_KEY = 'AIzaSyAJxJtTjLVFMtAU93alX8LzFIIu96d70io';

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

const parseYoutubeDuration = (isoDuration: string): string => {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = isoDuration.match(regex);

    if (!matches) {
        return "0:00";
    }

    const hours = matches[1] ? parseInt(matches[1], 10) : 0;
    const minutes = matches[2] ? parseInt(matches[2], 10) : 0;
    const seconds = matches[3] ? parseInt(matches[3], 10) : 0;
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const displayMinutes = Math.floor(totalSeconds / 60);
    const displaySeconds = totalSeconds % 60;

    return `${displayMinutes}:${displaySeconds.toString().padStart(2, '0')}`;
};

const categorySearchQueries: Record<string, string> = {
    'Inteligência Artificial': '"Inteligência Artificial" curso completo | "machine learning" para iniciantes | "redes neurais" tutorial | "deep learning" explicado | "chatgpt" para negócios | "midjourney" tutorial',
    'Marketing Digital': '"marketing digital" para afiliados | "tráfego pago" curso | "gestor de tráfego" | "google ads" passo a passo | "facebook ads" para iniciantes | "seo para iniciantes" | "copywriting" curso',
    'Mercado Financeiro': '"day trade" para iniciantes | "análise técnica" curso | "investir em ações" | "como investir em criptomoedas" | "educação financeira" | "swing trade" | "price action"',
    'Vendas e Produtos Digitais': '"como vender infoprodutos" | "lançamento de produto digital" | "hotmart" como vender | "dropshipping" passo a passo | "PLR" o que é | "kiwify" tutorial | "estratégia de vendas online"',
    'Ferramentas e Automação': '"automação n8n" tutorial | "make.com" automação | "zapier" para iniciantes | "automação de marketing" ferramentas | "lovable" automação',
    'Academia e Fitness': '"treino de hipertrofia" | "como ganhar massa muscular" | "dieta para emagrecer" | "treino ABC" | "calistenia" para iniciantes | "jejum intermitente" | "melhores suplementos"',
    'Psicologia e Desenvolvimento': '"48 leis do poder" resumo | "estoicismo" na prática | "sun tzu a arte da guerra" explicado | "inteligência emocional" daniel goleman | "o poder do hábito" | "leis da natureza humana" | "comunicação assertiva"',
};

export const findMoreVideos = async (categoryTitle: string, existingVideos: Video[]): Promise<Video[]> => {
    const existingVideoIds = existingVideos.map(v => v.id);
    
    if (!YOUTUBE_API_KEY) {
        throw new Error("A chave da API do YouTube não foi configurada. O administrador precisa adicionar a YOUTUBE_API_KEY nas variáveis de ambiente.");
    }

    // Step 1: Generate a powerful search query.
    // Start with the specific query from our map.
    const specificQuery = categorySearchQueries[categoryTitle];

    // Step 2: Always include a generic fallback to broaden the search.
    const genericQuery = `"${categoryTitle}" tutorial | "${categoryTitle}" curso`;

    // Combine them for a more robust search. If a specific query exists, it's prioritized.
    const searchQuery = specificQuery ? `${specificQuery} | ${genericQuery}` : genericQuery;
    
    console.log(`Searching YouTube with query: ${searchQuery}`);

    try {
        // Step 2: Search YouTube with the embeddable filter.
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoEmbeddable=true&regionCode=BR&maxResults=50&key=${YOUTUBE_API_KEY}&relevanceLanguage=pt`;
        
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
            if (searchResponse.status === 403) {
                 throw new Error("Busca no YouTube indisponível. A chave da API do YouTube é inválida ou expirou. O administrador precisa fornecer uma nova chave.");
            }
            const errorData = await searchResponse.json();
            console.error("YouTube Search API Error:", errorData);
            throw new Error(`Falha na busca do YouTube. Status: ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        
        const candidateIds = searchData.items
            ? searchData.items
                .map((item: any) => item.id.videoId)
                .filter((id: string) => id && !existingVideoIds.includes(id))
            : [];
            
        if (candidateIds.length === 0) {
             console.log("No new video candidates found from the initial search.");
             return [];
        }

        // Step 3: Verify details with the Videos API.
        const idsToValidate = [...new Set(candidateIds)].slice(0, 50).join(','); // API limit is 50
        
        if (!idsToValidate) {
            console.log("Filtered video IDs resulted in an empty list for validation. Nothing to do.");
            return [];
        }
        
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status&id=${idsToValidate}&key=${YOUTUBE_API_KEY}`;
        
        const detailsResponse = await fetch(detailsUrl);
        if (!detailsResponse.ok) {
             const errorData = await detailsResponse.json();
             console.error("YouTube Videos API Error:", errorData);
             throw new Error(`Falha ao buscar detalhes dos vídeos. Status: ${detailsResponse.status}`);
        }
        
        const detailsData = await detailsResponse.json();
        if (!detailsData.items || detailsData.items.length === 0) {
             console.log("Video details query returned no items.");
             return [];
        }

        // Final filtering and mapping
        const validVideos: Video[] = detailsData.items
            .filter((item: any) => {
                const hasThumbnail = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url;
                return item.status?.embeddable === true && hasThumbnail;
            })
            .map((item: any) => ({
                id: item.id,
                title: item.snippet.title,
                duration: parseYoutubeDuration(item.contentDetails.duration),
                thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
                platform: 'youtube',
            }));
        
        console.log(`Found ${validVideos.length} valid new videos.`);
        return validVideos.slice(0, 7); // Return up to 7 new videos.

    } catch (error) {
        console.error("An unexpected error occurred during the YouTube API processing:", error);
        if (error instanceof Error) throw error;
        throw new Error("Falha ao se comunicar com a API do YouTube.");
    }
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