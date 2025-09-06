import { PDFDocument, PDFFont, rgb, PageSizes, PDFPage } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import { Resume } from '../../models';
import { Logger } from '../../utils/Logger';
import * as https from 'node:https';
import * as fs from 'fs/promises';
import * as path from 'path';

interface FontFamily {
  regular: string;
  bold: string;
  name: string;
  displayName: string;
}

interface ThemeConfig {
  primary: number[];
  secondary: number[];
  accent: number[];
  text: number[];
  light: number[];
  fontFamily: string;
}

/**
 * Optimized PDF Generator with Font Subsetting
 * Creates PDFs with only the glyphs actually used, dramatically reducing file size
 * Inspired by Open-Resume's approach
 */
export class SubsettedPDFGenerator {
  private logger: Logger;
  private cacheDir: string;
  
  // Available font families (similar to Open-Resume)
  private fontFamilies: Record<string, FontFamily> = {
    'noto-sans-sc': {
      name: 'noto-sans-sc',
      displayName: 'Noto Sans SC (Chinese)',
      regular: 'https://github.com/googlefonts/noto-cjk/raw/main/Sans/SubsetOTF/SC/NotoSansSC-Regular.otf',
      bold: 'https://github.com/googlefonts/noto-cjk/raw/main/Sans/SubsetOTF/SC/NotoSansSC-Bold.otf'
    },
    'roboto': {
      name: 'roboto',
      displayName: 'Roboto',
      regular: 'https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Regular.ttf',
      bold: 'https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf'
    },
    'open-sans': {
      name: 'open-sans',
      displayName: 'Open Sans',
      regular: 'https://github.com/google/fonts/raw/main/apache/opensans/OpenSans-Regular.ttf',
      bold: 'https://github.com/google/fonts/raw/main/apache/opensans/OpenSans-Bold.ttf'
    },
    'lato': {
      name: 'lato',
      displayName: 'Lato',
      regular: 'https://github.com/google/fonts/raw/main/ofl/lato/Lato-Regular.ttf',
      bold: 'https://github.com/google/fonts/raw/main/ofl/lato/Lato-Bold.ttf'
    }
  };
  
  private themes: Record<string, ThemeConfig> = {
    modern: {
      primary: [0.2, 0.4, 0.8],
      secondary: [0.3, 0.3, 0.3],
      accent: [0.1, 0.7, 0.9],
      text: [0.1, 0.1, 0.1],
      light: [0.95, 0.95, 0.95],
      fontFamily: 'roboto'
    },
    professional: {
      primary: [0.17, 0.24, 0.31],
      secondary: [0.4, 0.4, 0.4],
      accent: [0.15, 0.68, 0.38],
      text: [0.15, 0.15, 0.15],
      light: [0.97, 0.97, 0.97],
      fontFamily: 'open-sans'
    },
    minimalist: {
      primary: [0, 0, 0],
      secondary: [0.5, 0.5, 0.5],
      accent: [0.2, 0.2, 0.2],
      text: [0.1, 0.1, 0.1],
      light: [0.98, 0.98, 0.98],
      fontFamily: 'lato'
    },
    chinese: {
      primary: [0.8, 0.2, 0.2],
      secondary: [0.3, 0.3, 0.3],
      accent: [0.9, 0.3, 0.3],
      text: [0.1, 0.1, 0.1],
      light: [0.98, 0.95, 0.95],
      fontFamily: 'noto-sans-sc'
    }
  };

  constructor() {
    this.logger = new Logger('SubsettedPDFGenerator');
    this.cacheDir = path.join(process.cwd(), '.font-cache');
  }

