import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { Logger } from '../../utils/Logger';
import { ResumeManager } from '../../core/resume/ResumeManager';

export class ResumeCommand {
  private logger: Logger;
  private resumeManager: ResumeManager;

  constructor() {
    this.logger = new Logger('ResumeCommand');
    this.resumeManager = ResumeManager.getInstance();
  }

  register(program: Command): void {
    const resume = program
      .command('resume')
      .description('Manage your resume');

    resume
      .command('show')
      .description('Display current resume')
      .option('-f, --format <format>', 'Display format (text, json, md)', 'text')
      .action(async (options) => {
        try {
          await this.show(options);
        } catch (error) {
          this.logger.error('Failed to show resume', error);
          process.exit(1);
        }
      });

    resume
      .command('update')
      .description('Update resume with AI')
      .action(async () => {
        try {
          await this.update();
        } catch (error) {
          this.logger.error('Failed to update resume', error);
          process.exit(1);
        }
      });

    resume
      .command('regenerate')
      .description('Regenerate resume from scratch')
      .action(async () => {
        try {
          await this.regenerate();
        } catch (error) {
          this.logger.error('Failed to regenerate resume', error);
          process.exit(1);
        }
      });

    resume
      .command('export <format>')
      .description('Export resume (json, md, html)')
      .option('-o, --output <file>', 'Output file name')
      .action(async (format: string, options) => {
        try {
          await this.export(format, options);
        } catch (error) {
          this.logger.error('Failed to export resume', error);
          process.exit(1);
        }
      });
  }

  private async show(options: any): Promise<void> {
    const resume = await this.resumeManager.get();
    
    if (!resume) {
      console.log(chalk.yellow('\n⚠ No resume found.'));
      console.log('Generate one with: ' + chalk.cyan('faj analyze <project-path>'));
      return;
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(resume, null, 2));
      return;
    }

    if (options.format === 'md') {
      const markdown = await this.resumeManager.export('md');
      console.log(markdown);
      return;
    }

    // Text format
    console.log(chalk.cyan('\n📄 Your Resume\n'));
    console.log(chalk.gray('─'.repeat(50)));
    
    // Basic Information
    if (resume.basicInfo) {
      console.log(chalk.bold('\nBasic Information:'));
      console.log(`  Name: ${resume.basicInfo.name}`);
      console.log(`  Email: ${resume.basicInfo.email}`);
      if (resume.basicInfo.phone) {
        console.log(`  Phone: ${resume.basicInfo.phone}`);
      }
      if (resume.basicInfo.location) {
        console.log(`  Location: ${resume.basicInfo.location}`);
      }
      if (resume.basicInfo.languages && resume.basicInfo.languages.length > 0) {
        console.log(`  Languages: ${resume.basicInfo.languages.join(', ')}`);
      }
      if (resume.basicInfo.githubUrl) {
        console.log(`  GitHub: ${chalk.cyan(resume.basicInfo.githubUrl)}`);
      }
      if (resume.basicInfo.linkedinUrl) {
        console.log(`  LinkedIn: ${chalk.cyan(resume.basicInfo.linkedinUrl)}`);
      }
      if (resume.basicInfo.portfolioUrl) {
        console.log(`  Portfolio: ${chalk.cyan(resume.basicInfo.portfolioUrl)}`);
      }
    }
    
    // Professional Summary removed

    // Work Experience (moved to second position after basic info)
    if (resume.content.experience.length > 0) {
      console.log(chalk.bold('\nWork Experience:'));
      for (const exp of resume.content.experience.slice(0, 2)) {
        console.log(chalk.cyan(`  ${exp.title}${exp.company ? ' at ' + exp.company : ''}`));
        console.log(chalk.gray(`  ${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`));
        console.log(`  ${exp.description}`);
        if (exp.highlights && exp.highlights.length > 0) {
          console.log(chalk.gray('  Key Achievements:'));
          for (const highlight of exp.highlights.slice(0, 3)) {
            console.log(`    • ${highlight}`);
          }
        }
        if (exp.technologies && exp.technologies.length > 0) {
          console.log(chalk.gray(`  Technologies: ${exp.technologies.slice(0, 5).join(', ')}`));
        }
      }
      if (resume.content.experience.length > 2) {
        console.log(chalk.gray(`  ... and ${resume.content.experience.length - 2} more positions`));
      }
    }

