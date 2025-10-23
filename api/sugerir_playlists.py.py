from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from youtubesearchpython import PlaylistsSearch, ChannelsSearch

app = FastAPI()

# Permitir chamadas do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Canais base por categoria
categorias_canais = {
    "Inteligência Artificial": ["Canal AI", "AI News"],
    "Marketing Digital": ["Marketing Total", "Growth Hacker"]
}

@app.get("/")
def raiz():
    return {"message": "Backend funcionando!"}

@app.get("/sugerir_playlists")
def sugerir_playlists(categoria: str = Query(..., description="Categoria para sugerir playlists")):
    if categoria not in categorias_canais:
        return {"error": "Categoria não encontrada"}

    playlists_sugeridas = []
    seen_links = set()  # Evitar duplicatas

    for canal in categorias_canais[categoria]:
        canais = ChannelsSearch(canal, limit=3).result()['result']
        for c in canais:
            nome_canal = c['title']
            playlists = PlaylistsSearch(nome_canal, limit=5).result()['result']
            for p in playlists:
                if p['link'] not in seen_links:
                    playlists_sugeridas.append({
                        'titulo': p['title'],
                        'link': p['link'],
                        'thumbnail': p['thumbnails'][0]['url'],
                        'canal': nome_canal
                    })
                    seen_links.add(p['link'])

    return playlists_sugeridas
