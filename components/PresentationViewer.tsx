import React, { useState, useEffect } from 'react';
import type { Slide } from '../types';
import Icon from './Icons';
import { generateImage } from '../services/geminiService';
import { downloadPresentationAsPdf } from '../utils/pdfGenerator';

interface PresentationViewerProps {
    slides: Slide[];
    projectName: string;
}

const PresentationViewer: React.FC<PresentationViewerProps> = ({ slides, projectName }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [images, setImages] = useState<Record<number, string>>({});
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const currentSlide = slides[currentIndex];

    useEffect(() => {
        const fetchImage = async () => {
            if (images[currentIndex] || !currentSlide) return;

            setIsLoadingImage(true);
            try {
                const base64 = await generateImage(currentSlide.imagePrompt);
                setImages(prev => ({ ...prev, [currentIndex]: `data:image/png;base64,${base64}` }));
            } catch (error) {
                console.error("Failed to generate slide image:", error);
                setImages(prev => ({ ...prev, [currentIndex]: 'error' }));
            } finally {
                setIsLoadingImage(false);
            }
        };

        fetchImage();
    }, [currentIndex, images, currentSlide]);

    const goToNext = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const goToPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'info', message: 'Preparando imagens para o PDF...' }}));
        try {
            const allImages: Record<number, string> = { ...images };
            const promises: Promise<void>[] = [];

            for (let i = 0; i < slides.length; i++) {
                if (!allImages[i] || allImages[i] === 'error') {
                    const promise = generateImage(slides[i].imagePrompt)
                        .then(base64 => {
                            allImages[i] = `data:image/png;base64,${base64}`;
                        })
                        .catch(err => {
                            console.error(`Failed to fetch image for slide ${i}:`, err);
                            allImages[i] = ''; 
                        });
                    promises.push(promise);
                }
            }

            await Promise.all(promises);
            
            await downloadPresentationAsPdf(slides, allImages, projectName);

        } catch (error) {
            console.error("PDF download failed", error);
            const message = error instanceof Error ? error.message : 'Falha ao preparar o PDF para download.';
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'error', message }}));
        } finally {
            setIsDownloading(false);
        }
    };


    const currentImageUrl = images[currentIndex];

    return (
        <div className="w-full h-full flex flex-col">
            <div className="relative aspect-video bg-black rounded-lg flex-grow overflow-hidden flex items-center justify-center">
                {isLoadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                        <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <p className="text-sm text-gray-300 mt-2">Gerando imagem da cena...</p>
                    </div>
                )}
                {currentImageUrl && currentImageUrl !== 'error' && <img src={currentImageUrl} alt={currentSlide.title} className="w-full h-full object-cover animate-ken-burns" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 text-white max-w-full">
                    <h3 className="text-2xl font-bold" style={{ textShadow: '2px 2px 6px #000' }}>{currentSlide.title}</h3>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                        {currentSlide.content.map((point, i) => (
                            <li key={i} className="text-sm" style={{ textShadow: '1px 1px 4px #000' }}>{point}</li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center justify-between mt-4">
                <button onClick={goToPrev} disabled={currentIndex === 0} className="flex items-center gap-2 p-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50">
                    <Icon name="ChevronLeft" className="w-5 h-5"/> Anterior
                </button>
                 <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{currentIndex + 1} / {slides.length}</span>
                    <button onClick={handleDownload} disabled={isDownloading} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50" title="Baixar PDF">
                        {isDownloading ? (
                           <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                           <Icon name="Download" className="w-5 h-5"/>
                        )}
                    </button>
                </div>
                <button onClick={goToNext} disabled={currentIndex === slides.length - 1} className="flex items-center gap-2 p-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50">
                    Próximo <Icon name="ChevronLeft" className="w-5 h-5 transform rotate-180" />
                </button>
            </div>
        </div>
    );
};

export default PresentationViewer;