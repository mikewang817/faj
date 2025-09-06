import { themes } from './ResumeTemplates';

export interface PDFOptions {
  theme?: string;
  fontSize?: number;
  pageSize?: 'A4' | 'Letter';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// A4: 595 x 842 points (8.27 x 11.69 inches)
// Letter: 612 x 792 points (8.5 x 11 inches)
const PAGE_SIZES = {
  A4: { width: 595, height: 842 },
  Letter: { width: 612, height: 792 }
};

export async function generatePDFResume(
  content: any,
  options: PDFOptions = {}
): Promise<Buffer> {
  const PDFDocument = require('pdfkit');
  
  // Get theme configuration
  const theme = themes[options.theme || 'modern'] || themes.modern;
  const config = theme.pdfConfig || {};
  
  // Set up page configuration for A4 by default
  const pageSize = options.pageSize || 'A4';
  const margins = options.margins || config.margins || {
    top: 50,
    bottom: 50,
    left: 50,
    right: 50
  };
  
  // Create PDF with proper page setup
  const doc = new PDFDocument({
    size: pageSize,
    margins: margins,
    bufferPages: true, // Enable page buffering for better control
    info: {
      Title: `${content.basicInfo?.name || 'Resume'} - Resume`,
      Author: content.basicInfo?.name || 'Anonymous',
      Subject: 'Professional Resume',
      Keywords: 'resume, cv, professional'
    }
  });
  
  // Color definitions based on theme
  const colors: any = config.colors || {
    primary: '#2c3e50',
    secondary: '#34495e', 
    accent: '#3498db',
    text: '#333333',
    lightText: '#666666',
    border: '#e0e0e0'
  };
  
  // Font settings
  const fonts = {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    italic: 'Helvetica-Oblique',
    boldItalic: 'Helvetica-BoldOblique'
  };
  
  // Build PDF content
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  
  // Track vertical position for page management
  let currentY = doc.y;
  const pageHeight = PAGE_SIZES[pageSize].height;
  const pageWidth = PAGE_SIZES[pageSize].width - margins.left - margins.right;
  
  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number) => {
    if (doc.y + requiredSpace > pageHeight - margins.bottom) {
      doc.addPage();
      currentY = margins.top;
      return true;
    }
    return false;
  };
  
  // Modern theme header with gradient effect
  if (options.theme === 'modern') {
    // Create gradient-like effect with rectangles
    doc.rect(0, 0, PAGE_SIZES[pageSize].width, 120)
       .fill(colors.primary);
    
    // Add subtle pattern
    doc.rect(0, 120, PAGE_SIZES[pageSize].width, 2)
       .fill(colors.accent);
  }
  
  // Professional theme header  
  if (options.theme === 'professional') {
    doc.rect(0, 0, PAGE_SIZES[pageSize].width, 100)
       .fill('#fafafa');
    
    doc.moveTo(margins.left, 100)
       .lineTo(PAGE_SIZES[pageSize].width - margins.right, 100)
       .strokeColor(colors.primary)
       .lineWidth(2)
       .stroke();
  }
  
  // Name and Contact Information
  if (content.basicInfo) {
    const headerY = options.theme === 'modern' ? 40 : 30;
    
    // Name
    doc.font(fonts.bold)
       .fontSize(28)
       .fillColor(options.theme === 'modern' ? 'white' : colors.primary)
       .text(content.basicInfo.name, 0, headerY, {
         align: 'center',
         width: PAGE_SIZES[pageSize].width
       });
    
    // Contact info
    const contactInfo = [];
    if (content.basicInfo.email) contactInfo.push(content.basicInfo.email);
    if (content.basicInfo.phone) contactInfo.push(content.basicInfo.phone);
    if (content.basicInfo.location) contactInfo.push(content.basicInfo.location);
    
    if (contactInfo.length > 0) {
      doc.font(fonts.regular)
         .fontSize(10)
         .fillColor(options.theme === 'modern' ? 'white' : colors.lightText)
         .text(contactInfo.join(' • '), 0, headerY + 35, {
           align: 'center',
           width: PAGE_SIZES[pageSize].width
         });
    }
    
    // Links
    const links = [];
    if (content.basicInfo.github) links.push(content.basicInfo.github);
    if (content.basicInfo.linkedin) links.push(content.basicInfo.linkedin);
    
    if (links.length > 0) {
      doc.fontSize(9)
         .text(links.join(' • '), 0, headerY + 50, {
           align: 'center',
           width: PAGE_SIZES[pageSize].width
         });
    }
    
    doc.moveDown(2);
  }
  
