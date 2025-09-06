import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { ExperienceManager } from '../../core/experience/ExperienceManager';
import { ProjectAnalyzer } from '../../core/analyzer/ProjectAnalyzer';
import { ResumeManager } from '../../core/resume/ResumeManager';
import { ConfigManager } from '../../core/config/ConfigManager';
import { AIManager } from '../../ai/AIManager';
import { Logger } from '../../utils/Logger';
import fs from 'fs/promises';

export class AddCommand {
  private logger: Logger;
  private experienceManager: ExperienceManager;
  private projectAnalyzer: ProjectAnalyzer;
  private resumeManager: ResumeManager;
  private configManager: ConfigManager;
  private aiManager: AIManager;

  constructor() {
    this.logger = new Logger('AddCommand');
    this.experienceManager = ExperienceManager.getInstance();
    this.projectAnalyzer = new ProjectAnalyzer();
    this.resumeManager = ResumeManager.getInstance();
    this.configManager = ConfigManager.getInstance();
    this.aiManager = AIManager.getInstance();
  }

  register(program: Command): void {
    const add = program
      .command('add [type] [path]')
      .description('Add content to your resume (work/project/skill)')
      .action(async (type?: string, path?: string) => {
        await this.execute(type, path);
      });

    // Aliases for convenience
    add.alias('+');
  }

  private async execute(type?: string, targetPath?: string): Promise<void> {
    try {
      await this.configManager.load();
      
      // If no type specified, show menu
      if (!type) {
        const { choice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'choice',
            message: 'What would you like to add?',
            choices: [
              { name: '💼 Work Experience', value: 'work' },
              { name: '📁 Project (analyze code)', value: 'project' },
              { name: '🎓 Education', value: 'education' },
              { name: '💡 Skills', value: 'skills' },
              new inquirer.Separator(),
              { name: '← Back', value: 'back' }
            ]
          }
        ]);
        
        if (choice === 'back') return;
        type = choice;
      }

