import { BaseAIProvider } from './BaseProvider';
import { ProjectAnalysis, Resume, JobRequirement, AIProvider } from '../../models';

export class DeepSeekProvider extends BaseAIProvider {
  private baseURL: string = 'https://api.deepseek.com/v1';

  constructor(apiKey: string, model?: string) {
    super('DeepSeek', apiKey, model || 'deepseek-reasoner');
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('DeepSeek API key not configured');
      return false;
    }

    try {
      // DeepSeek uses OpenAI-compatible API
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        this.logger.info('DeepSeek API is available');
        return true;
      } else {
        this.logger.error(`DeepSeek API check failed: ${response.status}`);
        return false;
      }
    } catch (error: any) {
      this.logger.error(`Failed to check DeepSeek availability: ${error.message}`);
      return false;
    }
  }

  async processPrompt(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model || 'deepseek-reasoner',
          messages: [
            {
              role: 'system',
              content: 'You are a professional resume writer and career consultant. Help create and enhance resumes for job seekers. Be precise and professional.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
      }

      const data: any = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      this.logger.error(`Failed to process prompt: ${error.message}`);
      throw error;
    }
  }

  async analyzeProject(project: ProjectAnalysis): Promise<{
    summary: string;
    skills: string[];
    highlights: string[];
  }> {
    // Convert Map to array of language names
    const languages = Array.from(project.languages.keys());
    
    const prompt = `Analyze this software project and provide:
1. A concise professional summary (2-3 sentences)
2. List of technical skills used
3. 3-5 key highlights/achievements

Project: ${project.name}
Description: ${project.description || 'No description'}
Technologies: ${languages.join(', ')}
Frameworks: ${project.frameworks.join(', ') || 'None'}
Code metrics: ${project.metrics.filesCount} files, ${project.metrics.linesOfCode} lines of code

Provide the response in this JSON format:
{
  "summary": "...",
  "skills": ["skill1", "skill2", ...],
  "highlights": ["highlight1", "highlight2", ...]
}`;

    const response = await this.processPrompt(prompt);
    
    try {
      return JSON.parse(response);
    } catch {
      // Fallback if response is not valid JSON
      return {
        summary: response.split('\n')[0] || project.description || '',
        skills: languages,
        highlights: [
          `Developed ${project.name} with ${languages.join(', ')}`,
          `Managed ${project.metrics.filesCount} files with ${project.metrics.linesOfCode} lines of code`
        ]
      };
    }
  }

  async polishExperience(experience: any, options?: { language?: string }): Promise<any> {
    const language = options?.language || 'English';
    
    const prompt = `You are an expert resume writer. Transform this work experience into an impressive and comprehensive resume entry.

Company: ${experience.company}
Position: ${experience.title}
Duration: ${experience.startDate} to ${experience.endDate || 'Present'}
User's Brief Input: ${experience.description || experience.rawDescription || 'No description provided'}
Current Highlights (if any): ${experience.highlights?.join('; ') || 'None'}

YOUR TASK - Create a RICH and DETAILED experience entry:

1. EXPAND the description significantly (write 5-7 sentences):
   - Start with a strong overview of the role and its scope
   - Include specific responsibilities and areas of ownership
   - Mention team collaboration, stakeholder interaction, or leadership aspects
   - Describe the technologies, tools, and methodologies used
   - Highlight the business impact and value delivered
   - Show career progression or skill development in this role
   - Include relevant metrics (team size, project scale, user base, etc.)

2. Generate 6-8 detailed achievement bullet points that:
   - Begin with powerful action verbs (Architected, Spearheaded, Transformed, etc.)
   - Include specific metrics and quantifiable results (30% improvement, $2M savings, etc.)
   - Cover different aspects: technical innovation, process improvement, team leadership, business impact
   - Mention specific technologies and tools used
   - Show problem-solving abilities and initiative
   - Demonstrate both technical excellence and business acumen

3. Use REASONING to enhance the content:
   - Infer likely responsibilities based on the job title "${experience.title}"
   - Consider typical challenges and solutions in this type of role
   - Add industry-standard practices and methodologies relevant to the position
   - Include reasonable metrics based on company size and role level
   - Expand technical stack based on mentioned technologies and common pairings

4. Language and Style:
   - Write in ${language}
   - Use professional, confident language
   - Include industry-specific keywords for ATS optimization
   - Make it compelling and results-oriented
   - Ensure authenticity while maximizing impact

Provide the response in JSON format:
{
  "description": "A comprehensive 5-7 sentence description with rich details...",
  "highlights": [
    "Detailed achievement with specific metrics and impact...",
    "Technical innovation or architecture improvement...",
    "Team leadership or collaboration success...",
    "Process optimization with measurable results...",
    "Business value creation or cost savings...",
    "At least 6 impressive bullet points total..."
  ]
}`;

    const response = await this.processPrompt(prompt);
    
    try {
      const enhanced = JSON.parse(response);
      return {
        ...experience,
        description: enhanced.description,
        highlights: enhanced.highlights
      };
    } catch {
      // Fallback if response is not valid JSON
      return {
        ...experience,
        description: response.split('\n')[0] || experience.description,
        highlights: experience.highlights || []
      };
    }
  }

  async generateResume(projects: ProjectAnalysis[], profile: any): Promise<Resume> {
    const prompt = `Generate a professional resume based on these projects and profile:

Profile:
- Name: ${profile.name}
- Email: ${profile.email}
- Location: ${profile.location || 'Not specified'}
- Languages: ${profile.languages?.join(', ') || 'English'}

Projects: ${JSON.stringify(projects.map(p => ({
  name: p.name,
  description: p.description,
  technologies: Array.from(p.languages.keys()),
  metrics: p.metrics
})))}

Create a complete resume with summary, skills, and experience sections. Use reasoning to ensure high quality.`;

    const response = await this.processPrompt(prompt);
    
    // Collect all skills from projects
    const allLanguages = new Set<string>();
    const allFrameworks = new Set<string>();
    
    projects.forEach(p => {
      Array.from(p.languages.keys()).forEach(lang => allLanguages.add(lang));
      p.frameworks.forEach(fw => allFrameworks.add(fw));
    });
    
    // Parse and structure the response to match Resume interface
    return {
      id: `resume_${Date.now()}`,
      developerId: profile.id || 'user',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      aiProvider: 'deepseek' as AIProvider,
      basicInfo: {
        name: profile.name,
        email: profile.email,
        phone: profile.phone || '',
        location: profile.location || '',
        languages: profile.languages || ['English'],
        githubUrl: profile.github || '',
        linkedinUrl: profile.linkedin || ''
      },
      content: {
        summary: response.split('\n')[0] || 'Experienced software developer',
        experience: [],
        projects: projects.map(p => ({
          name: p.name,
          description: p.description || '',
          role: 'Developer',
          technologies: Array.from(p.languages.keys()),
          highlights: p.highlights || [],
          metrics: {
            stars: 0,
            forks: 0,
            contributors: p.metrics.contributorsCount
          }
        })),
        education: profile.education || [],
        skills: Array.from(allLanguages).concat(Array.from(allFrameworks)).map(skill => ({
          name: skill,
          level: 'intermediate' as const,
          category: 'language' as const
        }))
      },
      metadata: {
        hash: `hash_${Date.now()}`,
        published: false
      }
    };
  }

  async updateResume(resume: Resume, changes: Partial<Resume>): Promise<Resume> {
    return { ...resume, ...changes };
  }

  async matchScore(resume: Resume, job: JobRequirement): Promise<number> {
    const prompt = `Calculate match score between this resume and job requirement.
Resume skills: ${JSON.stringify(resume.content.skills)}
Job requirements: ${JSON.stringify(job)}
Return only a number between 0-100. Use reasoning to determine the score.`;

    const response = await this.processPrompt(prompt);
    const score = parseFloat(response);
    return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
  }

  async processGeneralPrompt(prompt: string): Promise<string> {
    // This is a general-purpose method for processing any prompt
    return this.processPrompt(prompt);
  }
}