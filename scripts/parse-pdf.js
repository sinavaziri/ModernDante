const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');

const PDF_PATH = path.join(__dirname, '..', 'Dante-Alighieri-The-Divine-Comedy.pdf');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'raw-text.txt');

async function parsePDF() {
  console.log('📖 Reading PDF file...');

  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', errData => {
      console.error('❌ Error parsing PDF:', errData.parserError);
      reject(errData.parserError);
    });

    pdfParser.on('pdfParser_dataReady', pdfData => {
      try {
        console.log('🔍 Extracting text from PDF...');

        // Extract text from all pages
        let fullText = '';
        pdfData.Pages.forEach((page, pageIndex) => {
          page.Texts.forEach(text => {
            text.R.forEach(r => {
              const decoded = decodeURIComponent(r.T);
              fullText += decoded;
            });
            fullText += ' ';
          });
          fullText += '\n\n';
        });

        console.log(`✓ Extracted ${pdfData.Pages.length} pages`);
        console.log(`✓ Total characters: ${fullText.length}`);

        // Ensure data directory exists
        const dataDir = path.dirname(OUTPUT_PATH);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }

        // Write extracted text to file
        fs.writeFileSync(OUTPUT_PATH, fullText, 'utf-8');

        console.log(`✓ Saved raw text to: ${OUTPUT_PATH}`);
        console.log('✅ PDF parsing complete!');

        // Show a preview
        const preview = fullText.substring(0, 500);
        console.log('\n📝 Preview of extracted text:');
        console.log('---');
        console.log(preview);
        console.log('...');

        resolve();
      } catch (error) {
        console.error('❌ Error processing PDF data:', error);
        reject(error);
      }
    });

    console.log('🔍 Loading PDF...');
    pdfParser.loadPDF(PDF_PATH);
  });
}

parsePDF().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