  // Move to content area
  doc.fillColor(colors.text);
  currentY = options.theme === 'modern' ? 140 : 120;
  doc.y = currentY;
  
  // Professional Summary
  if (content.content?.summary) {
    checkPageBreak(100);
    
    // Section title
    doc.font(fonts.bold)
       .fontSize(14)
       .fillColor(colors.primary)
       .text('PROFESSIONAL SUMMARY', margins.left);
    
    // Section underline
    doc.moveTo(margins.left, doc.y)
       .lineTo(pageWidth + margins.left, doc.y)
       .strokeColor(colors.primary)
       .lineWidth(1)
       .stroke();
    
    doc.moveDown(0.5);
    
    // Summary text
    doc.font(fonts.regular)
       .fontSize(10)
       .fillColor(colors.text)
       .text(content.content.summary, margins.left, doc.y, {
         align: 'justify',
         width: pageWidth
       });
    
    doc.moveDown(1.2);
  }
  
  // Work Experience
  if (content.content?.experience && content.content.experience.length > 0) {
    checkPageBreak(60);
    
    doc.font(fonts.bold)
       .fontSize(14)
       .fillColor(colors.primary)
       .text('WORK EXPERIENCE', margins.left);
    
    doc.moveTo(margins.left, doc.y)
       .lineTo(pageWidth + margins.left, doc.y)
       .strokeColor(colors.primary)
       .lineWidth(1)
       .stroke();
    
    doc.moveDown(0.5);
    
    for (const exp of content.content.experience) {
      checkPageBreak(80);
      
      // Position and company on same line
      doc.font(fonts.bold)
         .fontSize(11)
         .fillColor(colors.text)
         .text(exp.title, margins.left, doc.y, {
           continued: true,
           width: pageWidth * 0.6
         });
      
      // Date aligned to right
      const dateText = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
      doc.font(fonts.italic)
         .fontSize(9)
         .fillColor(colors.lightText)
         .text(dateText, margins.left + pageWidth * 0.6, doc.y, {
           align: 'right',
           width: pageWidth * 0.4
         });
      
      // Company name
      doc.font(fonts.italic)
         .fontSize(10)
         .fillColor(colors.secondary)
         .text(exp.company, margins.left);
      
      // Description
      if (exp.description) {
        doc.font(fonts.regular)
           .fontSize(9.5)
           .fillColor(colors.text)
           .text(exp.description, margins.left, doc.y, {
             align: 'justify',
             width: pageWidth
           });
      }
      
      // Highlights with bullets
      if (exp.highlights && exp.highlights.length > 0) {
        doc.moveDown(0.3);
        
        for (const highlight of exp.highlights) {
          checkPageBreak(20);
          
          // Bullet point
          doc.font(fonts.regular)
             .fontSize(9)
             .fillColor(colors.accent)
             .text('•', margins.left + 10, doc.y, { continued: true });
          
          // Highlight text
          doc.fillColor(colors.text)
             .text(` ${highlight}`, margins.left + 20, doc.y, {
               width: pageWidth - 20
             });
        }
      }
      
      doc.moveDown(0.8);
    }
  }
  
  // Projects
  if (content.content?.projects && content.content.projects.length > 0) {
    checkPageBreak(60);
    
    doc.font(fonts.bold)
       .fontSize(14)
       .fillColor(colors.primary)
       .text('PROJECTS', margins.left);
    
    doc.moveTo(margins.left, doc.y)
       .lineTo(pageWidth + margins.left, doc.y)
       .strokeColor(colors.primary)
       .lineWidth(1)
       .stroke();
    
    doc.moveDown(0.5);
    
    for (const proj of content.content.projects) {
      checkPageBreak(60);
      
      // Project name
      doc.font(fonts.bold)
         .fontSize(11)
         .fillColor(colors.text)
         .text(proj.name, margins.left);
      
      // Role
      if (proj.role) {
        doc.font(fonts.italic)
           .fontSize(9)
           .fillColor(colors.secondary)
           .text(proj.role, margins.left);
      }
      
      // Description
      if (proj.description) {
        doc.font(fonts.regular)
           .fontSize(9.5)
           .fillColor(colors.text)
           .text(proj.description, margins.left, doc.y, {
             align: 'justify',
             width: pageWidth
           });
      }
      
      // Highlights
      if (proj.highlights && proj.highlights.length > 0) {
        doc.moveDown(0.3);
        
        for (const highlight of proj.highlights) {
          checkPageBreak(20);
          
          doc.font(fonts.regular)
             .fontSize(9)
             .fillColor(colors.accent)
             .text('•', margins.left + 10, doc.y, { continued: true });
          
          doc.fillColor(colors.text)
             .text(` ${highlight}`, margins.left + 20, doc.y, {
               width: pageWidth - 20
             });
        }
      }
      
      doc.moveDown(0.8);
    }
  }
  
