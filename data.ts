import type { User, LearningCategory } from './types';

export const users: User[] = [
    { name: 'Gustavo', password: '9921', avatarUrl: 'https://placehold.co/100x100/E50914/FFFFFF?text=G' },
    { name: 'Yago', password: '8845', avatarUrl: 'https://placehold.co/100x100/1E40AF/FFFFFF?text=Y' },
    { name: 'Victor', password: '4975', avatarUrl: 'https://placehold.co/100x100/16A34A/FFFFFF?text=V' },
];

export const categories: LearningCategory[] = [
    {
        id: 'ia',
        title: 'Inteligência Artificial',
        description: 'Aprenda sobre IA, machine learning e como usar ferramentas de IA no dia a dia',
        icon: 'Fire',
        color: 'red',
        videos: [],
    },
    {
        id: 'marketing-digital',
        title: 'Marketing Digital',
        description: 'Estratégias de marketing digital, redes sociais e vendas online',
        icon: 'Chart',
        color: 'orange',
        videos: [],
    },
    {
        id: 'mercado-financeiro',
        title: 'Mercado Financeiro',
        description: 'Investimentos, ações, criptomoedas e educação financeira',
        icon: 'Dollar',
        color: 'green',
        videos: [],
    },
    {
        id: 'vendas-produtos-digitais',
        title: 'Vendas e Produtos Digitais',
        description: 'Aprenda a vender online, criar ebooks, infoprodutos e aumentar suas vendas',
        icon: 'Cart',
        color: 'blue',
        videos: [],
    },
    {
        id: 'ferramentas-automacao',
        title: 'Ferramentas e Automação',
        description: 'Domine Lovable, n8n, Make, Zapier e outras ferramentas de automação',
        icon: 'Wrench',
        color: 'indigo',
        videos: [],
    },
    {
        id: 'academia-fitness',
        title: 'Academia e Fitness',
        description: 'Treino, nutrição, ganho de massa e emagrecimento para resultados reais',
        icon: 'Dumbbell',
        color: 'yellow',
        videos: [],
    },
    {
        id: 'psicologia-desenvolvimento',
        title: 'Psicologia e Desenvolvimento',
        description: '48 Leis do Poder, estratégias de guerra, mentalidade vencedora e desenvolvimento pessoal',
        icon: 'Heart',
        color: 'rose',
        videos: [],
    }
];