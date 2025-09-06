export interface ResumeTheme {
  name: string;
  description: string;
  css: string;
  pdfConfig?: {
    font?: string;
    fontSize?: number;
    lineHeight?: number;
    margins?: { top: number; bottom: number; left: number; right: number };
    colors?: {
      primary: string;
      secondary: string;
      accent: string;
      text: string;
    };
  };
}

export const themes: { [key: string]: ResumeTheme } = {
  modern: {
    name: 'Modern',
    description: 'Clean and modern design with accent colors',
    css: `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      /* A4 size setup */
      @page {
        size: A4;
        margin: 0;
      }
      
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #2c3e50;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        padding: 20px;
      }
      
      .resume-container {
        width: 210mm;  /* A4 width */
        min-height: 297mm;  /* A4 height */
        margin: 0 auto;
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        overflow: hidden;
      }
      
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 60px 50px;
        text-align: center;
        position: relative;
      }
      
      .header::after {
        content: '';
        position: absolute;
        bottom: -30px;
        left: 0;
        right: 0;
        height: 60px;
        background: white;
        border-radius: 50% 50% 0 0;
      }
      
      .name {
        font-size: 3em;
        font-weight: 700;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 3px;
      }
      
      .contact-info {
        font-size: 1.1em;
        opacity: 0.95;
        display: flex;
        justify-content: center;
        gap: 30px;
        flex-wrap: wrap;
      }
      
      .contact-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .content {
        padding: 50px;
        padding-top: 20px;
      }
      
      .section {
        margin-bottom: 45px;
      }
      
      .section-title {
        font-size: 1.8em;
        color: #667eea;
        font-weight: 600;
        margin-bottom: 25px;
        padding-bottom: 10px;
        border-bottom: 3px solid #667eea;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      
      .summary {
        font-size: 1.1em;
        line-height: 1.8;
        color: #555;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #667eea;
      }
      
      .experience-item, .project-item, .education-item {
        margin-bottom: 30px;
        padding: 20px;
        background: #fafafa;
        border-radius: 8px;
        border-left: 4px solid #764ba2;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      
      .experience-item:hover, .project-item:hover, .education-item:hover {
        transform: translateX(5px);
        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
      }
      
      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 12px;
      }
      
      .item-title {
        font-size: 1.3em;
        color: #2c3e50;
        font-weight: 600;
      }
      
      .item-subtitle {
        color: #667eea;
        font-size: 1.1em;
        margin-bottom: 5px;
      }
      
      .item-date {
        color: #7f8c8d;
        font-style: italic;
        font-size: 0.95em;
      }
      
      .item-description {
        color: #555;
        line-height: 1.7;
        margin: 10px 0;
      }
      
      .highlights {
        list-style: none;
        margin-top: 12px;
      }
      
      .highlights li {
        position: relative;
        padding-left: 25px;
        margin-bottom: 8px;
        color: #555;
        line-height: 1.6;
      }
      
      .highlights li:before {
        content: "▸";
        position: absolute;
        left: 0;
        color: #667eea;
        font-weight: bold;
        font-size: 1.2em;
      }
      
      .skills-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      .skill-category {
        background: #f8f9fa;
        padding: 15px 20px;
        border-radius: 8px;
        border-left: 4px solid #667eea;
      }
      
      .skill-category-title {
        font-weight: 600;
        color: #667eea;
        margin-bottom: 10px;
        text-transform: uppercase;
        font-size: 0.9em;
        letter-spacing: 1px;
      }
      
      .skill-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      
      .skill-item {
        background: white;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.95em;
        color: #555;
        border: 1px solid #ddd;
        transition: all 0.3s ease;
      }
      
      .skill-item:hover {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(102, 126, 234, 0.2);
      }
      
      @media print {
        body {
          background: white;
          padding: 0;
        }
        .resume-container {
          width: 210mm;
          min-height: 297mm;
          box-shadow: none;
          border-radius: 0;
          margin: 0;
        }
      }
      
      @media screen and (max-width: 850px) {
        .resume-container {
          width: 100%;
          min-height: auto;
          border-radius: 0;
        }
        .header { padding: 40px 30px; }
        .content { padding: 30px 20px; }
        .name { font-size: 2em; }
        .contact-info { flex-direction: column; gap: 10px; }
      }
    `,
    pdfConfig: {
      fontSize: 11,
      lineHeight: 1.6,
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#3498db',
        text: '#2c3e50'
      }
    }
  },
  
  professional: {
    name: 'Professional',
    description: 'Traditional professional resume style',
    css: `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      /* A4 size setup */
      @page {
        size: A4;
        margin: 0;
      }
      
      body {
        font-family: 'Georgia', 'Times New Roman', serif;
        line-height: 1.5;
        color: #1a1a1a;
        background: #f5f5f5;
        padding: 20px;
      }
      
      .resume-container {
        width: 210mm;  /* A4 width */
        min-height: 297mm;  /* A4 height */
        margin: 0 auto;
        background: white;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        padding: 0;
      }
      
      .header {
        padding: 40px 50px;
        border-bottom: 3px double #2c3e50;
        background: #fafafa;
      }
      
      .name {
        font-size: 2.5em;
        font-weight: 400;
        text-align: center;
        margin-bottom: 15px;
        color: #2c3e50;
        letter-spacing: 2px;
      }
      
      .contact-info {
        text-align: center;
        font-size: 1em;
        color: #555;
      }
      
      .contact-item {
        display: inline-block;
        margin: 0 15px;
      }
      
      .content {
        padding: 40px 50px;
      }
      
      .section {
        margin-bottom: 35px;
      }
      
      .section-title {
        font-size: 1.4em;
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 20px;
        padding-bottom: 8px;
        border-bottom: 2px solid #2c3e50;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .summary {
        font-style: italic;
        line-height: 1.8;
        color: #444;
        text-align: justify;
        padding: 15px 0;
      }
      
      .experience-item, .project-item, .education-item {
        margin-bottom: 25px;
      }
      
      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 10px;
      }
      
      .item-title {
        font-size: 1.2em;
        font-weight: 600;
        color: #2c3e50;
      }
      
      .item-subtitle {
        color: #555;
        font-style: italic;
        margin-bottom: 5px;
      }
      
      .item-date {
        color: #777;
        font-size: 0.95em;
        font-style: italic;
      }
      
      .item-description {
        line-height: 1.7;
        color: #333;
        text-align: justify;
        margin: 10px 0;
      }
      
      .highlights {
        list-style: none;
        padding-left: 20px;
        margin-top: 10px;
      }
      
      .highlights li {
        position: relative;
        margin-bottom: 6px;
        padding-left: 20px;
      }
      
      .highlights li:before {
        content: "•";
        position: absolute;
        left: 0;
        font-weight: bold;
      }
      
      .skills-container {
        line-height: 1.8;
      }
      
      .skill-category {
        margin-bottom: 12px;
      }
      
      .skill-category-title {
        font-weight: 600;
        display: inline;
        margin-right: 10px;
      }
      
      .skill-list {
        display: inline;
      }
      
      .skill-item {
        display: inline;
        margin-right: 8px;
      }
      
      .skill-item:not(:last-child):after {
        content: ",";
      }
      
      @media print {
        body { background: white; padding: 0; }
        .resume-container { 
          width: 210mm;
          min-height: 297mm;
          box-shadow: none;
          margin: 0;
        }
      }
      
      @media screen and (max-width: 850px) {
        .resume-container {
          width: 100%;
          min-height: auto;
        }
      }
    `,
    pdfConfig: {
      font: 'Times-Roman',
      fontSize: 12,
      lineHeight: 1.5,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      colors: {
        primary: '#2c3e50',
        secondary: '#34495e',
        accent: '#3498db',
        text: '#1a1a1a'
      }
    }
  },
  
  minimalist: {
    name: 'Minimalist',
    description: 'Clean, simple, and elegant',
    css: `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      /* A4 size setup */
      @page {
        size: A4;
        margin: 0;
      }
      
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-weight: 300;
        line-height: 1.6;
        color: #333;
        background: white;
        padding: 20px;
      }
      
      .resume-container {
        width: 210mm;  /* A4 width */
        min-height: 297mm;  /* A4 height */
        margin: 0 auto;
        padding: 60px;
        background: white;
      }
      
      .header {
        margin-bottom: 50px;
        padding-bottom: 30px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .name {
        font-size: 2.8em;
        font-weight: 200;
        margin-bottom: 15px;
        letter-spacing: -1px;
      }
      
      .contact-info {
        font-size: 0.95em;
        color: #666;
        letter-spacing: 0.5px;
      }
      
      .contact-item {
        display: inline-block;
        margin-right: 30px;
      }
      
      .section {
        margin-bottom: 40px;
      }
      
      .section-title {
        font-size: 1.1em;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #000;
        margin-bottom: 20px;
        padding-bottom: 8px;
      }
      
      .summary {
        font-size: 1.05em;
        line-height: 1.8;
        color: #444;
      }
      
      .experience-item, .project-item, .education-item {
        margin-bottom: 25px;
        padding-bottom: 20px;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .experience-item:last-child, .project-item:last-child, .education-item:last-child {
        border-bottom: none;
      }
      
      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 8px;
      }
      
      .item-title {
        font-size: 1.15em;
        font-weight: 400;
        color: #000;
      }
      
      .item-subtitle {
        font-weight: 300;
        color: #666;
        margin-bottom: 5px;
      }
      
      .item-date {
        font-size: 0.9em;
        color: #999;
        font-weight: 300;
      }
      
      .item-description {
        color: #444;
        line-height: 1.7;
        font-weight: 300;
      }
      
      .highlights {
        list-style: none;
        margin-top: 10px;
      }
      
      .highlights li {
        padding-left: 15px;
        margin-bottom: 5px;
        position: relative;
        font-weight: 300;
        color: #555;
      }
      
      .highlights li:before {
        content: "–";
        position: absolute;
        left: 0;
        color: #999;
      }
      
      .skills-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .skill-category {
        display: flex;
        align-items: baseline;
      }
      
      .skill-category-title {
        min-width: 120px;
        font-weight: 400;
        color: #666;
        margin-right: 20px;
      }
      
      .skill-list {
        flex: 1;
      }
      
      .skill-item {
        display: inline-block;
        margin-right: 15px;
        color: #444;
        font-weight: 300;
      }
      
      @media print {
        body { background: white; padding: 0; }
        .resume-container { 
          width: 210mm;
          min-height: 297mm;
          margin: 0; 
          padding: 40px; 
        }
      }
      
      @media screen and (max-width: 850px) {
        .resume-container {
          width: 100%;
          min-height: auto;
          padding: 30px;
        }
      }
    `,
    pdfConfig: {
      font: 'Helvetica',
      fontSize: 10,
      lineHeight: 1.6,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      colors: {
        primary: '#000',
        secondary: '#666',
        accent: '#000',
        text: '#333'
      }
    }
  }
};

