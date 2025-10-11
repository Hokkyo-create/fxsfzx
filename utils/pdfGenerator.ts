// utils/pdfGenerator.ts

// Declare external libraries for TypeScript
declare const jspdf: any;
declare const html2canvas: any;

export const downloadProjectAsPdf = async (element: HTMLElement, projectName: string): Promise<void> => {
    try {
        const { jsPDF } = jspdf;
        // The element for html2canvas should be the one that actually scrolls
        const container = element.parentElement;
        if(!container) throw new Error("Printable area container not found");
        
        const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#0A0A0A',
            useCORS: true,
            // Use the full scroll height of the element
            height: element.scrollHeight,
            width: element.scrollWidth,
            windowHeight: element.scrollHeight,
            windowWidth: element.scrollWidth
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / pdfWidth;
        const totalPdfPages = Math.ceil(imgHeight / (pdfHeight * ratio));
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight / ratio);
        heightLeft -= (pdfHeight * ratio);

        for (let i = 1; i < totalPdfPages; i++) {
            position = -pdfHeight * i;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position / ratio, pdfWidth, imgHeight / ratio);
        }

        pdf.save(`${projectName.replace(/ /g, '_')}.pdf`);
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
    }
};