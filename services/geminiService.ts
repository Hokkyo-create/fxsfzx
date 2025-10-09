import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import type { Video, ChatMessage } from '../types';

// NOTE: Using the user-provided key directly.
// In a real production app, this key should be in a secure backend environment.
const YOUTUBE_API_KEY = 'AIzaSyB2HueAJl1V7XTG6G8AAcMru_9pXtvU9T4';

// A singleton instance for the default AI client, initialized lazily.
let defaultAiClient: GoogleGenAI | null = null;

/**
 * Gets a Gemini AI client instance.
 * If no API key is provided, it uses the default environment key.
 * Throws an error if no key is available.
 * This prevents the app from crashing on module load if the env var is missing.
 */
const getAiClient = (apiKey?: string): GoogleGenAI => {
    // Safely access the environment variable, checking for process and process.env existence.
    const envApiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
    const effectiveKey = apiKey || envApiKey;

    if (!effectiveKey) {
        // This will be caught by the calling functions and shown to the user.
        throw new Error("A chave de API do Gemini não foi configurada no ambiente do servidor.");
    }
    
    // If a specific key is provided, always create a new, temporary client.
    if (apiKey) {
        return new GoogleGenAI({ apiKey });
    }

    // If using the default key, use the singleton pattern.
    if (!defaultAiClient) {
        defaultAiClient = new GoogleGenAI({ apiKey: effectiveKey });
    }

    return defaultAiClient;
};


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
    
    const searchQueriesSchema = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
    };

    // Step 1: Use Gemini to generate high-quality search queries
    let prompt = `
    Você é um especialista em curadoria de conteúdo para o YouTube.
    Sua tarefa é gerar 4 termos de busca (queries) únicos e específicos para encontrar vídeos educacionais em Português do Brasil sobre o tópico "${topic}".
    As buscas devem focar em tutoriais, palestras ou cursos.
    Retorne APENAS um array de strings JSON. Exemplo: ["query 1", "query 2", "query 3", "query 4"]
    `;

    if (topic === 'Psicologia e Desenvolvimento') {
        prompt = `
        Você é um especialista em curadoria de conteúdo para o YouTube com foco em desenvolvimento pessoal e psicologia aplicada.
        Sua tarefa é gerar 4 termos de busca (queries) únicos e específicos para encontrar vídeos educacionais em Português do Brasil sobre os seguintes temas: as 48 Leis do Poder, estratégias de guerra aplicadas à vida, mentalidade vencedora, estoicismo, e desenvolvimento pessoal.
        As buscas devem focar em resumos, análises aprofundadas e conselhos práticos.
        Retorne APENAS um array de strings JSON. Exemplo: ["resumo 48 leis do poder", "como ter uma mentalidade vencedora", "estrategias de guerra sun tzu", "estoicismo para iniciantes"]
        `;
    }


    let searchQueries: string[] = [];
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: searchQueriesSchema,
            },
        });
        const jsonText = response.text.trim();
        searchQueries = JSON.parse(jsonText);
        console.log(`Gemini generated ${searchQueries.length} search queries for topic: ${topic}.`);
    } catch (error) {
        if (error instanceof Error && error.message.includes("configurada no ambiente")) {
             throw new Error("Busca por IA desativada. A chave de API do servidor não foi configurada.");
        }
        console.error("Error calling Gemini API to get search queries:", error);
        throw new Error("Falha ao gerar ideias de busca com a IA.");
    }
    
    if (searchQueries.length === 0) {
        return [];
    }

    try {
        // Step 2: For each query, search YouTube. Use Promise.allSettled to make it resilient.
        const searchPromises = searchQueries.map(async (query) => {
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&regionCode=BR&maxResults=10&key=${YOUTUBE_API_KEY}&relevanceLanguage=pt`;
            const searchResponse = await fetch(searchUrl);
            if (!searchResponse.ok) {
                 const errorText = await searchResponse.text();
                 console.error(`YouTube search API error for query "${query}":`, errorText);
                 try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error?.status === 'PERMISSION_DENIED') {
                        throw new Error("API do YouTube está bloqueada. Ative a 'YouTube Data API v3' no seu projeto Google Cloud para corrigir.");
                    }
                 } catch (e) { /* Fall through to generic error */ }
                 // Throw a specific error for this promise, which allSettled will catch.
                 throw new Error(`Falha na busca do YouTube para: "${query}"`);
            }
            const searchData = await searchResponse.json();
            return searchData.items ? searchData.items.map((item: any) => item.id.videoId) : [];
        });

        const searchResults = await Promise.allSettled(searchPromises);
        
        const videoIdPools: string[][] = [];
        searchResults.forEach(result => {
            if (result.status === 'fulfilled') {
                videoIdPools.push(result.value);
            } else {
                // Log the error but don't stop the entire process
                console.warn("A search query failed, but we are continuing with others:", result.reason);
            }
        });

        const videoIdPool = videoIdPools.flat();
        
        const candidateIds = [...new Set(videoIdPool)].filter(id => !existingVideoIds.includes(id));
        console.log(`Found ${candidateIds.length} unique video candidates from search.`);

        if (candidateIds.length === 0) {
            return [];
        }

        const idsToValidate = candidateIds.slice(0, 50).join(',');
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status&id=${idsToValidate}&key=${YOUTUBE_API_KEY}`;
        
        const detailsResponse = await fetch(detailsUrl);
         if (!detailsResponse.ok) {
            console.error("YouTube details API error:", await detailsResponse.text());
            return [];
        }
        const detailsData = await detailsResponse.json();

        if (!detailsData.items || detailsData.items.length === 0) {
            console.log("YouTube details API returned no items for the candidate IDs.");
            return [];
        }

        const validVideos: Video[] = [];
        for (const item of detailsData.items) {
            const isEmbeddable = item.status?.embeddable === true;
            const thumbnailUrl = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url;

            if (isEmbeddable && thumbnailUrl) {
                validVideos.push({
                    id: item.id,
                    title: item.snippet.title,
                    duration: parseYoutubeDuration(item.contentDetails.duration),
                    thumbnailUrl: thumbnailUrl,
                });
            }
        }
        
        console.log(`Filtered ${detailsData.items.length} candidates down to ${validVideos.length} valid videos.`);
        
        return validVideos.slice(0, 7);

    } catch (error) {
        console.error("An unexpected error occurred during the YouTube API processing:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Falha ao buscar vídeos da API do YouTube.");
    }
};


const systemInstruction = `
Você é o "ARC7", um assistente de IA da plataforma de aprendizado "ARC7HIVE | Projeto Evolution".
Sua missão é ajudar os usuários a entenderem a plataforma, suas categorias de conteúdo e tirar dúvidas.
Você deve ser prestativo, inteligente e se comunicar de forma clara e concisa, sempre em Português do Brasil.

Seu conhecimento é estritamente limitado a esta plataforma. NÃO responda a perguntas sobre outros tópicos. Se o usuário perguntar algo fora do escopo, recuse educadamente. Exemplo: "Como assistente da ARC7HIVE, meu conhecimento se limita a esta plataforma. Posso ajudar com mais alguma dúvida sobre nossas trilhas de conhecimento?"

**CONHECIMENTO DA PLATAFORMA:**

1.  **Sobre a Plataforma:**
    *   **Nome:** ARC7HIVE | Projeto Evolution.
    *   **Objetivo:** Uma plataforma de aprendizado para integrar novos membros da equipe em IA, Marketing Digital, Finanças e outras áreas-chave. É um ambiente de treinamento interno focado em desenvolvimento rápido e prático.

2.  **Sobre as Categorias (Trilhas de Conhecimento):**
    *   **Inteligência Artificial:** Focada em ensinar sobre IA, machine learning e o uso prático de ferramentas de IA para otimizar o trabalho.
    *   **Marketing Digital:** Cobre estratégias de marketing de conteúdo, SEO, tráfego pago, gestão de redes sociais e técnicas de vendas online.
    *   **Mercado Financeiro:** Ensina sobre investimentos em ações e criptomoedas, análise de mercado e educação financeira para construir patrimônio.
    *   **Vendas e Produtos Digitais:** Focada em como vender online, criar infoprodutos (como e-books, cursos e mentorias) e construir funis de venda eficientes.
    *   **Ferramentas e Automação:** Cobre o uso de ferramentas de automação e no-code para otimizar processos.
        *   **Lovable:** Uma ferramenta para gestão de relacionamento com o cliente (CRM) e automação de vendas.
        *   **n8n, Make, Zapier:** Plataformas para conectar diferentes aplicativos e automatizar fluxos de trabalho sem precisar de código.
    *   **Academia e Fitness:** Conteúdo sobre treino com foco em hipertrofia, nutrição para ganho de massa muscular e estratégias para emagrecimento.
    *   **Psicologia e Desenvolvimento:** Focada em desenvolvimento pessoal e inteligência emocional.

3.  **Sobre Alterações Recentes (IMPORTANTE):**
    *   A busca de vídeos para a categoria "Psicologia e Desenvolvimento" foi recentemente APRIMORADA.
    *   Se perguntarem sobre essa categoria ou sobre atualizações, mencione que a IA agora busca proativamente por vídeos sobre temas específicos como "48 Leis do Poder", "estratégias de guerra aplicadas à vida", "mentalidade vencedora" e "estoicismo", para garantir conteúdo mais relevante e profundo.

Responda de forma conversacional. Comece a primeira interação com uma saudação e se apresentando.
`;

export const getChatbotResponse = async (message: string, history: ChatMessage[]): Promise<string> => {
    try {
        const ai = getAiClient();
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: systemInstruction,
            },
            history: history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            }))
        });
        
        const response: GenerateContentResponse = await chat.sendMessage({ message });
        return response.text;

    } catch (error) {
         if (error instanceof Error && error.message.includes("configurada no ambiente")) {
             return "O chatbot está temporariamente indisponível (chave de API do servidor não configurada).";
        }
        console.error("Error getting chatbot response from Gemini:", error);
        return "Desculpe, estou com um problema para me conectar. Tente novamente em alguns instantes.";
    }
};


