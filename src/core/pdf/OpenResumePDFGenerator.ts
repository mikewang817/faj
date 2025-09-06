import { PDFDocument, PDFFont, rgb, PageSizes } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs/promises';
import * as path from 'path';
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
 * PDF Generator using local TTF fonts like Open-Resume
 * Simple, straightforward approach with pre-downloaded fonts
 */
export class OpenResumePDFGenerator {
  private logger: Logger;
  private fontsDir: string;
  
  private themes: Record<string, ThemeConfig> = {
    modern: {
      primary: [0.2, 0.4, 0.8],
      secondary: [0.4, 0.4, 0.4],
      accent: [0.1, 0.7, 0.9],
      text: [0.1, 0.1, 0.1],
      light: [0.95, 0.95, 0.95]
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
    this.logger = new Logger('OpenResumePDFGenerator');
    this.fontsDir = path.join(process.cwd(), 'public', 'fonts');
  }

  async generatePDF(resume: Resume, themeName: string = 'modern'): Promise<Buffer> {
    const theme = this.themes[themeName] || this.themes.modern;
    
    // Detect if content has CJK characters
    const resumeText = JSON.stringify(resume);
    const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(resumeText);
    
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    
    // Set metadata
    pdfDoc.setTitle(`${resume.basicInfo?.name || 'Resume'}`);
    pdfDoc.setAuthor(resume.basicInfo?.name || 'Unknown');
    pdfDoc.setCreator('FAJ Resume Builder');
    
    // Load fonts from local files (like Open-Resume)
    let regularFont: PDFFont;
    let boldFont: PDFFont;
    let cjkRegularFont: PDFFont | null = null;
    let cjkBoldFont: PDFFont | null = null;
    
    try {
      // Always load Roboto for English/numbers
      this.logger.info('Loading fonts...');
      const robotoRegularBytes = await fs.readFile(path.join(this.fontsDir, 'Roboto-Regular.ttf'));
      const robotoBoldBytes = await fs.readFile(path.join(this.fontsDir, 'Roboto-Bold.ttf'));
      regularFont = await pdfDoc.embedFont(robotoRegularBytes);
      boldFont = await pdfDoc.embedFont(robotoBoldBytes);
      
      // Load CJK fonts only if needed
      if (hasCJK) {
        this.logger.info('Loading CJK fonts for Chinese content');
        const cjkRegularBytes = await fs.readFile(path.join(this.fontsDir, 'NotoSansSC-Regular.ttf'));
        const cjkBoldBytes = await fs.readFile(path.join(this.fontsDir, 'NotoSansSC-Bold.ttf'));
        cjkRegularFont = await pdfDoc.embedFont(cjkRegularBytes);
        cjkBoldFont = await pdfDoc.embedFont(cjkBoldBytes);
      }
    } catch (error) {
      this.logger.warn('Failed to load local fonts, using defaults');
      this.logger.error('Font loading error:', error);
      // Fallback to standard fonts
      const { StandardFonts } = await import('pdf-lib');
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }
    
    // Create A4 page
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    
    let y = height - 50;
    const leftMargin = 50;
    const rightMargin = 50;
    const margin = leftMargin; // For backward compatibility
    const contentWidth = width - leftMargin - rightMargin;
    
    // Helper function to draw mixed text (CJK + English/numbers)
    const drawMixedText = (
      text: string, 
      x: number, 
      y: number, 
      size: number, 
      color: number[],
      isBold: boolean = false
    ) => {
      if (!hasCJK || !cjkRegularFont) {
        // No CJK content, use regular font
        page.drawText(text, {
          x,
          y,
          size,
          font: isBold ? boldFont : regularFont,
          color: rgb(color[0], color[1], color[2])
        });
        return;
      }
      
      // Split text into segments of CJK and non-CJK
      let currentX = x;
      let currentSegment = '';
      let isCJKSegment = false;
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const charIsCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(char);
        
        if (i === 0) {
          isCJKSegment = charIsCJK;
          currentSegment = char;
        } else if (charIsCJK !== isCJKSegment) {
          // Draw the current segment
          const font = isCJKSegment 
            ? (isBold ? cjkBoldFont! : cjkRegularFont!)
            : (isBold ? boldFont : regularFont);
          
          page.drawText(currentSegment, {
            x: currentX,
            y,
            size,
            font,
            color: rgb(color[0], color[1], color[2])
          });
          
          currentX += font.widthOfTextAtSize(currentSegment, size);
          
          // Start new segment
          isCJKSegment = charIsCJK;
          currentSegment = char;
        } else {
          currentSegment += char;
        }
      }
      
      // Draw the last segment
      if (currentSegment) {
        const font = isCJKSegment 
          ? (isBold ? cjkBoldFont! : cjkRegularFont!)
          : (isBold ? boldFont : regularFont);
        
        page.drawText(currentSegment, {
          x: currentX,
          y,
          size,
          font,
          color: rgb(color[0], color[1], color[2])
        });
      }
    };
    
    // Helper function to calculate mixed text width
    const getMixedTextWidth = (text: string, size: number, isBold: boolean = false): number => {
      if (!hasCJK || !cjkRegularFont) {
        return (isBold ? boldFont : regularFont).widthOfTextAtSize(text, size);
      }
      
      let totalWidth = 0;
      let currentSegment = '';
      let isCJKSegment = false;
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const charIsCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(char);
        
        if (i === 0) {
          isCJKSegment = charIsCJK;
          currentSegment = char;
        } else if (charIsCJK !== isCJKSegment) {
          const font = isCJKSegment 
            ? (isBold ? cjkBoldFont! : cjkRegularFont!)
            : (isBold ? boldFont : regularFont);
          totalWidth += font.widthOfTextAtSize(currentSegment, size);
          
          isCJKSegment = charIsCJK;
          currentSegment = char;
        } else {
          currentSegment += char;
        }
      }
      
      if (currentSegment) {
        const font = isCJKSegment 
          ? (isBold ? cjkBoldFont! : cjkRegularFont!)
          : (isBold ? boldFont : regularFont);
        totalWidth += font.widthOfTextAtSize(currentSegment, size);
      }
      
      return totalWidth;
    };
    
