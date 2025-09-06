import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, PageSizes } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import { Resume } from '../../models';
import { Logger } from '../../utils/Logger';
import { SystemFontLoader } from './SystemFontLoader';
import { CDNFontLoader } from './CDNFontLoader';

interface ThemeConfig {
  primary: number[];
  secondary: number[];
  accent: number[];
  text: number[];
  light: number[];
  background: number[];
}

export class ElegantPDFGenerator {
  private logger: Logger;
  private themes: Record<string, ThemeConfig> = {
    modern: {
      primary: [0.4, 0.49, 0.92],     // #667eea - Purple blue
      secondary: [0.46, 0.29, 0.64],   // #764ba2 - Purple
      accent: [0.20, 0.60, 0.86],      // #3498db - Sky blue
      text: [0.13, 0.13, 0.13],        // #212121 - Almost black
      light: [0.96, 0.96, 0.98],       // #f5f5fa - Light gray
      background: [0.98, 0.98, 1.0]    // #fafaff - Very light blue
    },
    professional: {
      primary: [0.17, 0.24, 0.31],     // #2c3e50 - Dark blue gray
      secondary: [0.52, 0.58, 0.64],   // #85929e - Medium gray
      accent: [0.15, 0.68, 0.38],      // #27ae60 - Green
      text: [0.17, 0.17, 0.17],        // #2b2b2b - Dark gray
      light: [0.95, 0.96, 0.97],       // #f3f4f6 - Light gray
      background: [1.0, 1.0, 1.0]      // #ffffff - White
    },
    minimalist: {
      primary: [0, 0, 0],               // #000000 - Black
      secondary: [0.4, 0.4, 0.4],       // #666666 - Gray
      accent: [0.2, 0.2, 0.2],          // #333333 - Dark gray
      text: [0.1, 0.1, 0.1],            // #1a1a1a - Near black
      light: [0.97, 0.97, 0.97],        // #f7f7f7 - Light gray
      background: [1.0, 1.0, 1.0]       // #ffffff - White
    }
  };

  constructor() {
    this.logger = new Logger('ElegantPDFGenerator');
  }