import { getSectionTitles } from '../utils/SectionTitles';

export function generateHTMLResume(content: any, themeName: string = 'modern'): string {
  const theme = themes[themeName] || themes.modern;
  const titles = getSectionTitles(content.basicInfo?.languages);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.basicInfo?.name || 'Resume'} - Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700&display=swap" rel="stylesheet">
  <style>${theme.css}</style>
</head>
<body>
  <div class="resume-container">
    ${generateHeader(content)}
    <div class="content">
      ${generateSummary(content, titles)}
      ${generateEducation(content, titles)}
      ${generateExperience(content, titles)}
      ${generateProjects(content, titles)}
      ${generateSkills(content, titles)}
    </div>
  </div>
</body>
</html>`;
}

function generateHeader(content: any): string {
  if (!content.basicInfo) return '';
  
  const contactItems = [];
  if (content.basicInfo.email) {
    contactItems.push(`<span class="contact-item">📧 ${content.basicInfo.email}</span>`);
  }
  if (content.basicInfo.phone) {
    contactItems.push(`<span class="contact-item">📱 ${content.basicInfo.phone}</span>`);
  }
  if (content.basicInfo.location) {
    contactItems.push(`<span class="contact-item">📍 ${content.basicInfo.location}</span>`);
  }
  // Check multiple possible field names for GitHub
  const githubUrl = content.basicInfo.githubUrl || content.basicInfo.github;
  if (githubUrl) {
    contactItems.push(`<span class="contact-item">💻 ${githubUrl}</span>`);
  }
  // Check multiple possible field names for LinkedIn
  const linkedinUrl = content.basicInfo.linkedinUrl || content.basicInfo.linkedin;
  if (linkedinUrl) {
    contactItems.push(`<span class="contact-item">🔗 ${linkedinUrl}</span>`);
  }
  
  return `
    <div class="header">
      <h1 class="name">${content.basicInfo.name}</h1>
      <div class="contact-info">
        ${contactItems.join('')}
      </div>
    </div>
  `;
}

function generateSummary(content: any, titles?: any): string {
  // Check for professional summary in multiple places
  const summary = content.content?.summary || content.personalSummary || content.basicInfo?.personalSummary;
  
  if (!summary) return '';
  
  return `
    <div class="section">
      <h2 class="section-title">${titles?.professionalSummary || 'Professional Summary'}</h2>
      <div class="summary-text">${summary}</div>
    </div>
  `;
}

function generateExperience(content: any, titles?: any): string {
  if (!content.content?.experience || content.content.experience.length === 0) return '';
  
  const experiences = content.content.experience.map((exp: any) => `
    <div class="experience-item">
      <div class="item-header">
        <div>
          <div class="item-title">${exp.title}</div>
          <div class="item-subtitle">${exp.company}</div>
        </div>
        <div class="item-date">${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}</div>
      </div>
      ${exp.description ? `<div class="item-description">${exp.description}</div>` : ''}
      ${exp.highlights && exp.highlights.length > 0 ? `
        <ul class="highlights">
          ${exp.highlights.map((h: string) => `<li>${h}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `).join('');
  
  return `
    <div class="section">
      <h2 class="section-title">${titles?.workExperience || 'Work Experience'}</h2>
      ${experiences}
    </div>
  `;
}

function generateProjects(content: any, titles?: any): string {
  if (!content.content?.projects || content.content.projects.length === 0) return '';
  
  const projects = content.content.projects.map((proj: any) => `
    <div class="project-item">
      <div class="item-header">
        <div>
          <div class="item-title">${proj.name}</div>
          ${proj.role ? `<div class="item-subtitle">${proj.role}</div>` : ''}
        </div>
        ${proj.period ? `<div class="item-date">${proj.period}</div>` : ''}
      </div>
      ${proj.description ? `<div class="item-description">${proj.description}</div>` : ''}
      ${proj.highlights && proj.highlights.length > 0 ? `
        <ul class="highlights">
          ${proj.highlights.map((h: string) => `<li>${h}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `).join('');
  
  return `
    <div class="section">
      <h2 class="section-title">${titles?.projects || 'Projects'}</h2>
      ${projects}
    </div>
  `;
}

function generateSkills(content: any, titles?: any): string {
  if (!content.content?.skills || content.content.skills.length === 0) return '';
  
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
  
  const skillsHtml = Object.entries(skillsByCategory).map(([category, skills]) => `
    <div class="skill-category">
      <span class="skill-category-title">${categoryLabels[category] || category}:</span>
      <span class="skill-list">
        ${skills.map(s => `<span class="skill-item">${s.name}</span>`).join('')}
      </span>
    </div>
  `).join('');
  
  return `
    <div class="section">
      <h2 class="section-title">${titles?.technicalSkills || 'Technical Skills'}</h2>
      <div class="skills-container">
        ${skillsHtml}
      </div>
    </div>
  `;
}

function generateEducation(content: any, titles?: any): string {
  if (!content.content?.education || content.content.education.length === 0) return '';
  
  // Filter out invalid education entries
  const validEducation = content.content.education.filter((edu: any) => 
    edu && edu.degree && edu.field && edu.institution
  );
  
  if (validEducation.length === 0) return '';
  
  const education = validEducation.map((edu: any) => `
    <div class="education-item">
      <div class="item-header">
        <div>
          <div class="item-title">${edu.degree || ''}（${edu.field || ''}）</div>
          <div class="item-subtitle">${edu.institution || ''}</div>
        </div>
        <div class="item-date">${edu.startDate || ''} - ${edu.current ? 'Present' : (edu.endDate || '')}</div>
      </div>
      ${edu.gpa ? `<div class="item-description">GPA: ${edu.gpa}</div>` : ''}
      ${edu.highlights && edu.highlights.length > 0 ? `
        <ul class="highlights">
          ${edu.highlights.map((h: string) => `<li>${h}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `).join('');
  
  return `
    <div class="section">
      <h2 class="section-title">${titles?.education || 'Education'}</h2>
      ${education}
    </div>
  `;
}