import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import CryptoJS from 'crypto-js';
import { Config, AIProvider, ConfigSchema } from '../../models';
import { Logger } from '../../utils/Logger';

// Note: .env file support is deprecated but maintained for backward compatibility
// Configuration is now stored in encrypted ~/.faj/config.json

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config | null = null;
  private configPath: string;
  private logger: Logger;
  private encryptionKey: string;

  private constructor() {
    this.logger = new Logger('ConfigManager');
    this.configPath = path.join(os.homedir(), '.faj', 'config.json');
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private getOrCreateEncryptionKey(): string {
    // In production, this should use keytar or similar secure storage
    // For now, we'll use a machine-specific key
    const hostname = os.hostname();
    const username = os.userInfo().username;
    return CryptoJS.SHA256(`${hostname}-${username}-faj-key`).toString();
  }

  async load(): Promise<Config> {
    try {
      await this.ensureConfigDir();
      
      if (await this.configExists()) {
        const fileData = await fs.readFile(this.configPath, 'utf-8');
        
        // Try to parse as plain JSON first (for development/testing)
        let parsed;
        try {
          parsed = JSON.parse(fileData);
        } catch {
          // If not plain JSON, try to decrypt
          const decrypted = this.decrypt(fileData);
          parsed = JSON.parse(decrypted);
        }
        
        // Convert date strings to Date objects if needed
        if (parsed.profile) {
          if (typeof parsed.profile.createdAt === 'string') {
            parsed.profile.createdAt = new Date(parsed.profile.createdAt);
          }
          if (typeof parsed.profile.updatedAt === 'string') {
            parsed.profile.updatedAt = new Date(parsed.profile.updatedAt);
          }
        }
        
        // Validate config schema - use safeParse to avoid throwing
        // and keep the original data if validation passes
        const validationResult = ConfigSchema.safeParse(parsed);
        if (validationResult.success) {
          // Use the original parsed data to preserve all fields
          this.config = parsed as Config;
        } else {
          this.logger.warn('Config validation issues, using parsed data anyway:', validationResult.error);
          this.config = parsed as Config;
        }
        
        this.logger.info('Configuration loaded successfully');
      } else {
        // Create default config
        this.config = this.getDefaultConfig();
        await this.save();
        this.logger.info('Created default configuration');
      }
      
      return this.config;
    } catch (error) {
      this.logger.error('Failed to load configuration', error);
      throw new Error('Failed to load configuration');
    }
  }

  async save(): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration to save');
    }

    try {
      await this.ensureConfigDir();
      
      const jsonData = JSON.stringify(this.config, null, 2);
      const encrypted = this.encrypt(jsonData);
      
      await fs.writeFile(this.configPath, encrypted, 'utf-8');
      this.logger.info('Configuration saved successfully');
    } catch (error) {
      this.logger.error('Failed to save configuration', error);
      throw new Error('Failed to save configuration');
    }
  }

  async get<K extends keyof Config>(key: K): Promise<Config[K] | undefined> {
    if (!this.config) {
      await this.load();
    }
    return this.config![key];
  }

  async set<K extends keyof Config>(key: K, value: Config[K]): Promise<void> {
    if (!this.config) {
      await this.load();
    }
    
    this.config![key] = value;
    await this.save();
  }

  async setNested(path: string, value: any): Promise<void> {
    if (!this.config) {
      await this.load();
    }

    const keys = path.split('.');
    let current: any = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    await this.save();
  }

  async getNested(path: string): Promise<any> {
    if (!this.config) {
      await this.load();
    }

    const keys = path.split('.');
    let current: any = this.config;

    for (const key of keys) {
      if (current && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  getAIProvider(): AIProvider | undefined {
    // Check environment variable first
    const envProvider = process.env.FAJ_AI_PROVIDER;
    if (envProvider && this.isValidProvider(envProvider)) {
      return envProvider as AIProvider;
    }
    
    // Then check config
    return this.config?.ai?.provider;
  }

  getAIApiKey(provider?: AIProvider): string | undefined {
    const targetProvider = provider || this.getAIProvider();
    
    if (!targetProvider) {
      return undefined;
    }

    // Check config for stored API key (encrypted) first
    const configKey = this.config?.ai?.apiKeys?.[targetProvider];
    if (configKey) {
      this.logger.debug(`Using stored API key for ${targetProvider}`);
      return configKey;
    }

    // Fall back to environment variable for backward compatibility
    const envKey = process.env[`FAJ_${targetProvider.toUpperCase()}_API_KEY`];
    if (envKey) {
      this.logger.debug(`Using environment variable for ${targetProvider} API key (consider migrating to config)`);
      return envKey;
    }

    // Generic AI key env var (deprecated)
    if (process.env.FAJ_AI_API_KEY) {
      this.logger.debug(`Using generic FAJ_AI_API_KEY (deprecated)`);
      return process.env.FAJ_AI_API_KEY;
    }

    return undefined;
  }

  getAIModel(): string | undefined {
    // Check environment variable for model override
    const envModel = process.env.FAJ_AI_MODEL;
    if (envModel) {
      this.logger.info(`Using AI model from environment: ${envModel}`);
      return envModel;
    }
    
    // Return undefined to use provider's default
    return undefined;
  }

  async setAIApiKey(provider: AIProvider, apiKey: string): Promise<void> {
    if (!this.config) {
      await this.load();
    }

    // Ensure config is not null
    if (!this.config) {
      this.config = { version: '1.0.0' };
    }

    // Ensure ai and apiKeys objects exist
    if (!this.config.ai) {
      this.config.ai = { provider: provider };
    }
    if (!this.config.ai.apiKeys) {
      this.config.ai.apiKeys = {};
    }

    // Store the API key (in production, this should be encrypted)
    this.config.ai.apiKeys[provider] = apiKey;
    
    await this.save();
    this.logger.info(`API key for ${provider} has been saved`);
  }

  private isValidProvider(provider: string): boolean {
    return ['openai', 'gemini', 'anthropic', 'azure', 'deepseek', 'custom'].includes(provider);
  }

  private async ensureConfigDir(): Promise<void> {
    const configDir = path.dirname(this.configPath);
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }
  }

  private async configExists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  private encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  private decrypt(data: string): string {
    const bytes = CryptoJS.AES.decrypt(data, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  private getDefaultConfig(): Config {
    return {
      version: '1.0.0',
      storage: {
        ipfs: {
          gateway: 'https://ipfs.io',
        },
        local: {
          path: path.join(os.homedir(), '.faj', 'data'),
        },
      },
      network: {
        bootstrap: true,
      },
      notifications: {
        email: false,
      },
    };
  }

  async reset(): Promise<void> {
    this.config = this.getDefaultConfig();
    await this.save();
    this.logger.info('Configuration reset to defaults');
  }
}