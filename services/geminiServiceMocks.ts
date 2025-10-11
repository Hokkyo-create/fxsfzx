// services/geminiServiceMocks.ts
import { Type } from "@google/genai";
import type { QuizQuestion, Video, VideoScript, YouTubeTrack } from "../types";

// --- Mock Data ---

const placeholderVideos = [
    'https://videos.pexels.com/video-files/3209828/3209828-hd_1280_720_25fps.mp4',
    'https://videos.pexels.com/video-files/2099392/2099392-hd_1280_720_24fps.mp4',
    'https://videos.pexels.com/video-files/4434246/4434246-hd_1280_720_25fps.mp4',
    'https://videos.pexels.com/video-files/853875/853875-hd_1280_720_30fps.mp4',
];

// --- Mock Functions ---

export const getMockMeetingChatResponse = (): string => {
    return "Modo de simulação: A cota da API foi excedida. Não posso processar esta solicitação no momento.";
};

export const getMockFindMoreVideos = (): Video[] => {
    return [];
};

export const getMockChatbotResponse = (isError: boolean = false): string => {
    if (isError) {
        return "Oops! Tive um problema para me conectar. Como a cota da API foi excedida, estou em modo de simulação.";
    }
    return "Olá! Estou operando em modo de simulação, pois a cota da API foi atingida. Minhas respostas são pré-definidas.";
};

export const getMockLiveStyles = (): string => {
    return "/* Modo de simulação: Geração de estilo desativada */";
};

export const getMockImagePrompt = (): string => {
    return "a simulation of a beautiful futuristic city at sunset, digital art";
};

export const getMockImageBase64 = (): string => {
    // A gray placeholder image
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=";
};

export const getMockEbookStream = (): string[] => {
    const mockContent = `
# Título do Ebook de Simulação
[INTRODUÇÃO]
Este é um ebook gerado em modo de simulação porque a cota da API foi excedida. O conteúdo aqui é apenas um exemplo.
[CAPÍTULO 1: O Que é o Modo de Simulação?]
O modo de simulação permite que o aplicativo continue funcionando com dados de exemplo quando a API principal não está disponível.
[CAPÍTULO 2: Benefícios]
Isso evita que o aplicativo trave e permite que o desenvolvimento e o teste da interface do usuário continuem sem interrupções.
[CONCLUSÃO]
Este é o fim do ebook de simulação.
    `;
    // Split into chunks to simulate streaming
    return mockContent.match(/.{1,50}/g) || [mockContent];
};

export const getMockPromptIdeas = (): string[] => {
    return [
        "Simulated prompt idea one",
        "Simulated prompt idea two",
        "Simulated prompt idea three",
    ];
};

export const getMockYouTubeMusic = (): YouTubeTrack[] => {
    return [
        { id: 'dQw4w9WgXcQ', title: 'Sample Music (Simulation)', artist: 'Mock Artist', thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }
    ];
};

export const getMockEbookQuiz = (): QuizQuestion[] => {
    return [
        {
            question: "Por que este quiz está sendo exibido?",
            options: ["Porque eu cliquei no botão", "Porque a cota da API foi excedida", "Para testar meu conhecimento", "É um recurso novo"],
            correctAnswer: "Porque a cota da API foi excedida"
        },
        {
            question: "O que acontece no modo de simulação?",
            options: ["O aplicativo para de funcionar", "Tudo funciona normalmente", "A IA é mais lenta", "O aplicativo usa dados de exemplo"],
            correctAnswer: "O aplicativo usa dados de exemplo"
        }
    ];
};

export const getMockVideoScript = (): VideoScript => {
    return {
        scenes: [
            { narration: "Este é um vídeo de simulação.", prompt: "a computer screen with code" },
            { narration: "Ele foi gerado porque a cota da API foi excedida.", prompt: "a warning sign with an exclamation mark" },
            { narration: "Ele usa vídeos de exemplo para continuar funcionando.", prompt: "a library of video tapes" }
        ],
        fullNarrationScript: "Este é um vídeo de simulação. Ele foi gerado porque a cota da API foi excedida. Ele usa vídeos de exemplo para continuar funcionando."
    };
};

export const getMockVideoOperation = () => {
    const randomPlaceholder = placeholderVideos[Math.floor(Math.random() * placeholderVideos.length)];
    return Promise.resolve({
        done: true,
        response: {
            generatedVideos: [{
                video: { uri: randomPlaceholder }
            }]
        }
    });
};


// --- Schemas for JSON parsing (used by real calls, but good to keep mocks consistent) ---
export const quizSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
        },
        required: ["question", "options", "correctAnswer"],
    },
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
                    prompt: { type: Type.STRING },
                },
                required: ["narration", "prompt"],
            },
        },
        fullNarrationScript: { type: Type.STRING },
    },
    required: ["scenes", "fullNarrationScript"],
};