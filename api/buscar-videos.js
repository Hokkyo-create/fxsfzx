import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Conecta ao Supabase usando as variáveis de ambiente do Vercel
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Quantidade máxima de vídeos por categoria
const MAX_RESULTS = 5;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { user, categories } = req.body;

  if (!user || !categories || !Array.isArray(categories)) {
    return res.status(400).json({ message: 'Parâmetros inválidos: user e categories são obrigatórios' });
  }

  try {
    for (const category of categories) {
      // Busca vídeos do YouTube por categoria
      const youtubeRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(category)}&regionCode=BR&key=${YOUTUBE_API_KEY}`
      );
      const data = await youtubeRes.json();

      if (!data.items || data.items.length === 0) continue; // se não vier vídeo, pula

      for (const video of data.items) {
        // Insere ou atualiza vídeo no Supabase evitando duplicatas
        const { error } = await supabase.from('videos').upsert([{
          title: video.snippet.title,
          description: video.snippet.description,
          url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
          category,
          language: 'pt',
          user_id: user
        }], { onConflict: ['url'] });

        if (error) console.error('Erro ao inserir vídeo:', error.message);
      }
    }

    return res.status(200).json({ message: 'Vídeos atualizados no Supabase!' });
  } catch (err) {
    console.error('Erro na função buscar-videos:', err.message);
    return res.status(500).json({ message: 'Erro ao buscar vídeos', error: err.message });
  }
}
