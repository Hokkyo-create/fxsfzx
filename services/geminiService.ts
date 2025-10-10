import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import type { Video, ChatMessage, AiProvider, MeetingMessage } from '../types';

// NOTE: Using the user-provided key directly.
const YOUTUBE_API_KEY = 'AIzaSyAwudima4ZEO18AQtbY4fzgI02_LpziE8A';

/**
 * Retrieves the globally configured API key and provider from local storage.
 */
const getAiConfig = (): { apiKey: string | null; provider: AiProvider } => {
    if (typeof window !== 'undefined') {
        const apiKey = localStorage.getItem('arc7hive_admin_api_key');
        const provider = (localStorage.getItem('arc7hive_ai_provider') as AiProvider) || 'gemini'; // Default to gemini
        return { apiKey, provider };
    }
    return { apiKey: null, provider: 'gemini' };
}

const parseYoutubeDuration = (duration: string): string => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return "00:00";

    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    const fmtMinutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const fmtSeconds = String(totalSeconds % 60).padStart(2, '0');

    return `${fmtMinutes}:${fmtSeconds}`;
};

export const findMoreVideos = async (topic: string, existingVideoIds: string[]): Promise<Video[]> => {
    // Step 1: Generate a single, powerful search query.
    let searchQuery: string;
    
    // The user has specific interests for this category. We combine them with OR operator for a broad search.
    if (topic === 'Psicologia e Desenvolvimento') {
        searchQuery = '"48 leis do poder" | "mentalidade vencedora" | "estoicismo" | "sun tzu a arte da guerra"';
    } else {
        // For other topics, a general but effective query.
        searchQuery = `"${topic}" tutorial | "${topic}" curso`;
    }
    
    console.log(`Searching YouTube with query: ${searchQuery}`);

    try {
        // Step 2: Search YouTube with the embeddable filter directly in the search query.
        // This is more efficient and should return a better list of candidates.
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
        
        // Extract video IDs, filter out any that already exist in the user's playlist.
        const candidateIds = searchData.items
            ? searchData.items
                .map((item: any) => item.id.videoId)
                .filter((id: string) => id && !existingVideoIds.includes(id))
            : [];
            
        if (candidateIds.length === 0) {
             console.log("No new video candidates found from the initial search.");
             return [];
        }

        // Step 3: It's still best practice to verify details with the Videos API.
        // This confirms embeddability and gets us crucial info like duration.
        const idsToValidate = [...new Set(candidateIds)].join(',');
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
                // Double-check embeddable status
                return item.status?.embeddable === true && hasThumbnail;
            })
            .map((item: any) => ({
                id: item.id,
                title: item.snippet.title,
                duration: parseYoutubeDuration(item.contentDetails.duration),
                thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
            }));
        
        console.log(`Found ${validVideos.length} valid new videos.`);
        return validVideos.slice(0, 7); // Return up to 7 new videos.

    } catch (error) {
        console.error("An unexpected error occurred during the YouTube API processing:", error);
        if (error instanceof Error) throw error;
        throw new Error("Falha ao se comunicar com a API do YouTube.");
    }
};

const systemInstruction = `
Você é o "ARC7", um assistente de IA da plataforma de aprendizado "ARC7HIVE | Projeto Evolution".
Sua missão é ajudar os usuários a entenderem a plataforma, suas categorias de conteúdo e tirar dúvidas.
Você deve ser prestativo, inteligente e se comunicar de forma clara e concisa, sempre em Português do Brasil.
Seu conhecimento é estritamente limitado a esta plataforma. NÃO responda a perguntas sobre outros tópicos. Se o usuário perguntar algo fora do escopo, recuse educadamente.
**CONHECIMENTO DA PLATAFORMA:**
1.  **Sobre a Plataforma:** Nome: ARC7HIVE | Projeto Evolution. Objetivo: Uma plataforma de aprendizado para integrar novos membros da equipe em IA, Marketing Digital, Finanças e outras áreas-chave.
2.  **Sobre as Categorias:** Inteligência Artificial, Marketing Digital, Mercado Financeiro, Vendas e Produtos Digitais, Ferramentas e Automação (Lovable, n8n), Academia e Fitness, Psicologia e Desenvolvimento.
3.  **Sobre Alterações Recentes:** A busca de vídeos para "Psicologia e Desenvolvimento" foi aprimorada para buscar proativamente vídeos sobre "48 Leis do Poder", "estratégias de guerra", "mentalidade vencedora" e "estoicismo".
Responda de forma conversacional. Comece a primeira interação com uma saudação e se apresentando.
`;

