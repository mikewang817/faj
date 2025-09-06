/**
 * Compact Resume Templates optimized for A4 single-page printing
 * These templates are designed to fit all content within one A4 page (210mm x 297mm)
 */

export const compactCSS = `
  /* Reset and base styles */
  * { 
    margin: 0; 
    padding: 0; 
    box-sizing: border-box; 
  }
  
  /* A4 page setup */
  @page {
    size: A4;
    margin: 10mm;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #333;
    background: white;
    margin: 0;
    padding: 0;
  }
  
  .resume-container {
    max-width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 15mm;
    background: white;
  }
  
  /* Compact Header */
  .header {
    text-align: center;
    padding-bottom: 8mm;
    border-bottom: 2px solid #2c3e50;
    margin-bottom: 6mm;
  }
  
  .name {
    font-size: 20pt;
    font-weight: bold;
    color: #2c3e50;
    margin-bottom: 3mm;
  }
  
  .contact-info {
    font-size: 9pt;
    color: #666;
    display: flex;
    justify-content: center;
    gap: 10mm;
    flex-wrap: wrap;
  }
  
  .contact-item {
    display: inline-block;
  }
  
  /* Compact Content */
  .content {
    padding: 0;
  }
  
  .section {
    margin-bottom: 5mm;
  }
  
  .section-title {
    font-size: 12pt;
    font-weight: bold;
    color: #2c3e50;
    text-transform: uppercase;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 1mm;
    margin-bottom: 3mm;
  }
  
  /* Professional Summary - Compact */
  .summary {
    font-size: 10pt;
    line-height: 1.4;
    color: #444;
    margin-bottom: 3mm;
    text-align: justify;
  }
  
  /* Experience Items - Compact */
  .experience-item, .project-item {
    margin-bottom: 4mm;
  }
  
  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 1mm;
  }
  
  .item-title {
    font-size: 11pt;
    font-weight: bold;
    color: #2c3e50;
  }
  
  .item-subtitle {
    font-size: 10pt;
    color: #666;
    font-style: italic;
  }
  
  .item-date {
    font-size: 9pt;
    color: #888;
    font-style: italic;
  }
  
  .item-description {
    font-size: 10pt;
    line-height: 1.3;
    color: #444;
    margin: 1mm 0;
  }
  
  /* Compact Highlights */
  .highlights {
    list-style: none;
    margin: 2mm 0 0 3mm;
  }
  
  .highlights li {
    font-size: 9pt;
    line-height: 1.3;
    margin-bottom: 1mm;
    position: relative;
    padding-left: 4mm;
  }
  
  .highlights li:before {
    content: "•";
    position: absolute;
    left: 0;
    color: #2c3e50;
  }
  
  /* Skills - Compact inline display */
  .skills-container {
    font-size: 10pt;
  }
  
  .skill-category {
    margin-bottom: 2mm;
  }
  
  .skill-category-title {
    font-weight: bold;
    color: #666;
    display: inline;
  }
  
  .skill-list {
    display: inline;
  }
  
  .skill-item {
    display: inline;
    margin-right: 2mm;
  }
  
  .skill-item:after {
    content: ",";
  }
  
  .skill-item:last-child:after {
    content: "";
  }
  
  /* Education - Compact */
  .education-item {
    margin-bottom: 3mm;
  }
  
  /* Print specific optimizations */
  @media print {
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    .resume-container {
      padding: 0;
      page-break-after: auto;
    }
    
    .header {
      page-break-after: avoid;
    }
    
    .section {
      page-break-inside: avoid;
    }
    
    .experience-item, .project-item, .education-item {
      page-break-inside: avoid;
    }
    
    /* Remove all unnecessary spacing for print */
    .section {
      margin-bottom: 4mm;
    }
    
    .experience-item, .project-item {
      margin-bottom: 3mm;
    }
    
    .highlights li {
      margin-bottom: 0.5mm;
    }
  }
  
  /* Hide elements that shouldn't print */
  @media print {
    .no-print, .print-notice {
      display: none !important;
    }
  }
`;

