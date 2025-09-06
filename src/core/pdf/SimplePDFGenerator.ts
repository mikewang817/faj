import { generateHTMLResume } from '../../templates/ResumeTemplates';
import { Logger } from '../../utils/Logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export class SimplePDFGenerator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('SimplePDFGenerator');
  }

  /**
   * Generate a temporary HTML file that can be opened and printed to PDF
   * This ensures perfect rendering with all fonts and styles
   */
  async generateHTMLForPDF(resume: any, themeName: string = 'modern'): Promise<string> {
    try {
      // Generate HTML content with the selected theme
      let htmlContent = generateHTMLResume(resume, themeName);
      
      // Add print-specific CSS to ensure proper A4 formatting
      const printCSS = `
        <style>
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            .resume-container {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            
            .header {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            
            .section {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            
            .experience-item, .project-item, .education-item {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            
            /* Ensure background colors print */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          
          /* Additional screen styles for better preview */
          @media screen {
            body {
              background: #f0f0f0;
              padding: 20px;
            }
            
            .resume-container {
              max-width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: white;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
          }
        </style>
      `;
      
      // Insert print CSS before closing head tag
      htmlContent = htmlContent.replace('</head>', printCSS + '</head>');
      
      // Add instructions for printing
      const instructions = `
        <div id="print-instructions" style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #4CAF50;
          color: white;
          padding: 15px;
          border-radius: 5px;
          z-index: 10000;
          font-family: Arial, sans-serif;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        ">
          <h3 style="margin: 0 0 10px 0;">📄 生成PDF说明 / Export to PDF</h3>
          <ol style="margin: 5px 0; padding-left: 20px;">
            <li>按 Ctrl+P (Windows/Linux) 或 Cmd+P (Mac)</li>
            <li>选择"另存为PDF" / Select "Save as PDF"</li>
            <li>确保选择A4纸张 / Ensure A4 paper size</li>
            <li>勾选"背景图形" / Check "Background graphics"</li>
          </ol>
          <button onclick="window.print(); return false;" style="
            background: white;
            color: #4CAF50;
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 10px;
          ">立即打印 / Print Now</button>
          <button onclick="this.parentElement.style.display='none'" style="
            background: transparent;
            color: white;
            border: 1px solid white;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            margin-left: 10px;
          ">关闭 / Close</button>
        </div>
        <style>
          @media print {
            #print-instructions {
              display: none !important;
            }
          }
        </style>
      `;
      
      // Add instructions after body tag
      htmlContent = htmlContent.replace('<body>', '<body>' + instructions);
      
      // Save to temporary file
      const tmpDir = os.tmpdir();
      const fileName = `resume_${Date.now()}.html`;
      const filePath = path.join(tmpDir, fileName);
      
      await fs.writeFile(filePath, htmlContent, 'utf-8');
      
      this.logger.success(`HTML file created: ${filePath}`);
      
      return filePath;
    } catch (error) {
      this.logger.error('Failed to generate HTML for PDF', error);
      throw new Error('HTML generation failed: ' + (error as Error).message);
    }
  }
  
  /**
   * Generate PDF using PDFKit with better Unicode support
   * Note: This method has limitations with complex layouts
   */
  async generateWithPDFKit(resume: any, themeName: string = 'modern'): Promise<Buffer> {
    const PDFDocument = require('pdfkit');
    
    // Create a new PDF document with Unicode font support
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      },
      autoFirstPage: true,
      bufferPages: true
    });
    
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    // Try to register fonts that support Unicode
    try {
      // For development, we'll use the default fonts
      // In production, you should bundle proper Unicode fonts
      if (process.platform === 'darwin') {
        // macOS - use system fonts
        doc.registerFont('ChineseFont', '/System/Library/Fonts/PingFang.ttc');
        doc.font('ChineseFont');
      } else {
        // Use default Helvetica which doesn't support Chinese
        // Add a warning for Chinese content
        doc.font('Helvetica');
      }
    } catch (err) {
      this.logger.warn('Could not load Unicode fonts, using fallback');
      doc.font('Helvetica');
    }
    
    // Get theme colors
    const themes: any = {
      modern: {
        primary: '#667eea',
        secondary: '#764ba2',
        text: '#2c3e50'
      },
      professional: {
        primary: '#2c3e50',
        secondary: '#34495e',
        text: '#1a1a1a'
      },
      minimalist: {
        primary: '#000000',
        secondary: '#666666',
        text: '#333333'
      }
    };
    
    const colors = themes[themeName] || themes.modern;
    
    // Header
    if (resume.basicInfo) {
      // Name
      doc.fontSize(28)
         .fillColor(colors.primary)
         .text(resume.basicInfo.name || 'Name', {
           align: 'center'
         });
      
      doc.moveDown(0.5);
      
      // Contact info
      const contactInfo = [];
      if (resume.basicInfo.email) contactInfo.push(resume.basicInfo.email);
      if (resume.basicInfo.phone) contactInfo.push(resume.basicInfo.phone);
      if (resume.basicInfo.location) contactInfo.push(resume.basicInfo.location);
      
      if (contactInfo.length > 0) {
        doc.fontSize(11)
           .fillColor(colors.secondary)
           .text(contactInfo.join(' | '), {
             align: 'center'
           });
      }
      
      // Add line separator
      doc.moveDown();
      doc.moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .strokeColor(colors.primary)
         .lineWidth(2)
         .stroke();
      doc.moveDown();
    }
    
    // Professional Summary
    if (resume.content?.summary) {
      doc.fontSize(14)
         .fillColor(colors.primary)
         .text('PROFESSIONAL SUMMARY');
      
      doc.fontSize(10)
         .fillColor(colors.text)
         .text(resume.content.summary, {
           align: 'justify'
         });
      
      doc.moveDown(1.5);
    }
    
    // Work Experience
    if (resume.content?.experience && resume.content.experience.length > 0) {
      doc.fontSize(14)
         .fillColor(colors.primary)
         .text('WORK EXPERIENCE');
      
      doc.moveDown(0.5);
      
      for (const exp of resume.content.experience) {
        doc.fontSize(12)
           .fillColor(colors.text)
           .text(exp.title || 'Position', {
             continued: true
           })
           .fillColor(colors.secondary)
           .text(` at ${exp.company || 'Company'}`);
        
        doc.fontSize(9)
           .fillColor('#666666')
           .text(`${exp.startDate || ''} - ${exp.current ? 'Present' : exp.endDate || ''}`);
        
        if (exp.description) {
          doc.fontSize(10)
             .fillColor(colors.text)
             .text(exp.description);
        }
        
        if (exp.highlights && exp.highlights.length > 0) {
          doc.moveDown(0.3);
          for (const highlight of exp.highlights) {
            doc.fontSize(9)
               .fillColor(colors.text)
               .text(`• ${highlight}`, {
                 indent: 20
               });
          }
        }
        
        doc.moveDown();
      }
    }
    
    // Projects
    if (resume.content?.projects && resume.content.projects.length > 0) {
      doc.fontSize(14)
         .fillColor(colors.primary)
         .text('PROJECTS');
      
      doc.moveDown(0.5);
      
      for (const proj of resume.content.projects) {
        doc.fontSize(12)
           .fillColor(colors.text)
           .text(proj.name || 'Project');
        
        if (proj.role) {
          doc.fontSize(9)
             .fillColor(colors.secondary)
             .text(proj.role);
        }
        
        if (proj.description) {
          doc.fontSize(10)
             .fillColor(colors.text)
             .text(proj.description);
        }
        
        doc.moveDown();
      }
    }
    
    // Skills
    if (resume.content?.skills && resume.content.skills.length > 0) {
      doc.fontSize(14)
         .fillColor(colors.primary)
         .text('TECHNICAL SKILLS');
      
      doc.moveDown(0.5);
      
      const skillText = resume.content.skills.map((s: any) => s.name).join(', ');
      doc.fontSize(10)
         .fillColor(colors.text)
         .text(skillText);
      
      doc.moveDown();
    }
    
    // Education
    if (resume.content?.education && resume.content.education.length > 0) {
      doc.fontSize(14)
         .fillColor(colors.primary)
         .text('EDUCATION');
      
      doc.moveDown(0.5);
      
      for (const edu of resume.content.education) {
        doc.fontSize(12)
           .fillColor(colors.text)
           .text(`${edu.degree || 'Degree'} in ${edu.field || 'Field'}`);
        
        doc.fontSize(10)
           .fillColor(colors.secondary)
           .text(edu.institution || 'Institution');
        
        doc.fontSize(9)
           .fillColor('#666666')
           .text(`${edu.startDate || ''} - ${edu.endDate || ''}`);
        
        if (edu.gpa) {
          doc.text(`GPA: ${edu.gpa}`);
        }
        
        doc.moveDown();
      }
    }
    
    // End the document
    doc.end();
    
    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
    });
  }
}