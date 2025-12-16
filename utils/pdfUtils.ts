import * as pdfjsLib from 'pdfjs-dist';

// Handle potential ESM/CommonJS interop issues where default export is used
const getPdfJs = () => {
  const lib = pdfjsLib as any;
  if (lib.GlobalWorkerOptions) return lib;
  if (lib.default && lib.default.GlobalWorkerOptions) return lib.default;
  return lib;
};

const pdfjs = getPdfJs();

// Configure the worker to load from a reliable CDN (cdnjs)
// Using cdnjs avoids potential redirect/CORS issues with esm.sh in worker context
if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const pdfjs = getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Iterate over all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract text items and join them
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
        
      fullText += pageText + '\n\n';
    }

    return fullText;
  } catch (error) {
    console.error("PDF Extraction Error:", error);
    // Provide a more helpful error message
    if (error instanceof Error && (error.message.includes("fake worker") || error.name === "NetworkError")) {
        throw new Error("PDF Worker failed to load. Please check your internet connection or try a text file.");
    }
    throw new Error("Could not extract text from PDF. The file might be corrupted or password protected.");
  }
};