export function generateCompactHTMLResume(content: any, themeName: string = 'modern'): string {
  // Get theme colors
  const themes: any = {
    modern: {
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#3498db'
    },
    professional: {
      primary: '#2c3e50',
      secondary: '#34495e',
      accent: '#3498db'
    },
    minimalist: {
      primary: '#000000',
      secondary: '#666666',
      accent: '#000000'
    }
  };
  
  const colors = themes[themeName] || themes.modern;
  
  // Apply theme colors to CSS
  const themedCSS = compactCSS
    .replace(/#2c3e50/g, colors.primary)
    .replace(/#666/g, colors.secondary);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.basicInfo?.name || 'Resume'} - Resume</title>
  <style>${themedCSS}</style>
</head>
<body>
  <div class="resume-container">
    <!-- Compact Header -->
    <div class="header">
      <div class="name">${content.basicInfo?.name || ''}</div>
      <div class="contact-info">
        ${content.basicInfo?.email ? `<span class="contact-item">${content.basicInfo.email}</span>` : ''}
        ${content.basicInfo?.phone ? `<span class="contact-item">${content.basicInfo.phone}</span>` : ''}
        ${content.basicInfo?.location ? `<span class="contact-item">${content.basicInfo.location}</span>` : ''}
        ${content.basicInfo?.github ? `<span class="contact-item">${content.basicInfo.github}</span>` : ''}
      </div>
    </div>
    
    <div class="content">
      
      <!-- Work Experience -->
      ${content.content?.experience && content.content.experience.length > 0 ? `
      <div class="section">
        <div class="section-title">Work Experience</div>
        ${content.content.experience.map((exp: any) => `
        <div class="experience-item">
          <div class="item-header">
            <div>
              <span class="item-title">${exp.title}</span>
              <span class="item-subtitle"> at ${exp.company}</span>
            </div>
            <div class="item-date">${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}</div>
          </div>
          ${exp.description ? `<div class="item-description">${exp.description}</div>` : ''}
          ${exp.highlights && exp.highlights.length > 0 ? `
          <ul class="highlights">
            ${exp.highlights.slice(0, 3).map((h: string) => `<li>${h}</li>`).join('')}
          </ul>
          ` : ''}
        </div>
        `).join('')}
      </div>
      ` : ''}
      
      <!-- Projects (limit to top 2-3) -->
      ${content.content?.projects && content.content.projects.length > 0 ? `
      <div class="section">
        <div class="section-title">Key Projects</div>
        ${content.content.projects.slice(0, 2).map((proj: any) => `
        <div class="project-item">
          <div class="item-header">
            <div>
              <span class="item-title">${proj.name}</span>
              ${proj.role ? `<span class="item-subtitle"> - ${proj.role}</span>` : ''}
            </div>
          </div>
          ${proj.description ? `<div class="item-description">${proj.description}</div>` : ''}
          ${proj.highlights && proj.highlights.length > 0 ? `
          <ul class="highlights">
            ${proj.highlights.slice(0, 2).map((h: string) => `<li>${h}</li>`).join('')}
          </ul>
          ` : ''}
        </div>
        `).join('')}
      </div>
      ` : ''}
      
      <!-- Skills (inline format to save space) -->
      ${content.content?.skills && content.content.skills.length > 0 ? `
      <div class="section">
        <div class="section-title">Technical Skills</div>
        <div class="skills-container">
          ${(() => {
            const skillsByCategory: any = {};
            content.content.skills.forEach((skill: any) => {
              const cat = skill.category || 'Other';
              if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
              skillsByCategory[cat].push(skill.name);
            });
            
            const categoryLabels: any = {
              'programming_languages': 'Languages',
              'frameworks': 'Frameworks',
              'databases': 'Databases',
              'tools': 'Tools',
              'cloud': 'Cloud',
              'Other': 'Other'
            };
            
            return Object.entries(skillsByCategory).slice(0, 4).map(([cat, skills]: [string, any]) => `
              <div class="skill-category">
                <span class="skill-category-title">${categoryLabels[cat] || cat}:</span>
                <span class="skill-list">
                  ${skills.slice(0, 8).map((s: string) => `<span class="skill-item">${s}</span>`).join('')}
                </span>
              </div>
            `).join('');
          })()}
        </div>
      </div>
      ` : ''}
      
      <!-- Education (compact) -->
      ${content.content?.education && content.content.education.length > 0 ? `
      <div class="section">
        <div class="section-title">Education</div>
        ${content.content.education.map((edu: any) => `
        <div class="education-item">
          <div class="item-header">
            <div>
              <span class="item-title">${edu.degree}（${edu.field}）</span>
              <span class="item-subtitle"> - ${edu.institution}</span>
            </div>
            <div class="item-date">${edu.startDate} - ${edu.endDate}</div>
          </div>
          ${edu.gpa ? `<div style="font-size: 9pt; color: #666;">GPA: ${edu.gpa}</div>` : ''}
        </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
  </div>
  
  <!-- Print instructions (will not show in print) -->
  <div class="print-notice no-print" style="
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
    <h3 style="margin: 0 0 10px 0;">📄 Save as PDF</h3>
    <ol style="margin: 5px 0; padding-left: 20px; font-size: 12px;">
      <li>Press Ctrl+P (Windows/Linux) or Cmd+P (Mac)</li>
      <li>Destination: Save as PDF</li>
      <li>Layout: Portrait</li>
      <li>Paper size: A4</li>
      <li>Margins: Default</li>
      <li>Options: Check "Background graphics"</li>
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
    ">Print Now</button>
    <button onclick="this.parentElement.style.display='none'" style="
      background: transparent;
      color: white;
      border: 1px solid white;
      padding: 8px 16px;
      border-radius: 3px;
      cursor: pointer;
      margin-left: 10px;
    ">Close</button>
  </div>
</body>
</html>`;
}