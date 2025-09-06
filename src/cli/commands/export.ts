import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { ResumeManager } from '../../core/resume/ResumeManager';
import { Logger } from '../../utils/Logger';
import fs from 'fs/promises';

export class ExportCommand {
  private logger: Logger;
  private resumeManager: ResumeManager;

  constructor() {
    this.logger = new Logger('ExportCommand');
    this.resumeManager = ResumeManager.getInstance();
  }

  register(program: Command): void {
    program
      .command('export [format] [filename]')
      .description('Export your resume (default: markdown)')
      .action(async (format?: string, filename?: string) => {
        await this.execute(format, filename);
      });
  }

  private async execute(format?: string, filename?: string): Promise<void> {
    try {
      const resume = await this.resumeManager.get();
      
      if (!resume) {
        console.log(chalk.red('No resume found. Create one first with: faj'));
        return;
      }

      // Default format is markdown
      if (!format) {
        format = 'md';
      }
      
      // Validate format
      const validFormats = ['md', 'markdown', 'html', 'json'];
      if (!validFormats.includes(format.toLowerCase())) {
        console.log(chalk.red(`Invalid format: ${format}`));
        console.log(chalk.gray('Valid formats: md, html, json'));
        return;
      }

      // Normalize format
      if (format === 'markdown') format = 'md';
      
      // Default filename
      if (!filename) {
        filename = `resume.${format}`;
      }
      
      // Check if file exists
      try {
        await fs.access(filename);
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `${filename} already exists. Overwrite?`,
            default: false
          }
        ]);
        
        if (!overwrite) {
          const { newName } = await inquirer.prompt([
            {
              type: 'input',
              name: 'newName',
              message: 'New filename:',
              default: `resume-${Date.now()}.${format}`
            }
          ]);
          filename = newName;
        }
      } catch {
        // File doesn't exist, that's fine
      }

      const spinner = ora(`Exporting to ${filename}...`).start();
      
      try {
        let content: string;
        
        if (format === 'json') {
          content = JSON.stringify(resume, null, 2);
        } else {
          content = await this.resumeManager.export(format as 'md' | 'html' | 'pdf');
        }
        
        await fs.writeFile(filename!, content);
        spinner.succeed(chalk.green(`Resume exported to ${filename}`));
        
        // Show next steps
        console.log(chalk.gray('\nNext steps:'));
        if (format === 'md') {
          console.log(chalk.gray('  • Open in any markdown editor'));
          console.log(chalk.gray('  • Convert to PDF using pandoc or similar'));
          console.log(chalk.gray('  • Upload to GitHub as README.md'));
        } else if (format === 'html') {
          console.log(chalk.gray('  • Open in web browser'));
          console.log(chalk.gray('  • Print to PDF from browser'));
          console.log(chalk.gray('  • Host on GitHub Pages'));
        }
      } catch (error: any) {
        spinner.fail(`Export failed: ${error.message}`);
        throw error;
      }
    } catch (error) {
      this.logger.error('Export failed', error);
      console.error(chalk.red('Export failed:'), error);
    }
  }
}