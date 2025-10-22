// utils/pdfGenerator.ts
import type { Slide } from '../types';

// Declare external libraries for TypeScript
declare const jspdf: any;
declare const html2canvas: any;

export const downloadEbookWebpageAsPdf = async (htmlContent: string, projectName: string): Promise<void> => {
    const container = document.createElement('div');
    // Style it to be off-screen but rendered with a specific width for PDF layout
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    // A4 width is 210mm. At 96DPI, that's about 794px. 800px is a good round number.
    container.style.width = '800px'; 
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container, {
            scale: 2, // Higher resolution for better quality
            useCORS: true,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = jspdf;

        // PDF units are in mm for A4
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        const ratio = canvasWidth / pdfWidth;
        const canvasHeightInPdf = canvasHeight / ratio;

        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, canvasHeightInPdf);
        let heightLeft = canvasHeightInPdf - pdfHeight;

        while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, canvasHeightInPdf);
            heightLeft -= pdfHeight;
        }
        
        pdf.save(`${projectName.replace(/ /g, '_')}.pdf`);

    } catch (error) {
        console.error("Failed to generate PDF from HTML:", error);
        throw new Error("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
    } finally {
        // Clean up the temporary container
        document.body.removeChild(container);
    }
};


/**
 * Creates a PDF from presentation slides using html2canvas and jspdf.
 * @param slides - The array of slide data.
 * @param images - A record mapping slide index to its base64 image URL.
 * @param projectName - The name of the project for the suggested filename.
 */
export const downloadPresentationAsPdf = async (slides: Slide[], images: Record<number, string>, projectName: string): Promise<void> => {
    const { jsPDF } = jspdf;
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1280, 720] // Standard 16:9 presentation dimensions
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Create a temporary container for rendering slides off-screen
    const renderContainer = document.createElement('div');
    renderContainer.className = 'presentation-print-container'; // Reuse print styles for layout
    renderContainer.style.position = 'absolute';
    renderContainer.style.left = '-9999px';
    renderContainer.style.top = '0';
    renderContainer.style.zIndex = '-1';
    document.body.appendChild(renderContainer);

    try {
        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];
            
            // Build the HTML for the current slide
            const slideElement = document.createElement('div');
            slideElement.className = 'presentation-print-slide';
            slideElement.style.width = `${pdfWidth}px`;
            slideElement.style.height = `${pdfHeight}px`;

            const imageUrl = images[i];
            if (imageUrl && imageUrl !== 'error') {
                const img = document.createElement('img');
                img.src = imageUrl;
                slideElement.appendChild(img);
            }
            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            slideElement.appendChild(overlay);
            const content = document.createElement('div');
            content.className = 'content';
            const title = document.createElement('h3');
            title.textContent = slide.title;
            content.appendChild(title);
            const list = document.createElement('ul');
            slide.content.forEach(point => {
                const item = document.createElement('li');
                item.textContent = point;
                list.appendChild(item);
            });
            content.appendChild(list);
            slideElement.appendChild(content);

            // Render the slide in the off-screen container
            renderContainer.innerHTML = ''; // Clear previous slide
            renderContainer.appendChild(slideElement);

            // Ensure the image is fully loaded before capturing with html2canvas
            const imgEl = slideElement.querySelector('img');
            if (imgEl) {
                await new Promise(resolve => {
                    if (imgEl.complete) return resolve(true);
                    imgEl.onload = () => resolve(true);
                    imgEl.onerror = () => { console.error(`Image failed to load for slide ${i}`); resolve(false); };
                });
            }

            // Capture the rendered slide as a canvas
            const canvas = await html2canvas(slideElement, {
                useCORS: true,
                scale: 1, // Capture at the specified size
            });
            const imgData = canvas.toDataURL('image/png');

            // Add the captured image to the PDF
            if (i > 0) {
                pdf.addPage([pdfWidth, pdfHeight], 'landscape');
            }
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }

        pdf.save(`${projectName.replace(/ /g, '_')}_presentation.pdf`);

    } catch (error) {
        console.error("Failed to generate presentation PDF:", error);
        throw new Error("Ocorreu um erro ao gerar o PDF da apresentação.");
    } finally {
        // Clean up the temporary container
        document.body.removeChild(renderContainer);
    }
};