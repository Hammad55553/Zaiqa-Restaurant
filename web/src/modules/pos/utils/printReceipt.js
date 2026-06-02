import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Renders the receipt element to a PDF and auto-downloads it.
 * No print dialog — fully silent save.
 *
 * @param {HTMLElement} element - The receipt DOM node to capture
 * @param {string} filename - e.g. "receipt-5.pdf"
 */
export const saveReceiptAsPDF = async (element, filename = 'receipt.pdf') => {
  if (!element) return;

  // Thermal paper: 80mm wide. We scale up for quality, then set PDF size.
  const canvas = await html2canvas(element, {
    scale: 3,           // 3x resolution for crisp text
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');

  // 80mm × auto height in mm
  const pdfWidthMM = 80;
  const pxToMM = pdfWidthMM / canvas.width;
  const pdfHeightMM = canvas.height * pxToMM;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pdfWidthMM, pdfHeightMM],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMM, pdfHeightMM);
  pdf.save(filename);
};