    // Project Experience (moved to third position)
    if (resume.content.projects.length > 0) {
      console.log(chalk.bold('\nProject Experience:'));
      for (const project of resume.content.projects.slice(0, 3)) {
        console.log(chalk.cyan(`  ${project.name}`));
        console.log(`  ${project.description}`);
        if (project.highlights && project.highlights.length > 0) {
          for (const highlight of project.highlights.slice(0, 2)) {
            console.log(`    • ${highlight}`);
          }
        }
        if (project.technologies.length > 0) {
          console.log(chalk.gray(`  Tech Stack: ${project.technologies.slice(0, 5).join(', ')}`));
        }
      }
      
      if (resume.content.projects.length > 3) {
        console.log(chalk.gray(`  ... and ${resume.content.projects.length - 3} more projects`));
      }
    }

    // Technical Skills (moved to fourth position)
    if (resume.content.skills.length > 0) {
      console.log(chalk.bold('\nTechnical Skills:'));
      const skillsByCategory: Record<string, string[]> = {};
      for (const skill of resume.content.skills) {
        const category = skill.category || 'other';
        if (!skillsByCategory[category]) {
          skillsByCategory[category] = [];
        }
        skillsByCategory[category].push(`${skill.name} (${skill.level})`);
      }
      
      for (const [category, skills] of Object.entries(skillsByCategory)) {
        const categoryLabel = this.getCategoryLabel(category);
        console.log(chalk.gray(`  ${categoryLabel}:`));
        console.log(`    ${skills.join(', ')}`);
      }
    }

    // Metadata
    console.log(chalk.gray('\n─'.repeat(50)));
    console.log(chalk.gray(`Version: ${resume.version} | AI Provider: ${resume.aiProvider}`));
    console.log(chalk.gray(`Published: ${resume.metadata.published ? 'Yes' : 'No'}`));
    if (resume.metadata.ipfsHash) {
      console.log(chalk.gray(`IPFS Hash: ${resume.metadata.ipfsHash}`));
    }
  }

  private async update(): Promise<void> {
    const resume = await this.resumeManager.get();
    
    if (!resume) {
      console.log(chalk.yellow('\n⚠ No resume found.'));
      console.log('Generate one with: ' + chalk.cyan('faj analyze <project-path>'));
      return;
    }

    console.log(chalk.cyan('\n📝 Update Resume\n'));
    
    const { updateType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'updateType',
        message: 'What would you like to update?',
        choices: [
          { name: 'Summary', value: 'summary' },
          { name: 'Skills', value: 'skills' },
          { name: 'Add new project', value: 'project' },
          { name: 'Add experience', value: 'experience' },
          { name: 'Education', value: 'education' },
          { name: 'Regenerate with AI', value: 'regenerate' },
        ],
      },
    ]);

    if (updateType === 'regenerate') {
      await this.regenerate();
      return;
    }

    if (updateType === 'summary') {
      const { summary } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'summary',
          message: 'Enter your professional summary:',
          default: resume.content.summary,
        },
      ]);

      const spinner = ora('Updating resume...').start();
      try {
        await this.resumeManager.update({
          content: { ...resume.content, summary },
        });
        spinner.succeed('Resume updated successfully!');
      } catch (error) {
        spinner.fail('Failed to update resume');
        throw error;
      }
    }

    // Other update types would follow similar pattern
    console.log(chalk.yellow('\nFull update functionality coming soon!'));
  }

  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'language': 'Programming Languages',
      'framework': 'Frameworks',
      'tool': 'Tools & Technologies',
      'database': 'Databases',
      'other': 'Other Skills'
    };
    return labels[category] || category;
  }

  private async regenerate(): Promise<void> {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'This will regenerate your entire resume. Continue?',
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Regeneration cancelled.'));
      return;
    }

    console.log(chalk.yellow('\nTo regenerate, analyze your projects again:'));
    console.log(chalk.cyan('  faj analyze <project-paths>'));
  }

  private async export(format: string, options: any): Promise<void> {
    const validFormats = ['json', 'md', 'html'];
    if (!validFormats.includes(format)) {
      console.log(chalk.red(`✗ Invalid format: ${format}`));
      console.log(`Valid formats: ${validFormats.join(', ')}`);
      return;
    }

    const resume = await this.resumeManager.get();
    
    if (!resume) {
      console.log(chalk.yellow('\n⚠ No resume found.'));
      console.log('Generate one with: ' + chalk.cyan('faj analyze <project-path>'));
      return;
    }

    const spinner = ora(`Exporting resume as ${format}...`).start();

    try {
      const exported = await this.resumeManager.export(format as any);
      
      const filename = options.output || `resume.${format}`;
      const fs = await import('fs/promises');
      await fs.writeFile(filename, exported, 'utf-8');
      
      spinner.succeed(`Resume exported to ${filename}`);
    } catch (error) {
      spinner.fail(`Failed to export resume: ${(error as Error).message}`);
      throw error;
    }
  }
}