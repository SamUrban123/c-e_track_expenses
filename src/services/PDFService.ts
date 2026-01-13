import { PDFDocument } from 'pdf-lib';

export class PDFService {
    async createPdfFromImage(imageBlob: Blob): Promise<Blob> {
        const arrayBuffer = await imageBlob.arrayBuffer();

        // Create new PDF
        const pdfDoc = await PDFDocument.create();

        // Embed the image
        let image;
        if (imageBlob.type === 'image/jpeg' || imageBlob.type === 'image/jpg') {
            image = await pdfDoc.embedJpg(arrayBuffer);
        } else if (imageBlob.type === 'image/png') {
            image = await pdfDoc.embedPng(arrayBuffer);
        } else {
            throw new Error('Unsupported image format. Please use JPEG or PNG.');
        }

        // Get dimensions and add page
        const { width, height } = image.scale(1);

        // A4 size usually? Or fit to image?
        // Receipts are variable. Better to fit page to image size.
        const page = pdfDoc.addPage([width, height]);

        page.drawImage(image, {
            x: 0,
            y: 0,
            width,
            height,
        });

        const pdfBytes = await pdfDoc.save();
        return new Blob([pdfBytes as any], { type: 'application/pdf' });
    }
}

export const pdfService = new PDFService();
