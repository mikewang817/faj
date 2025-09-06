import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, PageSizes } from 'pdf-lib';
import { Resume } from '../../models';
import { Logger } from '../../utils/Logger';

interface ThemeConfig {
  primary: number[];
  secondary: number[];
  accent: number[];
  text: number[];
  light: number[];
}

/**
 * Lightweight PDF Generator that uses system fonts or standard fonts
 * Produces much smaller PDF files (typically < 100KB)
 * Trade-off: CJK characters will be replaced with romanized versions or placeholders
 */
export class LightweightPDFGenerator {
  private logger: Logger;
  private themes: Record<string, ThemeConfig> = {
    modern: {
      primary: [0.4, 0.49, 0.92],
      secondary: [0.46, 0.29, 0.64],
      accent: [0.20, 0.60, 0.86],
      text: [0.13, 0.13, 0.13],
      light: [0.96, 0.96, 0.98]
    },
    professional: {
      primary: [0.17, 0.24, 0.31],
      secondary: [0.52, 0.58, 0.64],
      accent: [0.15, 0.68, 0.38],
      text: [0.17, 0.17, 0.17],
      light: [0.95, 0.96, 0.97]
    },
    minimalist: {
      primary: [0, 0, 0],
      secondary: [0.4, 0.4, 0.4],
      accent: [0.2, 0.2, 0.2],
      text: [0.1, 0.1, 0.1],
      light: [0.97, 0.97, 0.97]
    }
  };

  constructor() {
    this.logger = new Logger('LightweightPDFGenerator');
  }

  async generatePDF(resume: Resume, themeName: string = 'modern'): Promise<Buffer> {
    const theme = this.themes[themeName] || this.themes.modern;
    
    // Check if content has CJK characters
    const resumeText = JSON.stringify(resume);
    const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(resumeText);
    
    if (hasCJK) {
      this.logger.warn('CJK characters detected. They will be transliterated or shown as [CJK] in the PDF.');
      this.logger.info('For full CJK support, use the "html-print" export option or enable font embedding.');
    }
    
    // Create PDF with metadata
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`${this.sanitizeText(resume.basicInfo?.name || 'Resume')} - Resume`);
    pdfDoc.setAuthor(this.sanitizeText(resume.basicInfo?.name || 'Unknown'));
    pdfDoc.setCreator('FAJ Resume Builder');
    pdfDoc.setProducer('FAJ Lightweight');
    
    // Use standard fonts only (no embedding needed)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Create A4 page
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    
    let y = height - 50;
    const margin = 60;
    const contentWidth = width - (margin * 2);
    
    // Header
    if (resume.basicInfo?.name) {
      const name = this.sanitizeText(resume.basicInfo.name);
      page.drawText(name, {
        x: margin,
        y: y,
        size: 28,
        font: boldFont,
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
      });
      y -= 35;
      
      // Contact info
      const contacts = [
        this.sanitizeText(resume.basicInfo.email),
        this.sanitizeText(resume.basicInfo.phone),
        this.sanitizeText(resume.basicInfo.location)
      ].filter(Boolean);
      
      if (contacts.length > 0) {
        const contactText = contacts.join(' • ');
        page.drawText(contactText, {
          x: margin,
          y: y,
          size: 10,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        y -= 25;
      }
      
      // Separator line
      page.drawLine({
        start: { x: margin, y: y },
        end: { x: width - margin, y: y },
        thickness: 1,
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2]),
        opacity: 0.3
      });
      y -= 25;
    }
    