    // Header Section
    if (resume.basicInfo?.name) {
      // Name
      drawMixedText(resume.basicInfo.name, margin, y, 28, theme.primary, true);
      y -= 35;
      
      // Contact info in one line
      const contacts = [
        resume.basicInfo.email,
        resume.basicInfo.phone,
        resume.basicInfo.location
      ].filter(Boolean);
      
      if (contacts.length > 0) {
        const contactText = contacts.join(' • ');
        drawMixedText(contactText, margin, y, 10, theme.secondary);
        y -= 20;
      }
      
      // Divider line
      page.drawLine({
        start: { x: leftMargin, y: y },
        end: { x: width - rightMargin, y: y },
        thickness: 0.5,
        color: rgb(theme.light[0], theme.light[1], theme.light[2])
      });
      y -= 25;
    }
    
    // Professional Summary
    if (resume.content.summary) {
      this.drawSection(page, 'PROFESSIONAL SUMMARY', margin, y, theme, boldFont);
      y -= 20;
      
      const lines = this.wrapMixedText(resume.content.summary, contentWidth, 11, false);
      for (const line of lines) {
        drawMixedText(line, margin, y, 11, theme.text);
        y -= 16;
      }
      y -= 15;
    }
    
    // Work Experience
    if (resume.content.experience?.length > 0) {
      this.drawSection(page, 'WORK EXPERIENCE', margin, y, theme, boldFont);
      y -= 20;
      
      for (const exp of resume.content.experience) {
        // Title and company
        const titleText = exp.title;
        const companyText = exp.company ? ` at ${exp.company}` : '';
        
        drawMixedText(titleText, margin, y, 12, theme.text, true);
        
        if (companyText) {
          const titleWidth = getMixedTextWidth(titleText, 12, true);
          drawMixedText(companyText, margin + titleWidth, y, 12, theme.secondary);
        }
        
        // Date on right
        const dateText = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
        const dateWidth = getMixedTextWidth(dateText, 10);
        drawMixedText(dateText, width - rightMargin - dateWidth, y, 10, theme.secondary);
        y -= 18;
        
        // Description
        if (exp.description) {
          const descLines = this.wrapMixedText(exp.description, contentWidth, 10, false);
          for (const line of descLines) {
            drawMixedText(line, margin, y, 10, theme.text);
            y -= 14;
          }
        }
        
        // Highlights
        if (exp.highlights?.length > 0) {
          for (const highlight of exp.highlights) {
            const bulletLines = this.wrapMixedText(`• ${highlight}`, contentWidth - 20, 10, false);
            for (const line of bulletLines) {
              drawMixedText(line, margin + 10, y, 10, theme.text);
              y -= 14;
            }
          }
        }
        
        y -= 15;
      }
    }
    
