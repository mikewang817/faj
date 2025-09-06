import { Logger } from '../../utils/Logger';
import fs from 'fs/promises';
import path from 'path';
import { ProjectAnalysis } from '../../models';
import { AIManager } from '../../ai/AIManager';
import { ConfigManager } from '../config/ConfigManager';

export interface Project {
  id: string;
  name: string;
  description: string;
  role: string;
  technologies: string[];
  highlights: string[];
  metrics?: {
    filesCount: number;
    linesOfCode: number;
  };
  startDate?: string;
  endDate?: string | null;
  current?: boolean;
  githubUrl?: string;
  url?: string;
  createdAt?: Date;
  updatedAt?: Date;
  polished?: boolean;
}

export class ProjectManager {
  private static instance: ProjectManager;
  private logger: Logger;
  private projects: Project[] = [];
  private projectsPath: string;
  private aiManager: AIManager;
  private configManager: ConfigManager;

  private constructor() {
    this.logger = new Logger('ProjectManager');
    this.projectsPath = path.join(process.env.HOME || '', '.faj', 'projects.json');
    this.aiManager = AIManager.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  static getInstance(): ProjectManager {
    if (!this.instance) {
      this.instance = new ProjectManager();
    }
    return this.instance;
  }

  async load(): Promise<void> {
    try {
      await this.ensureProjectsFile();
      const data = await fs.readFile(this.projectsPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.projects = parsed.projects || [];
      this.logger.info(`Loaded ${this.projects.length} projects`);
    } catch (error) {
      this.logger.error('Failed to load projects', error);
      this.projects = [];
    }
  }

  async save(): Promise<void> {
    try {
      await this.ensureProjectsFile();
      const data = {
        projects: this.projects,
        updatedAt: new Date()
      };
      await fs.writeFile(this.projectsPath, JSON.stringify(data, null, 2));
      this.logger.debug('Projects saved to disk');
    } catch (error) {
      this.logger.error('Failed to save projects', error);
      throw error;
    }
  }

  async add(project: Partial<Project>): Promise<Project> {
    const newProject: Project = {
      id: this.generateId(),
      name: project.name || 'Untitled Project',
      description: project.description || '',
      role: project.role || 'Developer',
      technologies: project.technologies || [],
      highlights: project.highlights || [],
      metrics: project.metrics,
      startDate: project.startDate,
      endDate: project.endDate,
      current: project.current,
      githubUrl: project.githubUrl,
      url: project.url,
      createdAt: new Date(),
      updatedAt: new Date(),
      polished: false
    };

    this.projects.push(newProject);
    await this.save();
    this.logger.success(`Added project: ${newProject.name}`);
    return newProject;
  }

  async update(id: string, updates: Partial<Project>): Promise<Project | null> {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) {
      this.logger.warn(`Project not found: ${id}`);
      return null;
    }

    this.projects[index] = {
      ...this.projects[index],
      ...updates,
      updatedAt: new Date()
    };

    await this.save();
    this.logger.success(`Updated project: ${this.projects[index].name}`);
    return this.projects[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) {
      this.logger.warn(`Project not found: ${id}`);
      return false;
    }

    const removed = this.projects.splice(index, 1);
    await this.save();
    this.logger.success(`Deleted project: ${removed[0].name}`);
    return true;
  }

  async get(id: string): Promise<Project | null> {
    return this.projects.find(p => p.id === id) || null;
  }

  async getAll(): Promise<Project[]> {
    return [...this.projects];
  }

  async addFromAnalysis(analysis: ProjectAnalysis, additionalInfo?: Partial<Project>): Promise<Project> {
    const project: Partial<Project> = {
      name: analysis.name,
      description: additionalInfo?.description || analysis.description || '',
      role: additionalInfo?.role || 'Developer',
      technologies: Object.keys(analysis.languages || {}),
      highlights: analysis.highlights || [],
      metrics: analysis.metrics,
      githubUrl: (analysis as any).githubUrl,
      ...additionalInfo
    };

    return await this.add(project);
  }

  async polish(id: string, rawDescription?: string): Promise<Project | null> {
    const project = await this.get(id);
    if (!project) {
      this.logger.warn(`Project not found: ${id}`);
      return null;
    }

    try {
      // Get user's language preference
      const profile: any = await this.configManager.get('profile');
      const userLanguages = profile?.languages || ['English'];
      const primaryLanguage = userLanguages[0];
      
      // Determine the language to use for AI response
      let languageName = 'English';
      if (primaryLanguage) {
        const langLower = primaryLanguage.toLowerCase();
        if (langLower.includes('chinese') || langLower.includes('中文') || langLower.includes('mandarin')) {
          languageName = 'Chinese';
        } else if (langLower.includes('spanish') || langLower.includes('español')) {
          languageName = 'Spanish';
        } else if (langLower.includes('french') || langLower.includes('français')) {
          languageName = 'French';
        } else if (langLower.includes('german') || langLower.includes('deutsch')) {
          languageName = 'German';
        } else if (langLower.includes('japanese') || langLower.includes('日本語')) {
          languageName = 'Japanese';
        } else if (langLower.includes('korean') || langLower.includes('한국어')) {
          languageName = 'Korean';
        }
      }

      // Build AI prompt with strict guidelines
      const prompt = `
Based on this ACTUAL project data, enhance the project description in ${languageName}:

ACTUAL PROJECT DATA (DO NOT INVENT METRICS):
- Project Name: ${project.name}
- Current Description: ${rawDescription || project.description}
- Actual Technologies Used: ${project.technologies.join(', ')}
- Actual File Count: ${project.metrics?.filesCount || 0} files
- Actual Lines of Code: ${project.metrics?.linesOfCode || 0} lines
${project.highlights.length > 0 ? `- Existing Highlights: ${project.highlights.join(', ')}` : ''}
${project.role ? `- Developer Role: ${project.role}` : ''}
${project.githubUrl ? `- GitHub URL: ${project.githubUrl}` : ''}

STRICT RULES:
1. Use ONLY the metrics provided above - DO NOT invent performance numbers, user counts, or other metrics
2. Focus on the actual technical implementation based on the technologies listed
3. Describe architecture and code organization based on the file/line count
4. DO NOT make up features, improvements, or achievements not evident from the data
5. Base everything on the actual code statistics and technologies detected

Generate:
1. A refined 2-3 sentence description based on the actual project scope
2. 3-5 highlights using ONLY the real metrics (e.g., "Built with ${project.metrics?.filesCount || 0} well-organized files", "Leverages ${project.technologies.length} key technologies")
3. Keep the same technologies list, just clean/organize if needed

IMPORTANT: Generate ALL content in ${languageName} language.
NO SPECULATION - use only the provided data.

Return the response in JSON format:
{
  "description": "...",
  "highlights": ["fact-based highlight 1", "fact-based highlight 2", ...],
  "technologies": [${project.technologies.map(t => `"${t}"`).join(', ')}]
}`;

      await this.aiManager.initialize();
      const response = await this.aiManager.processPrompt(prompt);
      
      try {
        // Clean up the response - remove markdown code blocks if present
        let cleanedResponse = response;
        if (response.includes('```json')) {
          cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        } else if (response.includes('```')) {
          cleanedResponse = response.replace(/```\s*/g, '');
        }
        cleanedResponse = cleanedResponse.trim();
        
        const parsed = JSON.parse(cleanedResponse);
        
        const updated = await this.update(id, {
          description: parsed.description || project.description,
          highlights: parsed.highlights || project.highlights,
          technologies: parsed.technologies || project.technologies,
          polished: true
        });

        this.logger.success(`Polished project: ${project.name}`);
        return updated;
      } catch (parseError) {
        this.logger.warn('Failed to parse AI response, using original');
        return project;
      }
    } catch (error) {
      this.logger.error('Failed to polish project', error);
      return project;
    }
  }

  private async ensureProjectsFile(): Promise<void> {
    const dir = path.dirname(this.projectsPath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }

    try {
      await fs.access(this.projectsPath);
    } catch {
      // File doesn't exist, create it
      await fs.writeFile(this.projectsPath, JSON.stringify({ projects: [], updatedAt: new Date() }, null, 2));
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substring(2, 9);
  }

  async clear(): Promise<void> {
    this.projects = [];
    await this.save();
    this.logger.info('Cleared all projects');
  }

  async count(): Promise<number> {
    return this.projects.length;
  }
}