export const generateLiveStyles = async (prompt: string, apiKey: string): Promise<string> => {
    const styleGenSystemInstruction = `
    Você é um especialista em CSS que gera código para modificar a aparência de uma aplicação web.
    Sua tarefa é responder a um pedido do usuário e retornar APENAS o código CSS.
    NÃO inclua explicações, comentários, ou a tag <style>. Apenas o CSS bruto.
    
    **REGRA MAIS IMPORTANTE:** Para garantir que seus estilos sejam aplicados, use seletores de alta especificidade. Por exemplo, em vez de '.category-card', use '#root .category-card'. Sempre prefixe seus seletores com '#root' para aumentar a especificidade.

    Aqui está um resumo das classes e IDs importantes na aplicação:
    - O elemento raiz da aplicação tem o ID 'root'. Use '#root' como prefixo.
    - O container principal do dashboard é 'main'.
    - O cabeçalho é 'header' com a classe 'dashboard-header'.
    - O card de resumo de progresso tem a classe 'progress-summary-card'.
    - A grade de categorias tem a classe 'categories-grid'.
    - Cada cartão de categoria individual tem a classe 'category-card'.
    - O fundo do body pode ser modificado com 'body { ... }'.
    - A tela de boas-vindas ("tudum") tem um ícone de fogo com a classe '.welcome-fire-icon'. Para alterá-lo, use o seletor '#root .welcome-fire-icon'.

    Para animações, você DEVE definir novos @keyframes e depois aplicá-los.
    
    Para criar um efeito de "fogo realista", você pode usar técnicas como:
    - Múltiplas camadas usando pseudo-elementos (::before, ::after) com cores diferentes (amarelo, laranja, vermelho).
    - Animações de keyframes que movem e transformam as camadas de forma dessincronizada para criar um efeito de cintilação (flicker).
    - Filtros CSS como \`blur()\` e \`contrast()\` combinados para criar um efeito de "fusão" visual entre as camadas.

    Exemplo de pedido: "Faça a animação do fogo na tela de boas-vindas parecer mais realista."
    Exemplo de resposta (apenas uma ideia de técnica):
    @keyframes flicker-realistic {
      0%, 100% { transform: scale(1, 1) rotate(-1deg); opacity: 1; filter: drop-shadow(0 0 8px #ff8800); }
      25% { transform: scale(1.1, 0.9) rotate(2deg); opacity: 0.9; filter: drop-shadow(0 0 12px #ffdd00); }
      50% { transform: scale(0.95, 1.05) rotate(-2deg); opacity: 1; filter: drop-shadow(0 0 10px #ff5500); }
      75% { transform: scale(1.05, 0.95) rotate(1deg); opacity: 0.95; filter: drop-shadow(0 0 15px #ffcc00); }
    }
    #root .welcome-fire-icon {
        animation: flicker-realistic 0.5s infinite ease-in-out;
        color: #ffaa00;
    }
    `;
    
    const userPrompt = prompt;

    try {
        let generatedCss = '';

        // Check if the key looks like an OpenAI key
        if (apiKey && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'))) {
            const requestBody = {
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: styleGenSystemInstruction },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.2,
            };

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });


            if (!response.ok) {
                const errorData = await response.json();
                console.error("OpenAI API Error:", errorData);
                throw new Error(`Erro na API da OpenAI: ${errorData.error?.message || 'Verifique sua chave de API.'}`);
            }

            const data = await response.json();
            generatedCss = data.choices[0]?.message?.content || '';

        } else {
            // Use Gemini API, now with the safe getter
            const aiClient = getAiClient(apiKey);
            
            const geminiResponse = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: userPrompt,
                config: {
                    systemInstruction: styleGenSystemInstruction,
                },
            });

            if (!geminiResponse?.text) {
                console.error("Gemini response was empty or did not contain text.", { response: geminiResponse });
                throw new Error("A IA (Gemini) retornou uma resposta vazia. Tente um prompt mais específico.");
            }
            generatedCss = geminiResponse.text;
        }

        const cssCode = generatedCss
            .replace(/```css/g, '')
            .replace(/```/g, '')
            .trim();

        if (!cssCode) {
            throw new Error("A IA retornou uma resposta vazia. Tente um prompt mais específico sobre as mudanças visuais.");
        }
            
        return cssCode;

    } catch (error) {
        console.error("Error generating live styles:", error);
        if (error instanceof Error) {
            if (error.message.includes("configurada no ambiente")) {
                throw new Error("A chave de API do Gemini não foi configurada no ambiente nem fornecida no painel.");
            }
            throw error;
        }
        throw new Error("A IA não conseguiu gerar os estilos. Verifique sua chave de API e tente um prompt diferente.");
    }
};