    // Projects (if space available)
    if (resume.content.projects?.length > 0 && y > 200) {
      this.drawSection(page, 'PROJECTS', margin, y, theme, boldFont);
      y -= 20;
      
      for (const project of resume.content.projects.slice(0, 2)) {
        drawMixedText(project.name, margin, y, 11, theme.text, true);
        
        if (project.role) {
          const nameWidth = getMixedTextWidth(project.name, 11, true);
          drawMixedText(` - ${project.role}`, margin + nameWidth, y, 11, theme.secondary);
        }
        y -= 16;
        
        if (project.description) {
          const descLines = this.wrapMixedText(project.description, contentWidth, 10, false);
          for (const line of descLines.slice(0, 2)) {
            drawMixedText(line, margin, y, 10, theme.text);
            y -= 14;
          }
        }
        
        if (project.technologies?.length > 0) {
          const techText = `Tech: ${project.technologies.slice(0, 5).join(', ')}`;
          drawMixedText(techText, margin, y, 9, theme.secondary);
          y -= 14;
        }
        
        y -= 10;
        
        // Stop if running out of space
        if (y < 150) break;
      }
    }
    
    // Skills (compact)
    if (resume.content.skills?.length > 0 && y > 100) {
      this.drawSection(page, 'TECHNICAL SKILLS', margin, y, theme, boldFont);
      y -= 20;
      
      const skillsByCategory = this.groupSkills(resume.content.skills);
      
      for (const [category, skills] of Object.entries(skillsByCategory)) {
        if (y < 80) break;
        
        const categoryLabel = this.getCategoryLabel(category);
        const skillNames = skills.map(s => s.name).slice(0, 8).join(', ');
        
        drawMixedText(`${categoryLabel}: `, margin, y, 10, theme.secondary, true);
        
        const labelWidth = getMixedTextWidth(`${categoryLabel}: `, 10, true);
        const skillLines = this.wrapMixedText(skillNames, contentWidth - labelWidth, 10, false);
        
        skillLines.forEach((line, idx) => {
          drawMixedText(line, margin + (idx === 0 ? labelWidth : 0), y - (idx * 14), 10, theme.text);
        });
        
        y -= skillLines.length * 14 + 5;
      }
      
      y -= 10;
    }
    
    // Education (compact)
    if (resume.content.education?.length > 0 && y > 80) {
      this.drawSection(page, 'EDUCATION', margin, y, theme, boldFont);
      y -= 20;
      
      for (const edu of resume.content.education) {
        const degreeText = `${edu.degree} in ${edu.field}`;
        drawMixedText(degreeText, margin, y, 11, theme.text, true);
        
        const dateText = `${edu.startDate} - ${edu.endDate}`;
        const dateWidth = getMixedTextWidth(dateText, 10);
        drawMixedText(dateText, width - rightMargin - dateWidth, y, 10, theme.secondary);
        y -= 16;
        
        let institutionText = edu.institution;
        if (edu.gpa) {
          institutionText += ` • GPA: ${edu.gpa}`;
        }
        
        drawMixedText(institutionText, margin, y, 10, theme.secondary);
        
        y -= 20;
      }
    }
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    
    const sizeKB = Math.round(pdfBytes.length / 1024);
    const sizeMB = (pdfBytes.length / 1024 / 1024).toFixed(2);
    
    if (sizeKB < 1024) {
      this.logger.success(`Generated PDF: ${sizeKB}KB`);
    } else {
      this.logger.success(`Generated PDF: ${sizeMB}MB`);
    }
    
    return Buffer.from(pdfBytes);
  }
  
  private drawSection(page: any, title: string, x: number, y: number, theme: ThemeConfig, font: PDFFont): void {
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
      opacity: 0.3
    });
  }
  
  private wrapMixedText(text: string, maxWidth: number, fontSize: number, _isBold: boolean): string[] {
    const lines: string[] = [];
    let currentLine = '';
    
    // Improved word wrapping with better width calculation
    // Different character types have different widths
    const getCharWidth = (char: string): number => {
      // CJK characters are wider
      if (/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(char)) {
        return fontSize * 0.9; // CJK characters are almost square
      }
      // Numbers and uppercase letters
      if (/[A-Z0-9]/.test(char)) {
        return fontSize * 0.55;
      }
      // Lowercase letters
      if (/[a-z]/.test(char)) {
        return fontSize * 0.45;
      }
      // Punctuation and spaces
      if (/[\s\.,;:!?]/.test(char)) {
        return fontSize * 0.25;
      }
      // Default for other characters
      return fontSize * 0.5;
    };
    
    const getLineWidth = (line: string): number => {
      let width = 0;
      for (const char of line) {
        width += getCharWidth(char);
      }
      return width;
    };
    
    const words = text.split(' ');
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = getLineWidth(testLine);
      
      if (testWidth > maxWidth && currentLine) {
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
      'language': 'Languages',
      'frameworks': 'Frameworks',
      'framework': 'Frameworks',
      'databases': 'Databases',
      'database': 'Databases',
      'tools': 'Tools',
      'tool': 'Tools',
      'cloud': 'Cloud',
      'other': 'Other'
    };
    return labels[category.toLowerCase()] || category;
  }
}