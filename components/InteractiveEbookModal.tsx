import React, { useState, useEffect } from 'react';
import type { Project, QuizQuestion } from '../types';
import Icon from './Icons';
import { generateEbookQuiz } from '../services/geminiService';

interface InteractiveEbookModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
}

const InteractiveEbookModal: React.FC<InteractiveEbookModalProps> = ({ isOpen, onClose, project }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        if (isOpen) {
            resetAndFetchQuiz();
        }
    }, [isOpen]);
    
    const resetAndFetchQuiz = async () => {
        setIsLoading(true);
        setError(null);
        setQuiz([]);
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setScore(0);
        setIsFinished(false);

        try {
            const quizData = await generateEbookQuiz(project);
            setQuiz(quizData);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Falha ao criar o quiz interativo.";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAnswerSelect = (option: string) => {
        if (selectedAnswer !== null) return;

        setSelectedAnswer(option);
        const correct = option === quiz[currentQuestionIndex].correctAnswer;
        setIsCorrect(correct);
        if (correct) {
            setScore(prev => prev + 1);
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < quiz.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsCorrect(null);
        } else {
            setIsFinished(true);
        }
    };
    
    const getButtonClass = (option: string) => {
        if (selectedAnswer === null) {
            return "bg-gray-800 hover:bg-gray-700";
        }
        const isSelected = selectedAnswer === option;
        const isCorrectAnswer = option === quiz[currentQuestionIndex].correctAnswer;

        if (isCorrectAnswer) return "bg-green-600 ring-2 ring-green-400";
        if (isSelected && !isCorrectAnswer) return "bg-red-600 ring-2 ring-red-400";
        return "bg-gray-800 opacity-60";
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center p-8">
                    <svg className="animate-spin h-10 w-10 text-brand-red mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h4 className="text-lg font-bold text-white">Criando sua experiência...</h4>
                    <p className="text-gray-400 text-sm">A IA está lendo o ebook e preparando as perguntas.</p>
                </div>
            );
        }

        if (error) {
             return (
                <div className="text-center p-8 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <Icon name="X" className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">Erro na Geração</h4>
                    <p className="text-red-300 text-sm">{error}</p>
                </div>
            );
        }
        
        if (isFinished) {
            return (
                <div className="text-center p-8">
                    <Icon name="Check" className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h4 className="text-2xl font-display tracking-wider text-white">Quiz Concluído!</h4>
                    <p className="text-gray-300 text-lg mt-2">Sua pontuação final foi:</p>
                    <p className="text-5xl font-bold text-brand-red my-4">{score} / {quiz.length}</p>
                    <button onClick={resetAndFetchQuiz} className="mt-4 flex items-center justify-center gap-2 mx-auto bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors">
                        Tentar Novamente
                    </button>
                </div>
            );
        }

        if (quiz.length > 0) {
            const currentQuestion = quiz[currentQuestionIndex];
            return (
                <div className="p-4">
                    <div className="text-sm text-gray-400 mb-2 font-semibold">Pergunta {currentQuestionIndex + 1} de {quiz.length}</div>
                    <h4 className="text-lg font-bold text-white mb-6">{currentQuestion.question}</h4>
                    <div className="space-y-3">
                        {currentQuestion.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswerSelect(option)}
                                disabled={selectedAnswer !== null}
                                className={`w-full text-left p-3 rounded-md transition-all duration-300 ${getButtonClass(option)}`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                    {selectedAnswer && (
                         <button onClick={handleNextQuestion} className="mt-6 w-full bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors animate-fade-in">
                            {currentQuestionIndex < quiz.length - 1 ? 'Próxima Pergunta' : 'Finalizar Quiz'}
                        </button>
                    )}
                </div>
            )
        }
        
        return null;
    };

    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-2xl mx-4 p-6 flex flex-col min-h-[400px]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-4 border-b border-gray-800 flex-shrink-0 mb-4">
                    <div className="flex items-center gap-3">
                        <Icon name="Sparkles" className="w-6 h-6 text-brand-red" />
                        <h3 className="text-xl font-display tracking-wider text-white">Ebook Interativo: Quiz</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <Icon name="X" className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-grow flex items-center justify-center">
                    {renderContent()}
                </div>

            </div>
        </div>
    );
};

export default InteractiveEbookModal;