import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { user, categories } = req.body;

  for (const category of categories) {
    const youtubeRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(category)}&regionCode=BR&key=${YOUTUBE_API_KEY}`
    );
    const data = await youtubeRes.json();

    for (const video of data.items) {
      await supabase.from('videos').insert([{
        title: video.snippet.title,
        description: video.snippet.description,
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        category,
        language: 'pt',
        user_id: user
      }]);
    }
  }

  return res.status(200).json({ message: 'Vídeos atualizados no Supabase!' });
}