    // Professional Summary
    if (resume.content.summary) {
      this.drawSection(page, 'PROFESSIONAL SUMMARY', margin, y, theme, boldFont);
      y -= 20;
      
      const summaryText = this.sanitizeText(resume.content.summary);
      const summaryLines = this.wrapText(summaryText, contentWidth, 11, font);
      
      summaryLines.forEach(line => {
        page.drawText(line, {
          x: margin,
          y: y,
          size: 11,
          font: font,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        y -= 16;
      });
      y -= 15;
    }
    
    // Experience
    if (resume.content.experience?.length > 0) {
      this.drawSection(page, 'PROFESSIONAL EXPERIENCE', margin, y, theme, boldFont);
      y -= 20;
      
      resume.content.experience.forEach(exp => {
        // Title and company
        const title = this.sanitizeText(exp.title);
        const company = this.sanitizeText(exp.company || '');
        
        page.drawText(title, {
          x: margin,
          y: y,
          size: 12,
          font: boldFont,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        
        if (company) {
          page.drawText(` at ${company}`, {
            x: margin + font.widthOfTextAtSize(title, 12) + 5,
            y: y,
            size: 11,
            font: font,
            color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
          });
        }
        
        // Date
        const dateText = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
        const dateWidth = font.widthOfTextAtSize(dateText, 10);
        page.drawText(dateText, {
          x: width - margin - dateWidth,
          y: y,
          size: 10,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        y -= 18;
        
        // Description
        if (exp.description) {
          const descText = this.sanitizeText(exp.description);
          const descLines = this.wrapText(descText, contentWidth, 10, font);
          
          descLines.forEach(line => {
            page.drawText(line, {
              x: margin,
              y: y,
              size: 10,
              font: font,
              color: rgb(theme.text[0], theme.text[1], theme.text[2])
            });
            y -= 14;
          });
        }
        
        // Highlights
        if (exp.highlights?.length > 0) {
          exp.highlights.slice(0, 3).forEach(highlight => {
            const highlightText = this.sanitizeText(highlight);
            const lines = this.wrapText(`• ${highlightText}`, contentWidth - 20, 10, font);
            
            lines.forEach(line => {
              page.drawText(line, {
                x: margin + 10,
                y: y,
                size: 10,
                font: font,
                color: rgb(theme.text[0], theme.text[1], theme.text[2])
              });
              y -= 14;
            });
          });
        }
        
        y -= 15;
      });
    }
    
    // Projects
    if (resume.content.projects?.length > 0) {
      this.drawSection(page, 'PROJECTS', margin, y, theme, boldFont);
      y -= 20;
      
      resume.content.projects.slice(0, 2).forEach(project => {
        const projectName = this.sanitizeText(project.name);
        page.drawText(projectName, {
          x: margin,
          y: y,
          size: 11,
          font: boldFont,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        
        if (project.role) {
          const role = this.sanitizeText(project.role);
          page.drawText(` - ${role}`, {
            x: margin + font.widthOfTextAtSize(projectName, 11) + 3,
            y: y,
            size: 10,
            font: font,
            color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
          });
        }
        y -= 16;
        
        if (project.description) {
          const descText = this.sanitizeText(project.description);
          const descLines = this.wrapText(descText, contentWidth, 10, font);
          
          descLines.forEach(line => {
            page.drawText(line, {
              x: margin,
              y: y,
              size: 10,
              font: font,
              color: rgb(theme.text[0], theme.text[1], theme.text[2])
            });
            y -= 14;
          });
        }
        
        if (project.technologies?.length > 0) {
          const techText = `Tech: ${project.technologies.join(', ')}`;
          page.drawText(techText, {
            x: margin,
            y: y,
            size: 9,
            font: font,
            color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
          });
          y -= 14;
        }
        
        y -= 10;
      });
    }
    
    // Skills
    if (resume.content.skills?.length > 0) {
      this.drawSection(page, 'TECHNICAL SKILLS', margin, y, theme, boldFont);
      y -= 20;
      
      const skillsByCategory = this.groupSkills(resume.content.skills);
      
      Object.entries(skillsByCategory).forEach(([category, skills]) => {
        const categoryLabel = this.getCategoryLabel(category);
        const skillNames = skills.map(s => s.name).join(', ');
        
        page.drawText(`${categoryLabel}: `, {
          x: margin,
          y: y,
          size: 10,
          font: boldFont,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        
        const labelWidth = boldFont.widthOfTextAtSize(`${categoryLabel}: `, 10);
        const skillLines = this.wrapText(skillNames, contentWidth - labelWidth, 10, font);
        
        skillLines.forEach((line, idx) => {
          page.drawText(line, {
            x: margin + (idx === 0 ? labelWidth : 0),
            y: y - (idx * 14),
            size: 10,
            font: font,
            color: rgb(theme.text[0], theme.text[1], theme.text[2])
          });
        });
        
        y -= skillLines.length * 14 + 5;
      });
      
      y -= 10;
    }
    
    // Education
    if (resume.content.education?.length > 0) {
      this.drawSection(page, 'EDUCATION', margin, y, theme, boldFont);
      y -= 20;
      
      resume.content.education.forEach(edu => {
        const degree = this.sanitizeText(`${edu.degree} in ${edu.field}`);
        const institution = this.sanitizeText(edu.institution);
        
        page.drawText(degree, {
          x: margin,
          y: y,
          size: 11,
          font: boldFont,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        
        const dateText = `${edu.startDate} - ${edu.endDate}`;
        const dateWidth = font.widthOfTextAtSize(dateText, 10);
        page.drawText(dateText, {
          x: width - margin - dateWidth,
          y: y,
          size: 10,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        y -= 16;
        
        page.drawText(institution, {
          x: margin,
          y: y,
          size: 10,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        
        if (edu.gpa) {
          const gpa = ` • GPA: ${edu.gpa}`;
          page.drawText(gpa, {
            x: margin + font.widthOfTextAtSize(institution, 10),
            y: y,
            size: 10,
            font: font,
            color: rgb(theme.text[0], theme.text[1], theme.text[2])
          });
        }
        
        y -= 20;
      });
    }
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    this.logger.success(`Generated lightweight PDF: ${pdfBytes.length / 1024}KB`);
    
    return Buffer.from(pdfBytes);
  }
  
  private drawSection(
    page: PDFPage,
    title: string,
    x: number,
    y: number,
    theme: ThemeConfig,
    font: PDFFont
  ): void {
    page.drawText(title, {
      x: x,
      y: y,
      size: 12,
      font: font,
      color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
    });
    
    // Underline
    const textWidth = font.widthOfTextAtSize(title, 12);
    page.drawLine({
      start: { x: x, y: y - 3 },
      end: { x: x + textWidth, y: y - 3 },
      thickness: 0.5,
      color: rgb(theme.primary[0], theme.primary[1], theme.primary[2]),
      opacity: 0.5
    });
  }
  
  /**
   * Sanitize text to remove or transliterate CJK characters
   * This ensures the PDF can be rendered with standard fonts
   */
  private sanitizeText(text: string | undefined): string {
    if (!text) return '';
    
    // Replace CJK characters with romanized versions or placeholders
    return text
      .replace(/[\u4e00-\u9fff]+/g, '[Chinese]') // Chinese characters
      .replace(/[\u3040-\u309f]+/g, '[Hiragana]') // Japanese Hiragana
      .replace(/[\u30a0-\u30ff]+/g, '[Katakana]') // Japanese Katakana
      .replace(/[\uac00-\ud7af]+/g, '[Korean]')   // Korean characters
      .replace(/[^\x00-\x7F]/g, ''); // Remove other non-ASCII
  }
  
  
  private wrapText(text: string, maxWidth: number, fontSize: number, font: PDFFont): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (textWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }
  
  private groupSkills(skills: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    skills.forEach(skill => {
      const category = skill.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(skill);
    });
    
    return grouped;
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