  // Skills
  if (content.content?.skills && content.content.skills.length > 0) {
    checkPageBreak(60);
    
    doc.font(fonts.bold)
       .fontSize(14)
       .fillColor(colors.primary)
       .text('TECHNICAL SKILLS', margins.left);
    
    doc.moveTo(margins.left, doc.y)
       .lineTo(pageWidth + margins.left, doc.y)
       .strokeColor(colors.primary)
       .lineWidth(1)
       .stroke();
    
    doc.moveDown(0.5);
    
    // Group skills by category
    const skillsByCategory: { [key: string]: any[] } = {};
    content.content.skills.forEach((skill: any) => {
      const category = skill.category || 'Other';
      if (!skillsByCategory[category]) {
        skillsByCategory[category] = [];
      }
      skillsByCategory[category].push(skill);
    });
    
    const categoryLabels: { [key: string]: string } = {
      'programming_languages': 'Programming Languages',
      'frameworks': 'Frameworks & Libraries',
      'databases': 'Databases',
      'tools': 'Tools & Technologies',
      'cloud': 'Cloud & DevOps',
      'soft_skills': 'Soft Skills',
      'Other': 'Other Skills'
    };
    
    for (const [category, skills] of Object.entries(skillsByCategory)) {
      checkPageBreak(20);
      
      doc.font(fonts.bold)
         .fontSize(9)
         .fillColor(colors.secondary)
         .text(`${categoryLabels[category] || category}: `, margins.left, doc.y, {
           continued: true
         });
      
      doc.font(fonts.regular)
         .fillColor(colors.text)
         .text(skills.map((s: any) => s.name).join(', '), {
           width: pageWidth - 100
         });
      
      doc.moveDown(0.3);
    }
    
    doc.moveDown(0.5);
  }
  
  // Education
  if (content.content?.education && content.content.education.length > 0) {
    checkPageBreak(60);
    
    doc.font(fonts.bold)
       .fontSize(14)
       .fillColor(colors.primary)
       .text('EDUCATION', margins.left);
    
    doc.moveTo(margins.left, doc.y)
       .lineTo(pageWidth + margins.left, doc.y)
       .strokeColor(colors.primary)
       .lineWidth(1)
       .stroke();
    
    doc.moveDown(0.5);
    
    for (const edu of content.content.education) {
      checkPageBreak(40);
      
      // Degree and field
      doc.font(fonts.bold)
         .fontSize(11)
         .fillColor(colors.text)
         .text(`${edu.degree}（${edu.field}）`, margins.left);
      
      // Institution
      doc.font(fonts.regular)
         .fontSize(10)
         .fillColor(colors.secondary)
         .text(edu.institution, margins.left);
      
      // Date and GPA on same line
      const eduInfo = [`${edu.startDate} - ${edu.endDate}`];
      if (edu.gpa) eduInfo.push(`GPA: ${edu.gpa}`);
      
      doc.font(fonts.italic)
         .fontSize(9)
         .fillColor(colors.lightText)
         .text(eduInfo.join(' | '), margins.left);
      
      doc.moveDown(0.6);
    }
  }
  
  // Page numbers
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    
    // Footer
    doc.font(fonts.italic)
       .fontSize(8)
       .fillColor(colors.lightText)
       .text(
         `Page ${i + 1} of ${pages.count}`,
         margins.left,
         pageHeight - 30,
         {
           align: 'center',
           width: pageWidth
         }
       );
  }
  
  // Finalize PDF
  doc.end();
  
  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);
  });
}