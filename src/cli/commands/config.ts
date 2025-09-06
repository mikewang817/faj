import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../../core/config/ConfigManager';
import { Logger } from '../../utils/Logger';

export class ConfigCommand {
  private logger: Logger;
  private configManager: ConfigManager;

  constructor() {
    this.logger = new Logger('ConfigCommand');
    this.configManager = ConfigManager.getInstance();
  }

  register(program: Command): void {
    const config = program
      .command('config')
      .description('Manage configuration settings');

    config
      .command('get <key>')
      .description('Get configuration value')
      .action(async (key: string) => {
        try {
          const value = await this.configManager.getNested(key);
          if (value !== undefined) {
            console.log(chalk.green(`${key}: ${JSON.stringify(value, null, 2)}`));
          } else {
            console.log(chalk.yellow(`Configuration key '${key}' not found`));
          }
        } catch (error) {
          this.logger.error('Failed to get configuration', error);
        }
      });

    config
      .command('set <key> <value>')
      .description('Set configuration value')
      .action(async (key: string, value: string) => {
        try {
          await this.configManager.setNested(key, value);
          console.log(chalk.green(`✓ ${key} set to: ${value}`));
        } catch (error) {
          this.logger.error('Failed to set configuration', error);
        }
      });

    config
      .command('list')
      .description('List all configuration')
      .action(async () => {
        try {
          await this.configManager.load();
          const config = await this.configManager.get('profile');
          console.log(chalk.cyan('Current configuration:'));
          console.log(JSON.stringify(config, null, 2));
        } catch (error) {
          this.logger.error('Failed to list configuration', error);
        }
      });

    // New command: config ai
    config
      .command('ai')
      .description('Configure AI settings (provider, model, language)')
      .option('-p, --provider <provider>', 'AI provider (gemini, openai, anthropic)')
      .option('-m, --model <model>', 'AI model (e.g., gemini-1.5-flash, gpt-4)')
      .option('-k, --api-key <key>', 'API key for the provider')
      .option('-l, --language <lang>', 'Resume language (zh, en, ja, etc.)')
      .option('--interactive', 'Interactive configuration mode')
      .action(async (options) => {
        try {
          if (options.interactive) {
            await this.configureAIInteractive();
          } else {
            await this.configureAI(options);
          }
        } catch (error) {
          this.logger.error('Failed to configure AI settings', error);
          console.error(chalk.red('Failed to configure AI settings'));
        }
      });

    // New command: config language
    config
      .command('language <lang>')
      .description('Set resume language (zh=中文, en=English, ja=日本語, etc.)')
      .action(async (lang: string) => {
        try {
          await this.setLanguage(lang);
        } catch (error) {
          this.logger.error('Failed to set language', error);
        }
      });

    // New command: config api-key
    config
      .command('api-key')
      .description('Securely configure API keys')
      .option('-p, --provider <provider>', 'Provider name (gemini, openai, anthropic)')
      .action(async (options) => {
        try {
          await this.configureApiKey(options.provider);
        } catch (error) {
          this.logger.error('Failed to configure API key', error);
        }
      });

    // New command: config show
    config
      .command('show')
      .description('Show current AI configuration')
      .action(async () => {
        try {
          await this.showConfiguration();
        } catch (error) {
          this.logger.error('Failed to show configuration', error);
        }
      });
  }

