import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Resume, DeveloperProfile, ProjectAnalysis } from '../../models';
import { Logger } from '../../utils/Logger';
import { AIManager } from '../../ai/AIManager';
import { ConfigManager } from '../config/ConfigManager';
import { ExperienceManager } from '../experience/ExperienceManager';
import { generateHTMLResume, themes } from '../../templates/ResumeTemplates';
import { generateCompactHTMLResume } from '../../templates/CompactResumeTemplates';
import { getSectionTitles } from '../../utils/SectionTitles';
import { OpenResumePDFGenerator } from '../pdf/OpenResumePDFGenerator';

export class ResumeManager {
  private static instance: ResumeManager;
  private logger: Logger;
  private resumePath: string;
  private currentResume: Resume | null = null;
  private aiManager: AIManager;
  private configManager: ConfigManager;

  private constructor() {
    this.logger = new Logger('ResumeManager');
    this.resumePath = path.join(os.homedir(), '.faj', 'resume.json');
    this.aiManager = AIManager.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  static getInstance(): ResumeManager {
    if (!ResumeManager.instance) {
      ResumeManager.instance = new ResumeManager();
    }
    return ResumeManager.instance;
  }

  async loadOrCreate(): Promise<Resume> {
    try {
      await this.ensureResumeDir();
      
      if (await this.resumeExists()) {
        const data = await fs.readFile(this.resumePath, 'utf-8');
        this.currentResume = JSON.parse(data);
        this.logger.info('Resume loaded successfully');
      } else {
        this.currentResume = await this.createEmptyResume();
        await this.save();
        this.logger.info('Created new resume');
      }
      
      return this.currentResume!;
    } catch (error) {
      this.logger.error('Failed to load resume', error);
      throw new Error('Failed to load resume');
    }
  }

  async generateFromProjects(projects: ProjectAnalysis[]): Promise<Resume> {
    this.logger.info(`Generating resume from ${projects.length} projects`);

    const profile = await this.configManager.get('profile') as DeveloperProfile;
    if (!profile) {
      throw new Error('Developer profile not configured. Run "faj init" first.');
    }
    
    // Load user's real work experiences
    const experienceManager = ExperienceManager.getInstance();
    await experienceManager.load();
    const userExperiences = await experienceManager.getAll();
    
    // Debug: Log profile to see what's being passed
    this.logger.debug('Profile loaded for resume generation:', {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      languages: profile.languages,
      education: profile.education
    });
    
    this.logger.info(`Including ${userExperiences.length} real work experiences`);

    try {
      // Initialize AI manager
      await this.aiManager.initialize();

      // Create enhanced profile with real experiences
      const enhancedProfile = {
        ...profile,
        realExperiences: userExperiences
      };

      // Generate resume using AI with real experiences
      const generatedResume = await this.aiManager.generateResume(projects, enhancedProfile);
      
      // Merge with existing resume if exists
      if (this.currentResume) {
        generatedResume.version = this.currentResume.version + 1;
        generatedResume.id = this.currentResume.id; // Keep same ID
      }

      this.currentResume = generatedResume;
      await this.save();
      
      this.logger.success('Resume generated successfully');
      return this.currentResume;
    } catch (error) {
      this.logger.error('Failed to generate resume', error);
      throw new Error(`Failed to generate resume: ${(error as Error).message}`);
    }
  }

  async update(changes: Partial<Resume>): Promise<Resume> {
    if (!this.currentResume) {
      await this.loadOrCreate();
    }

    try {
      // Use AI to intelligently update the resume
      await this.aiManager.initialize();
      const updatedResume = await this.aiManager.updateResume(this.currentResume!, changes);
      
      this.currentResume = updatedResume;
      await this.save();
      
      this.logger.success('Resume updated successfully');
      return this.currentResume;
    } catch (error) {
      this.logger.error('Failed to update resume', error);
      throw new Error(`Failed to update resume: ${(error as Error).message}`);
    }
  }

  async get(): Promise<Resume | null> {
    if (!this.currentResume) {
      await this.loadOrCreate();
    }
    return this.currentResume;
  }

  async export(format: 'json' | 'md' | 'html' | 'pdf' | 'html-compact', themeName?: string): Promise<string> {
    if (!this.currentResume) {
      await this.loadOrCreate();
    }

    switch (format) {
      case 'json':
        return JSON.stringify(this.currentResume, null, 2);
      
      case 'md':
        return await this.exportMarkdown();
      
      case 'html':
        return await this.exportHTML(themeName);
      
      case 'html-compact':
        return await this.exportCompactHTML(themeName);
      
      case 'pdf':
        return await this.exportPDF(themeName);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async exportMarkdown(): Promise<string> {
    if (!this.currentResume) {
      throw new Error('No resume to export');
    }

    const resume = this.currentResume;
    
    // Load profile data
    const profile = await this.configManager.get('profile') as DeveloperProfile;
    
    // Ensure basicInfo has languages from profile
    if (!resume.basicInfo) {
      resume.basicInfo = {
        name: profile?.name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        location: profile?.location || '',
        languages: profile?.languages || []
      } as any;
    } else if (!resume.basicInfo.languages && profile?.languages) {
      resume.basicInfo.languages = profile.languages;
    }
    
    const titles = getSectionTitles(resume.basicInfo?.languages);
    
    // Load education from profile if not already in resume
    if (!resume.content.education || resume.content.education.length === 0) {
      if (profile?.education) {
        // Handle both old (single object) and new (array) formats
        const eduArray = Array.isArray(profile.education) ? profile.education : [profile.education];
        if (eduArray.length > 0 && eduArray[0]) {
          resume.content.education = eduArray
            .filter((edu: any) => edu && edu.degree && edu.field && edu.institution)
            .map((edu: any) => ({
              degree: edu.degree,
              field: edu.field,
              institution: edu.institution,
              location: edu.location,
              startDate: edu.startDate || edu.startYear || '',
              endDate: edu.endDate || edu.endYear || edu.graduationYear || '',
              current: edu.current || false,
              gpa: typeof edu.gpa === 'string' ? parseFloat(edu.gpa) : edu.gpa,
              highlights: edu.highlights || edu.achievements || []
            }));
        }
      }
    }
    
    // Load projects from projects.json if not already in resume
    if (!resume.content.projects || resume.content.projects.length === 0) {
      try {
        const projectsPath = path.join(process.env.HOME || '', '.faj', 'projects.json');
        const projectsData = await fs.readFile(projectsPath, 'utf-8');
        const { projects } = JSON.parse(projectsData);
        if (projects && projects.length > 0) {
          resume.content.projects = projects;
        }
      } catch {
        // No projects file exists
      }
    }
    let md = `# Resume\n\n`;
    
    // Basic Information
    if (resume.basicInfo) {
      md += `## Basic Information\n\n`;
      md += `**Name:** ${resume.basicInfo.name}\n`;
      md += `**Email:** ${resume.basicInfo.email}\n`;
      if (resume.basicInfo.phone) md += `**Phone:** ${resume.basicInfo.phone}\n`;
      if (resume.basicInfo.location) md += `**Location:** ${resume.basicInfo.location}\n`;
      if (resume.basicInfo.birthDate) md += `**Birth Date:** ${resume.basicInfo.birthDate}\n`;
      if (resume.basicInfo.nationality) md += `**Nationality:** ${resume.basicInfo.nationality}\n`;
      if (resume.basicInfo.languages?.length) {
        md += `**Languages:** ${resume.basicInfo.languages.join(', ')}\n`;
      }
      if (resume.basicInfo.githubUrl) md += `**GitHub:** [${resume.basicInfo.githubUrl}](${resume.basicInfo.githubUrl})\n`;
      if (resume.basicInfo.linkedinUrl) md += `**LinkedIn:** [${resume.basicInfo.linkedinUrl}](${resume.basicInfo.linkedinUrl})\n`;
      if (resume.basicInfo.portfolioUrl) md += `**Portfolio:** [${resume.basicInfo.portfolioUrl}](${resume.basicInfo.portfolioUrl})\n`;
      md += '\n';
    }
    
    // Professional Summary section removed

    // Education (moved to second position, after Basic Info)
    if (resume.content.education.length > 0) {
      md += `## ${titles.education}\n\n`;
      for (const edu of resume.content.education) {
        md += `### ${edu.degree}（${edu.field}）\n`;
        md += `${edu.institution}`;
        if (edu.location) md += `, ${edu.location}`;
        md += `\n`;
        md += `*${edu.startDate} - ${edu.current ? 'Present' : edu.endDate}*\n\n`;
        if (edu.gpa) {
          md += `**GPA:** ${edu.gpa}\n\n`;
        }
        if (edu.highlights && edu.highlights.length > 0) {
          md += `**Highlights:**\n`;
          md += edu.highlights.map(h => `- ${h}`).join('\n');
          md += '\n\n';
        }
      }
    }

    // Work Experience (moved to third position)
    if (resume.content.experience.length > 0) {
      md += `## ${titles.workExperience}\n\n`;
      for (const exp of resume.content.experience) {
        md += `### ${exp.title}`;
        if (exp.company) md += ` at ${exp.company}`;
        md += `\n`;
        md += `*${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}*\n\n`;
        md += `${exp.description}\n\n`;
        if (exp.highlights.length > 0) {
          md += `**Key Achievements:**\n`;
          md += exp.highlights.map(h => `- ${h}`).join('\n');
          md += '\n\n';
        }
        if (exp.technologies.length > 0) {
          md += `**Technologies:** ${exp.technologies.join(', ')}\n\n`;
        }
      }
    }

    // Projects (moved to fourth position)
    if (resume.content.projects.length > 0) {
      md += `## Project Experience\n\n`;
      for (const project of resume.content.projects) {
        md += `### ${project.name}\n`;
        md += `${project.description}\n\n`;
        if (project.role) {
          md += `**Role:** ${project.role}\n\n`;
        }
        if (project.highlights.length > 0) {
          md += `**Key Features & Achievements:**\n`;
          md += project.highlights.map(h => `- ${h}`).join('\n');
          md += '\n\n';
        }
        if (project.technologies.length > 0) {
          md += `**Tech Stack:** ${project.technologies.join(', ')}\n\n`;
        }
        if (project.url || project.githubUrl) {
          md += `**Links:** `;
          if (project.url) md += `[Website](${project.url}) `;
          if (project.githubUrl) md += `[GitHub](${project.githubUrl})`;
          md += '\n\n';
        }
      }
    }

    // Technical Skills (moved to fifth position)
    if (resume.content.skills.length > 0) {
      md += `## ${titles.technicalSkills}\n\n`;
      const skillsByCategory = this.groupSkillsByCategory(resume.content.skills);
      for (const [category, skills] of Object.entries(skillsByCategory)) {
        const categoryLabel = this.getCategoryLabel(category);
        md += `### ${categoryLabel}\n`;
        md += skills.map(s => `- ${s.name} (${s.level})`).join('\n');
        md += '\n\n';
      }
    }

    // Certifications
    if (resume.content.certifications && resume.content.certifications.length > 0) {
      md += `## Certifications\n\n`;
      for (const cert of resume.content.certifications) {
        md += `- **${cert.name}** by ${cert.issuer} (${cert.issueDate})`;
        if (cert.expiryDate) md += ` - Expires: ${cert.expiryDate}`;
        if (cert.url) md += ` [View](${cert.url})`;
        md += '\n';
      }
    }

    return md;
  }

  private async exportPDF(themeName?: string): Promise<string> {
    if (!this.currentResume) {
      throw new Error('No resume to export');
    }

    const resume = this.currentResume;
    
    // Load profile data
    const profile = await this.configManager.get('profile') as DeveloperProfile;
    
    // Ensure basicInfo has languages from profile
    if (!resume.basicInfo) {
      resume.basicInfo = {
        name: profile?.name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        location: profile?.location || '',
        languages: profile?.languages || []
      } as any;
    } else if (!resume.basicInfo.languages && profile?.languages) {
      resume.basicInfo.languages = profile.languages;
    }
    
    // Load education from profile if not already in resume
    if (!resume.content.education || resume.content.education.length === 0) {
      if (profile?.education) {
        // Handle both old (single object) and new (array) formats
        const eduArray = Array.isArray(profile.education) ? profile.education : [profile.education];
        if (eduArray.length > 0 && eduArray[0]) {
          resume.content.education = eduArray
            .filter((edu: any) => edu && edu.degree && edu.field && edu.institution)
            .map((edu: any) => ({
              degree: edu.degree,
              field: edu.field,
              institution: edu.institution,
              location: edu.location,
              startDate: edu.startDate || edu.startYear || '',
              endDate: edu.endDate || edu.endYear || edu.graduationYear || '',
              current: edu.current || false,
              gpa: typeof edu.gpa === 'string' ? parseFloat(edu.gpa) : edu.gpa,
              highlights: edu.highlights || edu.achievements || []
            }));
        }
      }
    }
    
    // Load projects from projects.json if not already in resume
    if (!resume.content.projects || resume.content.projects.length === 0) {
      try {
        const projectsPath = path.join(process.env.HOME || '', '.faj', 'projects.json');
        const projectsData = await fs.readFile(projectsPath, 'utf-8');
        const { projects } = JSON.parse(projectsData);
        if (projects && projects.length > 0) {
          resume.content.projects = projects;
        }
      } catch {
        // No projects file exists
      }
    }
    
    // Use OpenResumePDFGenerator with local TTF fonts (like Open-Resume)
    const pdfGenerator = new OpenResumePDFGenerator();
    
    try {
      const pdfBuffer = await pdfGenerator.generatePDF(resume, themeName || 'modern');
      return pdfBuffer.toString('base64');
    } catch (error) {
      this.logger.error('Failed to generate PDF', error);
      throw new Error('Failed to generate PDF');
    }
  }
  
  
  private async exportHTML(themeName?: string): Promise<string> {
    if (!this.currentResume) {
      throw new Error('No resume to export');
    }
    
    // Load profile data
    const profile = await this.configManager.get('profile') as DeveloperProfile;
    
    // Ensure basicInfo has languages from profile
    if (!this.currentResume.basicInfo) {
      this.currentResume.basicInfo = {
        name: profile?.name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        location: profile?.location || '',
        languages: profile?.languages || []
      } as any;
    } else if (!this.currentResume.basicInfo.languages && profile?.languages) {
      this.currentResume.basicInfo.languages = profile.languages;
    }
    
    // Load education from profile if not already in resume
    if (!this.currentResume.content.education || this.currentResume.content.education.length === 0) {
      if (profile?.education) {
        // Handle both old (single object) and new (array) formats
        const eduArray = Array.isArray(profile.education) ? profile.education : [profile.education];
        if (eduArray.length > 0 && eduArray[0]) {
          this.currentResume.content.education = eduArray
            .filter((edu: any) => edu && edu.degree && edu.field && edu.institution)
            .map((edu: any) => ({
              degree: edu.degree,
              field: edu.field,
              institution: edu.institution,
              location: edu.location,
              startDate: edu.startDate || edu.startYear || '',
              endDate: edu.endDate || edu.endYear || edu.graduationYear || '',
              current: edu.current || false,
              gpa: typeof edu.gpa === 'string' ? parseFloat(edu.gpa) : edu.gpa,
              highlights: edu.highlights || edu.achievements || []
            }));
        }
      }
    }
    
    // Load projects from projects.json if not already in resume
    if (!this.currentResume.content.projects || this.currentResume.content.projects.length === 0) {
      try {
        const projectsPath = path.join(process.env.HOME || '', '.faj', 'projects.json');
        const projectsData = await fs.readFile(projectsPath, 'utf-8');
        const { projects } = JSON.parse(projectsData);
        if (projects && projects.length > 0) {
          this.currentResume.content.projects = projects;
        }
      } catch {
        // No projects file exists
      }
    }
    
    return generateHTMLResume(this.currentResume, themeName || 'modern');
  }
  
  private async exportCompactHTML(themeName?: string): Promise<string> {
    if (!this.currentResume) {
      throw new Error('No resume to export');
    }
    
    // Load profile data
    const profile = await this.configManager.get('profile') as DeveloperProfile;
    
    // Ensure basicInfo has languages from profile
    if (!this.currentResume.basicInfo) {
      this.currentResume.basicInfo = {
        name: profile?.name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        location: profile?.location || '',
        languages: profile?.languages || []
      } as any;
    } else if (!this.currentResume.basicInfo.languages && profile?.languages) {
      this.currentResume.basicInfo.languages = profile.languages;
    }
    
    // Load education from profile if not already in resume
    if (!this.currentResume.content.education || this.currentResume.content.education.length === 0) {
      if (profile?.education) {
        // Handle both old (single object) and new (array) formats
        const eduArray = Array.isArray(profile.education) ? profile.education : [profile.education];
        if (eduArray.length > 0 && eduArray[0]) {
          this.currentResume.content.education = eduArray
            .filter((edu: any) => edu && edu.degree && edu.field && edu.institution)
            .map((edu: any) => ({
              degree: edu.degree,
              field: edu.field,
              institution: edu.institution,
              location: edu.location,
              startDate: edu.startDate || edu.startYear || '',
              endDate: edu.endDate || edu.endYear || edu.graduationYear || '',
              current: edu.current || false,
              gpa: typeof edu.gpa === 'string' ? parseFloat(edu.gpa) : edu.gpa,
              highlights: edu.highlights || edu.achievements || []
            }));
        }
      }
    }
    
    // Load projects from projects.json if not already in resume
    if (!this.currentResume.content.projects || this.currentResume.content.projects.length === 0) {
      try {
        const projectsPath = path.join(process.env.HOME || '', '.faj', 'projects.json');
        const projectsData = await fs.readFile(projectsPath, 'utf-8');
        const { projects } = JSON.parse(projectsData);
        if (projects && projects.length > 0) {
          this.currentResume.content.projects = projects;
        }
      } catch {
        // No projects file exists
      }
    }
    
    return generateCompactHTMLResume(this.currentResume, themeName || 'modern');
  }
  
  getAvailableThemes(): { name: string; description: string }[] {
    return Object.keys(themes).map(key => ({
      name: key,
      description: themes[key].description
    }));
  }

  private groupSkillsByCategory(skills: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    for (const skill of skills) {
      const category = skill.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(skill);
    }

    return grouped;
  }

  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'language': 'Programming Languages',
      'framework': 'Frameworks',
      'tool': 'Tools & Technologies',
      'database': 'Databases',
      'other': 'Other Skills'
    };
    return labels[category] || category;
  }

  private async save(): Promise<void> {
    if (!this.currentResume) {
      throw new Error('No resume to save');
    }

    try {
      await this.ensureResumeDir();
      await fs.writeFile(this.resumePath, JSON.stringify(this.currentResume, null, 2), 'utf-8');
      this.logger.debug('Resume saved to disk');
    } catch (error) {
      this.logger.error('Failed to save resume', error);
      throw new Error('Failed to save resume');
    }
  }

  private async ensureResumeDir(): Promise<void> {
    const dir = path.dirname(this.resumePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async resumeExists(): Promise<boolean> {
    try {
      await fs.access(this.resumePath);
      return true;
    } catch {
      return false;
    }
  }

  private async createEmptyResume(): Promise<Resume> {
    const profile = await this.configManager.get('profile') as DeveloperProfile;
    const developerId = profile?.id || 'unknown';

    return {
      id: this.generateId(),
      developerId,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      aiProvider: 'gemini',
      content: {
        summary: '',
        skills: [],
        experience: [],
        projects: [],
        education: [],
      },
      metadata: {
        hash: '',
        published: false,
      },
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}