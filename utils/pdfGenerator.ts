// utils/pdfGenerator.ts

// Declare external libraries for TypeScript
declare const jspdf: any;
declare const html2canvas: any;

export const downloadProjectAsPdf = async (element: HTMLElement, projectName: string): Promise<void> => {
    try {
        const { jsPDF } = jspdf;
        
        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for better quality
            backgroundColor: '#0A0A0A',
            useCORS: true,
            // Ensure html2canvas captures the entire scrollable height
            height: element.scrollHeight,
            windowHeight: element.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calculate the aspect ratio to fit the image width to the PDF width
        const ratio = pdfWidth / imgWidth;
        const canvasHeightInPdf = imgHeight * ratio;
        
        let position = 0;
        let heightLeft = canvasHeightInPdf;

        // Add the first page
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, canvasHeightInPdf);
        heightLeft -= pdfHeight;

        // Add subsequent pages if the content is taller than one page
        while (heightLeft > 0) {
            position -= pdfHeight; // Move the position up for the next slice
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, canvasHeightInPdf);
            heightLeft -= pdfHeight;
        }

        pdf.save(`${projectName.replace(/ /g, '_')}.pdf`);
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
    }
};