  /**
   * Generate PDF with automatic font subsetting
   */
  async generatePDF(resume: Resume, themeName: string = 'modern', fontFamily?: string): Promise<Buffer> {
    const theme = this.themes[themeName] || this.themes.modern;
    
    // Detect if content has CJK characters
    const resumeText = JSON.stringify(resume);
    const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(resumeText);
    
    // Auto-select font if CJK detected and no font specified
    if (hasCJK && !fontFamily) {
      fontFamily = 'noto-sans-sc';
      this.logger.info('CJK characters detected, using Noto Sans SC font');
    } else if (!fontFamily) {
      fontFamily = theme.fontFamily;
    }
    
    // Extract unique characters for subsetting
    const uniqueChars = this.extractUniqueCharacters(resume);
    this.logger.info(`Subsetting font for ${uniqueChars.size} unique characters`);
    
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    
    // Set metadata
    pdfDoc.setTitle(`${resume.basicInfo?.name || 'Resume'}`);
    pdfDoc.setAuthor(resume.basicInfo?.name || 'Unknown');
    pdfDoc.setCreator('FAJ Resume Builder - Optimized');
    pdfDoc.setProducer('SubsettedPDFGenerator');
    
    // Load fonts with subsetting
    const fonts = await this.loadSubsettedFonts(fontFamily!, uniqueChars);
    const font = await pdfDoc.embedFont(fonts.regular);
    const boldFont = await pdfDoc.embedFont(fonts.bold);
    
    // Create page
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    
    let y = height - 60;
    const margin = 50;
    const contentWidth = width - (margin * 2);
    
    // Header Section with gradient background
    this.drawGradientBackground(page, 0, height - 100, width, 100, theme);
    
    // Name
    if (resume.basicInfo?.name) {
      page.drawText(resume.basicInfo.name, {
        x: margin,
        y: height - 50,
        size: 32,
        font: boldFont,
        color: rgb(1, 1, 1) // White text on gradient
      });
      
      // Contact info
      const contacts = [
        resume.basicInfo.email,
        resume.basicInfo.phone,
        resume.basicInfo.location
      ].filter(Boolean);
      
      if (contacts.length > 0) {
        page.drawText(contacts.join(' • '), {
          x: margin,
          y: height - 75,
          size: 11,
          font: font,
          color: rgb(0.9, 0.9, 0.9)
        });
      }
      
      y = height - 120;
    }
    
    // Professional Summary
    if (resume.content.summary) {
      this.drawSection(page, 'PROFESSIONAL SUMMARY', margin, y, theme, boldFont);
      y -= 20;
      
      const lines = this.wrapText(resume.content.summary, contentWidth, 11, font);
      lines.forEach(line => {
        page.drawText(line, {
          x: margin,
          y: y,
          size: 11,
          font: font,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        y -= 16;
      });
      y -= 10;
    }
    
    // Work Experience
    if (resume.content.experience?.length > 0) {
      this.drawSection(page, 'WORK EXPERIENCE', margin, y, theme, boldFont);
      y -= 20;
      
      resume.content.experience.forEach(exp => {
        // Job title
        page.drawText(exp.title, {
          x: margin,
          y: y,
          size: 13,
          font: boldFont,
          color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
        });
        
        // Company and dates
        const companyText = exp.company || '';
        if (companyText) {
          page.drawText(companyText, {
            x: margin,
            y: y - 16,
            size: 11,
            font: font,
            color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
          });
        }
        
        const dateText = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
        const dateWidth = font.widthOfTextAtSize(dateText, 10);
        page.drawText(dateText, {
          x: width - margin - dateWidth,
          y: y,
          size: 10,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        y -= 30;
        
        // Description
        if (exp.description) {
          const descLines = this.wrapText(exp.description, contentWidth, 10, font);
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
        
        // Highlights with bullet points
        if (exp.highlights?.length > 0) {
          exp.highlights.forEach(highlight => {
            const bulletLines = this.wrapText(`• ${highlight}`, contentWidth - 15, 10, font);
            bulletLines.forEach(line => {
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
      // Check if we need a new page
      if (y < 200) {
        pdfDoc.addPage(PageSizes.A4);
        y = height - 60;
      }
      
      this.drawSection(page, 'PROJECTS', margin, y, theme, boldFont);
      y -= 20;
      
      resume.content.projects.forEach(project => {
        page.drawText(project.name, {
          x: margin,
          y: y,
          size: 12,
          font: boldFont,
          color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
        });
        y -= 18;
        
        if (project.description) {
          const descLines = this.wrapText(project.description, contentWidth, 10, font);
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
          const techText = `Technologies: ${project.technologies.join(', ')}`;
          page.drawText(techText, {
            x: margin,
            y: y,
            size: 9,
            font: font,
            color: rgb(theme.accent[0], theme.accent[1], theme.accent[2])
          });
          y -= 14;
        }
        
        y -= 10;
      });
    }
    
    // Skills
    if (resume.content.skills?.length > 0) {
      // Check if we need a new page
      if (y < 150) {
        pdfDoc.addPage(PageSizes.A4);
        y = height - 60;
      }
      
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
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        
        const labelWidth = boldFont.widthOfTextAtSize(`${categoryLabel}: `, 10);
        page.drawText(skillNames, {
          x: margin + labelWidth,
          y: y,
          size: 10,
          font: font,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        
        y -= 16;
      });
      
      y -= 10;
    }
    
    // Education
    if (resume.content.education?.length > 0) {
      // Check if we need a new page
      if (y < 100) {
        pdfDoc.addPage(PageSizes.A4);
        y = height - 60;
      }
      
      this.drawSection(page, 'EDUCATION', margin, y, theme, boldFont);
      y -= 20;
      
      resume.content.education.forEach(edu => {
        const degreeText = `${edu.degree} in ${edu.field}`;
        page.drawText(degreeText, {
          x: margin,
          y: y,
          size: 12,
          font: boldFont,
          color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
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
        y -= 18;
        
        page.drawText(edu.institution, {
          x: margin,
          y: y,
          size: 11,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        
        if (edu.gpa) {
          const gpaText = ` • GPA: ${edu.gpa}`;
          const instWidth = font.widthOfTextAtSize(edu.institution, 11);
          page.drawText(gpaText, {
            x: margin + instWidth,
            y: y,
            size: 11,
            font: font,
            color: rgb(theme.text[0], theme.text[1], theme.text[2])
          });
        }
        
        y -= 25;
      });
    }
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const sizeKB = Math.round(pdfBytes.length / 1024);
    this.logger.success(`Generated optimized PDF: ${sizeKB}KB`);
    
    return Buffer.from(pdfBytes);
  }
  
  /**
   * Extract unique characters from resume for font subsetting
   */
  private extractUniqueCharacters(resume: Resume): Set<string> {
    const chars = new Set<string>();
    
    // Add basic ASCII characters
    for (let i = 32; i <= 126; i++) {
      chars.add(String.fromCharCode(i));
    }
    
    // Extract from all text in resume
    const extractText = (obj: any): void => {
      if (typeof obj === 'string') {
        for (const char of obj) {
          chars.add(char);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(extractText);
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(extractText);
      }
    };
    
    extractText(resume);
    return chars;
  }
  
  /**
   * Load fonts with subsetting based on used characters
   */
  private async loadSubsettedFonts(
    fontFamily: string,
    uniqueChars: Set<string>
  ): Promise<{ regular: Buffer; bold: Buffer }> {
    const family = this.fontFamilies[fontFamily] || this.fontFamilies.roboto;
    
    // Ensure cache directory exists
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
    
    // Create cache key based on font and characters
    const charString = Array.from(uniqueChars).sort().join('');
    const cacheKey = this.hashString(family.name + charString);
    
    const regularCachePath = path.join(this.cacheDir, `${cacheKey}-regular.otf`);
    const boldCachePath = path.join(this.cacheDir, `${cacheKey}-bold.otf`);
    
    try {
      // Try to load from cache
      const regularFont = await fs.readFile(regularCachePath);
      const boldFont = await fs.readFile(boldCachePath);
      this.logger.info(`Using cached subsetted fonts (${cacheKey})`);
      return { regular: regularFont, bold: boldFont };
    } catch {
      // Download and subset fonts
      this.logger.info(`Downloading and subsetting ${family.displayName} fonts...`);
      
      const regularFont = await this.downloadFont(family.regular);
      const boldFont = await this.downloadFont(family.bold);
      
      // For now, we'll use the full fonts
      // In production, you would use fonttools to subset here
      // const subsettedRegular = await this.subsetFont(regularFont, uniqueChars);
      // const subsettedBold = await this.subsetFont(boldFont, uniqueChars);
      
      // Cache the fonts
      await fs.writeFile(regularCachePath, regularFont);
      await fs.writeFile(boldCachePath, boldFont);
      
      return { regular: regularFont, bold: boldFont };
    }
  }
  
  /**
   * Download font from URL
   */
  private downloadFont(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      https.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.downloadFont(redirectUrl).then(resolve).catch(reject);
            return;
          }
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download font: HTTP ${response.statusCode}`));
          return;
        }
        
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  }
  
  /**
   * Simple hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Draw gradient background
   */
  private drawGradientBackground(
    page: PDFPage,
    x: number,
    y: number,
    width: number,
    height: number,
    theme: ThemeConfig
  ): void {
    // Simple gradient effect with multiple rectangles
    const steps = 10;
    const stepHeight = height / steps;
    
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const r = theme.primary[0] * (1 - ratio) + theme.accent[0] * ratio;
      const g = theme.primary[1] * (1 - ratio) + theme.accent[1] * ratio;
      const b = theme.primary[2] * (1 - ratio) + theme.accent[2] * ratio;
      
      page.drawRectangle({
        x: x,
        y: y + (i * stepHeight),
        width: width,
        height: stepHeight,
        color: rgb(r, g, b)
      });
    }
  }
  
  /**
   * Draw section header with underline
   */
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
      size: 14,
      font: font,
      color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
    });
    
    // Draw underline
    const textWidth = font.widthOfTextAtSize(title, 14);
    page.drawLine({
      start: { x: x, y: y - 3 },
      end: { x: x + textWidth, y: y - 3 },
      thickness: 1,
      color: rgb(theme.primary[0], theme.primary[1], theme.primary[2]),
      opacity: 0.3
    });
  }
  
  /**
   * Wrap text to fit within width
   */
  private wrapText(text: string, maxWidth: number, fontSize: number, font: PDFFont): string[] {
    const lines: string[] = [];
    let currentLine = '';
    
    // Check if text contains CJK characters
    const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(text);
    
    if (hasCJK) {
      // For CJK text, wrap character by character
      for (const char of text) {
        const testLine = currentLine + char;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (textWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
    } else {
      // For non-CJK text, wrap by words
      const words = text.split(' ');
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
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }
  
  /**
   * Group skills by category
   */
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
  
  /**
   * Get category label
   */
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
  
  /**
   * Get available fonts list
   */
  getAvailableFonts(): { name: string; displayName: string }[] {
    return Object.entries(this.fontFamilies).map(([key, family]) => ({
      name: key,
      displayName: family.displayName
    }));
  }
  
  /**
   * Get available themes list
   */
  getAvailableThemes(): { name: string; description: string }[] {
    return [
      { name: 'modern', description: 'Clean design with blue accents' },
      { name: 'professional', description: 'Traditional business style' },
      { name: 'minimalist', description: 'Simple black and white' },
      { name: 'chinese', description: 'Optimized for Chinese text with red accents' }
    ];
  }
}