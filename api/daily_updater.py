from youtubesearchpython import PlaylistsSearch, ChannelsSearch
import json
from datetime import datetime

categorias_canais = {
    "Inteligência Artificial": ["Canal AI", "AI News"],
    "Marketing Digital": ["Marketing Total", "Growth Hacker"]
}

def atualizar_playlists():
    todas_playlists = {}

    for categoria, canais in categorias_canais.items():
        playlists_sugeridas = []
        for canal in canais:
            canais_encontrados = ChannelsSearch(canal, limit=3).result()['result']
            for c in canais_encontrados:
                nome_canal = c['title']
                playlists = PlaylistsSearch(nome_canal, limit=5).result()['result']
                for p in playlists:
                    playlists_sugeridas.append({
                        'titulo': p['title'],
                        'link': p['link'],
                        'thumbnail': p['thumbnails'][0]['url'],
                        'canal': nome_canal
                    })
        todas_playlists[categoria] = playlists_sugeridas

    # Salva em JSON local (ou aqui você pode integrar com DB)
    now = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    with open(f"playlists_{now}.json", "w", encoding="utf-8") as f:
        json.dump(todas_playlists, f, ensure_ascii=False, indent=2)

    print("Playlists atualizadas com sucesso!")

if __name__ == "__main__":
    atualizar_playlists()