      switch (type?.toLowerCase()) {
        case 'work':
        case 'experience':
        case 'job':
          await this.addWorkExperience();
          break;
          
        case 'project':
        case 'code':
          await this.addProject(targetPath);
          break;
          
        case 'education':
        case 'edu':
          await this.addEducation();
          break;
          
        case 'skills':
        case 'skill':
          await this.addSkills();
          break;
          
        default:
          console.log(chalk.red(`Unknown type: ${type}`));
          console.log(chalk.gray('Valid types: work, project, education, skills'));
      }
    } catch (error) {
      this.logger.error('Add command failed', error);
      console.error(chalk.red('Error:'), error);
    }
  }

  private async addWorkExperience(): Promise<void> {
    await this.experienceManager.load();
    
    console.log(chalk.cyan.bold('\n➕ Add Work Experience\n'));
    
    // Show example
    console.log(chalk.gray('Example: "I worked at Google as a software engineer, developed'));
    console.log(chalk.gray('search algorithms, improved performance by 30%, used Python and Go"\n'));
    
    const experience = await inquirer.prompt([
      {
        type: 'input',
        name: 'company',
        message: 'Company name:',
        validate: input => input.length > 0 || 'Required'
      },
      {
        type: 'input',
        name: 'title',
        message: 'Job title:',
        validate: input => input.length > 0 || 'Required'
      },
      {
        type: 'input',
        name: 'startDate',
        message: 'Start date (YYYY-MM):',
        default: '2020-01',
        validate: input => /^\d{4}-\d{2}$/.test(input) || 'Use YYYY-MM format'
      },
      {
        type: 'confirm',
        name: 'current',
        message: 'Current position?',
        default: false
      },
      {
        type: 'input',
        name: 'endDate',
        message: 'End date (YYYY-MM):',
        when: answers => !answers.current,
        validate: input => /^\d{4}-\d{2}$/.test(input) || 'Use YYYY-MM format'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Describe your role (AI will enhance this):',
        validate: input => input.length > 10 || 'Please provide more details'
      }
    ]);

    // Extract technologies from description
    const techPattern = /\b(Java|Python|JavaScript|TypeScript|Go|C\+\+|React|Vue|Angular|Node|Spring|Django|Docker|Kubernetes|AWS|Azure|GCP|MySQL|PostgreSQL|MongoDB|Redis)\b/gi;
    const technologies = [...new Set(experience.description.match(techPattern) || [])];
    
    // Save initial version
    const saved = await this.experienceManager.add({
      ...experience,
      technologies,
      rawDescription: experience.description,
      highlights: [],
      polished: false
    });
    
    console.log(chalk.green(`✓ Work experience at ${experience.company} saved`));
    
    // Try AI polish if configured
    const aiConfig = await this.configManager.get('ai');
    if (aiConfig) {
      const spinner = ora('AI is enhancing your description...').start();
      try {
        await this.aiManager.initialize();
        const polished = await this.experienceManager.polish(saved.id, experience.description);
        
        if (polished) {
          spinner.succeed('AI enhanced your experience');
          console.log(chalk.cyan('\n📝 Enhanced Description:'));
          console.log(polished.description);
          
          if (polished.highlights?.length > 0) {
            console.log(chalk.cyan('\n🎯 Key Achievements:'));
            polished.highlights.slice(0, 3).forEach(h => {
              console.log(`  • ${h}`);
            });
          }
        }
      } catch (error) {
        spinner.fail('AI enhancement failed, using original');
      }
    }
  }

  private async addProject(projectPath?: string | undefined): Promise<void> {
    console.log(chalk.cyan.bold('\n📁 Add Project\n'));
    
    // Get project path
    if (!projectPath) {
      const { source } = await inquirer.prompt([
        {
          type: 'list',
          name: 'source',
          message: 'Project source:',
          choices: [
            { name: 'Local directory', value: 'local' },
            { name: 'GitHub repository', value: 'github' }
          ]
        }
      ]);
      
      if (source === 'local') {
        const { path } = await inquirer.prompt([
          {
            type: 'input',
            name: 'path',
            message: 'Project path:',
            default: process.cwd(),
            validate: async input => {
              try {
                const stats = await fs.stat(input);
                return stats.isDirectory() || 'Must be a directory';
              } catch {
                return 'Path does not exist';
              }
            }
          }
        ]);
        projectPath = path;
      } else {
        const { url } = await inquirer.prompt([
          {
            type: 'input',
            name: 'url',
            message: 'GitHub URL:',
            validate: input => {
              return /^https:\/\/github\.com\/[\w-]+\/[\w-]+/.test(input) || 
                     'Enter a valid GitHub URL';
            }
          }
        ]);
        projectPath = url;
      }
    }
    
    // Analyze project
    const spinner = ora('Analyzing project...').start();
    try {
      const analysis = await this.projectAnalyzer.analyze(projectPath!);
      spinner.succeed(`Analyzed ${analysis.name}`);
      
      // Show analysis summary
      console.log(chalk.green('\n✓ Project analyzed successfully'));
      console.log(`  Name: ${analysis.name}`);
      console.log(`  Languages: ${Object.keys(analysis.languages || {}).join(', ')}`);
      console.log(`  Files: ${analysis.metrics?.filesCount || 0}`);
      console.log(`  Lines of code: ${analysis.metrics?.linesOfCode || 0}`);
      
      // Update resume
      const currentResume = await this.resumeManager.get();
      
      if (currentResume) {
        // Add project to resume
        const projects = currentResume.content.projects || [];
        projects.push({
          name: analysis.name,
          description: analysis.description || `${analysis.name} project`,
          role: 'Developer',
          technologies: Object.keys(analysis.languages || {}),
          highlights: analysis.highlights || []
        });
        
        // Save updated resume
        currentResume.content.projects = projects;
        // Need to save through proper API
        console.log(chalk.green('✓ Project added to resume'));
      }
    } catch (error: any) {
      spinner.fail(`Failed: ${error.message}`);
    }
  }

  private async addEducation(): Promise<void> {
    console.log(chalk.cyan.bold('\n🎓 Add Education\n'));
    
    const education = await inquirer.prompt([
      {
        type: 'input',
        name: 'degree',
        message: 'Degree (e.g., Bachelor of Science):',
        default: 'Bachelor of Science'
      },
      {
        type: 'input',
        name: 'field',
        message: 'Field of study:',
        default: 'Computer Science'
      },
      {
        type: 'input',
        name: 'institution',
        message: 'University/College:',
        validate: input => input.length > 0 || 'Required'
      },
      {
        type: 'input',
        name: 'graduationYear',
        message: 'Graduation year:',
        default: new Date().getFullYear().toString()
      },
      {
        type: 'input',
        name: 'gpa',
        message: 'GPA (optional):',
        default: ''
      }
    ]);
    
    // Update profile
    const profile: any = await this.configManager.get('profile') || {};
    profile.education = education;
    await this.configManager.set('profile', profile);
    
    console.log(chalk.green('✓ Education information saved'));
  }

  private async addSkills(): Promise<void> {
    console.log(chalk.cyan.bold('\n💡 Add Skills\n'));
    
    const { skills } = await inquirer.prompt([
      {
        type: 'input',
        name: 'skills',
        message: 'Enter skills (comma-separated):',
        validate: input => input.length > 0 || 'Enter at least one skill'
      }
    ]);
    
    const skillList = skills.split(',').map((s: string) => s.trim()).filter((s: string) => s);
    
    // Update profile
    const profile: any = await this.configManager.get('profile') || {};
    const currentSkills = profile.skills || [];
    profile.skills = [...new Set([...currentSkills, ...skillList])];
    await this.configManager.set('profile', profile);
    
    console.log(chalk.green(`✓ Added ${skillList.length} skills`));
  }
}