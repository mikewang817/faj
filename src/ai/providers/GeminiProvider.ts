import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseAIProvider } from './BaseProvider';
import { ProjectAnalysis, Resume, JobRequirement } from '../../models';

export class GeminiProvider extends BaseAIProvider {
  private client: GoogleGenerativeAI | null = null;

  constructor(apiKey?: string, model: string = 'gemini-2.5-pro') {
    super('Gemini', apiKey, model);
    
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey || !this.client) {
      this.logger.warn('Gemini API key not configured');
      return false;
    }

    // Skip availability check due to regional restrictions
    // Assume available if API key is provided
    this.logger.info('Gemini provider configured with API key');
    return true;
  }

  async analyzeProject(project: ProjectAnalysis): Promise<{
    summary: string;
    skills: string[];
    highlights: string[];
  }> {
    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }

    const prompt = this.buildAnalysisPrompt(project);
    
    try {
      const model = this.client.getGenerativeModel({ model: this.model! });
      const result = await this.executeWithRetry(async () => {
        return await model.generateContent(prompt);
      });

      const response = result.response.text();
      return this.parseAnalysisResponse(response);
    } catch (error) {
      this.logger.error('Failed to analyze project with Gemini', error);
      throw error;
    }
  }

  async generateResume(
    projects: ProjectAnalysis[],
    profile: any
  ): Promise<Resume> {
    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }

    const prompt = this.buildResumePrompt(projects, profile);

    try {
      const model = this.client.getGenerativeModel({ model: this.model! });
      const result = await this.executeWithRetry(async () => {
        return await model.generateContent(prompt);
      });

      const response = result.response.text();
      return this.parseResumeResponse(response, profile);
    } catch (error) {
      this.logger.error('Failed to generate resume with Gemini', error);
      throw error;
    }
  }

  async updateResume(
    resume: Resume,
    changes: Partial<Resume>
  ): Promise<Resume> {
    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }

    const prompt = this.buildUpdatePrompt(resume, changes);

    try {
      const model = this.client.getGenerativeModel({ model: this.model! });
      const result = await this.executeWithRetry(async () => {
        return await model.generateContent(prompt);
      });

      const response = result.response.text();
      return this.parseUpdateResponse(response, resume);
    } catch (error) {
      this.logger.error('Failed to update resume with Gemini', error);
      throw error;
    }
  }

  async matchScore(
    resume: Resume,
    job: JobRequirement
  ): Promise<number> {
    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }

    const prompt = this.buildMatchPrompt(resume, job);

    try {
      const model = this.client.getGenerativeModel({ model: this.model! });
      const result = await this.executeWithRetry(async () => {
        return await model.generateContent(prompt);
      });

      const response = result.response.text();
      return this.parseMatchScore(response);
    } catch (error) {
      this.logger.error('Failed to calculate match score with Gemini', error);
      throw error;
    }
  }

  private buildAnalysisPrompt(project: ProjectAnalysis): string {
    return `Analyze the following software project and provide a COMPREHENSIVE professional analysis.

Project Details:
- Name: ${project.name}
- Path/URL: ${project.path}
- Description: ${project.description}
- Type: ${project.type}
- Languages: ${Array.from(project.languages.keys()).join(', ')}
- Frameworks: ${project.frameworks.join(', ') || 'None detected - infer common frameworks'}
- Libraries: ${project.libraries.join(', ')}
- Complexity: ${project.complexity}
- Lines of Code: ${project.metrics.linesOfCode}
- Files: ${project.metrics.filesCount}

IMPORTANT: Be comprehensive and detailed. This is a sophisticated project that demonstrates advanced skills.

Please provide:
1. A detailed summary (3-4 sentences) explaining the project's purpose, architecture, and value
2. A comprehensive list of 10+ technical skills (include detected AND implied/related technologies)
3. 5-7 impressive highlight points that showcase technical expertise

For TypeScript/JavaScript projects, also include related skills like:
- Package managers (npm, yarn, pnpm)
- Build tools (Webpack, Vite, Rollup, ESBuild)
- Testing (Jest, Mocha, Vitest, Cypress)
- Version Control (Git, GitHub/GitLab)
- CI/CD tools
- Database technologies
- Cloud services
- Development methodologies

Format your response as JSON:
{
  "summary": "...",
  "skills": ["skill1", "skill2", ...at least 10-15 skills],
  "highlights": ["highlight1", "highlight2", ...at least 5-7 highlights]
}`;
  }

  private buildResumePrompt(projects: ProjectAnalysis[], profile: any): string {
    // Check if user has real work experiences
    const hasRealExperiences = profile.realExperiences && profile.realExperiences.length > 0;
    
    const projectsInfo = projects.map((p) => ({
      name: p.name,
      path: p.path,
      languages: Array.from(p.languages.keys()),
      frameworks: p.frameworks,
      libraries: p.libraries,
      complexity: p.complexity,
      linesOfCode: p.metrics.linesOfCode,
      filesCount: p.metrics.filesCount,
      description: p.description,
    }));

    // Get language preference from environment
    const language = process.env.FAJ_RESUME_LANGUAGE || 'zh';
    const languageInstructions = this.getLanguageInstructions(language);

    return `You are an expert resume writer for software developers. Generate a COMPREHENSIVE and DETAILED professional developer resume.

${languageInstructions}

Profile Information:
- Name: ${profile.name}
- Email: ${profile.email}
- Phone: ${profile.phone || 'Not provided'}
- Location: ${profile.location || 'Not provided'}
- Years of Experience: ${profile.experience}
- Languages: ${profile.languages?.join(', ') || 'Chinese, English'}
- Education: ${(() => {
    if (!profile.education) return 'Not provided';
    const eduArray = Array.isArray(profile.education) ? profile.education : [profile.education];
    if (eduArray.length === 0 || !eduArray[0]) return 'Not provided';
    return eduArray.map((edu: any) => `${edu.degree} in ${edu.field} from ${edu.institution} (${edu.endDate || edu.endYear || edu.graduationYear || edu.startDate})`).join('; ');
  })()}
- Career Objective: ${profile.careerObjective || 'Not provided'}
- GitHub: ${profile.githubUsername ? `https://github.com/${profile.githubUsername}` : 'Not provided'}
- LinkedIn: ${profile.linkedinUrl || 'Not provided'}

${hasRealExperiences ? `
User's Real Work Experiences (${profile.realExperiences.length} positions):
${JSON.stringify(profile.realExperiences.map((exp: any) => ({
  title: exp.title,
  company: exp.company,
  startDate: exp.startDate,
  endDate: exp.endDate || 'Present',
  current: exp.current,
  description: exp.description,
  highlights: exp.highlights,
  technologies: exp.technologies
})), null, 2)}
` : ''}

Projects Analyzed (Total: ${projects.length}):
${JSON.stringify(projectsInfo, null, 2)}

CRITICAL REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:
1. RESUME ORDER: Basic Info → Work Experience → Project Experience → Technical Skills → Education
2. WORK EXPERIENCE: ${hasRealExperiences ? 'USE THE PROVIDED REAL WORK EXPERIENCES - DO NOT CREATE FICTIONAL ONES' : 'Generate based on project complexity and skills demonstrated'}
3. PROJECTS: Use ONLY the actual projects provided - DO NOT make up fictional projects
4. For the project "${projectsInfo[0]?.name}", use the exact description: "${projectsInfo[0]?.description}"
5. SKILLS: Extract from BOTH work experiences and projects, remove duplicates
6. Include specific numbers and metrics in ALL sections

SPECIFIC PROJECT REQUIREMENTS:
- Include the actual FAJ project if it was analyzed (decentralized job matching platform)
- Use the real project names, not generic names
- Use the actual technologies detected in the analysis
- Describe the actual functionality implemented in these projects
- Each project should have 8-10 detailed bullet points
- Include specific metrics: ${projectsInfo[0]?.linesOfCode} lines of code, ${projectsInfo[0]?.filesCount} files

METRICS TO INCLUDE (use actual numbers from the project):
- Lines of code: ${projectsInfo[0]?.linesOfCode}
- Number of files: ${projectsInfo[0]?.filesCount}
- Primary language percentage: ${projectsInfo[0]?.languages?.[0]} (use actual percentage)
- Number of frameworks used: ${projectsInfo[0]?.frameworks?.length || 0}
- Number of libraries integrated: ${projectsInfo[0]?.libraries?.length || 0}
- Code complexity: ${projectsInfo[0]?.complexity}

IMPORTANT REQUIREMENTS:
- Be EXTREMELY detailed and comprehensive in all sections
- Generate AT LEAST 15-20 technical skills based on the ACTUAL project analysis
- Include both the detected technologies AND related/implied technologies
- Create 2-3 VERY detailed projects with 8-10 bullet points each
- Professional experience should have 6-8 bullet points with specific metrics
- Include specific numbers in EVERY bullet point (percentages, counts, time improvements, etc.)
- Make the summary 5-6 sentences with quantifiable achievements
- Skills should include languages, frameworks, tools, databases, cloud services, methodologies, etc.

For a project using TypeScript/JavaScript, also infer and include:
- Related tools (npm, yarn, webpack, babel, etc.)
- Testing frameworks (Jest, Mocha, Cypress, etc.)
- Version control (Git, GitHub)
- Development practices (Agile, CI/CD, TDD)
- Relevant databases (MongoDB, PostgreSQL, Redis)
- Cloud/deployment (Docker, AWS, Vercel, etc.)

Create a comprehensive resume following this EXACT order:
1. Professional summary (3-4 sentences, incorporating career objective if provided)
2. Work Experience section: ${hasRealExperiences ? `Use the ${profile.realExperiences.length} real experiences provided, enhance with metrics` : 'Generate 2-3 positions based on project complexity'}
3. Project Experience section: Include the ${projects.length} analyzed projects with 6-8 bullet points each
4. Technical Skills section: Extract from work experiences AND projects (15-20 skills, categorized)
5. Education section: ${(() => {
    if (!profile.education) return 'Bachelor degree in relevant field';
    const eduArray = Array.isArray(profile.education) ? profile.education : [profile.education];
    if (eduArray.length === 0 || !eduArray[0]) return 'Bachelor degree in relevant field';
    return eduArray.map((edu: any) => `${edu.degree} in ${edu.field} from ${edu.institution}`).join('; ');
  })()}

BULLET POINT REQUIREMENTS:
- EVERY bullet point MUST contain at least one specific number (percentage, count, time, etc.)
- Use action verbs: 开发了, 实现了, 优化了, 提升了, 减少了, 负责了, 设计了, 集成了, 构建了, 部署了, 重构了
- Include technical details about implementation
- Mention specific modules, features, or components created
- Highlight performance improvements with percentages
- Show scale and impact with concrete numbers

EXAMPLES OF METRICS TO INCLUDE IN BULLET POINTS:
- "开发了包含15个API端点的RESTful服务，处理每日10,000+请求"
- "优化算法性能，将响应时间从2秒降低到200毫秒，提升90%"
- "编写了300+单元测试，代码覆盖率达到95%"
- "管理包含${projectsInfo[0]?.linesOfCode}行代码的项目，涉及${projectsInfo[0]?.filesCount}个文件"
- "集成了${projectsInfo[0]?.libraries?.length || 0}个第三方库，提升开发效率40%"
- "将部署时间从3小时缩短到15分钟，效率提升92%"
- "设计了支持1000并发用户的系统架构"
- "减少了60%的代码重复，通过创建20个可复用组件"

Format the response as JSON following this structure:
{
  "summary": "...",
  "skills": [
    {
      "name": "...",
      "level": "beginner|intermediate|advanced|expert",
      "category": "language|framework|tool|database|other"
    }
  ],
  "projects": [
    {
      "name": "...",
      "description": "... (2-3 sentences describing the project purpose and impact)",
      "role": "...",
      "technologies": ["... at least 8-10 technologies"],
      "highlights": ["... at least 8-10 detailed bullet points, each with specific numbers"]
    }
  ],
  "experience": [
    {
      "title": "...",
      "company": "...",
      "startDate": "...",
      "endDate": "...",
      "current": false,
      "description": "... (2-3 sentences with specific project scope and team size)",
      "highlights": ["... at least 6-8 bullet points, each with metrics and numbers"],
      "technologies": ["... at least 8-10 technologies used"]
    }
  ],
  "education": [
    {
      "degree": "...",
      "field": "...",
      "institution": "...",
      "startDate": "...",
      "endDate": "...",
      "current": false
    }
  ]
}`;
  }

  private buildUpdatePrompt(resume: Resume, changes: Partial<Resume>): string {
    return `Update the following resume with the specified changes.

Current Resume:
${JSON.stringify(resume.content, null, 2)}

Requested Changes:
${JSON.stringify(changes, null, 2)}

Provide the updated resume in the same JSON format, incorporating the changes while maintaining consistency and professionalism.`;
  }

  private buildMatchPrompt(resume: Resume, job: JobRequirement): string {
    return `Calculate a match score (0-100) between this resume and job requirement.

Resume Skills:
${resume.content.skills.map((s) => s.name).join(', ')}

Job Requirements:
- Required Skills: ${job.requirements.skills.join(', ')}
- Required Experience: ${job.requirements.experience} years
- Job Type: ${job.type}

Provide a score from 0-100 and breakdown:
{
  "totalScore": 85,
  "breakdown": {
    "skillMatch": 90,
    "experienceMatch": 80,
    "overallFit": 85
  }
}`;
  }

  private parseAnalysisResponse(response: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing
      return {
        summary: 'Project analyzed successfully',
        skills: [],
        highlights: [],
      };
    } catch (error) {
      this.logger.warn('Failed to parse Gemini response as JSON', error);
      return {
        summary: response.substring(0, 200),
        skills: [],
        highlights: [],
      };
    }
  }

  private parseResumeResponse(response: string, profile: any): Resume {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      // Debug log profile content
      this.logger.debug('Profile received in parseResumeResponse:', {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        languages: profile.languages,
        education: profile.education
      });

      // Build basic info from profile - filter out undefined values
      const basicInfo: any = {
        name: profile.name,
        email: profile.email,
      };
      
      if (profile.phone) basicInfo.phone = profile.phone;
      if (profile.location) basicInfo.location = profile.location;
      if (profile.birthDate) basicInfo.birthDate = profile.birthDate;
      if (profile.nationality) basicInfo.nationality = profile.nationality;
      if (profile.languages && profile.languages.length > 0) basicInfo.languages = profile.languages;
      if (profile.githubUsername) basicInfo.githubUrl = `https://github.com/${profile.githubUsername}`;
      if (profile.linkedinUrl) basicInfo.linkedinUrl = profile.linkedinUrl;
      if (profile.portfolioUrl) basicInfo.portfolioUrl = profile.portfolioUrl;
      
      this.logger.debug('BasicInfo built:', basicInfo);

      // Use profile education if available
      let education = parsed.education || [];
      if (profile.education && education.length === 0) {
        // Handle both old (single object) and new (array) formats
        const eduArray = Array.isArray(profile.education) ? profile.education : [profile.education];
        if (eduArray.length > 0 && eduArray[0]) {
          education = eduArray.map((edu: any) => ({
            degree: edu.degree,
            field: edu.field,
            institution: edu.institution,
            startDate: edu.startDate || edu.startYear || (edu.graduationYear ? `${parseInt(edu.graduationYear) - 4}` : ''),
            endDate: edu.endDate || edu.endYear || edu.graduationYear || '',
            current: edu.current || false,
            gpa: edu.gpa,
            highlights: edu.highlights || edu.achievements || []
          }));
        }
      }

      return {
        id: this.generateId(),
        developerId: profile.id || this.generateId(),
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        aiProvider: 'gemini',
        basicInfo,
        content: {
          summary: parsed.summary || profile.careerObjective || '',
          skills: parsed.skills || [],
          experience: parsed.experience || [],
          projects: parsed.projects || [],
          education,
        },
        metadata: {
          hash: this.generateHash(parsed),
          published: false,
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse resume response', error);
      throw new Error('Failed to generate resume from Gemini response');
    }
  }

  private parseUpdateResponse(response: string, originalResume: Resume): Resume {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        ...originalResume,
        version: originalResume.version + 1,
        updatedAt: new Date(),
        content: {
          summary: parsed.summary || originalResume.content.summary,
          skills: parsed.skills || originalResume.content.skills,
          experience: parsed.experience || originalResume.content.experience,
          projects: parsed.projects || originalResume.content.projects,
          education: parsed.education || originalResume.content.education,
        },
        metadata: {
          ...originalResume.metadata,
          hash: this.generateHash(parsed),
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse update response', error);
      throw new Error('Failed to update resume from Gemini response');
    }
  }

  private parseMatchScore(response: string): number {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.totalScore || parsed.score || 0;
      }
      
      // Try to find a number in the response
      const numberMatch = response.match(/\d+/);
      return numberMatch ? parseInt(numberMatch[0], 10) : 0;
    } catch (error) {
      this.logger.warn('Failed to parse match score', error);
      return 0;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private generateHash(data: any): string {
    // Simple hash for demo - in production use proper hashing
    return Buffer.from(JSON.stringify(data)).toString('base64').substring(0, 16);
  }

  async polishExperience(experience: any, options?: { language?: string }): Promise<any> {
    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }

    const language = options?.language || process.env.FAJ_RESUME_LANGUAGE || 'zh';
    const languageInstr = this.getLanguageInstructions(language);
    
    const prompt = `You are an elite resume writer specializing in transforming brief work descriptions into comprehensive, impressive career narratives.

${languageInstr}

WORK EXPERIENCE TO ENHANCE:
Company: ${experience.company}
Position: ${experience.title}
Duration: ${experience.startDate} to ${experience.endDate || 'Present'}
User's Brief Input: ${experience.description || experience.rawDescription || 'No description provided'}
Current Highlights (if any): ${experience.highlights?.join('; ') || 'None'}

YOUR MISSION - Create an EXCEPTIONAL and COMPREHENSIVE experience entry:

1. CRAFT A RICH DESCRIPTION (6-8 sentences minimum):
   • Open with a powerful statement about the role's strategic importance and scope
   • Detail primary responsibilities and areas of ownership (technical leadership, system architecture, team collaboration)
   • Describe the technical environment (technologies, tools, methodologies, scale of systems)
   • Highlight cross-functional collaboration and stakeholder management
   • Include team dynamics (team size, mentoring, leading initiatives)
   • Quantify the business impact and value delivered (revenue, cost savings, efficiency gains)
   • Show career progression and skill expansion during this role
   • Add context about the company's industry position and your role's contribution to it

2. CREATE 7-10 ACHIEVEMENT BULLET POINTS that showcase:
   • Start each with dynamic action verbs (Architected, Pioneered, Orchestrated, Revolutionized, Spearheaded, Transformed)
   • Include hard metrics in EVERY bullet (percentages, dollar amounts, time savings, scale)
   • Technical achievements (system architecture, performance optimization, innovation)
   • Leadership accomplishments (team building, mentoring, process improvement)
   • Business impact (revenue generation, cost reduction, efficiency gains)
   • Problem-solving examples (critical issues resolved, technical challenges overcome)
   • Innovation and initiatives (new tools introduced, processes created, standards established)
   • Cross-team collaboration and influence
   • Recognition and awards received

3. APPLY INTELLIGENT REASONING to enhance the content:
   • Based on the title "${experience.title}", infer typical high-level responsibilities
   • Consider industry best practices and methodologies relevant to this role
   • Add reasonable metrics based on typical achievements in similar positions:
     - Senior roles: 20-40% improvements, $1M+ impact, 10+ team members
     - Mid-level: 15-30% improvements, $100K-1M impact, 5-10 team members
     - Junior: 10-20% improvements, measurable but smaller scale impact
   • Expand the technical stack based on mentioned technologies and their ecosystems
   • Include relevant soft skills and leadership qualities demonstrated

4. METRICS AND QUANTIFICATION GUIDELINES:
   • Performance improvements: "Optimized API response time by 75%, from 800ms to 200ms"
   • Scale indicators: "Managed microservices handling 50M+ daily requests"
   • Team impact: "Led cross-functional team of 12 engineers across 3 time zones"
   • Cost savings: "Reduced infrastructure costs by $2.5M annually through optimization"
   • Productivity gains: "Increased deployment frequency by 300% through CI/CD implementation"
   • Quality metrics: "Achieved 99.9% uptime SLA for critical services"
   • Growth indicators: "Scaled platform from 10K to 1M+ active users"

5. PROFESSIONAL TONE AND KEYWORDS:
   • Use industry-specific terminology and acronyms appropriately
   • Include keywords relevant for ATS (Applicant Tracking Systems)
   • Balance technical depth with business understanding
   • Demonstrate both individual contribution and team collaboration
   • Show progression from technical execution to strategic thinking

Provide the enhanced experience in JSON format:
{
  "description": "A comprehensive 6-8 sentence description showcasing the full scope and impact of the role...",
  "highlights": [
    "Architected and deployed scalable microservices handling 10M+ daily transactions with 99.99% uptime...",
    "Led cross-functional team of 15 engineers to deliver $3M revenue-generating platform 2 months ahead of schedule...",
    "Optimized database queries reducing response time by 85% and saving $500K annually in infrastructure costs...",
    "Pioneered automated testing framework increasing code coverage from 45% to 95% and reducing bugs by 70%...",
    "Mentored 8 junior developers, with 100% promotion rate within 18 months...",
    "Implemented DevOps best practices reducing deployment time from 4 hours to 15 minutes...",
    "At least 7-10 impressive, metric-rich bullet points total..."
  ]
}`;

    try {
      const model = this.client.getGenerativeModel({ model: this.model! });
      const result = await this.executeWithRetry(async () => {
        return await model.generateContent(prompt);
      });

      const response = result.response.text();
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const enhanced = JSON.parse(jsonMatch[0]);
        return {
          ...experience,
          description: enhanced.description,
          highlights: enhanced.highlights
        };
      }
      
      // Fallback if parsing fails
      return {
        ...experience,
        description: experience.description || experience.rawDescription,
        highlights: experience.highlights || []
      };
    } catch (error) {
      this.logger.error('Failed to polish experience with Gemini', error);
      // Return original if enhancement fails
      return {
        ...experience,
        description: experience.description || experience.rawDescription,
        highlights: experience.highlights || []
      };
    }
  }

  async processGeneralPrompt(prompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }

    try {
      const model = this.client.getGenerativeModel({ model: this.model! });
      const result = await this.executeWithRetry(async () => {
        return await model.generateContent(prompt);
      });

      return result.response.text();
    } catch (error) {
      this.logger.error('Failed to process prompt with Gemini', error);
      throw error;
    }
  }

  protected getLanguageInstructions(language: string): string {
    const instructions: { [key: string]: string } = {
      'zh': `LANGUAGE REQUIREMENT: Generate the ENTIRE resume in Chinese (中文).
- Use professional Chinese terminology
- Summary, descriptions, and highlights should all be in Chinese
- Maintain professional tone suitable for Chinese job market
- Use appropriate Chinese job titles and industry terms`,
      
      'en': `LANGUAGE REQUIREMENT: Generate the ENTIRE resume in English.
- Use professional English terminology
- Clear, concise, and action-oriented language
- Follow standard English resume conventions
- Use strong action verbs and quantifiable achievements`,
      
      'ja': `LANGUAGE REQUIREMENT: Generate the ENTIRE resume in Japanese (日本語).
- Use professional Japanese business language (敬語)
- Follow Japanese resume (履歴書) conventions
- Include appropriate honorifics and formal expressions
- Maintain professional tone suitable for Japanese job market`,
      
      'ko': `LANGUAGE REQUIREMENT: Generate the ENTIRE resume in Korean (한국어).
- Use professional Korean business language
- Follow Korean resume conventions
- Maintain formal and respectful tone
- Use appropriate Korean job titles and industry terms`,
      
      'es': `LANGUAGE REQUIREMENT: Generate the ENTIRE resume in Spanish (Español).
- Use professional Spanish terminology
- Follow Spanish/Latin American resume conventions
- Maintain formal professional tone
- Use appropriate Spanish job titles and technical terms`,
      
      'fr': `LANGUAGE REQUIREMENT: Generate the ENTIRE resume in French (Français).
- Use professional French terminology
- Follow French CV conventions
- Maintain formal professional tone
- Use appropriate French job titles and technical terms`,
      
      'de': `LANGUAGE REQUIREMENT: Generate the ENTIRE resume in German (Deutsch).
- Use professional German terminology
- Follow German Lebenslauf conventions
- Maintain formal professional tone
- Use appropriate German job titles and technical terms`,
    };

    return instructions[language] || instructions['zh'];
  }
}