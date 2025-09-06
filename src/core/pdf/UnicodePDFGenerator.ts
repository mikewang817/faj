import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import { Resume } from '../../models';
import { Logger } from '../../utils/Logger';
import { SystemFontLoader } from './SystemFontLoader';
import { CDNFontLoader } from './CDNFontLoader';

export class UnicodePDFGenerator {
  private logger: Logger;
  private themes: Record<string, { primary: number[]; secondary: number[]; accent: number[]; text: number[] }> = {
    modern: {
      primary: [0.4, 0.49, 0.92],  // #667eea
      secondary: [0.46, 0.29, 0.64], // #764ba2
      accent: [0.20, 0.60, 0.86],   // #3498db
      text: [0.2, 0.2, 0.2]
    },
    professional: {
      primary: [0.17, 0.24, 0.31],  // #2c3e50
      secondary: [0.20, 0.29, 0.37], // #34495e
      accent: [0.20, 0.60, 0.86],   // #3498db
      text: [0.17, 0.24, 0.31]
    },
    minimalist: {
      primary: [0, 0, 0],           // #000000
      secondary: [0.4, 0.4, 0.4],   // #666666
      accent: [0, 0, 0],            // #000000
      text: [0.2, 0.2, 0.2]
    }
  };

  constructor() {
    this.logger = new Logger('UnicodePDFGenerator');
  }

