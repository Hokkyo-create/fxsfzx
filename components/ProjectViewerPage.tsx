import React, { useRef, useState } from 'react';
import type { Project, Chapter } from '../types';
import Icon from './Icons';
import Avatar from './Avatar';

// Declare external libraries for TypeScript
declare const jspdf: any;
declare const html2canvas: any;

interface ProjectViewerPageProps {
    project: Project;
    onBack: () => void;
}

const ProjectViewerPage: React.FC<ProjectViewerPageProps> = ({ project, onBack }) => {
    const printableAreaRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadPdf = async () => {
        if (!printableAreaRef.current) return;
        setIsDownloading(true);

        try {
            const { jsPDF } = jspdf;
            const canvas = await html2canvas(printableAreaRef.current, {
                scale: 2,
                backgroundColor: '#0A0A0A',
                useCORS: true,
                windowWidth: printableAreaRef.current.scrollWidth,
                windowHeight: printableAreaRef.current.scrollHeight
            });

            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = 595; // A4 width in points
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${project.name.replace(/ /g, '_')}.pdf`);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.");
        } finally {
            setIsDownloading(false);
        }
    };
    
    const renderMarkdownContent = (text: string) => {
        return text.split('\n').map((paragraph, index) => (
            paragraph.trim() ? <p key={index} className="text-gray-300 leading-relaxed mb-4">{paragraph}</p> : null
        ));
    }

    return (
        <div className="min-h-screen bg-darker text-white font-sans flex flex-col animate-fade-in">
            <header className="bg-dark border-b border-gray-900 sticky top-0 z-20">
                <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors mr-2 flex-shrink-0">
                            <Icon name="ChevronLeft" className="w-6 h-6" />
                        </button>
                        <div className="min-w-0">
                             <h1 className="text-xl font-display tracking-wider text-white truncate" title={project.name}>{project.name}</h1>
                             <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                <Avatar src={project.avatarUrl} name={project.createdBy} size="sm" />
                                <span>Criado por {project.createdBy}</span>
                             </div>
                        </div>
                    </div>
                     <button 
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-md bg-brand-red hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <Icon name="Download" className="w-4 h-4" />
                        <span className="text-sm font-semibold">{isDownloading ? 'Baixando...' : 'Baixar PDF'}</span>
                    </button>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 py-8 flex-grow">
                <div ref={printableAreaRef} className="max-w-4xl mx-auto bg-dark/50 border border-gray-800 rounded-lg overflow-hidden">
                    {project.coverImageUrl && (
                        <div className="w-full aspect-[3/4] max-h-[1024px] bg-black">
                             <img src={project.coverImageUrl} alt={`Capa de ${project.name}`} className="w-full h-full object-contain" />
                        </div>
                    )}
                   <div className="p-8 md:p-12">
                       <h1 className="text-4xl md:text-5xl font-display text-white mb-8 border-b-2 border-brand-red pb-4">{project.name}</h1>
                       
                       <h3 className="text-2xl font-display text-brand-red mt-8 mb-4">Introdução</h3>
                       {renderMarkdownContent(project.introduction)}

                       {project.chapters?.map((chapter, index) => (
                           <div key={index}>
                               <h3 className="text-2xl font-display text-brand-red mt-8 mb-4">{chapter.title}</h3>
                               {chapter.imageUrl && (
                                   <div className="my-6">
                                      <img src={chapter.imageUrl} alt={`Imagem para ${chapter.title}`} className="w-full rounded-lg object-cover" />
                                   </div>
                               )}
                               {renderMarkdownContent(chapter.content)}
                           </div>
                       ))}

                       <h3 className="text-2xl font-display text-brand-red mt-8 mb-4">Conclusão</h3>
                       {renderMarkdownContent(project.conclusion)}
                   </div>
                </div>
            </main>
        </div>
    );
};

export default ProjectViewerPage;