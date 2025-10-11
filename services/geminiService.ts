// services/geminiService.ts

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Video, ChatMessage, MeetingMessage } from '../types';

// NOTE: Using the user-provided key directly.
const YOUTUBE_API_KEY = 'AIzaSyAwudima4ZEO18AQtbY4fzgI02_LpziE8A';

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
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction },
            history: history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }))
        });
        const response: GenerateContentResponse = await chat.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error(`Error getting chatbot response from Gemini:`, error);
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
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    } catch (error) {
        console.error(`Error getting meeting response from Gemini:`, error);
        if (error instanceof Error) return `Ocorreu um erro com a IA: ${error.message}`;
        return "Desculpe, a IA encontrou um problema. Tente novamente.";
    }
};


export const generateLiveStyles = async (prompt: string): Promise<string> => {
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
        const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const geminiResponse = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: styleGenSystemInstruction },
        });
        if (!geminiResponse?.text) throw new Error("A IA (Gemini) retornou uma resposta vazia.");
        const generatedCss = geminiResponse.text;
        
        const cssCode = generatedCss.replace(/```css/g, '').replace(/```/g, '').trim();
        if (!cssCode) throw new Error("A IA retornou uma resposta vazia.");
            
        return cssCode;

    } catch (error) {
        console.error(`Error generating live styles with Gemini:`, error);
        if (error instanceof Error) throw error;
        throw new Error("A IA não conseguiu gerar os estilos.");
    }
};

export async function* generateEbookProjectStream(topic: string, chapters: number): AsyncGenerator<string> {
    const ebookSystemInstruction = `Você é um autor de ebooks especialista. Sua tarefa é gerar um ebook completo sobre um tópico. A saída DEVE ser em Markdown e seguir esta estrutura RIGOROSAMENTE:
1.  **Título:** A primeira linha DEVE ser o título, começando com '# '. Exemplo: '# O Guia Completo de Marketing Digital'
2.  **Introdução:** Comece com a tag '[INTRODUÇÃO]' em uma nova linha, seguida pelo conteúdo da introdução.
3.  **Capítulos:** Gere exatamente ${chapters} capítulos. É CRUCIAL que você gere exatamente o número de capítulos solicitado. Cada um DEVE começar com a tag '[CAPÍTULO X: Título do Capítulo]' em sua própria linha.
4.  **Conteúdo do Capítulo:** Para cada capítulo, escreva pelo menos 3-4 parágrafos de conteúdo detalhado.
5.  **Conclusão:** Termine com a tag '[CONCLUSÃO]' em uma nova linha, seguida pelo parágrafo de conclusão.
Responda APENAS com o conteúdo do ebook. Não inclua nenhuma conversa ou explicação adicional.`;

    const fullPrompt = `Gere um ebook completo sobre o seguinte tópico: "${topic}"`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: { systemInstruction: ebookSystemInstruction },
        });

        for await (const chunk of response) {
            yield chunk.text;
        }
    } catch (error) {
        console.error(`Error generating ebook stream with Gemini:`, error);
        if (error instanceof Error) throw error;
        throw new Error("A IA não conseguiu gerar o conteúdo do projeto.");
    }
};

export const generateImagePromptForText = async (title: string, content: string): Promise<string> => {
    const promptGenSystemInstruction = `Você é um diretor de arte especializado em criar prompts para IAs de geração de imagem. Sua tarefa é criar um prompt curto, em inglês, para gerar uma imagem. O prompt deve ser descritivo, evocativo e focado nos conceitos principais do texto.
    **REGRAS:**
    - O prompt deve ser em INGLÊS.
    - O prompt deve ter no máximo 30 palavras.
    - Estilo: 'minimalist vector art, cinematic, dramatic lighting'.
    - Apenas retorne o texto do prompt, sem nenhuma explicação.`;

    const fullPrompt = `Crie um prompt de imagem para um texto com o título "${title}" e cujo conteúdo fala sobre: "${content.substring(0, 300)}..."`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: { systemInstruction: promptGenSystemInstruction },
        });
        return response.text.trim();
    } catch (error) {
        console.error('Error generating cover prompt:', error);
        // Fallback prompt
        return `minimalist vector art of ${title}, cinematic, dramatic lighting`;
    }
};

// Fallback function to generate a local canvas image if the network request fails
const generateLocalCanvasImage = async (prompt: string): Promise<string> => {
    await document.fonts.ready; // Wait for custom fonts to be loaded.

    const canvas = document.createElement('canvas');
    const width = 600;
    const height = 800;
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context.");

    // Create an abstract gradient background
    const color1 = '#E50914'; // Brand red
    const color2 = '#141414'; // Dark
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle noise texture
    for (let i = 0; i < 10000; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const alpha = Math.random() * 0.1;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
    }
    
    // Prepare and draw the main text
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.font = 'bold 50px "Bebas Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = prompt
        .replace(/minimalist vector art|cinematic|dramatic lighting/gi, '')
        .replace(/,/g, ' ')
        .replace(/of|a|an|the/gi, ' ')
        .trim();
    
    const words = text.split(/\s+/);
    const maxWidth = width - 100;
    let line = '';
    const lines = [];

    for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line.length > 0) {
            lines.push(line.trim());
            line = word + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());

    const lineHeight = 60;
    const displayLines = lines.slice(0, 6); // Limit to 6 lines
    const startY = (height / 2) - ((displayLines.length - 1) * lineHeight) / 2;

    displayLines.forEach((l, i) => {
        ctx.fillText(l.toUpperCase(), width / 2, startY + i * lineHeight);
    });
    
    ctx.shadowColor = 'transparent';

    // Add a footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '18px "Inter", sans-serif';
    ctx.fillText('ARC7HIVE AI GENERATED', width / 2, height - 50);

    const pngDataUrl = canvas.toDataURL('image/png');
    const base64data = pngDataUrl.split(',')[1];
    
    if (!base64data) throw new Error("Failed to convert canvas to PNG base64.");
    return base64data;
};

export const generateImage = async (prompt: string): Promise<string> => {
    // Use Pollinations.ai for image generation with specific dimensions.
    const encodedPrompt = encodeURIComponent(prompt);
    const width = 600;
    const height = 800;
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}`;

    try {
        const response = await fetch(pollinationsUrl);
        if (!response.ok) {
            throw new Error(`Pollinations.ai returned an error: ${response.statusText}`);
        }
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
            throw new Error('Response from Pollinations.ai was not a valid image.');
        }
        
        // Load image blob into an ImageBitmap to draw on canvas
        const imageBitmap = await createImageBitmap(blob);
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error("Could not get canvas context to remove watermark.");
        }

        // Draw the original image
        ctx.drawImage(imageBitmap, 0, 0);
        
        // Define the approximate watermark area (bottom-right corner) and cover it
        const watermarkHeight = 25;
        const watermarkWidth = 130;
        const x = width - watermarkWidth;
        const y = height - watermarkHeight;

        // Cover with a dark color from the app's theme to hide the watermark
        ctx.fillStyle = '#0A0A0A'; // bg-darker
        ctx.fillRect(x, y, watermarkWidth, watermarkHeight);

        // Convert the modified canvas back to a base64 string
        const dataUrl = canvas.toDataURL('image/png');
        const base64data = dataUrl.split(',')[1];
        
        if (!base64data) {
            throw new Error("Failed to convert canvas to PNG base64 after removing watermark.");
        }
        
        return base64data;

    } catch (error) {
        console.warn('Error processing image from Pollinations.ai, falling back to local canvas:', error);
        // Fallback to the local, reliable canvas-based image generator
        return await generateLocalCanvasImage(prompt);
    }
};