  async generatePDF(resume: Resume, themeName: string = 'modern'): Promise<Buffer> {
    const theme = this.themes[themeName] || this.themes.modern;
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Register fontkit for custom font support
    pdfDoc.registerFontkit(fontkit);

    // Load fonts with CJK support
    let font: PDFFont;
    let boldFont: PDFFont;
    
    try {
      // First try system fonts (faster if available)
      const systemFontLoader = new SystemFontLoader();
      const systemFonts = await systemFontLoader.findSystemFonts();
      
      if (systemFonts.regular && systemFonts.bold) {
        // Use system fonts if available
        font = await pdfDoc.embedFont(systemFonts.regular);
        boldFont = await pdfDoc.embedFont(systemFonts.bold);
        this.logger.info('Using system CJK fonts');
      } else {
        // Download from CDN if no system fonts
        this.logger.info('No system CJK fonts found. Loading from CDN...');
        const cdnLoader = new CDNFontLoader();
        
        try {
          const cdnFonts = await cdnLoader.loadFonts();
          font = await pdfDoc.embedFont(cdnFonts.regular);
          boldFont = await pdfDoc.embedFont(cdnFonts.bold);
          this.logger.success('Using CDN fonts for CJK support');
        } catch (cdnError) {
          // Final fallback to standard fonts
          this.logger.warn('Failed to load CDN fonts, using standard fonts');
          font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        }
      }
    } catch (error) {
      this.logger.error('Failed to load fonts, using fallback', error);
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }

    // Add a page
    const page = pdfDoc.addPage([595, 842]); // A4 size in points
    const { width, height } = page.getSize();
    
    let yPosition = height - 50;
    const leftMargin = 50;
    const rightMargin = width - 50;
    const contentWidth = rightMargin - leftMargin;

    // Helper function to draw text
    const drawText = (
      text: string,
      x: number,
      y: number,
      size: number,
      color: number[] = theme.text,
      useFont: PDFFont = font
    ) => {
      try {
        page.drawText(text, {
          x,
          y,
          size,
          font: useFont,
          color: rgb(color[0], color[1], color[2])
        });
      } catch (error) {
        // If text can't be encoded, log warning but continue
        this.logger.warn(`Failed to draw text: ${text.substring(0, 20)}...`);
      }
      return useFont.heightAtSize(size);
    };

    // Helper function to wrap text (handles both space-separated and CJK text)
    const wrapText = (text: string, maxWidth: number, fontSize: number, useFont: PDFFont = font): string[] => {
      const lines: string[] = [];
      let currentLine = '';
      
      // Check if text contains CJK characters
      const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(text);
      
      if (hasCJK) {
        // For CJK text, wrap character by character
        for (const char of text) {
          const testLine = currentLine + char;
          try {
            const textWidth = useFont.widthOfTextAtSize(testLine, fontSize);
            if (textWidth > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = char;
            } else {
              currentLine = testLine;
            }
          } catch {
            currentLine = testLine; // Continue even if width calculation fails
          }
        }
      } else {
        // For non-CJK text, wrap by words
        const words = text.split(' ');
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          try {
            const textWidth = useFont.widthOfTextAtSize(testLine, fontSize);
            if (textWidth > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          } catch {
            currentLine = testLine;
          }
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    };

    // Draw header - Name
    if (resume.basicInfo?.name) {
      const nameSize = 24;
      const nameWidth = boldFont.widthOfTextAtSize(resume.basicInfo.name, nameSize);
      drawText(
        resume.basicInfo.name,
        (width - nameWidth) / 2,
        yPosition,
        nameSize,
        theme.primary,
        boldFont
      );
      yPosition -= 30;
    }

    // Draw contact info
    const contactInfo: string[] = [];
    if (resume.basicInfo?.email) contactInfo.push(resume.basicInfo.email);
    if (resume.basicInfo?.phone) contactInfo.push(resume.basicInfo.phone);
    if (resume.basicInfo?.location) contactInfo.push(resume.basicInfo.location);
    
    if (contactInfo.length > 0) {
      const contactText = contactInfo.join(' | ');
      const contactSize = 10;
      const contactWidth = font.widthOfTextAtSize(contactText, contactSize);
      drawText(
        contactText,
        (width - contactWidth) / 2,
        yPosition,
        contactSize,
        theme.secondary
      );
      yPosition -= 25;
    }

    // Draw line separator
    page.drawLine({
      start: { x: leftMargin, y: yPosition },
      end: { x: rightMargin, y: yPosition },
      thickness: 1,
      color: rgb(0.88, 0.88, 0.88)
    });
    yPosition -= 20;

    // Professional Summary
    if (resume.content.summary) {
      drawText('PROFESSIONAL SUMMARY', leftMargin, yPosition, 12, theme.primary, boldFont);
      yPosition -= 20;
      
      const summaryLines = wrapText(resume.content.summary, contentWidth, 10);
      for (const line of summaryLines) {
        drawText(line, leftMargin, yPosition, 10);
        yPosition -= 14;
      }
      yPosition -= 10;
    }

    // Work Experience
    if (resume.content.experience && resume.content.experience.length > 0) {
      drawText('WORK EXPERIENCE', leftMargin, yPosition, 12, theme.primary, boldFont);
      yPosition -= 20;
      
      for (const exp of resume.content.experience) {
        // Check if we need a new page
        if (yPosition < 100) {
          pdfDoc.addPage([595, 842]);
          yPosition = height - 50;
        }
        
        // Job title and company
        drawText(`${exp.title} at ${exp.company}`, leftMargin, yPosition, 11, theme.text, boldFont);
        
        // Date
        const dateText = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
        const dateWidth = font.widthOfTextAtSize(dateText, 9);
        drawText(dateText, rightMargin - dateWidth, yPosition, 9, theme.secondary);
        yPosition -= 18;
        
        // Description
        if (exp.description) {
          const descLines = wrapText(exp.description, contentWidth, 10);
          for (const line of descLines) {
            drawText(line, leftMargin, yPosition, 10);
            yPosition -= 14;
          }
        }
        
        // Highlights
        if (exp.highlights && exp.highlights.length > 0) {
          for (const highlight of exp.highlights.slice(0, 3)) {
            const bulletLines = wrapText(`• ${highlight}`, contentWidth - 15, 9);
            for (const line of bulletLines) {
              drawText(line, leftMargin + 15, yPosition, 9);
              yPosition -= 12;
            }
          }
        }
        
        yPosition -= 10;
      }
    }

    // Projects
    if (resume.content.projects && resume.content.projects.length > 0) {
      // Check if we need a new page
      if (yPosition < 150) {
        pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
      
      drawText('PROJECTS', leftMargin, yPosition, 12, theme.primary, boldFont);
      yPosition -= 20;
      
      for (const project of resume.content.projects.slice(0, 2)) {
        drawText(project.name, leftMargin, yPosition, 11, theme.text, boldFont);
        yPosition -= 18;
        
        if (project.description) {
          const descLines = wrapText(project.description, contentWidth, 10);
          for (const line of descLines) {
            drawText(line, leftMargin, yPosition, 10);
            yPosition -= 14;
          }
        }
        
        if (project.technologies && project.technologies.length > 0) {
          const techText = `Technologies: ${project.technologies.join(', ')}`;
          const techLines = wrapText(techText, contentWidth, 9);
          for (const line of techLines) {
            drawText(line, leftMargin, yPosition, 9, theme.secondary);
            yPosition -= 12;
          }
        }
        
        yPosition -= 10;
      }
    }

    // Skills
    if (resume.content.skills && resume.content.skills.length > 0) {
      // Check if we need a new page
      if (yPosition < 100) {
        pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
      
      drawText('TECHNICAL SKILLS', leftMargin, yPosition, 12, theme.primary, boldFont);
      yPosition -= 20;
      
      const skillsByCategory: Record<string, string[]> = {};
      resume.content.skills.forEach(skill => {
        const category = skill.category || 'Other';
        if (!skillsByCategory[category]) {
          skillsByCategory[category] = [];
        }
        skillsByCategory[category].push(skill.name);
      });
      
      for (const [category, skills] of Object.entries(skillsByCategory)) {
        const categoryLabel = this.getCategoryLabel(category);
        drawText(`${categoryLabel}:`, leftMargin, yPosition, 10, theme.secondary, boldFont);
        
        const skillsText = skills.slice(0, 8).join(', ');
        drawText(skillsText, leftMargin + 80, yPosition, 10);
        yPosition -= 16;
      }
      
      yPosition -= 10;
    }

    // Education
    if (resume.content.education && resume.content.education.length > 0) {
      // Check if we need a new page
      if (yPosition < 80) {
        pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
      
      drawText('EDUCATION', leftMargin, yPosition, 12, theme.primary, boldFont);
      yPosition -= 20;
      
      for (const edu of resume.content.education) {
        drawText(`${edu.degree} in ${edu.field}`, leftMargin, yPosition, 11, theme.text, boldFont);
        
        const dateText = `${edu.startDate} - ${edu.endDate}`;
        const dateWidth = font.widthOfTextAtSize(dateText, 9);
        drawText(dateText, rightMargin - dateWidth, yPosition, 9, theme.secondary);
        yPosition -= 16;
        
        drawText(edu.institution, leftMargin, yPosition, 10, theme.secondary);
        yPosition -= 14;
        
        if (edu.gpa) {
          drawText(`GPA: ${edu.gpa}`, leftMargin, yPosition, 9);
          yPosition -= 14;
        }
        
        yPosition -= 8;
      }
    }

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'programming_languages': 'Languages',
      'frameworks': 'Frameworks',
      'databases': 'Databases',
      'tools': 'Tools',
      'cloud': 'Cloud',
      'other': 'Other'
    };
    return labels[category.toLowerCase()] || category;
  }
}