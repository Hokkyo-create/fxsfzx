// Fix: Provide the full implementation for the Gemini mock service.
import { Type } from "@google/genai";
import type { QuizQuestion, VideoScript, ShortFormVideoScript, Slide } from "../types";

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
# O Guia Definitivo de Mock Data para Desenvolvedores

[INTRODUÇÃO]
Bem-vindo ao mundo dos dados simulados! Este ebook é o seu guia completo para dominar a arte de criar e usar dados mockados em seus projetos. Desde testes unitários até o desenvolvimento de interfaces complexas, os dados mockados são a chave para um fluxo de trabalho mais rápido e eficiente.

[CAPÍTULO 1: Fundamentos Essenciais][ÍCONE: Brain]
Exploramos a definição de 'mock data'. Discutimos por que eles são cruciais e a diferença fundamental entre dados mockados, stubs e fakes.

[CAPÍTULO 2: Geração de Dados com Faker.js][ÍCONE: Wrench]
Um mergulho profundo na biblioteca Faker.js. Aprenda a gerar nomes, endereços, textos e muito mais para popular suas aplicações durante o desenvolvimento.

[CAPÍTULO 3: Mockando APIs com MSW][ÍCONE: Share]
Descubra como usar o Mock Service Worker (MSW) para interceptar requisições de rede e retornar respostas mockadas, permitindo que o front-end trabalhe de forma independente do back-end.

[CAPÍTULO 4: Estratégias de Teste][ÍCONE: Check]
Veja como dados mockados são vitais para testes unitários, de integração e end-to-end, garantindo que seu código seja robusto e confiável.

[CAPÍTULO 5: Dados para Componentes de UI][ÍCONE: Film]
Aprenda a criar cenários de dados para seus componentes de UI, cobrindo todos os casos de uso, desde estados de carregamento e erro até a exibição de listas longas.

[CAPÍTULO 6: Mockaroo e Outras Ferramentas Visuais][ÍCONE: Chart]
Analisamos ferramentas baseadas em UI como o Mockaroo, que permitem gerar grandes volumes de dados em formatos como CSV, JSON e SQL sem escrever uma linha de código.

[CAPÍTULO 7: O Lado Comercial][ÍCONE: Dollar]
Entenda como o uso de dados mockados pode economizar tempo e dinheiro para sua equipe e sua empresa, resultando em um ROI positivo.

[CAPÍTULO 8: Desafios e Armadilhas][ÍCONE: Fire]
Discutimos os problemas comuns, como dados que não representam a realidade e a manutenção de mocks complexos, e como evitá-los.

[CAPÍTULO 9: Integração Contínua (CI/CD)][ÍCONE: Gear]
Veja como integrar a geração de dados mockados em seu pipeline de CI/CD para automatizar testes e garantir a qualidade contínua do software.

[CAPÍTULO 10: O Futuro dos Dados Sintéticos][ÍCONE: Sparkles]
Exploramos as tendências emergentes, incluindo a geração de dados sintéticos com IA para criar conjuntos de dados ainda mais realistas e complexos para treinamento de modelos de machine learning.

[CONCLUSÃO]
Parabéns! Você agora tem o conhecimento necessário para implementar estratégias de mock data eficazes em qualquer projeto. Use esse poder para construir, testar e inovar mais rápido do que nunca.
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

export const presentationSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            content: { type: Type.ARRAY, items: { type: Type.STRING } },
            imagePrompt: { type: Type.STRING, description: "A descriptive prompt in English for an AI image generator to create a background image for this slide." }
        },
        required: ["title", "content", "imagePrompt"]
    }
};

