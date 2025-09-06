import { ProjectAnalysis, Resume, JobRequirement } from '../../models';
import { Logger } from '../../utils/Logger';

export interface AITask {
  type: 'analyze' | 'generate' | 'update' | 'match';
  data: any;
}

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export abstract class BaseAIProvider {
  protected logger: Logger;
  protected apiKey?: string;
  protected model?: string;

  constructor(protected name: string, apiKey?: string, model?: string) {
    this.logger = new Logger(`AI:${name}`);
    this.apiKey = apiKey;
    this.model = model;
  }

  abstract isAvailable(): Promise<boolean>;
  
  abstract analyzeProject(project: ProjectAnalysis): Promise<{
    summary: string;
    skills: string[];
    highlights: string[];
  }>;

  abstract generateResume(
    projects: ProjectAnalysis[],
    profile: any
  ): Promise<Resume>;

  abstract updateResume(
    resume: Resume,
    changes: Partial<Resume>
  ): Promise<Resume>;

  abstract matchScore(
    resume: Resume,
    job: JobRequirement
  ): Promise<number>;

  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Attempt ${i + 1} failed: ${lastError.message}`);
        
        if (i < maxRetries - 1) {
          await this.sleep(delay * Math.pow(2, i)); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected isRateLimitError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      error.status === 429
    );
  }

  protected isApiKeyError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('api key') ||
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      error.status === 401 ||
      error.status === 403
    );
  }

  abstract processGeneralPrompt(prompt: string): Promise<string>;

  protected getLanguageInstructions(language: string): string {
    const instructions: { [key: string]: string } = {
      'zh': `LANGUAGE REQUIREMENT: Generate the ENTIRE content in Chinese (中文).
- Use professional Chinese terminology
- Maintain professional tone suitable for Chinese job market`,
      
      'en': `LANGUAGE REQUIREMENT: Generate the ENTIRE content in English.
- Use professional English terminology
- Clear, concise, and action-oriented language`,
      
      'ja': `LANGUAGE REQUIREMENT: Generate the ENTIRE content in Japanese (日本語).
- Use professional Japanese business language (敬語)`,
      
      'ko': `LANGUAGE REQUIREMENT: Generate the ENTIRE content in Korean (한국어).
- Use professional Korean business language`,
      
      'es': `LANGUAGE REQUIREMENT: Generate the ENTIRE content in Spanish (Español).
- Use professional Spanish terminology`,
      
      'fr': `LANGUAGE REQUIREMENT: Generate the ENTIRE content in French (Français).
- Use professional French terminology`,
      
      'de': `LANGUAGE REQUIREMENT: Generate the ENTIRE content in German (Deutsch).
- Use professional German terminology`,
    };

    return instructions[language] || instructions['zh'];
  }
}