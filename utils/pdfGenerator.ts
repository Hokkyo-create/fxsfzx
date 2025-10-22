// utils/pdfGenerator.ts
import type { Slide } from '../types';

// Declare external libraries for TypeScript
declare const jspdf: any;

export const downloadProjectAsPdf = async (element: HTMLElement, projectName: string): Promise<void> => {
    // Add a print-friendly class to the element to apply specific styles for PDF generation
    element.classList.add('pdf-export-mode');

    try {
        const { jsPDF } = jspdf;
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        // The .html() method uses html2canvas to render the element onto the PDF.
        // The styles applied by 'pdf-export-mode' will ensure the layout is correct for an A4 page.
        await pdf.html(element, {
            callback: function (doc: any) {
                doc.save(`${projectName.replace(/ /g, '_')}.pdf`);
            },
            html2canvas: {
                scale: 2, // Use a higher scale for better quality text and images
                backgroundColor: '#0A0A0A', // Ensure background is dark
                useCORS: true, // Needed for external images if any
            },
            autoPaging: 'text', // Tries to avoid cutting text lines in half, works well with our CSS page breaks
            margin: [50, 40, 50, 40], // Top, Left, Bottom, Right
        });

    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
    } finally {
        // IMPORTANT: Always remove the class after the process is finished, whether it succeeded or failed.
        element.classList.remove('pdf-export-mode');
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
