import { BaseAIProvider } from './providers/BaseProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { DeepSeekProvider } from './providers/DeepSeekProvider';
import { MockProvider } from './providers/MockProvider';
import { ConfigManager } from '../core/config/ConfigManager';
import { AIProvider, ProjectAnalysis, Resume, JobRequirement } from '../models';
import { Logger } from '../utils/Logger';

export class AIManager {
  private static instance: AIManager;
  private providers: Map<AIProvider, BaseAIProvider> = new Map();
  private primaryProvider: BaseAIProvider | null = null;
  private logger: Logger;
  private configManager: ConfigManager;

  private constructor() {
    this.logger = new Logger('AIManager');
    this.configManager = ConfigManager.getInstance();
  }

  static getInstance(): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }

  async initialize(): Promise<void> {
    const config = await this.configManager.load();
    const aiConfig = config.ai;

    if (!aiConfig) {
      this.logger.warn('No AI configuration found');
      return;
    }

    // Initialize configured providers
    await this.initializeProvider(aiConfig.provider);

    // Initialize fallback providers
    if (aiConfig.fallbacks) {
      for (const fallback of aiConfig.fallbacks) {
        await this.initializeProvider(fallback);
      }
    }

    // Set primary provider
    if (this.providers.has(aiConfig.provider)) {
      this.primaryProvider = this.providers.get(aiConfig.provider)!;
      this.logger.info(`Primary AI provider set to: ${aiConfig.provider}`);
    }
  }

  private async initializeProvider(provider: AIProvider | 'mock'): Promise<void> {
    // Special handling for mock provider (for testing)
    if (provider === 'mock' || process.env.FAJ_USE_MOCK === 'true') {
      const mockProvider = new MockProvider();
      const isAvailable = await mockProvider.isAvailable();
      if (isAvailable) {
        this.providers.set('mock' as AIProvider, mockProvider);
        this.logger.success('Mock provider initialized for testing');
      }
      return;
    }

    const apiKey = this.configManager.getAIApiKey(provider as AIProvider);
    
    if (!apiKey) {
      this.logger.warn(`API key not found for ${provider}`);
      // Initialize mock provider as fallback for testing
      if (process.env.FAJ_ENV === 'development') {
        await this.initializeProvider('mock');
      }
      return;
    }

    // Get model from config if specified for this provider
    const config = await this.configManager.get('ai');
    const providerModel = config?.models?.[provider];
    
    let providerInstance: BaseAIProvider;

    switch (provider) {
      case 'gemini':
        // Use gemini-2.5-pro as default model
        const geminiModel = providerModel || 'gemini-2.5-pro';
        providerInstance = new GeminiProvider(apiKey, geminiModel);
        this.logger.info(`Using Gemini with model: ${geminiModel}`);
        break;
      case 'openai':
        // Use gpt-5 as default model
        const openaiModel = providerModel || 'gpt-5';
        providerInstance = new OpenAIProvider(apiKey, openaiModel);
        this.logger.info(`Using OpenAI with model: ${openaiModel}`);
        break;
      case 'deepseek':
        // Use deepseek-reasoner as default model
        const deepseekModel = providerModel || 'deepseek-reasoner';
        providerInstance = new DeepSeekProvider(apiKey, deepseekModel);
        this.logger.info(`Using DeepSeek with model: ${deepseekModel}`);
        break;
      case 'anthropic':
      case 'azure':
      case 'custom':
        // Placeholder for other providers
        this.logger.warn(`Provider ${provider} not yet fully implemented, using Gemini as fallback`);
        const fallbackModel = providerModel || 'gemini-2.5-pro';
        providerInstance = new GeminiProvider(apiKey, fallbackModel);
        break;
      default:
        this.logger.warn(`Unknown provider: ${provider}`);
        return;
    }

    // Test availability
    const isAvailable = await providerInstance.isAvailable();
    
    if (isAvailable) {
      this.providers.set(provider, providerInstance);
      this.logger.success(`${provider} provider initialized successfully`);
    } else {
      this.logger.warn(`${provider} provider is not available`);
    }
  }

  async analyzeProject(project: ProjectAnalysis): Promise<{
    summary: string;
    skills: string[];
    highlights: string[];
  }> {
    const provider = await this.getAvailableProvider();
    return provider.analyzeProject(project);
  }

  async generateResume(
    projects: ProjectAnalysis[],
    profile: any
  ): Promise<Resume> {
    // Debug log
    this.logger.debug('AIManager generateResume - profile passed:', {
      name: profile.name,
      phone: profile.phone,
      location: profile.location,
      languages: profile.languages,
      education: profile.education
    });
    
    const provider = await this.getAvailableProvider();
    return provider.generateResume(projects, profile);
  }

  async updateResume(
    resume: Resume,
    changes: Partial<Resume>
  ): Promise<Resume> {
    const provider = await this.getAvailableProvider();
    return provider.updateResume(resume, changes);
  }

  async matchScore(
    resume: Resume,
    job: JobRequirement
  ): Promise<number> {
    const provider = await this.getAvailableProvider();
    return provider.matchScore(resume, job);
  }

  async processPrompt(prompt: string): Promise<string> {
    const provider = await this.getAvailableProvider();
    // Use the provider's internal method to process general prompts
    return provider.processGeneralPrompt(prompt);
  }

  private async getAvailableProvider(): Promise<BaseAIProvider> {
    // Try primary provider first
    if (this.primaryProvider) {
      const isAvailable = await this.primaryProvider.isAvailable();
      if (isAvailable) {
        return this.primaryProvider;
      }
      this.logger.warn('Primary provider not available, trying fallbacks');
    }

    // Try fallback providers
    for (const [_name, provider] of this.providers) {
      const isAvailable = await provider.isAvailable();
      if (isAvailable) {
        this.logger.info(`Using fallback provider: ${_name}`);
        return provider;
      }
    }

    throw new Error('No AI provider available. Please configure your API keys.');
  }

  async setProvider(provider: AIProvider, _apiKey: string): Promise<void> {
    await this.initializeProvider(provider);
    
    if (this.providers.has(provider)) {
      this.primaryProvider = this.providers.get(provider)!;
      await this.configManager.setNested('ai.provider', provider);
      this.logger.success(`Switched to ${provider} provider`);
    } else {
      throw new Error(`Failed to initialize ${provider} provider`);
    }
  }

  getConfiguredProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  async testProvider(provider: AIProvider): Promise<boolean> {
    if (!this.providers.has(provider)) {
      return false;
    }
    
    const providerInstance = this.providers.get(provider)!;
    return providerInstance.isAvailable();
  }
}