export const getChatbotResponse = async (message: string, history: ChatMessage[]): Promise<string> => {
    const { apiKey, provider } = getAiConfig();
    if (!apiKey) {
        return "O chatbot está temporariamente indisponível. Erro: A chave de API não foi configurada. Por favor, adicione sua chave no 'Modo Desenvolvedor' para ativar as funcionalidades de IA.";
    }

    try {
        if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json;charset=UTF-8', 'Authorization': `Bearer ${apiKey}`},
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemInstruction },
                        ...history.map(msg => ({ role: msg.role, content: msg.text })),
                        { role: 'user', content: message }
                    ],
                    temperature: 0.5,
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI: ${errorData.error?.message || 'Erro desconhecido'}`);
            }
            const data = await response.json();
            return data.choices[0]?.message?.content || "Não recebi uma resposta.";

        } else { // Gemini
            const ai = new GoogleGenAI({ apiKey });
            const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction },
                history: history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }))
            });
            const response: GenerateContentResponse = await chat.sendMessage({ message });
            return response.text;
        }
    } catch (error) {
        console.error(`Error getting chatbot response from ${provider}:`, error);
        if (error instanceof Error) return `O chatbot está temporariamente indisponível. Erro: ${error.message}`;
        return "Desculpe, estou com um problema para me conectar. Tente novamente em alguns instantes.";
    }
};

const meetingSystemInstruction = `
Você é o "ARC7", um assistente de IA participando de uma reunião da equipe ARC7HIVE.
Sua função é responder a perguntas diretas, fornecer resumos, ou explicar conceitos complexos quando solicitado.
Você é ativado quando um usuário menciona "@ARC7" em uma mensagem.
Seja conciso, objetivo e mantenha o foco nos tópicos de IA, Marketing Digital e Finanças, que são o foco da plataforma.
Responda sempre em Português do Brasil.
`;

export const getMeetingChatResponse = async (prompt: string, history: MeetingMessage[]): Promise<string> => {
    const { apiKey, provider } = getAiConfig();
    if (!apiKey) {
        return "A função de IA na reunião está indisponível. A chave de API não foi configurada.";
    }

    const formattedHistoryForOpenAI = history.map(msg => ({
        role: msg.user === 'ARC7' ? 'assistant' : 'user',
        content: `${msg.user}: ${msg.text}`
    }));

    try {
        if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json;charset=UTF-8', 'Authorization': `Bearer ${apiKey}`},
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: meetingSystemInstruction },
                        ...formattedHistoryForOpenAI.slice(-10),
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI: ${errorData.error?.message || 'Erro desconhecido'}`);
            }
            const data = await response.json();
            return data.choices[0]?.message?.content || "Não recebi uma resposta.";

        } else { // Gemini
            const ai = new GoogleGenAI({ apiKey });

            const conversationContext = history
                .slice(-10) 
                .map(msg => `${msg.user}: ${msg.text}`)
                .join('\n');

            const fullPrompt = `Aqui está o histórico recente da conversa da equipe:\n\n${conversationContext}\n\nA partir deste contexto, responda à seguinte pergunta direcionada a você (ARC7): "${prompt}"`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: { systemInstruction: meetingSystemInstruction },
            });
            return response.text;
        }
    } catch (error) {
        console.error(`Error getting meeting response from ${provider}:`, error);
        if (error instanceof Error) return `Ocorreu um erro com a IA: ${error.message}`;
        return "Desculpe, a IA encontrou um problema. Tente novamente.";
    }
};


export const generateLiveStyles = async (prompt: string, apiKey: string, provider: AiProvider): Promise<string> => {
    const styleGenSystemInstruction = `
    Você é um especialista em CSS que gera código para modificar a aparência de uma aplicação web.
    Sua tarefa é responder a um pedido do usuário e retornar APENAS o código CSS.
    NÃO inclua explicações, comentários, ou a tag <style>. Apenas o CSS bruto.
    **REGRA MAIS IMPORTANTE:** Para garantir que seus estilos sejam aplicados, use seletores de alta especificidade. Sempre prefixe seus seletores com '#root' para aumentar a especificidade (ex: '#root .category-card').
    Classes importantes: .category-card, .progress-summary-card, .dashboard-header, .welcome-fire-icon.
    Para animações, você DEVE definir novos @keyframes e depois aplicá-los.
    Para "fogo realista", use pseudo-elementos, keyframes dessincronizados e filtros como blur() e contrast().
    `;
    
    try {
        let generatedCss = '';
        if (!apiKey || !apiKey.trim()) throw new Error("A chave de API não foi fornecida no painel.");

        if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json;charset=UTF-8', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [ { role: 'system', content: styleGenSystemInstruction }, { role: 'user', content: prompt } ],
                    temperature: 0.2,
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro na API da OpenAI: ${errorData.error?.message || 'Verifique sua chave.'}`);
            }
            const data = await response.json();
            generatedCss = data.choices[0]?.message?.content || '';

        } else { // Gemini
            const aiClient = new GoogleGenAI({ apiKey });
            const geminiResponse = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { systemInstruction: styleGenSystemInstruction },
            });
            if (!geminiResponse?.text) throw new Error("A IA (Gemini) retornou uma resposta vazia.");
            generatedCss = geminiResponse.text;
        }

        const cssCode = generatedCss.replace(/```css/g, '').replace(/```/g, '').trim();
        if (!cssCode) throw new Error("A IA retornou uma resposta vazia.");
            
        return cssCode;

    } catch (error) {
        console.error(`Error generating live styles with ${provider}:`, error);
        if (error instanceof Error) throw error;
        throw new Error("A IA não conseguiu gerar os estilos.");
    }
};