export const getMockPresentation = (): Slide[] => {
    return [
        {
            title: "O que são Mock Data?",
            content: [
                "Definição e importância.",
                "Diferenças de dados de teste.",
                "Essenciais para desenvolvimento moderno."
            ],
            imagePrompt: "A programmer looking at a screen with abstract data visualizations, digital art, blue and purple glow"
        },
        {
            title: "Ferramentas Populares",
            content: [
                "Faker.js para dados realistas.",
                "Mockaroo para interfaces visuais.",
                "MSW para interceptar requisições."
            ],
            imagePrompt: "A collection of logos for different software tools, arranged neatly on a grid, clean design, tech aesthetic"
        },
        {
            title: "Conclusão",
            content: [
                "Acelere seu desenvolvimento.",
                "Crie testes mais robustos.",
                "Construa aplicações melhores."
            ],
            imagePrompt: "A rocket launching into the sky, symbolizing speed and progress, vibrant colors, detailed illustration"
        }
    ];
};


export const getMockWebpage = (): string => {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>O Guia Definitivo de Mock Data</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; background-color: #121212; color: #e0e0e0; margin: 0; padding: 2rem; }
        .container { max-width: 800px; margin: auto; background-color: #1e1e1e; padding: 2rem; border-radius: 8px; border: 1px solid #333; }
        h1, h2 { color: #E50914; border-bottom: 2px solid #E50914; padding-bottom: 0.5rem; }
        p { margin-bottom: 1rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>O Guia Definitivo de Mock Data</h1>
        <h2>Introdução</h2>
        <p>Bem-vindo ao mundo dos dados simulados! Este guia irá guiá-lo através dos conceitos fundamentais e das melhores práticas para gerar e utilizar mock data em seus projetos.</p>
        <h2>Capítulo 1: O que são Mock Data?</h2>
        <p>Neste capítulo, exploramos a definição de mock data, por que são essenciais para o desenvolvimento de software moderno, e as diferenças entre mock data, dados de teste e dados reais.</p>
        <h2>Conclusão</h2>
        <p>Agora você está equipado com o conhecimento para acelerar seu desenvolvimento, criar testes mais robustos e construir aplicações melhores com o poder dos mock data.</p>
    </div>
</body>
</html>
    `;
};

export async function* getMockExtendEbookStreamGenerator(): AsyncGenerator<string> {
    const fullText = `
[CAPÍTULO 11: O Guia de Estilo][ÍCONE: Pencil]
Como manter a consistência visual e textual em seus mocks para que eles se pareçam com os dados reais.

[CAPÍTULO 12: Performance e Otimização][ÍCONE: Fire]
Técnicas para gerar grandes volumes de dados mockados sem impactar a performance da sua aplicação durante o desenvolvimento.

[CAPÍTULO 13: Mocking de Datas e Horas][ÍCONE: Chart]
Lidando com o desafio de mockar o tempo, fusos horários e durações de forma consistente em seus testes.

[CAPÍTULO 14: Segurança de Dados Mockados][ÍCONE: Heart]
Por que você nunca deve usar dados de produção para testes e como garantir que seus dados mockados sejam seguros e anônimos.

[CAPÍTULO 15: Mocking para Mobile][ÍCONE: Wrench]
Estratégias específicas para mockar APIs e dados em aplicações iOS e Android, considerando cenários offline e de rede lenta.

[CAPÍTULO 16: Colaboração em Equipe][ÍCONE: UsersGroup]
Como compartilhar e versionar seus mocks para que toda a equipe, de QAs a designers, possa usá-los de forma eficaz.

[CAPÍTULO 17: Mocking de Serviços de Terceiros][ÍCONE: Share]
Aprenda a simular respostas de APIs de terceiros, como gateways de pagamento e serviços de login social.

[CAPÍTULO 18: Geração de Dados com IA][ÍCONE: Brain]
Uma olhada em como usar modelos de linguagem como o Gemini para gerar dados mockados contextualmente ricos e variados.

[CAPÍTULO 19: Mocking de Estados de Aplicação][ÍCONE: Gear]
Como usar ferramentas de gerenciamento de estado como Redux ou Zustand para mockar diferentes estados da sua aplicação para depuração.

[CAPÍTULO 20: Medindo o Sucesso][ÍCONE: Dollar]
Como quantificar o impacto positivo do uso de mock data em métricas como velocidade de desenvolvimento, número de bugs e satisfação do desenvolvedor.
    `;
    const words = fullText.split(' ');
    for (const word of words) {
        yield word + ' ';
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}