  async generatePDF(resume: Resume, themeName: string = 'modern'): Promise<Buffer> {
    const theme = this.themes[themeName] || this.themes.modern;
    
    // Create PDF document with metadata
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`${resume.basicInfo?.name || 'Resume'} - Resume`);
    pdfDoc.setAuthor(resume.basicInfo?.name || 'Unknown');
    pdfDoc.setCreator('FAJ Resume Builder');
    pdfDoc.setProducer('FAJ');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());
    
    // Register fontkit for custom fonts
    pdfDoc.registerFontkit(fontkit);

    // Load fonts with CJK support
    const { font, boldFont } = await this.loadFonts(pdfDoc);
    
    // Create page with A4 size
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    
    // Draw based on theme
    switch (themeName) {
      case 'minimalist':
        await this.drawMinimalistTheme(page, resume, theme, font, boldFont, width, height);
        break;
      case 'professional':
        await this.drawProfessionalTheme(page, resume, theme, font, boldFont, width, height);
        break;
      default: // modern
        await this.drawModernTheme(page, resume, theme, font, boldFont, width, height);
        break;
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async loadFonts(pdfDoc: PDFDocument): Promise<{ font: PDFFont; boldFont: PDFFont }> {
    let font: PDFFont;
    let boldFont: PDFFont;
    
    try {
      // Try system fonts first
      const systemFontLoader = new SystemFontLoader();
      const systemFonts = await systemFontLoader.findSystemFonts();
      
      if (systemFonts.regular && systemFonts.bold) {
        font = await pdfDoc.embedFont(systemFonts.regular);
        boldFont = await pdfDoc.embedFont(systemFonts.bold);
        this.logger.info('Using system CJK fonts');
      } else {
        // Load from CDN
        const cdnLoader = new CDNFontLoader();
        const cdnFonts = await cdnLoader.loadFonts();
        font = await pdfDoc.embedFont(cdnFonts.regular);
        boldFont = await pdfDoc.embedFont(cdnFonts.bold);
        this.logger.info('Using CDN fonts');
      }
    } catch (error) {
      // Fallback
      this.logger.warn('Using standard fonts as fallback');
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }
    
    return { font, boldFont };
  }

  private async drawModernTheme(
    page: PDFPage,
    resume: Resume,
    theme: ThemeConfig,
    font: PDFFont,
    boldFont: PDFFont,
    width: number,
    height: number
  ): Promise<void> {
    let y = height - 40;
    const margin = 50;
    const contentWidth = width - (margin * 2);
    
    // Modern gradient header background
    page.drawRectangle({
      x: 0,
      y: height - 120,
      width: width,
      height: 120,
      color: rgb(theme.primary[0], theme.primary[1], theme.primary[2]),
      opacity: 0.05
    });
    
    // Draw decorative accent line at top
    page.drawRectangle({
      x: 0,
      y: height - 3,
      width: width,
      height: 3,
      color: rgb(theme.accent[0], theme.accent[1], theme.accent[2])
    });
    
    // Name with modern styling
    if (resume.basicInfo?.name) {
      const nameSize = 32;
      page.drawText(resume.basicInfo.name, {
        x: margin,
        y: y,
        size: nameSize,
        font: boldFont,
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
      });
      y -= 45;
    }
    
    // Contact info with icons simulation
    const contactY = y;
    if (resume.basicInfo) {
      const contactSize = 10;
      let contactX = margin;
      
      const contacts = [
        resume.basicInfo.email,
        resume.basicInfo.phone,
        resume.basicInfo.location,
        resume.basicInfo.githubUrl
      ].filter(Boolean);
      
      contacts.forEach((contact) => {
        if (contact) {
          // Draw small circle as icon placeholder
          page.drawCircle({
            x: contactX + 4,
            y: contactY + 4,
            size: 3,
            color: rgb(theme.accent[0], theme.accent[1], theme.accent[2]),
            opacity: 0.7
          });
          
          page.drawText(contact, {
            x: contactX + 12,
            y: contactY,
            size: contactSize,
            font: font,
            color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
          });
          
          contactX += this.getTextWidth(contact, font, contactSize) + 30;
        }
      });
      
      y -= 35;
    }
    
    // Modern section divider
    this.drawGradientLine(page, margin, y, contentWidth, theme);
    y -= 25;
    
    // Professional Summary with card-like background
    if (resume.content.summary) {
      this.drawSectionHeader(page, 'PROFESSIONAL SUMMARY', margin, y, theme, boldFont, 'modern', width, margin);
      y -= 25;
      
      // Light background for summary
      const summaryLines = this.wrapText(resume.content.summary, contentWidth - 20, 11, font);
      const summaryHeight = summaryLines.length * 16 + 10;
      
      page.drawRectangle({
        x: margin - 5,
        y: y - summaryHeight + 10,
        width: contentWidth + 10,
        height: summaryHeight,
        color: rgb(theme.light[0], theme.light[1], theme.light[2]),
        borderColor: rgb(theme.accent[0], theme.accent[1], theme.accent[2]),
        borderWidth: 0.5,
        borderOpacity: 0.3
      });
      
      summaryLines.forEach(line => {
        page.drawText(line, {
          x: margin + 5,
          y: y,
          size: 11,
          font: font,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        y -= 16;
      });
      y -= 20;
    }
    
    // Experience Section with timeline
    if (resume.content.experience?.length > 0) {
      this.drawSectionHeader(page, 'PROFESSIONAL EXPERIENCE', margin, y, theme, boldFont, 'modern', width, margin);
      y -= 25;
      
      resume.content.experience.forEach((exp, index) => {
        // Timeline dot
        page.drawCircle({
          x: margin - 10,
          y: y + 6,
          size: 4,
          color: rgb(theme.accent[0], theme.accent[1], theme.accent[2])
        });
        
        // Timeline line (if not last item)
        if (index < resume.content.experience.length - 1) {
          page.drawLine({
            start: { x: margin - 10, y: y + 2 },
            end: { x: margin - 10, y: y - 80 },
            thickness: 1,
            color: rgb(theme.accent[0], theme.accent[1], theme.accent[2]),
            opacity: 0.3
          });
        }
        
        // Job title and company
        page.drawText(exp.title, {
          x: margin + 5,
          y: y,
          size: 13,
          font: boldFont,
          color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
        });
        
        page.drawText(` @ ${exp.company}`, {
          x: margin + 5 + this.getTextWidth(exp.title, boldFont, 13),
          y: y,
          size: 12,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        
        // Date on the right
        const dateText = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
        this.drawCompactText(
          page,
          dateText,
          width - margin - this.getTextWidth(dateText, font, 10),
          y,
          10,
          font,
          [theme.secondary[0], theme.secondary[1], theme.secondary[2]]
        );
        y -= 20;
        
        // Description
        if (exp.description) {
          const descLines = this.wrapText(exp.description, contentWidth - 10, 10, font);
          descLines.forEach(line => {
            page.drawText(line, {
              x: margin + 5,
              y: y,
              size: 10,
              font: font,
              color: rgb(theme.text[0], theme.text[1], theme.text[2])
            });
            y -= 14;
          });
        }
        
        // Highlights with modern bullets
        if (exp.highlights?.length > 0) {
          y -= 5;
          exp.highlights.slice(0, 3).forEach(highlight => {
            // Modern bullet point
            page.drawRectangle({
              x: margin + 15,
              y: y + 3,
              width: 3,
              height: 3,
              color: rgb(theme.accent[0], theme.accent[1], theme.accent[2])
            });
            
            const highlightLines = this.wrapText(highlight, contentWidth - 30, 10, font);
            highlightLines.forEach(line => {
              page.drawText(line, {
                x: margin + 25,
                y: y,
                size: 10,
                font: font,
                color: rgb(theme.text[0], theme.text[1], theme.text[2])
              });
              y -= 14;
            });
          });
        }
        
        y -= 20;
      });
    }
    
    // Projects Section with modern styling
    if (resume.content.projects?.length > 0) {
      this.drawSectionHeader(page, 'KEY PROJECTS', margin, y, theme, boldFont, 'modern', width, margin);
      y -= 25;
      
      resume.content.projects.slice(0, 3).forEach(project => {
        // Project icon placeholder
        page.drawRectangle({
          x: margin,
          y: y + 4,
          width: 3,
          height: 10,
          color: rgb(theme.accent[0], theme.accent[1], theme.accent[2])
        });
        
        // Project name
        page.drawText(project.name, {
          x: margin + 8,
          y: y,
          size: 12,
          font: boldFont,
          color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
        });
        
        if (project.role) {
          page.drawText(` - ${project.role}`, {
            x: margin + 8 + this.getTextWidth(project.name, boldFont, 12),
            y: y,
            size: 11,
            font: font,
            color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
          });
        }
        y -= 18;
        
        // Project description
        if (project.description) {
          const descLines = this.wrapText(project.description, contentWidth - 10, 10, font);
          descLines.forEach(line => {
            page.drawText(line, {
              x: margin + 8,
              y: y,
              size: 10,
              font: font,
              color: rgb(theme.text[0], theme.text[1], theme.text[2])
            });
            y -= 14;
          });
        }
        
        // Project highlights
        if (project.highlights?.length > 0) {
          project.highlights.slice(0, 2).forEach(highlight => {
            page.drawCircle({
              x: margin + 18,
              y: y + 3,
              size: 2,
              color: rgb(theme.accent[0], theme.accent[1], theme.accent[2]),
              opacity: 0.7
            });
            
            const highlightLines = this.wrapText(highlight, contentWidth - 30, 9, font);
            highlightLines.forEach(line => {
              page.drawText(line, {
                x: margin + 25,
                y: y,
                size: 9,
                font: font,
                color: rgb(theme.text[0], theme.text[1], theme.text[2])
              });
              y -= 13;
            });
          });
        }
        
        // Technologies used
        if (project.technologies?.length > 0) {
          y -= 5;
          const techText = `Tech: ${project.technologies.slice(0, 5).join(', ')}`;
          page.drawText(techText, {
            x: margin + 8,
            y: y,
            size: 9,
            font: font,
            color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2]),
            opacity: 0.8
          });
          y -= 15;
        }
        
        y -= 10;
      });
    }
    
    // Skills Section with tags
    if (resume.content.skills?.length > 0) {
      this.drawSectionHeader(page, 'TECHNICAL SKILLS', margin, y, theme, boldFont, 'modern', width, margin);
      y -= 25;
      
      const skillsByCategory = this.groupSkills(resume.content.skills);
      Object.entries(skillsByCategory).forEach(([category, skills]) => {
        // Category label
        page.drawText(this.getCategoryLabel(category), {
          x: margin,
          y: y,
          size: 10,
          font: boldFont,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        
        // Skills as tags
        let tagX = margin + 100;
        skills.slice(0, 10).forEach((skill, idx) => {
          const skillText = skill.name;
          const skillWidth = this.getTextWidth(skillText, font, 9);
          
          // Tag background
          page.drawRectangle({
            x: tagX - 3,
            y: y - 3,
            width: skillWidth + 6,
            height: 14,
            color: rgb(theme.accent[0], theme.accent[1], theme.accent[2]),
            opacity: 0.1,
            borderColor: rgb(theme.accent[0], theme.accent[1], theme.accent[2]),
            borderWidth: 0.5,
            borderOpacity: 0.3
          });
          
          page.drawText(skillText, {
            x: tagX,
            y: y,
            size: 9,
            font: font,
            color: rgb(theme.text[0], theme.text[1], theme.text[2])
          });
          
          tagX += skillWidth + 12;
          
          // Wrap to next line if needed
          if (tagX > width - margin - 50 && idx < skills.length - 1) {
            tagX = margin + 100;
            y -= 20;
          }
        });
        y -= 25;
      });
    }
    
    // Education Section
    if (resume.content.education?.length > 0) {
      this.drawSectionHeader(page, 'EDUCATION', margin, y, theme, boldFont, 'modern', width, margin);
      y -= 25;
      
      resume.content.education.forEach(edu => {
        // Degree icon placeholder
        page.drawRectangle({
          x: margin,
          y: y,
          width: 4,
          height: 14,
          color: rgb(theme.accent[0], theme.accent[1], theme.accent[2])
        });
        
        page.drawText(`${edu.degree} in ${edu.field}`, {
          x: margin + 10,
          y: y,
          size: 12,
          font: boldFont,
          color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
        });
        
        const eduDate = `${edu.startDate} - ${edu.endDate}`;
        this.drawCompactText(
          page,
          eduDate,
          width - margin - this.getTextWidth(eduDate, font, 10),
          y,
          10,
          font,
          [theme.secondary[0], theme.secondary[1], theme.secondary[2]]
        );
        y -= 18;
        
        page.drawText(edu.institution, {
          x: margin + 10,
          y: y,
          size: 11,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        
        if (edu.gpa) {
          page.drawText(` • GPA: ${edu.gpa}`, {
            x: margin + 10 + this.getTextWidth(edu.institution, font, 11),
            y: y,
            size: 10,
            font: font,
            color: rgb(theme.text[0], theme.text[1], theme.text[2])
          });
        }
        
        y -= 25;
      });
    }
  }

  private async drawProfessionalTheme(
    page: PDFPage,
    resume: Resume,
    theme: ThemeConfig,
    font: PDFFont,
    boldFont: PDFFont,
    width: number,
    height: number
  ): Promise<void> {
    let y = height - 50;
    const margin = 60;
    const contentWidth = width - (margin * 2);
    
    // Professional header with clean lines
    if (resume.basicInfo?.name) {
      // Name in classic style
      const nameSize = 28;
      const nameWidth = this.getTextWidth(resume.basicInfo.name || '', boldFont, nameSize);
      page.drawText(resume.basicInfo.name, {
        x: (width - nameWidth) / 2,
        y: y,
        size: nameSize,
        font: boldFont,
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
      });
      y -= 35;
      
      // Professional title line
      page.drawLine({
        start: { x: margin, y: y + 10 },
        end: { x: width - margin, y: y + 10 },
        thickness: 2,
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
      });
      
      // Contact information centered
      if (resume.basicInfo) {
        const contactItems = [
          resume.basicInfo.email,
          resume.basicInfo.phone,
          resume.basicInfo.location
        ].filter(Boolean);
        
        const contactText = contactItems.join(' • ');
        const contactWidth = this.getTextWidth(contactText, font, 10);
        
        page.drawText(contactText, {
          x: (width - contactWidth) / 2,
          y: y - 8,
          size: 10,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        
        y -= 35;
      }
    }
    
    // Professional Summary
    if (resume.content.summary) {
      this.drawSectionHeader(page, 'PROFESSIONAL SUMMARY', margin, y, theme, boldFont, 'professional', width, margin);
      y -= 20;
      
      const summaryLines = this.wrapText(resume.content.summary, contentWidth, 11, font);
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
    
    // Experience Section
    if (resume.content.experience?.length > 0) {
      this.drawSectionHeader(page, 'PROFESSIONAL EXPERIENCE', margin, y, theme, boldFont, 'professional', width, margin);
      y -= 20;
      
      resume.content.experience.forEach(exp => {
        // Traditional format
        page.drawText(exp.title, {
          x: margin,
          y: y,
          size: 12,
          font: boldFont,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        
        const dateText = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
        this.drawCompactText(
          page,
          dateText,
          width - margin - this.getTextWidth(dateText, font, 10),
          y,
          10,
          font,
          [theme.secondary[0], theme.secondary[1], theme.secondary[2]]
        );
        y -= 16;
        
        page.drawText(exp.company || '', {
          x: margin,
          y: y,
          size: 11,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2]),
          opacity: 0.9
        });
        y -= 18;
        
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
        
        if (exp.highlights?.length > 0) {
          y -= 3;
          exp.highlights.slice(0, 4).forEach(highlight => {
            page.drawText('•', {
              x: margin + 10,
              y: y,
              size: 10,
              font: font,
              color: rgb(theme.text[0], theme.text[1], theme.text[2])
            });
            
            const highlightLines = this.wrapText(highlight, contentWidth - 20, 10, font);
            highlightLines.forEach((line, idx) => {
              page.drawText(line, {
                x: margin + 20,
                y: y,
                size: 10,
                font: font,
                color: rgb(theme.text[0], theme.text[1], theme.text[2])
              });
              if (idx < highlightLines.length - 1) y -= 14;
            });
            y -= 14;
          });
        }
        
        y -= 18;
      });
    }
    
    // Projects Section - Professional format
    if (resume.content.projects?.length > 0) {
      this.drawSectionHeader(page, 'PROJECTS', margin, y, theme, boldFont, 'professional', width, margin);
      y -= 20;
      
      resume.content.projects.slice(0, 3).forEach(project => {
        // Project name and role
        page.drawText(project.name, {
          x: margin,
          y: y,
          size: 11,
          font: boldFont,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        
        if (project.role) {
          page.drawText(` | ${project.role}`, {
            x: margin + this.getTextWidth(project.name, boldFont, 11),
            y: y,
            size: 10,
            font: font,
            color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
          });
        }
        y -= 16;
        
        // Project description
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
        
        // Project achievements
        if (project.highlights?.length > 0) {
          project.highlights.slice(0, 3).forEach(highlight => {
            page.drawText('•', {
              x: margin + 10,
              y: y,
              size: 10,
              font: font,
              color: rgb(theme.text[0], theme.text[1], theme.text[2])
            });
            
            const highlightLines = this.wrapText(highlight, contentWidth - 20, 10, font);
            highlightLines.forEach((line, idx) => {
              page.drawText(line, {
                x: margin + 20,
                y: y,
                size: 10,
                font: font,
                color: rgb(theme.text[0], theme.text[1], theme.text[2])
              });
              if (idx < highlightLines.length - 1) y -= 14;
            });
            y -= 14;
          });
        }
        
        // Technologies
        if (project.technologies?.length > 0) {
          const techText = `Technologies: ${project.technologies.join(', ')}`;
          const techLines = this.wrapText(techText, contentWidth, 9, font);
          techLines.forEach(line => {
            page.drawText(line, {
              x: margin,
              y: y,
              size: 9,
              font: font,
              color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
            });
            y -= 13;
          });
        }
        
        y -= 15;
      });
    }
    
    // Skills Section - Traditional format
    if (resume.content.skills?.length > 0) {
      this.drawSectionHeader(page, 'TECHNICAL SKILLS', margin, y, theme, boldFont, 'professional', width, margin);
      y -= 20;
      
      const skillsByCategory = this.groupSkills(resume.content.skills);
      Object.entries(skillsByCategory).forEach(([category, skills]) => {
        const categoryLabel = this.getCategoryLabel(category);
        page.drawText(`${categoryLabel}:`, {
          x: margin,
          y: y,
          size: 10,
          font: boldFont,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        
        const skillNames = skills.map(s => s.name).join(', ');
        const skillLines = this.wrapText(skillNames, contentWidth - 120, 10, font);
        skillLines.forEach((line, idx) => {
          page.drawText(line, {
            x: margin + 120,
            y: y - (idx * 14),
            size: 10,
            font: font,
            color: rgb(theme.text[0], theme.text[1], theme.text[2])
          });
        });
        y -= (skillLines.length * 14) + 8;
      });
      y -= 10;
    }
    
    // Education Section
    if (resume.content.education?.length > 0) {
      this.drawSectionHeader(page, 'EDUCATION', margin, y, theme, boldFont, 'professional', width, margin);
      y -= 20;
      
      resume.content.education.forEach(edu => {
        page.drawText(`${edu.degree} in ${edu.field}`, {
          x: margin,
          y: y,
          size: 11,
          font: boldFont,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        
        const eduDate = `${edu.startDate} - ${edu.endDate}`;
        this.drawCompactText(
          page,
          eduDate,
          width - margin - this.getTextWidth(eduDate, font, 10),
          y,
          10,
          font,
          [theme.secondary[0], theme.secondary[1], theme.secondary[2]]
        );
        y -= 16;
        
        page.drawText(edu.institution, {
          x: margin,
          y: y,
          size: 10,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        
        if (edu.gpa) {
          y -= 14;
          page.drawText(`GPA: ${edu.gpa}`, {
            x: margin,
            y: y,
            size: 10,
            font: font,
            color: rgb(theme.text[0], theme.text[1], theme.text[2])
          });
        }
        
        y -= 20;
      });
    }
  }

  private async drawMinimalistTheme(
    page: PDFPage,
    resume: Resume,
    theme: ThemeConfig,
    font: PDFFont,
    _boldFont: PDFFont,
    width: number,
    height: number
  ): Promise<void> {
    let y = height - 60;
    const margin = 70;
    const contentWidth = width - (margin * 2);
    
    // Minimalist header - just the name
    if (resume.basicInfo?.name) {
      const nameSize = 24;
      page.drawText(resume.basicInfo.name, {
        x: margin,
        y: y,
        size: nameSize,
        font: font, // Using regular font for minimalist
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
      });
      y -= 30;
      
      // Simple contact line
      const contacts = [
        resume.basicInfo.email,
        resume.basicInfo.phone,
        resume.basicInfo.location
      ].filter(Boolean).join('  ');
      
      if (contacts) {
        page.drawText(contacts, {
          x: margin,
          y: y,
          size: 9,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        y -= 30;
      }
      
      // Thin separator line
      page.drawLine({
        start: { x: margin, y: y },
        end: { x: width - margin, y: y },
        thickness: 0.5,
        color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2]),
        opacity: 0.3
      });
      y -= 25;
    }
    
    // Summary - no header, just text
    if (resume.content.summary) {
      const summaryLines = this.wrapText(resume.content.summary, contentWidth, 10, font);
      summaryLines.forEach(line => {
        page.drawText(line, {
          x: margin,
          y: y,
          size: 10,
          font: font,
          color: rgb(theme.text[0], theme.text[1], theme.text[2]),
          opacity: 0.9
        });
        y -= 15;
      });
      y -= 20;
    }
    
    // Experience - minimal styling
    if (resume.content.experience?.length > 0) {
      page.drawText('Experience', {
        x: margin,
        y: y,
        size: 11,
        font: font,
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
      });
      y -= 20;
      
      resume.content.experience.forEach(exp => {
        // Simple layout
        page.drawText(`${exp.title}, ${exp.company}`, {
          x: margin,
          y: y,
          size: 10,
          font: font,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        
        const dateText = `${exp.startDate} - ${exp.current ? 'Now' : exp.endDate}`;
        page.drawText(dateText, {
          x: width - margin - this.getTextWidth(dateText, font, 9),
          y: y,
          size: 9,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        y -= 16;
        
        if (exp.description) {
          const descLines = this.wrapText(exp.description, contentWidth, 9, font);
          descLines.forEach(line => {
            page.drawText(line, {
              x: margin,
              y: y,
              size: 9,
              font: font,
              color: rgb(theme.text[0], theme.text[1], theme.text[2]),
              opacity: 0.8
            });
            y -= 13;
          });
        }
        
        if (exp.highlights?.length > 0) {
          exp.highlights.slice(0, 2).forEach(highlight => {
            const highlightLines = this.wrapText(`– ${highlight}`, contentWidth, 9, font);
            highlightLines.forEach(line => {
              page.drawText(line, {
                x: margin + 10,
                y: y,
                size: 9,
                font: font,
                color: rgb(theme.text[0], theme.text[1], theme.text[2]),
                opacity: 0.7
              });
              y -= 13;
            });
          });
        }
        
        y -= 15;
      });
    }
    
    // Projects - minimalist style
    if (resume.content.projects?.length > 0) {
      page.drawText('Projects', {
        x: margin,
        y: y,
        size: 11,
        font: font,
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
      });
      y -= 20;
      
      resume.content.projects.slice(0, 2).forEach(project => {
        // Simple project listing
        page.drawText(project.name, {
          x: margin,
          y: y,
          size: 10,
          font: font,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        y -= 14;
        
        if (project.description) {
          const descLines = this.wrapText(project.description, contentWidth, 9, font);
          descLines.forEach(line => {
            page.drawText(line, {
              x: margin,
              y: y,
              size: 9,
              font: font,
              color: rgb(theme.text[0], theme.text[1], theme.text[2]),
              opacity: 0.8
            });
            y -= 13;
          });
        }
        
        if (project.technologies?.length > 0) {
          const techText = project.technologies.slice(0, 5).join(' · ');
          page.drawText(techText, {
            x: margin,
            y: y,
            size: 8,
            font: font,
            color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2]),
            opacity: 0.7
          });
          y -= 13;
        }
        
        y -= 10;
      });
    }
    
    // Skills - inline simple format
    if (resume.content.skills?.length > 0) {
      page.drawText('Skills', {
        x: margin,
        y: y,
        size: 11,
        font: font,
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
      });
      y -= 18;
      
      const allSkills = resume.content.skills.map(s => s.name).join(' · ');
      const skillLines = this.wrapText(allSkills, contentWidth, 9, font);
      skillLines.forEach(line => {
        page.drawText(line, {
          x: margin,
          y: y,
          size: 9,
          font: font,
          color: rgb(theme.text[0], theme.text[1], theme.text[2]),
          opacity: 0.8
        });
        y -= 13;
      });
      y -= 15;
    }
    
    // Education - minimal
    if (resume.content.education?.length > 0) {
      page.drawText('Education', {
        x: margin,
        y: y,
        size: 11,
        font: font,
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
      });
      y -= 18;
      
      resume.content.education.forEach(edu => {
        page.drawText(`${edu.degree}, ${edu.institution}`, {
          x: margin,
          y: y,
          size: 9,
          font: font,
          color: rgb(theme.text[0], theme.text[1], theme.text[2])
        });
        
        const eduDate = `${edu.endDate}`;
        page.drawText(eduDate, {
          x: width - margin - this.getTextWidth(eduDate, font, 9),
          y: y,
          size: 9,
          font: font,
          color: rgb(theme.secondary[0], theme.secondary[1], theme.secondary[2])
        });
        
        y -= 20;
      });
    }
  }

  private drawSectionHeader(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    theme: ThemeConfig,
    font: PDFFont,
    style: 'modern' | 'professional' | 'minimalist',
    width: number = 595,
    margin: number = 60
  ): void {
    if (style === 'modern') {
      // Modern style with accent color and underline
      page.drawText(text, {
        x: x,
        y: y,
        size: 13,
        font: font,
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
      });
      
      // Gradient underline
      const textWidth = this.getTextWidth(text, font, 13);
      page.drawRectangle({
        x: x,
        y: y - 4,
        width: textWidth,
        height: 2,
        color: rgb(theme.accent[0], theme.accent[1], theme.accent[2]),
        opacity: 0.6
      });
    } else if (style === 'professional') {
      // Professional style with full underline
      page.drawText(text, {
        x: x,
        y: y,
        size: 12,
        font: font,
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
      });
      
      page.drawLine({
        start: { x: x, y: y - 4 },
        end: { x: width - margin, y: y - 4 },
        thickness: 1,
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2]),
        opacity: 0.3
      });
    } else {
      // Minimalist - just text
      page.drawText(text.charAt(0) + text.slice(1).toLowerCase(), {
        x: x,
        y: y,
        size: 11,
        font: font,
        color: rgb(theme.primary[0], theme.primary[1], theme.primary[2])
      });
    }
  }

  private drawGradientLine(
    page: PDFPage,
    x: number,
    y: number,
    width: number,
    theme: ThemeConfig
  ): void {
    // Simulate gradient with multiple rectangles
    const segments = 20;
    const segmentWidth = width / segments;
    
    for (let i = 0; i < segments; i++) {
      const opacity = 0.1 + (0.2 * (i / segments));
      page.drawRectangle({
        x: x + (i * segmentWidth),
        y: y,
        width: segmentWidth + 1,
        height: 1,
        color: rgb(theme.accent[0], theme.accent[1], theme.accent[2]),
        opacity: opacity
      });
    }
  }

  private wrapText(text: string, maxWidth: number, fontSize: number, font: PDFFont): string[] {
    const lines: string[] = [];
    let currentLine = '';
    
    // Check if text contains CJK characters
    const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(text);
    
    if (hasCJK) {
      // For CJK text, wrap character by character
      for (const char of text) {
        const testLine = currentLine + char;
        try {
          const textWidth = this.getTextWidth(testLine, font, fontSize);
          if (textWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        } catch {
          currentLine = testLine;
        }
      }
    } else {
      // For non-CJK text, wrap by words
      const words = text.split(' ');
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        try {
          const textWidth = this.getTextWidth(testLine, font, fontSize);
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
  }

  private getTextWidth(text: string, font: PDFFont, size: number): number {
    try {
      const width = font.widthOfTextAtSize(text, size);
      // Adjust for CJK fonts that may have wider number spacing
      if (/\d/.test(text) && /[\u4e00-\u9fff]/.test(text)) {
        // If text contains both numbers and CJK, apply adjustment
        return width * 0.95;
      }
      return width;
    } catch {
      // Fallback calculation
      return text.length * size * 0.5;
    }
  }
  
  private drawCompactText(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    size: number,
    font: PDFFont,
    color: number[]
  ): void {
    // For date strings with numbers, draw each character individually with tighter spacing
    if (/^\d{4}-\d{2}/.test(text) || /^\d{4}\/\d{2}/.test(text)) {
      let currentX = x;
      for (const char of text) {
        page.drawText(char, {
          x: currentX,
          y: y,
          size: size,
          font: font,
          color: rgb(color[0], color[1], color[2])
        });
        // Use tighter spacing for numbers and punctuation
        const charWidth = this.getTextWidth(char, font, size);
        currentX += charWidth * (char === '-' || char === '/' ? 0.8 : 0.85);
      }
    } else {
      // Normal text rendering
      page.drawText(text, {
        x: x,
        y: y,
        size: size,
        font: font,
        color: rgb(color[0], color[1], color[2])
      });
    }
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