  private async configureAIInteractive(): Promise<void> {
    console.log(chalk.cyan('\n🤖 AI Configuration Setup\n'));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select AI provider:',
        choices: [
          { name: 'Google Gemini', value: 'gemini' },
          { name: 'OpenAI', value: 'openai' },
          { name: 'Anthropic Claude', value: 'anthropic' },
        ],
        default: 'gemini',
      },
      {
        type: 'input',
        name: 'model',
        message: 'Enter AI model (or press Enter for default):',
        default: (answers: any) => {
          switch (answers.provider) {
            case 'gemini': return 'gemini-1.5-flash';
            case 'openai': return 'gpt-3.5-turbo';
            case 'anthropic': return 'claude-3-sonnet';
            default: return '';
          }
        },
      },
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter API key:',
        mask: '*',
        validate: (input: string) => input.length > 0 || 'API key is required',
      },
      {
        type: 'list',
        name: 'language',
        message: 'Select resume language:',
        choices: [
          { name: '中文 (Chinese)', value: 'zh' },
          { name: 'English', value: 'en' },
          { name: '日本語 (Japanese)', value: 'ja' },
          { name: '한국어 (Korean)', value: 'ko' },
          { name: 'Español (Spanish)', value: 'es' },
          { name: 'Français (French)', value: 'fr' },
          { name: 'Deutsch (German)', value: 'de' },
        ],
        default: 'zh',
      },
    ]);

    await this.saveConfiguration(answers);
  }

  private async configureAI(options: any): Promise<void> {
    const updates: any = {};

    if (options.provider) {
      updates.provider = options.provider;
      console.log(chalk.green(`✓ AI provider set to: ${options.provider}`));
    }

    if (options.model) {
      updates.model = options.model;
      console.log(chalk.green(`✓ AI model set to: ${options.model}`));
    }

    if (options.language) {
      updates.language = options.language;
      console.log(chalk.green(`✓ Resume language set to: ${options.language}`));
    }

    if (options.apiKey) {
      updates.apiKey = options.apiKey;
      console.log(chalk.green('✓ API key configured'));
    }

    if (Object.keys(updates).length > 0) {
      await this.saveConfiguration(updates);
    } else {
      console.log(chalk.yellow('No changes made. Use --interactive for guided setup.'));
    }
  }

  private async setLanguage(lang: string): Promise<void> {
    const languageMap: { [key: string]: string } = {
      'zh': '中文',
      'en': 'English',
      'ja': '日本語',
      'ko': '한국어',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
    };

    if (!languageMap[lang]) {
      console.log(chalk.yellow(`Unsupported language: ${lang}`));
      console.log('Supported languages:', Object.keys(languageMap).join(', '));
      return;
    }

    await this.updateEnvFile({ FAJ_RESUME_LANGUAGE: lang });
    console.log(chalk.green(`✓ Resume language set to: ${languageMap[lang]} (${lang})`));
  }

  private async configureApiKey(provider?: string): Promise<void> {
    if (!provider) {
      const answer = await inquirer.prompt({
        type: 'list',
        name: 'provider',
        message: 'Select provider:',
        choices: ['gemini', 'openai', 'anthropic'],
      });
      provider = answer.provider;
    }

    const answer = await inquirer.prompt({
      type: 'password',
      name: 'apiKey',
      message: `Enter ${provider!.toUpperCase()} API key:`,
      mask: '*',
      validate: (input: string) => input.length > 0 || 'API key is required',
    });

    const envKey = `FAJ_${provider!.toUpperCase()}_API_KEY`;
    await this.updateEnvFile({ [envKey]: answer.apiKey });
    
    console.log(chalk.green(`✓ ${provider} API key configured`));
    console.log(chalk.gray('API key saved to .env file'));
  }

  private async saveConfiguration(config: any): Promise<void> {
    const envUpdates: { [key: string]: string } = {};

    if (config.provider) {
      envUpdates.FAJ_AI_PROVIDER = config.provider;
    }

    if (config.model) {
      envUpdates.FAJ_AI_MODEL = config.model;
    }

    if (config.language) {
      envUpdates.FAJ_RESUME_LANGUAGE = config.language;
    }

    if (config.apiKey && config.provider) {
      const envKey = `FAJ_${config.provider.toUpperCase()}_API_KEY`;
      envUpdates[envKey] = config.apiKey;
    }

    await this.updateEnvFile(envUpdates);
    
    console.log(chalk.green('\n✓ Configuration saved successfully!'));
    console.log(chalk.gray('Settings saved to .env file'));
  }

  private async updateEnvFile(updates: { [key: string]: string }): Promise<void> {
    const envPath = path.join(process.cwd(), '.env');
    let content = '';

    // Read existing .env file
    try {
      content = await fs.promises.readFile(envPath, 'utf-8');
    } catch {
      // File doesn't exist, create new
    }

    // Update or add each key
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'gm');
      if (regex.test(content)) {
        // Update existing
        content = content.replace(regex, `${key}=${value}`);
      } else {
        // Add new
        content += `\n${key}=${value}`;
      }
    }

    // Write back to file
    await fs.promises.writeFile(envPath, content.trim() + '\n');
  }

  private async showConfiguration(): Promise<void> {
    console.log(chalk.cyan('\n📋 Current AI Configuration\n'));

    // Read from environment
    const provider = process.env.FAJ_AI_PROVIDER || 'Not set';
    const model = process.env.FAJ_AI_MODEL || 'Using default';
    const language = process.env.FAJ_RESUME_LANGUAGE || 'zh (default)';

    // Check API keys (don't show actual keys)
    const geminiKey = process.env.FAJ_GEMINI_API_KEY ? '✓ Configured' : '✗ Not set';
    const openaiKey = process.env.FAJ_OPENAI_API_KEY ? '✓ Configured' : '✗ Not set';
    const anthropicKey = process.env.FAJ_ANTHROPIC_API_KEY ? '✓ Configured' : '✗ Not set';

    console.log(chalk.white('AI Provider:'), chalk.yellow(provider));
    console.log(chalk.white('AI Model:'), chalk.yellow(model));
    console.log(chalk.white('Resume Language:'), chalk.yellow(language));
    console.log();
    console.log(chalk.white('API Keys:'));
    console.log('  Gemini:', geminiKey);
    console.log('  OpenAI:', openaiKey);
    console.log('  Anthropic:', anthropicKey);
    console.log();
    console.log(chalk.gray('Use "faj config ai --interactive" to change settings'));
  }
}