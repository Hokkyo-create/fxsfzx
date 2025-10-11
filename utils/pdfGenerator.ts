// utils/pdfGenerator.ts

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