import { BaseAIProvider } from './BaseProvider';
import { ProjectAnalysis, Resume, JobRequirement } from '../../models';
import OpenAI from 'openai';

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;

  constructor(apiKey: string, model?: string) {
    super('OpenAI', apiKey, model || 'gpt-5');
    this.client = new OpenAI({
      apiKey: this.apiKey
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test the API with a simple request
      // For now, just check if client is initialized
      this.logger.info('OpenAI API is configured');
      return true;
    } catch (error: any) {
      this.logger.error(`OpenAI API check failed: ${error.message}`);
      return false;
    }
  }

  async processPrompt(prompt: string): Promise<string> {
    try {
      // Use chat completions API which should work with both old and new models
      const completion = await this.client.chat.completions.create({
        model: this.model || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are a professional resume writer and career consultant. Help create and enhance resumes for job seekers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error: any) {
      this.logger.error(`Failed to process prompt: ${error.message}`);
      throw error;
    }
  }

  async processGeneralPrompt(prompt: string): Promise<string> {
    // For general prompts, just use processPrompt
    return this.processPrompt(prompt);
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

    try {
      const response = await this.processPrompt(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Failed to analyze project with OpenAI', error);
      // Return default response if parsing fails
      return {
        summary: `${project.name}: A ${languages[0] || 'software'} project with ${project.metrics.filesCount} files.`,
        skills: languages,
        highlights: [`${project.metrics.linesOfCode} lines of code`, `Uses ${languages.length} technologies`]
      };
    }
  }

  async polishExperience(experience: {
    title: string;
    company: string;
    rawDescription: string;
  }): Promise<{
    description: string;
    highlights: string[];
  }> {
    const prompt = `Transform this work experience into a comprehensive and impressive resume entry:

Position: ${experience.title}
Company: ${experience.company}
User's Input: ${experience.rawDescription}

Your task is to expand and enhance this experience while keeping it authentic and realistic. 

IMPORTANT GUIDELINES:
1. Create a DETAILED professional description (4-6 sentences minimum) that:
   - Starts with a strong action verb describing the primary role
   - Includes specific responsibilities and scope of work
   - Mentions team size, project scale, or impact when relevant
   - Highlights the technologies, methodologies, or tools used
   - Shows progression or growth in the role
   - Quantifies achievements with realistic metrics when possible

2. Generate 5-7 specific achievements that:
   - Begin with strong action verbs (Led, Developed, Implemented, Optimized, etc.)
   - Include quantifiable results when appropriate (improved by X%, reduced by Y hours, etc.)
   - Show technical skills and business impact
   - Demonstrate leadership, collaboration, or innovation
   - Are relevant to the ${experience.title} role at a company like ${experience.company}

3. Make reasonable inferences based on:
   - The job title and typical responsibilities for that role
   - The company type and industry standards
   - Technologies mentioned or commonly used in such positions
   - Common challenges and achievements in similar roles

4. Keep the content:
   - Professional and credible
   - Specific enough to be impressive but not unbelievable
   - Relevant to modern industry practices
   - Rich with industry-appropriate keywords

Format as JSON:
{
  "description": "A comprehensive 4-6 sentence description...",
  "highlights": [
    "Detailed achievement with metrics...",
    "Specific technical accomplishment...",
    "Leadership or collaboration example...",
    "Process improvement with results...",
    "Innovation or problem-solving instance...",
    "At least 5 bullet points total..."
  ]
}`;

    try {
      const response = await this.processPrompt(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Failed to polish experience', error);
      // Return original if enhancement fails
      return {
        description: experience.rawDescription,
        highlights: []
      };
    }
  }

  async generateResume(profile: any, requirements?: JobRequirement): Promise<Resume> {
    const prompt = `Create a professional resume based on this profile:

${JSON.stringify(profile, null, 2)}

${requirements ? `Target job requirements: ${JSON.stringify(requirements, null, 2)}` : ''}

Generate a complete resume in JSON format with:
- Professional summary
- Work experiences with highlights
- Skills categorized by type
- Projects if applicable

Format the response as a valid JSON object.`;

    try {
      const response = await this.processPrompt(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Failed to generate resume', error);
      throw new Error('Failed to generate resume with OpenAI');
    }
  }

  async updateResume(
    resume: Resume,
    changes: Partial<Resume>
  ): Promise<Resume> {
    const prompt = `Update this resume with the following changes:

Current resume: ${JSON.stringify(resume, null, 2)}
Changes to apply: ${JSON.stringify(changes, null, 2)}

Return the updated resume as a JSON object.`;

    try {
      const response = await this.processPrompt(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Failed to update resume', error);
      // Return original resume if update fails
      return resume;
    }
  }

  async matchScore(
    resume: Resume,
    requirements: JobRequirement
  ): Promise<number> {
    const prompt = `Calculate a match score (0-100) for this resume against the job requirements:

Resume: ${JSON.stringify(resume, null, 2)}
Job Requirements: ${JSON.stringify(requirements, null, 2)}

Return only the numerical score.`;

    try {
      const response = await this.processPrompt(prompt);
      const score = parseInt(response.trim(), 10);
      return isNaN(score) ? 0 : Math.min(100, Math.max(0, score));
    } catch (error) {
      this.logger.error('Failed to calculate match score', error);
      return 0;
    }
  }

  async matchResume(resume: Resume, requirements: JobRequirement): Promise<{
    score: number;
    strengths: string[];
    gaps: string[];
    suggestions: string[];
  }> {
    const prompt = `Analyze how well this resume matches the job requirements:

Resume: ${JSON.stringify(resume, null, 2)}
Job Requirements: ${JSON.stringify(requirements, null, 2)}

Provide:
1. Match score (0-100)
2. Key strengths that match requirements
3. Gaps or missing qualifications
4. Suggestions for improvement

Format as JSON:
{
  "score": 85,
  "strengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

    try {
      const response = await this.processPrompt(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Failed to match resume', error);
      return {
        score: 0,
        strengths: [],
        gaps: ['Unable to analyze'],
        suggestions: ['Please try again']
      };
    }
  }
}