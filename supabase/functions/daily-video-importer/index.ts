// supabase/functions/daily-video-importer/index.ts

// Fix: Add a reference to Deno's edge runtime types to resolve 'Cannot find name Deno' errors.
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// --- Types (mirrored from the frontend for consistency) ---
interface Video {
  id: string; // youtube video ID
  title: string;
  duration: string; // e.g. "10:32"
  thumbnailUrl: string;
  platform: 'youtube';
}

type IconName = 'Fire' | 'Chart' | 'Dollar' | 'Cart' | 'Wrench' | 'Dumbbell' | 'Heart';

interface LearningCategory {
  id: string; // e.g. "ia"
  title: string;
}

// --- Hardcoded Categories (Source of Truth for the Job) ---
const categories: LearningCategory[] = [
    { id: 'ia', title: 'Inteligência Artificial' },
    { id: 'marketing-digital', title: 'Marketing Digital' },
    { id: 'mercado-financeiro', title: 'Mercado Financeiro' },
    { id: 'vendas-produtos-digitais', title: 'Vendas e Produtos Digitais' },
    { id: 'ferramentas-automacao', title: 'Ferramentas e Automação' },
    { id: 'academia-fitness', title: 'Academia e Fitness' },
    { id: 'psicologia-desenvolvimento', title: 'Psicologia e Desenvolvimento' }
];

// --- Resilient Video Search Service (adapted for Deno) ---
// This logic is copied and adapted from services/geminiService.ts

const fetchWithTimeout = (url: string, timeout = 5000): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), timeout);
    fetch(url)
      .then(response => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

const formatSecondsDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const totalSeconds = Math.floor(seconds);
  const displayMinutes = Math.floor(totalSeconds / 60);
  const displaySeconds = totalSeconds % 60;
  return `${displayMinutes}:${displaySeconds.toString().padStart(2, '0')}`;
};

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

interface VideoProvider {
  name: string;
  searchUrl: (query: string) => string;
  parseResponse: (data: any) => Video[];
}

const parseInvidiousVideoResponse = (data: any): Video[] => {
  if (!Array.isArray(data)) return [];
  return data
    .map((item: any): Partial<Video> => {
      if (item.type !== 'video' || !item.videoId || !item.title) return {};
      return {
        id: item.videoId,
        title: item.title,
        duration: formatSecondsDuration(item.lengthSeconds),
        thumbnailUrl: item.videoThumbnails?.find((t: any) => t.quality === 'hqdefault')?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
        platform: 'youtube',
      };
    })
    .filter((video): video is Video => !!video.id && !!video.title && !!video.thumbnailUrl && video.thumbnailUrl.startsWith('http'));
};

const parsePipedVideoResponse = (data: any): Video[] => {
    if (!data.items || !Array.isArray(data.items)) return [];
    return data.items
        .map((item: any): Partial<Video> => {
            if (item.type !== 'stream' || !item.url || !item.title) return {};
            const videoIdMatch = item.url.match(/v=([^&]+)/);
            if (!videoIdMatch || !videoIdMatch[1]) return {};
            const videoId = videoIdMatch[1];
            return {
                id: videoId,
                title: item.title,
                duration: formatSecondsDuration(item.duration),
                thumbnailUrl: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                platform: 'youtube',
            };
        })
        .filter((video): video is Video => !!video.id && !!video.title && !!video.thumbnailUrl && video.thumbnailUrl.startsWith('http'));
};

const invidiousApiInstances = [
    'https://vid.puffyan.us', 'https://invidious.lunar.icu', 'https://invidious.protokoll.fi',
    'https://iv.melmac.space', 'https://invidious.projectsegfau.lt', 'https://invidious.incogniweb.net',
];
const pipedApiInstances = [
    'https://pipedapi.kavin.rocks', 'https://pipedapi.smnz.de', 'https://pipedapi.adminforge.de',
    'https://pipedapi.in.projectsegau.lt', 'https://pipedapi.frontend.la',
];

const videoProviders: VideoProvider[] = [
    ...invidiousApiInstances.map(instance => ({
        name: `Invidious (${new URL(instance).hostname})`,
        searchUrl: (query: string) => `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&region=BR&sort_by=relevance`,
        parseResponse: parseInvidiousVideoResponse
    })),
    ...pipedApiInstances.map(instance => ({
        name: `Piped (${new URL(instance).hostname})`,
        searchUrl: (query: string) => `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`,
        parseResponse: parsePipedVideoResponse
    }))
];

async function searchVideosFromProviders(searchQuery: string): Promise<Video[]> {
  const shuffledProviders = shuffleArray(videoProviders);
  for (const provider of shuffledProviders) {
    try {
      const response = await fetchWithTimeout(provider.searchUrl(searchQuery));
      if (!response.ok) throw new Error(`Response not OK: ${response.status}`);
      const data = await response.json();
      const videos = provider.parseResponse(data);
      if (videos.length > 0) return videos;
    } catch (e) {
      console.error(`Provider ${provider.name} failed:`, e.message);
    }
  }
  return []; // Return empty array instead of throwing
}

// --- Main Edge Function Logic ---

Deno.serve(async (req) => {
  // This is needed for the function to be invoked from a browser and for pre-flight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    console.log("Daily video importer job started.");

    // 1. Get all existing video IDs to avoid duplicates
    const { data: existingVideos, error: fetchError } = await supabaseClient
      .from('learning_videos')
      .select('id');

    if (fetchError) throw fetchError;

    const existingVideoIds = new Set(existingVideos.map(v => v.id));
    console.log(`Found ${existingVideoIds.size} existing videos in the database.`);

    const allVideosToInsert = [];

    // 2. Iterate over each category and find new videos
    for (const category of categories) {
      const currentYear = new Date().getFullYear();
      const searchQuery = `tutoriais ${category.title} ${currentYear}`;
      console.log(`Searching for category "${category.title}" with query: "${searchQuery}"`);

      const foundVideos = await searchVideosFromProviders(searchQuery);

      const newVideos = foundVideos
        .filter(video => !existingVideoIds.has(video.id))
        .slice(0, 5); // Limit to 5 new videos per category per day to avoid spam

      if (newVideos.length > 0) {
        console.log(`Found ${newVideos.length} new videos for "${category.title}".`);
        const videosToInsert = newVideos.map(video => ({
          category_id: category.id,
          id: video.id,
          title: video.title,
          duration: video.duration,
          thumbnail_url: video.thumbnailUrl,
          platform: video.platform,
        }));
        allVideosToInsert.push(...videosToInsert);
      } else {
        console.log(`No new videos found for "${category.title}".`);
      }
    }

    // 3. Batch insert all new videos into the database
    if (allVideosToInsert.length > 0) {
      console.log(`Attempting to insert ${allVideosToInsert.length} new videos in total.`);
      const { error: insertError } = await supabaseClient
        .from('learning_videos')
        .insert(allVideosToInsert);

      if (insertError) throw insertError;

      return new Response(JSON.stringify({
        message: `Successfully added ${allVideosToInsert.length} new videos.`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ message: "Job completed. No new videos to add." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in daily-video-importer function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
