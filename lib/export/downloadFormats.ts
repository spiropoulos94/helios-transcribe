/**
 * Download utilities for different file formats
 */

import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

// Font cache
let fontCache: { regular: string | null; bold: string | null } = {
  regular: null,
  bold: null,
};

/**
 * Load Noto Sans fonts for Greek character support
 * Uses jsDelivr CDN to fetch TTF font files (more reliable than woff2 for jsPDF)
 */
async function loadNotoSansFonts(): Promise<{
  regular: string | null;
  bold: string | null;
}> {
  if (fontCache.regular && fontCache.bold) {
    return fontCache;
  }

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const fetchFont = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return arrayBufferToBase64(arrayBuffer);
    } catch {
      return null;
    }
  };

  // Fetch both regular and bold variants in parallel
  // Using Noto Sans TTF from Google Fonts GitHub (TTF required for jsPDF unicode support)
  const [regular, bold] = await Promise.all([
    fetchFont(
      'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/full/ttf/NotoSans-Regular.ttf'
    ),
    fetchFont(
      'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/full/ttf/NotoSans-Bold.ttf'
    ),
  ]);

  fontCache = { regular, bold };
  return fontCache;
}

/**
 * Strip markdown formatting from text for PDF output
 * Removes bold (**text**), italic (*text* or _text_), and other common markdown
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold **text**
    .replace(/\*([^*]+)\*/g, '$1') // Italic *text*
    .replace(/__([^_]+)__/g, '$1') // Bold __text__
    .replace(/_([^_]+)_/g, '$1') // Italic _text_
    .replace(/`([^`]+)`/g, '$1') // Code `text`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links [text](url)
}

/**
 * Download content as plain text file
 */
export function downloadAsTxt(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${filename}.txt`);
}

/**
 * Download content as PDF file
 * Supports Greek characters by embedding Noto Sans font
 */
export async function downloadAsPdf(content: string, filename: string): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Set up page dimensions
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  const lineHeight = 6;
  let yPosition = margin;

  // Load and register Noto Sans font for Greek support
  const fonts = await loadNotoSansFonts();

  let fontName = 'Helvetica';
  if (fonts.regular) {
    try {
      pdf.addFileToVFS('NotoSans-Regular.ttf', fonts.regular);
      pdf.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      if (fonts.bold) {
        pdf.addFileToVFS('NotoSans-Bold.ttf', fonts.bold);
        pdf.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
      } else {
        // Fallback: use regular for bold if bold font failed to load
        pdf.addFont('NotoSans-Regular.ttf', 'NotoSans', 'bold');
      }
      fontName = 'NotoSans';
    } catch (error) {
      console.warn('Failed to register Noto Sans font:', error);
    }
  }

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(11);

  // Split content into lines
  const lines = content.split('\n');

  for (const line of lines) {
    // Check if we need a new page
    if (yPosition > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    if (line.trim() === '') {
      // Empty line - add some spacing
      yPosition += lineHeight / 2;
    } else if (line.startsWith('# ')) {
      // Main heading
      pdf.setFontSize(16);
      pdf.setFont(fontName, 'bold');
      const headingText = stripMarkdown(line.replace('# ', ''));
      const wrappedLines = pdf.splitTextToSize(headingText, maxWidth);
      pdf.text(wrappedLines, margin, yPosition);
      yPosition += wrappedLines.length * 8 + 4;
      pdf.setFontSize(11);
      pdf.setFont(fontName, 'normal');
    } else if (line.startsWith('## ')) {
      // Subheading
      pdf.setFontSize(13);
      pdf.setFont(fontName, 'bold');
      const headingText = stripMarkdown(line.replace('## ', ''));
      const wrappedLines = pdf.splitTextToSize(headingText, maxWidth);
      pdf.text(wrappedLines, margin, yPosition);
      yPosition += wrappedLines.length * 7 + 3;
      pdf.setFontSize(11);
      pdf.setFont(fontName, 'normal');
    } else if (line.startsWith('### ')) {
      // Sub-subheading
      pdf.setFontSize(12);
      pdf.setFont(fontName, 'bold');
      const headingText = stripMarkdown(line.replace('### ', ''));
      const wrappedLines = pdf.splitTextToSize(headingText, maxWidth);
      pdf.text(wrappedLines, margin, yPosition);
      yPosition += wrappedLines.length * 6 + 2;
      pdf.setFontSize(11);
      pdf.setFont(fontName, 'normal');
    } else if (line.startsWith('---')) {
      // Horizontal rule
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += lineHeight;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet point
      const bulletText = stripMarkdown(line.substring(2));
      const wrappedLines = pdf.splitTextToSize(bulletText, maxWidth - 5);
      pdf.text('•', margin, yPosition);
      pdf.text(wrappedLines, margin + 5, yPosition);
      yPosition += wrappedLines.length * lineHeight;
    } else {
      // Regular paragraph - strip markdown formatting
      const cleanedLine = stripMarkdown(line);
      const wrappedLines = pdf.splitTextToSize(cleanedLine, maxWidth);
      pdf.text(wrappedLines, margin, yPosition);
      yPosition += wrappedLines.length * lineHeight;
    }
  }

  pdf.save(`${filename}.pdf`);
}

/**
 * Download content as DOCX file
 */
export async function downloadAsDocx(content: string, filename: string): Promise<void> {
  const lines = content.split('\n');
  const children: Paragraph[] = [];

  for (const line of lines) {
    if (line.trim() === '') {
      // Empty paragraph for spacing
      children.push(new Paragraph({ children: [] }));
    } else if (line.startsWith('# ')) {
      // Main heading
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: line.replace('# ', ''),
              bold: true,
              size: 32,
            }),
          ],
        })
      );
    } else if (line.startsWith('## ')) {
      // Subheading
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: line.replace('## ', ''),
              bold: true,
              size: 26,
            }),
          ],
        })
      );
    } else if (line.startsWith('### ')) {
      // Sub-subheading
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [
            new TextRun({
              text: line.replace('### ', ''),
              bold: true,
              size: 24,
            }),
          ],
        })
      );
    } else if (line.startsWith('---')) {
      // Horizontal rule (approximated with a thin paragraph)
      children.push(
        new Paragraph({
          border: {
            bottom: { color: 'CCCCCC', size: 1, style: 'single' },
          },
          children: [],
        })
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet point
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: line.substring(2),
              size: 22,
            }),
          ],
        })
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      // Bold text
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace(/\*\*/g, ''),
              bold: true,
              size: 22,
            }),
          ],
        })
      );
    } else {
      // Regular paragraph - handle inline bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const textRuns: TextRun[] = parts
        .filter(part => part.length > 0)
        .map(part => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRun({
              text: part.replace(/\*\*/g, ''),
              bold: true,
              size: 22,
            });
          }
          return new TextRun({
            text: part,
            size: 22,
          });
        });

      children.push(
        new Paragraph({
          children: textRuns,
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

export type DownloadFormat = 'txt' | 'pdf' | 'docx';

/**
 * Download content in the specified format
 */
export async function downloadInFormat(
  content: string,
  filename: string,
  format: DownloadFormat
): Promise<void> {
  switch (format) {
    case 'txt':
      downloadAsTxt(content, filename);
      break;
    case 'pdf':
      await downloadAsPdf(content, filename);
      break;
    case 'docx':
      await downloadAsDocx(content, filename);
      break;
  }
}
