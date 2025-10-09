import { GoogleGenAI, Type } from "@google/genai";
import type { Video } from '../types';

// NOTE: Using the user-provided key directly.
// In a real production app, this key should be in a secure backend environment.
const YOUTUBE_API_KEY = 'AIzaSyB2HueAJl1V7XTG6G8AAcMru_9pXtvU9T4';
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


const searchQueriesSchema = {
    type: Type.ARRAY,
    items: { type: Type.STRING }
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
    
    // Step 1: Use Gemini to generate high-quality search queries
    const prompt = `
    Você é um especialista em curadoria de conteúdo para o YouTube.
    Sua tarefa é gerar 4 termos de busca (queries) únicos e específicos para encontrar vídeos educacionais em Português do Brasil sobre o tópico "${topic}".
    As buscas devem focar em tutoriais, palestras ou cursos.
    Retorne APENAS um array de strings JSON. Exemplo: ["query 1", "query 2", "query 3", "query 4"]
    `;

    let searchQueries: string[] = [];
    try {
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
        console.log(`Gemini generated ${searchQueries.length} search queries.`);
    } catch (error) {
        console.error("Error calling Gemini API to get search queries:", error);
        throw new Error("Falha ao gerar ideias de busca com a IA.");
    }
    
    if (searchQueries.length === 0) {
        return [];
    }

    try {
        // Step 2: For each query, search YouTube and collect all potential video IDs into a pool.
        const searchPromises = searchQueries.map(async (query) => {
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&regionCode=BR&maxResults=10&key=${YOUTUBE_API_KEY}&relevanceLanguage=pt`;
            const searchResponse = await fetch(searchUrl);
            if (!searchResponse.ok) {
                 const errorText = await searchResponse.text();
                 console.error(`YouTube search API error for query "${query}":`, errorText);
                 try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error?.status === 'PERMISSION_DENIED') {
                        // This is the key error to detect.
                        throw new Error("API do YouTube está bloqueada. Ative a 'YouTube Data API v3' no seu projeto Google Cloud para corrigir.");
                    }
                 } catch (e) { /* Fall through to generic error */ }
                 throw new Error(`Falha na busca do YouTube para: "${query}"`);
            }
            const searchData = await searchResponse.json();
            return searchData.items ? searchData.items.map((item: any) => item.id.videoId) : [];
        });

        const videoIdPools = await Promise.all(searchPromises);
        const videoIdPool = videoIdPools.flat();
        
        // Remove duplicates and already existing videos
        const candidateIds = [...new Set(videoIdPool)].filter(id => !existingVideoIds.includes(id));
        console.log(`Found ${candidateIds.length} unique video candidates from search.`);

        if (candidateIds.length === 0) {
            return [];
        }

        // Step 3: Make a single, efficient batch request to get details for all candidates at once.
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

        // Step 4: Filter the results from the batch request for quality.
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
        
        // Return up to 7 valid videos
        return validVideos.slice(0, 7);

    } catch (error) {
        console.error("Error processing YouTube API calls:", error);
        if (error instanceof Error) {
            throw error; // Re-throw the specific error message
        }
        throw new Error("Falha ao buscar vídeos da API do YouTube.");
    }
};