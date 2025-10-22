// Fix: Provide the full implementation for the Gemini mock service.
import { Type } from "@google/genai";
import type { QuizQuestion, VideoScript, ShortFormVideoScript } from "../types";

export const getMockMeetingChatResponse = (): string => {
    return "Claro! O ponto principal da última reunião foi a decisão de focar no marketing de conteúdo para o próximo trimestre. Alguma outra pergunta?";
};

export const getMockChatbotResponse = (isStream: boolean): string => {
    return "A plataforma ARC7HIVE é um ecossistema de aprendizado e colaboração focado em habilidades digitais. Você pode explorar trilhas de conhecimento, colaborar em projetos de ebook com IA, e até mesmo ouvir nossa rádio colaborativa!";
};

export const getMockLiveStyles = (): string => {
    return `
        body {
            --darker: #080808;
            --dark: #121212;
            --brand-red: #E50914;
        }
        .dashboard-header {
            background-color: rgba(18, 18, 18, 0.85);
        }
        .progress-summary-card {
            border: 1px solid var(--brand-red);
            background: linear-gradient(145deg, #1a1a1a, #111);
        }
        .category-card {
            box-shadow: 0 0 15px rgba(229, 9, 20, 0.3);
        }
    `;
};

export async function* getMockEbookStreamGenerator(): AsyncGenerator<string> {
    const fullText = `
# O Guia Definitivo de Mock Data

[INTRODUÇÃO]
Bem-vindo ao mundo dos dados simulados! Este ebook irá guiá-lo através dos conceitos fundamentais e das melhores práticas para gerar e utilizar mock data em seus projetos.

[CAPÍTULO 1: O que são Mock Data?]
Neste capítulo, exploramos a definição de mock data, por que são essenciais para o desenvolvimento de software moderno, e as diferenças entre mock data, dados de teste e dados reais.

[CAPÍTULO 2: Ferramentas Populares]
Analisamos as ferramentas mais populares do mercado para geração de dados, como Faker.js, Mockaroo, e as funcionalidades integradas de bibliotecas como a MSW (Mock Service Worker).

[CONCLUSÃO]
Agora você está equipado com o conhecimento para acelerar seu desenvolvimento, criar testes mais robustos e construir aplicações melhores com o poder dos mock data.
    `;

    const words = fullText.split(' ');
    for (const word of words) {
        yield word + ' ';
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

export const getMockImagePrompt = (): string => {
    return "digital art of a glowing brain made of code, cinematic lighting, vibrant neon colors, dark background";
};

export const getMockImageBase64 = (): string => {
    // A descriptive SVG placeholder image, base64 encoded.
    return "PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjgwMCIgdmlld0JveD0iMCAwIDYwMCA4MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6IzE0MTQxNDsiPjxzdHlsZT4udGl0bGUgeyBmb250OiBib2xkIDQ4cHggJ0JlYmFzIE5ldWUnLCBzYW5zLXNlcmlmOyBmaWxsOiAjRTUwOTE0OyB0ZXh0LWFuY2hvcjogbWlkZGxlOyB9IC50ZXh0IHsgZm9udDogMjRweCAnU2hhcmUgVGVjaCBNb25vJywgbW9ub3NwYWNlOyBmaWxsOiAjQTBBMEEwOyB0ZXh0LWFuY2hvcjogbWlkZGxlOyB9IC5pY29uIHsgZmlsbDogbm9uZTsgc3Ryb2tlOiAjRTUwOTE0OyBzdHJva2Utd2lkdGg6IDI7IHN0cm9rZS1saW5lY2FwOiByb3VuZDsgc3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgfSA8L3N0eWxlPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMwMCwgMzUwKSI+PHBhdGggY2xhc3M9Imljb24iIGQ9Ik0xMS4yNSAxMS4yNWwuMDQxLS4wMmEuNzUuNzUgMCAwMTEuMDYzLjg1MmwtLjcwOCAyLjgzNmEuNzUuNzUgMCAwMDEuMDYzLjg1M2wuMDQxLS4wMjFNMjEgMTJhOSA5IDAgMTEtMTggMCA5IDkgMCAwMTE4IDB6bS05LTMuNzVoLjAwOHYuMDA4SDEyVjguMjV6IiB0cmFuc2Zvcm09InNjYWxlKDMuNSkgdHJhbnNsYXRlKC0xMiwgLTEyKSIgLz48dGV4dCB5PSI4MCIgY2xhc3M9InRpdGxlIj5JTUFHRU0gTU9DSzwvdGV4dD48dGV4dCB5PSIxMjAiIGNsYXNzPSJ0ZXh0Ij5Db25maWd1cmUgc3VhIEFQSSBLZXkgbm8gVmVyY2VsPC90ZXh0Pjx0ZXh0IHk9IjE0NSIgY2xhc3M9InRleHQiPnBhcmEgaW1hZ2VucyByZWFpcy48L3RleHQ+PC9nPjwvc3ZnPg==";
};

export const getMockPromptIdeas = (): string[] => {
    return [
        "a photorealistic image of a motherboard with glowing circuits forming a human brain",
        "concept art of a data stream flowing into a futuristic neural network, cyberpunk aesthetic",
        "3D render of abstract code structures and data points, floating in space, deep blue and magenta"
    ];
};

export const getMockEbookQuiz = (): QuizQuestion[] => {
    return [
        {
            question: "Qual é o principal objetivo do uso de mock data?",
            options: ["Substituir o banco de dados de produção", "Acelerar o desenvolvimento e permitir testes independentes", "Gerar dados 100% precisos", "Apenas para design de UI"],
            correctAnswer: "Acelerar o desenvolvimento e permitir testes independentes"
        },
        {
            question: "Qual ferramenta é comumente usada para gerar dados falsos em JavaScript?",
            options: ["React", "Lodash", "Faker.js", "Moment.js"],
            correctAnswer: "Faker.js"
        }
    ];
};

export const getMockVideoScript = (): VideoScript => {
    return {
        scenes: [
            {
                narration: "Você sabia que dados simulados podem acelerar seu desenvolvimento em até 50%?",
                prompt: "programador digitando código rápido"
            },
            {
                narration: "Eles permitem que front-end e back-end trabalhem em paralelo, sem bloqueios.",
                prompt: "duas pessoas trabalhando juntas em um projeto"
            },
            {
                narration: "Comece a usar mock data hoje e transforme seu fluxo de trabalho.",
                prompt: "gráfico de produtividade subindo"
            }
        ],
        fullNarrationScript: "Você sabia que dados simulados podem acelerar seu desenvolvimento em até 50%? Eles permitem que front-end e back-end trabalhem em paralelo, sem bloqueios. Comece a usar mock data hoje e transforme seu fluxo de trabalho."
    };
};

export const getMockShortFormVideoScript = (): ShortFormVideoScript => {
    return {
        hook: "Transforme seu eBook em um sucesso viral!",
        scenes: [
            { narration: "Extraia as melhores ideias do seu texto.", imagePrompt: "a glowing lightbulb representing an idea, digital art, zoom in effect" },
            { narration: "Gere narrações e visuais incríveis com IA.", imagePrompt: "a robot arm painting on a digital canvas, cinematic, fast motion" },
            { narration: "E compartilhe com o mundo em segundos.", imagePrompt: "social media icons flying out of a smartphone screen, dynamic motion, colorful" },
        ],
        cta: "Saiba mais no link da bio!",
        musicSuggestion: "upbeat electronic"
    }
};

export const quizSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      correctAnswer: { type: Type.STRING }
    },
    required: ["question", "options", "correctAnswer"]
  }
};

export const videoScriptSchema = {
    type: Type.OBJECT,
    properties: {
        scenes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    narration: { type: Type.STRING },
                    prompt: { type: Type.STRING }
                },
                required: ["narration", "prompt"]
            }
        },
        fullNarrationScript: { type: Type.STRING }
    },
    required: ["scenes", "fullNarrationScript"]
};

export const shortFormVideoScriptSchema = {
    type: Type.OBJECT,
    properties: {
        hook: { type: Type.STRING },
        scenes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    narration: { type: Type.STRING, description: "Narration text for the scene (short and punchy)." },
                    imagePrompt: { type: Type.STRING, description: "A descriptive prompt in English for an AI image generator like Imagen to create a dynamic image for this scene." }
                },
                required: ["narration", "imagePrompt"]
            }
        },
        cta: { type: Type.STRING, description: "A short call to action for the end of the video." },
        musicSuggestion: { type: Type.STRING, description: "Keywords for background music style (e.g., 'upbeat electronic', 'lo-fi hip hop')." }
    },
    required: ["hook", "scenes", "cta", "musicSuggestion"]
};