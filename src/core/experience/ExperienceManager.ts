import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Experience } from '../../models';
import { Logger } from '../../utils/Logger';
import { AIManager } from '../../ai/AIManager';
import { ConfigManager } from '../config/ConfigManager';

export interface WorkExperience extends Experience {
  id: string;
  rawDescription?: string; // User's original description
  polished?: boolean; // Whether AI has polished this
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperienceStore {
  experiences: WorkExperience[];
  updatedAt: Date;
}

export class ExperienceManager {
  private static instance: ExperienceManager;
  private experiences: WorkExperience[] = [];
  private experiencePath: string;
  private logger: Logger;
  private aiManager: AIManager;
  private configManager: ConfigManager;

  private constructor() {
    this.logger = new Logger('ExperienceManager');
    this.experiencePath = path.join(os.homedir(), '.faj', 'experiences.json');
    this.aiManager = AIManager.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  static getInstance(): ExperienceManager {
    if (!ExperienceManager.instance) {
      ExperienceManager.instance = new ExperienceManager();
    }
    return ExperienceManager.instance;
  }

  async load(): Promise<void> {
    try {
      if (await this.experienceExists()) {
        const data = await fs.readFile(this.experiencePath, 'utf-8');
        const store: ExperienceStore = JSON.parse(data);
        
        // Convert date strings back to Date objects
        this.experiences = store.experiences.map(exp => ({
          ...exp,
          createdAt: new Date(exp.createdAt),
          updatedAt: new Date(exp.updatedAt)
        }));
        
        this.logger.info(`Loaded ${this.experiences.length} experiences`);
      } else {
        this.experiences = [];
        this.logger.info('No existing experiences found');
      }
    } catch (error) {
      this.logger.error('Failed to load experiences', error);
      this.experiences = [];
    }
  }

  async save(): Promise<void> {
    try {
      await this.ensureExperienceDir();
      
      const store: ExperienceStore = {
        experiences: this.experiences,
        updatedAt: new Date()
      };
      
      await fs.writeFile(
        this.experiencePath,
        JSON.stringify(store, null, 2),
        'utf-8'
      );
      
      this.logger.info('Experiences saved successfully');
    } catch (error) {
      this.logger.error('Failed to save experiences', error);
      throw new Error('Failed to save experiences');
    }
  }

  async add(experience: Omit<WorkExperience, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkExperience> {
    const newExperience: WorkExperience = {
      ...experience,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      polished: false
    };

    this.experiences.push(newExperience);
    await this.save();
    
    this.logger.info(`Added new experience: ${newExperience.title} at ${newExperience.company}`);
    return newExperience;
  }

  async update(id: string, updates: Partial<WorkExperience>): Promise<WorkExperience | null> {
    const index = this.experiences.findIndex(exp => exp.id === id);
    
    if (index === -1) {
      this.logger.warn(`Experience with id ${id} not found`);
      return null;
    }

    this.experiences[index] = {
      ...this.experiences[index],
      ...updates,
      updatedAt: new Date()
    };

    await this.save();
    
    this.logger.info(`Updated experience ${id}`);
    return this.experiences[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.experiences.findIndex(exp => exp.id === id);
    
    if (index === -1) {
      this.logger.warn(`Experience with id ${id} not found`);
      return false;
    }

    const removed = this.experiences.splice(index, 1)[0];
    await this.save();
    
    this.logger.info(`Deleted experience: ${removed.title} at ${removed.company}`);
    return true;
  }

  async get(id: string): Promise<WorkExperience | null> {
    return this.experiences.find(exp => exp.id === id) || null;
  }

  async getAll(): Promise<WorkExperience[]> {
    // Sort by end date (most recent first)
    // Current positions (current = true) should appear first
    return [...this.experiences].sort((a, b) => {
      // If one is current and the other is not, current comes first
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
      
      // If both are current or both are not current, sort by start date (most recent first)
      if (a.current && b.current) {
        return b.startDate.localeCompare(a.startDate);
      }
      
      // For non-current positions, sort by end date (most recent first)
      const aEndDate = a.endDate || a.startDate;
      const bEndDate = b.endDate || b.startDate;
      return bEndDate.localeCompare(aEndDate);
    });
  }

  async polish(id: string, rawDescription: string): Promise<WorkExperience | null> {
    const experience = await this.get(id);
    
    if (!experience) {
      this.logger.warn(`Experience with id ${id} not found`);
      return null;
    }

    try {
      await this.aiManager.initialize();
      
      const prompt = await this.buildPolishPrompt(experience, rawDescription);
      const response = await this.aiManager.processPrompt(prompt);
      
      // Parse AI response
      const polished = this.parsePolishResponse(response);
      
      // Update experience with polished content
      const updated = await this.update(id, {
        rawDescription,
        description: polished.description,
        highlights: polished.highlights,
        technologies: polished.technologies || experience.technologies,
        polished: true
      });
      
      this.logger.success('Experience polished successfully');
      return updated;
    } catch (error) {
      this.logger.error('Failed to polish experience', error);
      throw error;
    }
  }

  async polishWithJob(id: string, rawDescription: string, jobDescription: string): Promise<WorkExperience | null> {
    const experience = await this.get(id);
    
    if (!experience) {
      this.logger.warn(`Experience with id ${id} not found`);
      return null;
    }

    try {
      await this.aiManager.initialize();
      
      const prompt = await this.buildPolishWithJobPrompt(experience, rawDescription, jobDescription);
      const response = await this.aiManager.processPrompt(prompt);
      
      // Parse AI response
      const polished = this.parsePolishResponse(response);
      
      // Update experience with polished content
      const updated = await this.update(id, {
        rawDescription,
        description: polished.description,
        highlights: polished.highlights,
        technologies: polished.technologies || experience.technologies,
        polished: true
      });
      
      this.logger.success('Experience polished with job context successfully');
      return updated;
    } catch (error) {
      this.logger.error('Failed to polish experience with job context', error);
      throw error;
    }
  }

  async tailorToJob(id: string, jobDescription: string): Promise<WorkExperience | null> {
    const experience = await this.get(id);
    
    if (!experience) {
      this.logger.warn(`Experience with id ${id} not found`);
      return null;
    }

    try {
      await this.aiManager.initialize();
      
      const prompt = await this.buildTailorPrompt(experience, jobDescription);
      const response = await this.aiManager.processPrompt(prompt);
      
      // Parse AI response
      const tailored = this.parsePolishResponse(response);
      
      // Update experience with tailored content
      const updated = await this.update(id, {
        description: tailored.description,
        highlights: tailored.highlights,
        technologies: tailored.technologies || experience.technologies,
        polished: true
      });
      
      this.logger.success('Experience tailored to job description successfully');
      return updated;
    } catch (error) {
      this.logger.error('Failed to tailor experience', error);
      throw error;
    }
  }

  private async buildPolishPrompt(experience: WorkExperience, rawDescription: string): Promise<string> {
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
    
    return `You are a professional resume writer. Polish the following work experience description based on ACTUAL information provided.

ACTUAL WORK EXPERIENCE DATA:
- Company: ${experience.company}
- Position: ${experience.title}
- Duration: ${experience.startDate} - ${experience.endDate || 'Present'}
- Current Technologies: ${experience.technologies?.join(', ') || 'Not specified'}

User's Raw Description (this is the ONLY source of truth for achievements):
${rawDescription}

STRICT RULES:
1. Base EVERYTHING on the raw description provided - DO NOT invent achievements, metrics, or responsibilities
2. If the raw description doesn't mention specific numbers, DO NOT make them up
3. Only mention technologies that are either:
   - Already listed in the current technologies
   - Explicitly mentioned in the raw description
4. DO NOT add generic achievements like "improved performance by X%" unless explicitly stated in the raw description
5. Focus on reorganizing and polishing the ACTUAL content provided, not inventing new content

Please provide:
1. A professional 2-3 sentence summary of the role based ONLY on the raw description
2. 4-6 bullet points that reorganize the raw description content (use numbers ONLY if they exist in the raw description)
3. List of technologies (ONLY those mentioned in the data or raw description)

Requirements:
- Use action verbs for existing achievements
- Maintain factual accuracy - no speculation
- Professional language while staying true to the original content
- If no specific metrics exist in the raw description, focus on responsibilities and technical work

IMPORTANT: Generate ALL content in ${languageName} language.
Base everything on the raw description - NO INVENTION of metrics or achievements.

Format as JSON:
{
  "description": "...",
  "highlights": ["actual achievement 1", "actual achievement 2", ...],
  "technologies": ["only real tech 1", "only real tech 2", ...]
}`;
  }

  private async buildPolishWithJobPrompt(experience: WorkExperience, rawDescription: string, jobDescription: string): Promise<string> {
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
    
    return `You are a professional resume writer helping to polish and optimize work experiences.

USER'S ACTUAL WORK (PRIMARY FOCUS - 70%):
${rawDescription}

Work Context:
- Company: ${experience.company}
- Position: ${experience.title}
- Duration: ${experience.startDate} - ${experience.endDate || 'Present'}
- Technologies used: ${experience.technologies?.join(', ') || 'Not specified'}

TARGET JOB DESCRIPTION (For reference - 30%):
${jobDescription}

OPTIMIZATION STRATEGY:
1. START with the user's actual work description - this is the foundation
2. Polish and enhance the user's real experiences professionally
3. Identify which parts of their ACTUAL work align with the JD
4. Highlight and emphasize those naturally overlapping areas
5. Use JD keywords ONLY where they genuinely apply to the user's work
6. Add minor enhancements that are reasonable for their actual role

ENHANCEMENT APPROACH:
- Base 70% on what the user actually did and described
- Use JD to identify which of their real experiences to emphasize
- Enhance metrics with reasonable estimates based on their description
- Add standard practices that someone in their specific role would do
- Include technologies they mentioned plus closely related ones they likely used
- Structure to highlight JD-relevant parts of their REAL experience

IMPORTANT BOUNDARIES:
- The user's actual work is the core - don't overshadow it with JD requirements
- Only add skills/tasks that naturally fit with what they described
- Don't force JD requirements that don't match their experience
- Keep the authenticity of their unique experience at this company
- Enhance but don't transform - it should still feel like their story

OUTPUT:
1. A professional summary based on their actual role, with JD-relevant aspects highlighted
2. 5-6 bullet points: primarily their real work, with relevant ones emphasized for JD
3. Technologies: what they used + reasonable additions from their ecosystem

IMPORTANT: Generate ALL content in ${languageName} language.
Polish their real experience while highlighting JD-relevant aspects.

Format as JSON:
{
  "description": "professional summary of their actual work with relevant aspects emphasized",
  "highlights": ["their actual achievement 1", "their actual achievement 2 (relevant to JD)", ...],
  "technologies": ["their mentioned tech", "related tools they likely used", ...]
}`;
  }

  private async buildTailorPrompt(experience: WorkExperience, jobDescription: string): Promise<string> {
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
    
    return `You are a professional resume writer helping to refine existing work experiences.

EXISTING WORK EXPERIENCE (CORE CONTENT - 70%):
- Company: ${experience.company}
- Position: ${experience.title}
- Duration: ${experience.startDate} - ${experience.endDate || 'Present'}
- Current Description: ${experience.description}
- Key Achievements: ${experience.highlights?.join('\n') || 'None'}
- Technologies: ${experience.technologies?.join(', ') || 'Not specified'}
${experience.rawDescription ? `- Original Description: ${experience.rawDescription}` : ''}

TARGET JOB REFERENCE (GUIDANCE - 30%):
${jobDescription}

REFINEMENT STRATEGY:
1. Keep the user's existing experience as the foundation
2. Identify natural connections between their work and the JD
3. Adjust presentation to highlight relevant aspects they already have
4. Use JD keywords where they authentically apply to their experience
5. Reorder content to feature JD-relevant work prominently (but keep all content)
6. Polish language while maintaining their authentic experience

ENHANCEMENT GUIDELINES:
- Preserve the core of what they actually did
- Highlight existing achievements that happen to match JD needs
- Add reasonable details based on their role and company context
- Include related technologies they likely used in their ecosystem
- Improve metrics clarity where their description allows
- Use professional language that reflects both their work and JD terms

IMPORTANT LIMITS:
- Don't add responsibilities they didn't have
- Don't force-fit JD requirements that don't match
- Keep their unique experience authentic
- Maintain the truth of their actual contributions
- Enhance presentation, not substance

OUTPUT:
1. A refined summary of their actual experience, with relevant aspects naturally emphasized
2. 5-7 bullet points: all their real work, ordered to highlight JD-relevant items first
3. Technologies: their actual stack plus reasonable ecosystem tools

IMPORTANT: Generate ALL content in ${languageName} language.
Refine their real experience with subtle JD alignment.

Format as JSON:
{
  "description": "polished version of their actual experience",
  "highlights": ["their refined achievement 1", "their achievement 2 (happens to match JD)", ...],
  "technologies": ["their actual tech", "ecosystem tools", ...]
}`;
  }

  private parsePolishResponse(response: string): {
    description: string;
    highlights: string[];
    technologies?: string[];
  } {
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedResponse = response;
      if (response.includes('```json')) {
        cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (response.includes('```')) {
        cleanedResponse = response.replace(/```\s*/g, '');
      }
      
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.error('Failed to parse AI response', error);
    }
    
    // Fallback
    return {
      description: response,
      highlights: [],
      technologies: []
    };
  }

  getExperienceTemplates(): { [key: string]: string } {
    return {
      'internet': `我在[公司名]担任[职位]，负责[产品/系统]的[开发/维护]工作。
主要负责[具体模块]的设计与实现，参与了[项目名称]的开发。
在此期间，我优化了[具体功能]，将[性能指标]提升了[X%]。
团队规模[X]人，采用[敏捷/其他]开发模式。
使用的技术栈包括[语言]、[框架]、[数据库]等。`,

      'finance': `我在[银行/金融机构]担任[职位]，负责[交易系统/风控系统]的开发。
参与了[系统名称]的架构设计和核心模块开发，处理日均[X]笔交易。
通过[技术优化]，将系统延迟降低至[X]毫秒，可靠性达到[99.9%]。
负责与[业务部门]对接，确保系统满足合规要求。
使用技术包括[Java/C++]、[Spring/其他框架]、[Oracle/其他数据库]。`,

      'gaming': `我在[游戏公司]担任[职位]，负责[游戏名称/类型]的[服务器/客户端]开发。
实现了[核心玩法/系统]，支持[X]万同时在线用户。
优化了[具体系统]，将服务器响应时间减少[X%]，提升玩家体验。
参与了[X]次版本迭代，确保新功能按时上线。
技术栈：[C++/Unity]、[网络框架]、[数据库]、[缓存系统]。`,

      'startup': `我在[初创公司]担任[职位]，作为[第X号]员工参与产品从0到1的开发。
独立负责[核心模块]的设计和实现，支撑了[用户/业务]增长[X倍]。
在资源有限的情况下，通过[技术选型/架构优化]，节省了[X%]的成本。
除了开发工作，还参与了[技术选型/团队建设/客户对接]。
技术栈：[语言]、[框架]、[云服务]、[DevOps工具]。`,

      'enterprise': `我在[大型企业]担任[职位]，负责[企业级系统]的开发和维护。
参与了[系统名称]的微服务化改造，将单体应用拆分为[X]个微服务。
通过引入[技术/工具]，将部署时间从[X小时]缩短到[X分钟]。
负责跨部门协作，与[X]个团队共同推进项目落地。
技术栈：[Java/C#]、[Spring Boot/。NET]、[Kubernetes]、[CI/CD工具]。`
    };
  }

  getExperienceExample(): string {
    return `示例描述：

我在腾讯担任高级后端工程师，负责微信支付核心交易系统的开发和优化。
主要负责支付网关的架构设计和性能优化，日均处理超过1亿笔交易。
在此期间，我重构了支付路由模块，将系统响应时间从200ms降低到50ms，提升了75%。
带领3人小组完成了支付系统的容器化改造，实现了自动扩缩容。
使用的技术栈包括Java、Spring Boot、MySQL、Redis、Kafka和Kubernetes。

这个描述包含了：
✓ 具体公司和职位
✓ 明确的工作职责
✓ 量化的成果（1亿笔交易、75%性能提升）
✓ 团队规模（3人小组）
✓ 具体的技术栈`;
  }

  private async ensureExperienceDir(): Promise<void> {
    const dir = path.dirname(this.experiencePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async experienceExists(): Promise<boolean> {
    try {
      await fs.access(this.experiencePath);
      return true;
    } catch {
      return false;
    }
  }

  private generateId(): string {
    return 'exp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }
}