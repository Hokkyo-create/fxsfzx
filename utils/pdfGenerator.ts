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
 * Creates a hidden, printable version of the presentation,
 * triggers the browser's print dialog, and then cleans up.
 * Relies on @media print CSS rules in index.html.
 *
 * @param slides - The array of slide data.
 * @param images - A record mapping slide index to its base64 image URL.
 * @param projectName - The name of the project for the suggested filename.
 */
export const downloadPresentationAsPdf = (slides: Slide[], images: Record<number, string>, projectName: string): void => {
    // 1. Create a container for the printable content
    const printContainer = document.createElement('div');
    printContainer.className = 'presentation-print-container';
    printContainer.setAttribute('aria-hidden', 'true');

    // 2. Generate the HTML for each slide
    slides.forEach((slide, index) => {
        const slideElement = document.createElement('div');
        slideElement.className = 'presentation-print-slide';

        const imageUrl = images[index];
        if (imageUrl && imageUrl !== 'error') { // Check for error placeholder
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
        printContainer.appendChild(slideElement);
    });
    
    // 3. Append to the body, print, and then remove
    document.body.appendChild(printContainer);
    
    // Set document title for printing
    const originalTitle = document.title;
    document.title = `${projectName.replace(/ /g, '_')}.pdf`;

    window.print();
    
    // Cleanup
    document.body.removeChild(printContainer);
    document.title = originalTitle;
};