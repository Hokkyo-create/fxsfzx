// utils/pdfGenerator.ts

// Declare external libraries for TypeScript
declare const jspdf: any;

export const downloadProjectAsPdf = async (element: HTMLElement, projectName: string): Promise<void> => {
    try {
        const { jsPDF } = jspdf;
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        // The .html() method is a more robust way to generate PDFs from HTML.
        // It uses html2canvas internally but provides better control over paging.
        await pdf.html(element, {
            callback: function (doc: any) {
                doc.save(`${projectName.replace(/ /g, '_')}.pdf`);
            },
            html2canvas: {
                scale: 2, // Higher resolution for crisp text and images
                backgroundColor: '#0A0A0A',
                useCORS: true,
            },
            autoPaging: 'text', // This is key: it avoids cutting text lines in half
            margin: [50, 40, 50, 40], // Generous margins: Top, Left, Bottom, Right
            width: 595 - 80, // A4 width in points (595.28) minus left/right margins
            windowWidth: 800, // Use a consistent width for rendering to avoid layout shifts
        });

    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
    }
};