import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { ConfigManager } from '../../core/config/ConfigManager';
import { ResumeManager } from '../../core/resume/ResumeManager';
import { Logger } from '../../utils/Logger';
import { InitCommand } from './init';
import { ResumeCommand } from './resume';
import fs from 'fs/promises';
import path from 'path';

export class MainCommand {
  private logger: Logger;
  private configManager: ConfigManager;
  private resumeManager: ResumeManager;
  private initCommand: InitCommand;
  private resumeCommand: ResumeCommand;

  constructor() {
    this.logger = new Logger('MainCommand');
    this.configManager = ConfigManager.getInstance();
    this.resumeManager = ResumeManager.getInstance();
    this.initCommand = new InitCommand();
    this.resumeCommand = new ResumeCommand();
  }

  register(program: Command): void {
    // Smart main command - when user just types 'faj'
    program
      .action(async () => {
        await this.smartMain();
      });
  }

  private async smartMain(): Promise<void> {
    try {
      // Check if user has existing configuration
      const hasConfig = await this.checkExistingConfig();
      
      if (!hasConfig) {
        // New user - start initialization wizard
        console.log(chalk.cyan.bold('\n👋 Welcome to FAJ!\n'));
        console.log(chalk.gray('It looks like this is your first time using FAJ.'));
        console.log(chalk.gray('Let\'s create your professional resume!\n'));
        
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Start the resume creation wizard?',
            default: true
          }
        ]);
        
        if (proceed) {
          // Run init command - need to use the proper command interface
          const { Command } = require('commander');
          const program = new Command();
          this.initCommand.register(program);
          await program.parseAsync(['node', 'faj', 'init']);
        }
      } else {
        // Existing user - show menu
        await this.showMainMenu();
      }
    } catch (error) {
      this.logger.error('Smart main command failed', error);
      console.error(chalk.red('Error:'), error);
    }
  }

  private async checkExistingConfig(): Promise<boolean> {
    try {
      const configPath = path.join(process.env.HOME || '', '.faj', 'config.json');
      await fs.access(configPath);
      await this.configManager.load();
      const profile = await this.configManager.get('profile');
      return profile !== null;
    } catch {
      return false;
    }
  }

  private async showMainMenu(): Promise<void> {
    // Try to load and show resume summary
    try {
      const resume = await this.resumeManager.get();
      
      if (resume) {
        console.log(chalk.cyan.bold('\n📄 Your Resume\n'));
        console.log(chalk.white(`Name: ${resume.basicInfo?.name || 'Not set'}`));
        console.log(chalk.white(`Email: ${resume.basicInfo?.email || 'Not set'}`));
        
        if (resume.content?.experience?.length > 0) {
          console.log(chalk.white(`Work Experience: ${resume.content.experience.length} positions`));
        }
        if (resume.content?.projects?.length > 0) {
          console.log(chalk.white(`Projects: ${resume.content.projects.length} projects`));
        }
        console.log();
      }
    } catch {
      // Resume not found, that's okay
    }

    // Show interactive menu
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '👀 View full resume', value: 'view' },
          { name: '➕ Add work experience', value: 'add-work' },
          { name: '📁 Add project', value: 'add-project' },
          { name: '📤 Export resume', value: 'export' },
          { name: '🔧 Settings', value: 'settings' },
          new inquirer.Separator(),
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]);

    switch (action) {
      case 'view':
        // Use the proper command interface
        const { Command } = require('commander');
        const program = new Command();
        this.resumeCommand.register(program);
        await program.parseAsync(['node', 'faj', 'resume', 'show']);
        await this.showMainMenu(); // Return to menu
        break;
        
      case 'add-work':
        console.log(chalk.cyan('\nUse: faj add work'));
        break;
        
      case 'add-project':
        console.log(chalk.cyan('\nUse: faj add project <path>'));
        break;
        
      case 'export':
        await this.exportResume();
        await this.showMainMenu(); // Return to menu
        break;
        
      case 'settings':
        console.log(chalk.cyan('\nUse: faj config'));
        break;
        
      case 'exit':
        console.log(chalk.gray('Goodbye!'));
        break;
    }
  }

  private async exportResume(): Promise<void> {
    const { format } = await inquirer.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Select export format:',
        choices: [
          { name: 'Markdown (.md)', value: 'md' },
          { name: 'HTML (.html)', value: 'html' }
        ],
        default: 'md'
      }
    ]);

    const { filename } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'Export filename:',
        default: `resume.${format}`
      }
    ]);

    const spinner = ora(`Exporting to ${filename}...`).start();
    try {
      const content = await this.resumeManager.export(format as 'md' | 'html' | 'pdf');
      await fs.writeFile(filename, content);
      spinner.succeed(`Resume exported to ${filename}`);
    } catch (error: any) {
      spinner.fail(`Export failed: ${error.message}`);
    }
  }
}