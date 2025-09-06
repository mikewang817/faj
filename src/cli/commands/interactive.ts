import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { ConfigManager } from '../../core/config/ConfigManager';
import { ResumeManager } from '../../core/resume/ResumeManager';
import { ExperienceManager } from '../../core/experience/ExperienceManager';
import { ProjectAnalyzer } from '../../core/analyzer/ProjectAnalyzer';
import { ProjectManager } from '../../core/project/ProjectManager';
import { AIManager } from '../../ai/AIManager';
import { Logger } from '../../utils/Logger';
import { getEducationStrings } from '../../utils/EducationOptions';
import { AIProvider } from '../../models';
import { MenuHelper, menuSeparator, menuItem } from '../../utils/MenuHelper';
import fs from 'fs/promises';
import path from 'path';
import * as os from 'os';

export class InteractiveCommand {
  private logger: Logger;
  private configManager: ConfigManager;
  private resumeManager: ResumeManager;
  private experienceManager: ExperienceManager;
  private projectAnalyzer: ProjectAnalyzer;
  private projectManager: ProjectManager;
  private aiManager: AIManager;

  constructor() {
    this.logger = new Logger('InteractiveCommand');
    this.configManager = ConfigManager.getInstance();
    this.resumeManager = ResumeManager.getInstance();
    this.experienceManager = ExperienceManager.getInstance();
    this.projectAnalyzer = new ProjectAnalyzer();
    this.projectManager = ProjectManager.getInstance();
    this.aiManager = AIManager.getInstance();
  }

  register(program: Command): void {
    // Main interactive command - when user just types 'faj'
    program
      .action(async () => {
        await this.start();
      });

    // Also register specific commands for backward compatibility
    // But they all lead to interactive mode
    program
      .command('add')
      .description('Add content interactively')
      .action(async () => {
        await this.start('add');
      });

    program
      .command('export')
      .description('Export resume interactively')
      .action(async () => {
        await this.start('export');
      });

    program
      .command('config')
      .description('Configure settings interactively')
      .action(async () => {
        await this.start('config');
      });
  }

  async start(directAction?: string): Promise<void> {
    try {
      // Check if first time user
      const isNewUser = !(await this.checkExistingConfig());
      
      if (isNewUser) {
        await this.welcomeNewUser();
      } else {
        await this.showMainMenu(directAction);
      }
    } catch (error) {
      this.logger.error('Interactive command failed', error);
      console.error(chalk.red('Error:'), error);
    }
  }

  private async checkExistingConfig(): Promise<boolean> {
    try {
      const configPath = path.join(os.homedir(), '.faj', 'config.json');
      await fs.access(configPath);
      await this.configManager.load();
      const profile = await this.configManager.get('profile');
      // Check if profile exists and has basic required info
      return profile !== null && profile !== undefined && (profile as any).id;
    } catch {
      return false;
    }
  }

  private async welcomeNewUser(): Promise<void> {
    console.clear();
    console.log(chalk.cyan.bold('\n👋 Welcome to FAJ / 欢迎使用FAJ!\n'));
    console.log(chalk.white('Quick setup - just language and AI / 快速设置 - 仅需语言和AI配置\n'));
    
    // Quick language and AI setup
    await this.quickSetup();
    
    // After setup, show main menu
    await this.showMainMenu();
  }
  
  private async quickSetup(): Promise<void> {
    // Step 1: Language selection - same as in configureLanguages
    const { primaryLang } = await inquirer.prompt([
      {
        type: 'list',
        name: 'primaryLang',
        message: 'Select your primary language / 选择主要语言:',
        choices: [
          { name: 'English', value: 'English' },
          { name: 'Chinese (中文)', value: 'Chinese' },
          { name: 'Spanish (Español)', value: 'Spanish' },
          { name: 'French (Français)', value: 'French' },
          { name: 'German (Deutsch)', value: 'German' },
          { name: 'Japanese (日本語)', value: 'Japanese' },
          { name: 'Korean (한국어)', value: 'Korean' },
          { name: 'Portuguese', value: 'Portuguese' },
          { name: 'Russian', value: 'Russian' },
          { name: 'Italian', value: 'Italian' }
        ],
        default: 'Chinese'
      }
    ]);

    const isChinese = primaryLang === 'Chinese';

    // Step 2: AI Provider configuration - same as in configureAI
    const { configureAI } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'configureAI',
        message: isChinese ? 
          'AI可以帮你优化简历内容，现在配置吗？' : 
          'AI can help optimize your resume. Configure now?',
        default: true
      }
    ]);

    let aiConfig = null;
    if (configureAI) {
      const { provider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: isChinese ? 'Choose AI provider / 选择AI提供商:' : 'Choose AI provider:',
          choices: [
            { name: '✨ Google Gemini (gemini-2.5-pro)', value: 'gemini' },
            { name: '🧠 OpenAI (gpt-5)', value: 'openai' },
            { name: '🚀 DeepSeek (deepseek-reasoner)', value: 'deepseek' },
            { name: isChinese ? '稍后配置 / Skip' : 'Skip for now', value: 'skip' },
          ],
        },
      ]);

      if (provider !== 'skip') {
        const { apiKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: isChinese ? `输入${provider} API密钥:` : `Enter ${provider} API key:`,
            mask: '*',
            validate: (input) => input.length > 0 || 'API key required'
          }
        ]);

        // Save API key - same as in configureAI
        await this.configManager.setAIApiKey(provider as AIProvider, apiKey);
        
        // Set default model based on provider
        const defaultModels: { [key: string]: string } = {
          'gemini': 'gemini-2.5-pro',
          'openai': 'gpt-5',
          'deepseek': 'deepseek-reasoner'
        };
        
        aiConfig = {
          provider: provider as AIProvider,
          apiKeys: {
            [provider]: apiKey
          },
          models: defaultModels  // Include models like in configureAI
        };
      }
    }

    // Save minimal configuration
    const spinner = ora(isChinese ? '保存配置...' : 'Saving configuration...').start();
    
    try {
      // Create minimal profile with languages array (consistent with configureLanguages)
      const languages = primaryLang === 'Chinese' ? ['Chinese', 'English'] : 
                       primaryLang === 'English' ? ['English'] : 
                       [primaryLang, 'English'];
      
      const profile = {
        id: this.generateId(),
        role: 'developer' as const,
        name: '',
        email: '',
        languages: languages,  // Primary language first in array
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.configManager.set('profile', profile);
      
      if (aiConfig) {
        await this.configManager.set('ai', aiConfig);
      }

      spinner.succeed(isChinese ? '配置保存成功！' : 'Configuration saved!');
      
      console.log(chalk.green(
        isChinese ? '\n✨ 设置完成！现在可以开始创建简历了。\n' : '\n✨ Setup complete! You can now start creating your resume.\n'
      ));
      
    } catch (error) {
      spinner.fail(isChinese ? '配置保存失败' : 'Failed to save configuration');
      throw error;
    }
  }
  
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private async showMainMenu(directAction?: string): Promise<void> {
    // If direct action specified, execute it
    if (directAction) {
      switch (directAction) {
        case 'add':
          await this.addContent();
          return;
        case 'export':
          await this.exportResume();
          return;
        case 'config':
          await this.configureSettings();
          return;
      }
    }
    
    // Show navigation hints
    console.log(chalk.gray('\n  Navigation: ↑↓ Select | Enter Confirm | Ctrl+C Exit\n'));
    
    // Show main menu
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '👀 View Resume', value: 'view' },
          { name: '➕ Add Content', value: 'add' },
          { name: '✏️  Edit Content', value: 'edit' },
          { name: '📤 Export Resume', value: 'export' },
          { name: '🔧 Settings', value: 'settings' },
          { name: '🔄 Sync/Refresh', value: 'sync' },
          new inquirer.Separator('──────────────'),
          { name: '🗑️  Delete Resume', value: 'delete-resume' },
          { name: '❌ Exit', value: 'exit' }
        ],
        loop: false,
        pageSize: 15
      }
    ]);

    await this.handleMainAction(action);
  }

  // Commented out - not showing resume summary on startup anymore
  // private async showResumeSummary(): Promise<void> {
  //   try {
  //     const resume = await this.resumeManager.get();
  //     if (resume) {
  //       console.clear();
  //       console.log(chalk.cyan.bold('\n📄 Your Resume Summary\n'));
  //       
  //       // Basic info
  //       if (resume.basicInfo) {
  //         console.log(chalk.white(`Name: ${resume.basicInfo.name || 'Not set'}`));
  //         console.log(chalk.white(`Email: ${resume.basicInfo.email || 'Not set'}`));
  //         if (resume.basicInfo.location) {
  //           console.log(chalk.white(`Location: ${resume.basicInfo.location}`));
  //         }
  //       }
  //       
  //       // Stats
  //       const expCount = resume.content?.experience?.length || 0;
  //       const projCount = resume.content?.projects?.length || 0;
  //       const skillCount = resume.content?.skills?.length || 0;
  //       
  //       console.log(chalk.gray('\n📊 Content:'));
  //       console.log(chalk.gray(`  • ${expCount} work experience${expCount !== 1 ? 's' : ''}`));
  //       console.log(chalk.gray(`  • ${projCount} project${projCount !== 1 ? 's' : ''}`));
  //       console.log(chalk.gray(`  • ${skillCount} skill${skillCount !== 1 ? 's' : ''}`));
  //       console.log();
  //     }
  //   } catch {
  //     // No resume yet
  //   }
  // }

  private async handleMainAction(action: string): Promise<void> {
    switch (action) {
      case 'view':
        await this.viewResume();
        break;
      case 'add':
        await this.addContent();
        break;
      case 'edit':
        await this.editContent();
        break;
      case 'export':
        await this.exportResume();
        break;
      case 'settings':
        await this.configureSettings();
        break;
      case 'sync':
        await this.syncResume();
        break;
      case 'delete-resume':
        await this.deleteEntireResume();
        break;
      case 'exit':
        console.log(chalk.gray('\nGoodbye! 👋\n'));
        return;
    }
    
    // Automatically return to main menu after action (no confirmation needed)
    if (action !== 'exit') {
      await this.showMainMenu();
    }
  }

  private async viewResume(): Promise<void> {
    const resume = await this.resumeManager.get();
    
    // Load experiences from ExperienceManager (which has the polished versions)
    await this.experienceManager.load();
    const experiences = await this.experienceManager.getAll();
    
    if (!resume && experiences.length === 0) {
      console.log(chalk.yellow('\n⚠️  No resume found. Let\'s create one!\n'));
      await this.createResume();
      return;
    }
    
    console.clear();
    console.log(chalk.cyan.bold('\n📄 Your Complete Resume\n'));
    
    // Check if resume is empty
    const profile: any = await this.configManager.get('profile');
    const hasContent = profile || experiences.length > 0 || 
                       (resume?.content?.projects && resume.content.projects.length > 0) || 
                       (resume?.content?.skills && resume.content.skills.length > 0) || 
                       resume?.content?.education;
    
    if (!hasContent) {
      console.log(chalk.yellow('  ⚠️  Your resume is empty. Use "Add Content" from the main menu to get started!\n'));
    }
    
    // Basic Information
    if (profile) {
      console.log(chalk.yellow.bold('Basic Information:'));
      console.log(`  Name: ${profile.name || 'Not set'}`);
      console.log(`  Email: ${profile.email || 'Not set'}`);
      if (profile.phone) console.log(`  Phone: ${profile.phone}`);
      if (profile.location) console.log(`  Location: ${profile.location}`);
      if (profile.githubUrl) console.log(`  GitHub: ${profile.githubUrl}`);
      if (profile.linkedinUrl) console.log(`  LinkedIn: ${profile.linkedinUrl}`);
      console.log();
    }
    
    // Summary
    if (profile?.personalSummary || resume?.content?.summary) {
      console.log(chalk.yellow.bold('Professional Summary:'));
      console.log(`  ${profile?.personalSummary || resume?.content?.summary}`);
      console.log();
    }
    
    // Education - Display right after basic info and summary
    if (profile?.education) {
      // Handle both old (single object) and new (array) formats
      const educationArray = Array.isArray(profile.education) ? profile.education : [profile.education];
      if (educationArray.length > 0 && educationArray[0]) {
        console.log(chalk.yellow.bold('Education:'));
        for (const edu of educationArray) {
        console.log(`  ${chalk.cyan(edu.degree)}（${chalk.cyan(edu.field)}）`);
        console.log(`  ${edu.institution}`);
        if (edu.startDate && edu.endDate) {
          console.log(`  ${edu.startDate} - ${edu.endDate}`);
        } else if (edu.startDate) {
          console.log(`  ${edu.startDate} - Present`);
        }
        if (edu.gpa) {
          console.log(`  GPA: ${edu.gpa}`);
        }
        if (edu.highlights && edu.highlights.length > 0) {
          console.log(`  Achievements:`);
          for (const highlight of edu.highlights) {
            console.log(`    • ${highlight}`);
          }
        }
        console.log();
      }
      }
    } else if (resume?.content?.education && resume.content.education.length > 0) {
      // Also check resume for education
      console.log(chalk.yellow.bold('Education:'));
      for (const edu of resume.content.education) {
        console.log(`  ${chalk.cyan(edu.degree)}（${chalk.cyan(edu.field)}）`);
        console.log(`  ${edu.institution}`);
        if (edu.startDate && edu.endDate) {
          console.log(`  ${edu.startDate} - ${edu.endDate}`);
        }
        if (edu.gpa) {
          console.log(`  GPA: ${edu.gpa}`);
        }
        console.log();
      }
    }
    
    // Work Experience - Use ExperienceManager data (includes polished versions)
    if (experiences.length > 0) {
      console.log(chalk.yellow.bold('Work Experience:'));
      for (const exp of experiences) {
        console.log(`  ${chalk.cyan(exp.title)} at ${chalk.cyan(exp.company)}`);
        console.log(`  ${exp.startDate} - ${exp.current ? 'Present' : exp.endDate || 'Present'}`);
        if (exp.description) {
          console.log(`  ${exp.description}`);
        }
        if (exp.highlights && exp.highlights.length > 0) {
          console.log(chalk.gray('\n  Key Achievements:'));
          exp.highlights.slice(0, 5).forEach((h: string) => {
            console.log(`    • ${h}`);
          });
        }
        if (exp.technologies && exp.technologies.length > 0) {
          console.log(chalk.gray(`\n  Technologies: ${exp.technologies.join(', ')}`));
        }
        console.log();
      }
    }
    
    // Projects - Load using ProjectManager
    try {
      await this.projectManager.load();
      const projects = await this.projectManager.getAll();
      
      if (projects && projects.length > 0) {
        console.log(chalk.yellow.bold('Projects:'));
        for (const proj of projects) {
          console.log(`  ${chalk.cyan(proj.name)}`);
          if (proj.role) console.log(`  ${proj.role}`);
          if (proj.description) {
            console.log(`  ${proj.description}`);
          }
          
          if (proj.highlights && proj.highlights.length > 0) {
            console.log(chalk.gray('\n  Key Achievements:'));
            proj.highlights.forEach((h: string) => {
              console.log(`    • ${h}`);
            });
          }
          
          if (proj.technologies && proj.technologies.length > 0) {
            console.log(chalk.gray(`\n  Technologies: ${proj.technologies.join(', ')}`));
          }
          
          if (proj.metrics) {
            const { filesCount, linesOfCode } = proj.metrics;
            if (filesCount || linesOfCode) {
              console.log(chalk.gray(`\n  Scale: ${filesCount} files, ${linesOfCode.toLocaleString()} lines of code`));
            }
          }
          console.log();
        }
      }
    } catch {
      // No projects file yet or legacy resume format
      if (resume?.content?.projects && resume.content.projects.length > 0) {
        console.log(chalk.yellow.bold('Projects:'));
        for (const proj of resume.content.projects) {
          console.log(`  ${chalk.cyan(proj.name)}`);
          console.log(`  ${proj.description}`);
          if (proj.technologies?.length > 0) {
            console.log(`  Tech: ${proj.technologies.join(', ')}`);
          }
          console.log();
        }
      }
    }
    
    // Skills
    if (resume?.content?.skills?.length && resume.content.skills.length > 0) {
      console.log(chalk.yellow.bold('Skills:'));
      const skillsByCategory: any = {};
      resume.content.skills.forEach(skill => {
        const cat = skill.category || 'other';
        if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
        skillsByCategory[cat].push(skill.name);
      });
      
      Object.entries(skillsByCategory).forEach(([cat, skills]: [string, any]) => {
        console.log(`  ${cat}: ${skills.join(', ')}`);
      });
      console.log();
    } else if (profile?.skills && profile.skills.length > 0) {
      // Also check profile for skills
      console.log(chalk.yellow.bold('Skills:'));
      console.log(`  ${profile.skills.join(', ')}`);
      console.log();
    }
    
    // Wait for user to press Enter before returning to main menu
    console.log(chalk.gray('\n─────────────────────────────────────────\n'));
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray('Press Enter to return to main menu...'),
        default: ''
      }
    ]);
  }

  private async addContent(): Promise<void> {
    while (true) {
      console.log(chalk.gray('\n  Navigation: ↑↓ Select | Enter Confirm | Choose "← Back" to return\n'));
      
      const { contentType } = await inquirer.prompt([
        {
          type: 'list',
          name: 'contentType',
          message: 'What would you like to add?',
          choices: [
            { name: '💼 Work Experience', value: 'work' },
            { name: '📁 Project (from code)', value: 'project' },
            { name: '🎓 Education', value: 'education' },
            { name: '💡 Skills', value: 'skills' },
            { name: '📝 Summary/Objective', value: 'summary' },
            new inquirer.Separator('──────────────'),
            { name: '← Back to Main Menu', value: 'back' }
          ],
          loop: false,
          pageSize: 10
        }
      ]);
      
      if (contentType === 'back') return;
      
      switch (contentType) {
        case 'work':
          await this.addWorkExperience();
          break;
        case 'project':
          await this.addProject();
          break;
        case 'education':
          await this.addEducation();
          break;
        case 'skills':
          await this.addSkills();
          break;
        case 'summary':
          await this.addSummary();
          break;
      }
    }
  }

  private async addWorkExperience(): Promise<void> {
    console.log(chalk.cyan.bold('\n💼 Add Work Experience\n'));
    
    // Show example
    console.log(chalk.gray('Tip: Describe your role briefly. AI will enhance it!\n'));
    console.log(chalk.gray('Example: "Backend engineer at Google, worked on search algorithms,'));
    console.log(chalk.gray('improved performance by 30%, used Python and Go"\n'));
    
    const experience = await inquirer.prompt([
      {
        type: 'input',
        name: 'company',
        message: 'Company name:',
        validate: input => input.length > 0 || 'Company name is required'
      },
      {
        type: 'input',
        name: 'title',
        message: 'Your position/title:',
        validate: input => input.length > 0 || 'Position is required'
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
        message: 'Is this your current position?',
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
        message: 'Describe your role and achievements:',
        validate: input => input.length > 20 || 'Please provide more details (at least 20 characters)'
      }
    ]);
    
    // Extract technologies mentioned
    const techKeywords = ['Java', 'Python', 'JavaScript', 'TypeScript', 'Go', 'React', 'Node', 'Docker', 'Kubernetes', 'AWS', 'MySQL', 'MongoDB'];
    const technologies = techKeywords.filter(tech => 
      new RegExp(`\\b${tech}\\b`, 'i').test(experience.description)
    );
    
    // If user mentioned numbers, extract as highlights
    const highlights: string[] = [];
    const sentences = experience.description.split(/[.!?]/).filter((s: string) => s.trim());
    sentences.forEach((sentence: string) => {
      if (/\d+/.test(sentence) || /improved|reduced|increased|led|managed/i.test(sentence)) {
        highlights.push(sentence.trim());
      }
    });
    
    // Save experience
    await this.experienceManager.load();
    const saved = await this.experienceManager.add({
      ...experience,
      technologies,
      highlights: highlights.slice(0, 3),
      rawDescription: experience.description,
      polished: false
    });
    
    console.log(chalk.green(`\n✓ Work experience at ${experience.company} saved!\n`));
    
    // Try AI polish if configured
    const aiConfig = await this.configManager.get('ai');
    if (aiConfig) {
      const { polish } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'polish',
          message: 'Would you like AI to enhance this description?',
          default: true
        }
      ]);
      
      if (polish) {
        const spinner = ora('AI is enhancing your experience...').start();
        try {
          await this.aiManager.initialize();
          const polished = await this.experienceManager.polish(saved.id, experience.description);
          
          if (polished) {
            spinner.succeed('AI enhanced your experience!');
            
            console.log(chalk.cyan('\n📝 Enhanced Version:\n'));
            console.log(polished.description);
            
            if (polished.highlights?.length > 0) {
              console.log(chalk.cyan('\n🎯 Key Achievements:'));
              polished.highlights.forEach(h => console.log(`  • ${h}`));
            }
            
            const { accept } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'accept',
                message: 'Use this enhanced version?',
                default: true
              }
            ]);
            
            if (!accept) {
              // Revert to original
              await this.experienceManager.update(saved.id, {
                description: experience.description,
                polished: false
              });
            }
          }
        } catch (error) {
          spinner.fail('AI enhancement failed, keeping original');
        }
      }
    }
  }

  private async addProject(): Promise<void> {
    console.log(chalk.cyan.bold('\n📁 Add Project from Code\n'));
    
    const { source } = await inquirer.prompt([
      {
        type: 'list',
        name: 'source',
        message: 'Where is your project?',
        choices: [
          { name: '📂 Local folder on this computer', value: 'local' },
          { name: '🌐 GitHub repository', value: 'github' },
          { name: '← Back', value: 'back' }
        ]
      }
    ]);
    
    if (source === 'back') return;
    
    let projectPath: string;
    
    if (source === 'local') {
      const { path: localPath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'path',
          message: 'Project folder path:',
          default: process.cwd(),
          validate: async input => {
            try {
              const stats = await fs.stat(input);
              return stats.isDirectory() || 'Path must be a directory';
            } catch {
              return 'Path does not exist';
            }
          }
        }
      ]);
      projectPath = localPath;
    } else {
      const { url } = await inquirer.prompt([
        {
          type: 'input',
          name: 'url',
          message: 'GitHub repository URL:',
          default: 'https://github.com/',
          validate: input => {
            return /^https:\/\/github\.com\/[\w-]+\/[\w-]+/.test(input) || 
                   'Please enter a valid GitHub URL (e.g., https://github.com/user/repo)';
          }
        }
      ]);
      projectPath = url;
    }
    
    // Analyze project
    const spinner = ora('Analyzing project...').start();
    try {
      const analysis = await this.projectAnalyzer.analyze(projectPath);
      spinner.succeed('Project analyzed successfully!');
      
      // Show analysis results
      console.log(chalk.green('\n✓ Project Analysis Complete\n'));
      console.log(`  ${chalk.cyan('Name:')} ${analysis.name}`);
      console.log(`  ${chalk.cyan('Languages:')} ${Object.keys(analysis.languages || {}).join(', ')}`);
      console.log(`  ${chalk.cyan('Files:')} ${analysis.metrics?.filesCount || 0}`);
      console.log(`  ${chalk.cyan('Lines of code:')} ${analysis.metrics?.linesOfCode || 0}`);
      
      // Ask for additional details
      const { description, role } = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: 'Brief project description (optional):',
          default: analysis.description || ''
        },
        {
          type: 'input',
          name: 'role',
          message: 'Your role in this project:',
          default: 'Developer'
        }
      ]);
      
      // Try to enhance with AI if configured
      const aiConfig = await this.configManager.get('ai');
      let finalDescription = description || analysis.description || `${analysis.name} project`;
      let highlights = analysis.highlights || [];
      
      if (aiConfig) {
        const { enhance } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'enhance',
            message: 'Would you like AI to enhance the project description?',
            default: true
          }
        ]);
        
        if (enhance) {
          const spinner = ora('AI is generating enhanced project description...').start();
          try {
            await this.aiManager.initialize();
            
            // Get user's language preference
            const profile: any = await this.configManager.get('profile');
            const userLanguages = profile?.languages || ['English'];
            const primaryLanguage = userLanguages[0];
            
            // Determine the language to use for AI response
            let languageName = 'English';
            if (primaryLanguage) {
              const langLower = primaryLanguage.toLowerCase();
              if (langLower.includes('chinese') || langLower.includes('中文') || langLower.includes('mandarin')) {
                languageName = 'Chinese';
              } else if (langLower.includes('spanish') || langLower.includes('español')) {
                languageName = 'Spanish';
              } else if (langLower.includes('french') || langLower.includes('français')) {
                languageName = 'French';
              } else if (langLower.includes('german') || langLower.includes('deutsch')) {
                languageName = 'German';
              } else if (langLower.includes('japanese') || langLower.includes('日本語')) {
                languageName = 'Japanese';
              } else if (langLower.includes('korean') || langLower.includes('한국어')) {
                languageName = 'Korean';
              }
            }
            
            const prompt = `Based on this ACTUAL project analysis data, generate a professional project description in ${languageName}:
            
ACTUAL PROJECT DATA (DO NOT INVENT ANY OTHER METRICS):
- Project Name: ${analysis.name}
- Programming Languages Used: ${Object.keys(analysis.languages || {}).join(', ')}
- Language Distribution: ${Object.entries(analysis.languages || {}).map(([lang, pct]) => `${lang}: ${pct}%`).join(', ')}
- Total Files: ${analysis.metrics?.filesCount || 0}
- Total Lines of Code: ${analysis.metrics?.linesOfCode || 0}
- Frameworks: ${analysis.frameworks?.join(', ') || 'None detected'}
- Libraries: ${analysis.libraries?.join(', ') || 'None detected'}
- Complexity: ${analysis.complexity || 'Not determined'}
- Your Role: ${role}
- User's Description: ${description || 'Not provided'}

STRICT RULES:
1. ONLY use the metrics provided above - DO NOT invent any performance numbers, user counts, or other metrics
2. Base descriptions on the actual technologies and code statistics provided
3. Focus on the technical stack and architecture evident from the code analysis
4. Describe what the project does based on the technologies used and user's description
5. DO NOT make up features that aren't evident from the data

Generate:
1. A 2-3 sentence description based on the actual project data
2. 3-5 highlights based on ACTUAL metrics (e.g., "Implemented with ${analysis.metrics?.filesCount} files and ${analysis.metrics?.linesOfCode} lines of ${Object.keys(analysis.languages || {})[0]} code")
3. Technical focus areas based on the detected languages and frameworks

IMPORTANT: Generate ALL content in ${languageName} language.
Use ONLY the data provided - no speculation or invention.

Format as JSON:
{
  "description": "...",
  "highlights": ["highlight1", "highlight2", ...],
  "technologies": ["tech1", "tech2", ...]
}`;
            
            const response = await this.aiManager.processPrompt(prompt);
            
            // Parse AI response
            try {
              // Clean up the response - remove markdown code blocks if present
              let cleanedResponse = response;
              if (response.includes('```json')) {
                cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
              } else if (response.includes('```')) {
                cleanedResponse = response.replace(/```\s*/g, '');
              }
              cleanedResponse = cleanedResponse.trim();
              
              const enhanced = JSON.parse(cleanedResponse);
              spinner.succeed('AI enhanced your project description!');
              
              console.log(chalk.cyan('\n📝 Enhanced Description:\n'));
              console.log(enhanced.description);
              
              if (enhanced.highlights && enhanced.highlights.length > 0) {
                console.log(chalk.cyan('\n🎯 Technical Achievements:'));
                enhanced.highlights.forEach((h: string) => console.log(`  • ${h}`));
              }
              
              if (enhanced.metrics) {
                console.log(chalk.cyan('\n📊 Metrics:'));
                console.log(`  ${enhanced.metrics}`);
              }
              
              const { accept } = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'accept',
                  message: 'Use this enhanced version?',
                  default: true
                }
              ]);
              
              if (accept) {
                finalDescription = enhanced.description;
                highlights = enhanced.highlights || [];
              }
            } catch (parseError) {
              // If parsing fails, try to extract meaningful content
              spinner.warn('AI response formatting issue, using simple enhancement');
              finalDescription = response.substring(0, 500); // Use first part of response
            }
          } catch (error) {
            spinner.fail('AI enhancement failed, using original description');
          }
        }
      }
      
      // Save project to storage
      // Use ProjectManager to save the project
      await this.projectManager.load();
      const savedProject = await this.projectManager.addFromAnalysis(analysis, {
        description: finalDescription,
        role,
        highlights,
        githubUrl: source === 'github' ? projectPath : undefined
      });
      
      console.log(chalk.green('\n✓ Project added and saved!\n'));
      
      // If AI enhancement was successful, mark as polished
      if (aiConfig && finalDescription !== (description || analysis.description)) {
        await this.projectManager.update(savedProject.id, {
          polished: true
        });
      }
    } catch (error: any) {
      spinner.fail(`Failed to analyze project: ${error.message}`);
    }
  }

  private async addEducation(): Promise<void> {
    // Get user's language preference
    const profile: any = await this.configManager.get('profile');
    const userLanguages = profile?.languages || ['English'];
    const primaryLanguage = userLanguages[0];
    const eduStrings = getEducationStrings(primaryLanguage);
    
    console.log(chalk.cyan.bold(`\n${eduStrings.addEducationTitle}\n`));
    
    const education = await inquirer.prompt([
      {
        type: 'list',
        name: 'degree',
        message: eduStrings.degreeLevel,
        choices: [
          { name: eduStrings.degrees.bachelors, value: eduStrings.degrees.bachelors },
          { name: eduStrings.degrees.masters, value: eduStrings.degrees.masters },
          { name: eduStrings.degrees.phd, value: eduStrings.degrees.phd },
          { name: eduStrings.degrees.associate, value: eduStrings.degrees.associate },
          { name: eduStrings.degrees.certificate, value: eduStrings.degrees.certificate },
          { name: eduStrings.degrees.bootcamp, value: eduStrings.degrees.bootcamp },
          { name: eduStrings.degrees.other, value: eduStrings.degrees.other }
        ]
      },
      {
        type: 'input',
        name: 'field',
        message: eduStrings.fieldOfStudy,
        default: eduStrings.fieldDefault
      },
      {
        type: 'input',
        name: 'institution',
        message: eduStrings.institution,
        validate: input => input.length > 0 || eduStrings.institutionRequired
      },
      {
        type: 'input',
        name: 'startYear',
        message: eduStrings.startYear,
        default: (new Date().getFullYear() - 4).toString(),
        validate: input => {
          const year = parseInt(input);
          return (!isNaN(year) && year >= 1950 && year <= 2030) || eduStrings.enterValidYear;
        }
      },
      {
        type: 'input',
        name: 'endYear',
        message: eduStrings.graduationYear,
        default: new Date().getFullYear().toString(),
        validate: input => {
          const year = parseInt(input);
          return (!isNaN(year) && year >= 1950 && year <= 2030) || eduStrings.enterValidYear;
        }
      },
      {
        type: 'input',
        name: 'gpa',
        message: eduStrings.gpa,
        default: '',
        filter: input => input.trim() || '',
        transformer: input => input || eduStrings.gpaOptional
      },
      {
        type: 'input',
        name: 'achievements',
        message: eduStrings.achievements,
        default: '',
        filter: input => input.trim() || '',
        transformer: input => input || eduStrings.achievementsHelp
      }
    ]);
    
    // Parse achievements if provided
    const achievements = education.achievements 
      ? education.achievements.split(';').map((s: string) => s.trim()).filter((s: string) => s)
      : [];
    
    // Convert years to dates for consistency
    const educationWithDates = {
      degree: education.degree,
      field: education.field,
      institution: education.institution,
      startDate: education.startYear,
      endDate: education.endYear,
      current: false,
      gpa: education.gpa ? parseFloat(education.gpa) : undefined,
      highlights: achievements.length > 0 ? achievements : undefined
    };
    
    // Initialize or migrate education array
    if (!profile.education) {
      profile.education = [];
    } else if (!Array.isArray(profile.education)) {
      // Migrate from old single object format to array
      const oldEducation = profile.education as any;
      profile.education = [{
        degree: oldEducation.degree,
        field: oldEducation.field,
        institution: oldEducation.institution,
        startDate: oldEducation.startYear || oldEducation.startDate || (oldEducation.graduationYear ? `${parseInt(oldEducation.graduationYear) - 4}` : ''),
        endDate: oldEducation.endYear || oldEducation.endDate || oldEducation.graduationYear || '',
        current: false,
        gpa: oldEducation.gpa ? (typeof oldEducation.gpa === 'string' ? parseFloat(oldEducation.gpa) : oldEducation.gpa) : undefined,
        highlights: oldEducation.achievements || oldEducation.highlights || []
      }];
    }
    
    // Add new education entry to the array
    profile.education.push(educationWithDates);
    
    // Sort education by end date (most recent first)
    profile.education.sort((a: any, b: any) => {
      const aEnd = a.endDate || a.startDate;
      const bEnd = b.endDate || b.startDate;
      return bEnd.localeCompare(aEnd);
    });
    
    await this.configManager.set('profile', profile);
    
    console.log(chalk.green(`\n${eduStrings.educationAdded}\n`));
  }

  private async addSkills(): Promise<void> {
    console.log(chalk.cyan.bold('\n💡 Add Skills\n'));
    
    const { method } = await inquirer.prompt([
      {
        type: 'list',
        name: 'method',
        message: 'How would you like to add skills?',
        choices: [
          { name: '✍️  Type them manually', value: 'manual' },
          { name: '🔍 Extract from resume', value: 'extract' },
          { name: '📋 Choose from common skills', value: 'common' },
          new inquirer.Separator('──────────────'),
          { name: '← Back', value: 'back' }
        ]
      }
    ]);
    
    if (method === 'back') return;
    
    let skills: string[] = [];
    
    if (method === 'manual') {
      const { input } = await inquirer.prompt([
        {
          type: 'input',
          name: 'input',
          message: 'Enter skills (comma-separated):',
          validate: input => input.length > 0 || 'Enter at least one skill'
        }
      ]);
      skills = input.split(',').map((s: string) => s.trim()).filter((s: string) => s);
    } else if (method === 'common') {
      const { selected } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selected',
          message: 'Select skills:',
          choices: [
            // Languages
            new inquirer.Separator('── Programming Languages ──'),
            'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'C++', 'C#', 'Ruby', 'PHP', 'Swift',
            // Frameworks
            new inquirer.Separator('── Frameworks ──'),
            'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'Spring Boot', '.NET',
            // Databases
            new inquirer.Separator('── Databases ──'),
            'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra',
            // Tools
            new inquirer.Separator('── Tools & Platforms ──'),
            'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'Jenkins', 'Terraform'
          ]
        }
      ]);
      skills = selected;
    } else if (method === 'extract') {
      // Extract from existing resume content
      const resume = await this.resumeManager.get();
      if (resume) {
        const extractedSkills = new Set<string>();
        
        // From experiences
        resume.content?.experience?.forEach(exp => {
          exp.technologies?.forEach(tech => extractedSkills.add(tech));
        });
        
        // From projects
        resume.content?.projects?.forEach(proj => {
          proj.technologies?.forEach(tech => extractedSkills.add(tech));
        });
        
        if (extractedSkills.size > 0) {
          skills = Array.from(extractedSkills);
          console.log(chalk.green(`\nExtracted ${skills.length} skills from your resume:`));
          console.log(skills.join(', '));
        } else {
          console.log(chalk.yellow('\nNo skills found to extract. Please add them manually.'));
          return this.addSkills();
        }
      }
    }
    
    // Save skills
    const profile: any = await this.configManager.get('profile') || {};
    const currentSkills = profile.skills || [];
    profile.skills = [...new Set([...currentSkills, ...skills])];
    await this.configManager.set('profile', profile);
    
    console.log(chalk.green(`\n✓ Added ${skills.length} skills!\n`));
  }

  private async addSummary(): Promise<void> {
    console.log(chalk.cyan.bold('\n📝 Professional Summary\n'));
    
    const { method } = await inquirer.prompt([
      {
        type: 'list',
        name: 'method',
        message: 'How would you like to create your summary?',
        choices: [
          { name: '✍️  Write it myself', value: 'manual' },
          { name: '🤖 Generate with AI', value: 'ai' },
          { name: '📋 Use a template', value: 'template' },
          new inquirer.Separator('──────────────'),
          { name: '← Back', value: 'back' }
        ]
      }
    ]);
    
    if (method === 'back') return;
    
    let summary = '';
    
    if (method === 'manual') {
      const { text } = await inquirer.prompt([
        {
          type: 'input',
          name: 'text',
          message: 'Write your professional summary (2-3 sentences):',
          validate: input => input.length > 30 || 'Please write at least 30 characters'
        }
      ]);
      summary = text;
    } else if (method === 'template') {
      const templates = [
        'Experienced software engineer with [X] years of expertise in [technologies]. Proven track record of [achievements]. Seeking opportunities in [field].',
        'Full-stack developer specializing in [technologies] with [X] years of experience. Successfully delivered [number] projects. Passionate about [interests].',
        'Results-driven engineer with expertise in [field]. Led teams of [size] to deliver [achievements]. Looking to leverage skills in [target role].'
      ];
      
      const { template } = await inquirer.prompt([
        {
          type: 'list',
          name: 'template',
          message: 'Choose a template:',
          choices: templates.map((t, i) => ({ name: t, value: i }))
        }
      ]);
      
      console.log(chalk.gray('\nFill in the blanks:\n'));
      summary = templates[template];
      
      // Replace placeholders
      const placeholders = summary.match(/\[([^\]]+)\]/g) || [];
      for (const placeholder of placeholders) {
        const field = placeholder.slice(1, -1);
        const { value } = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: `Enter ${field}:`
          }
        ]);
        summary = summary.replace(placeholder, value);
      }
    } else if (method === 'ai') {
      // Generate with AI based on resume content
      const aiConfig = await this.configManager.get('ai');
      if (!aiConfig) {
        console.log(chalk.yellow('\n⚠️  AI not configured. Please configure AI first.\n'));
        return;
      }
      
      const spinner = ora('Generating summary with AI...').start();
      try {
        // Gather all relevant data
        const profile: any = await this.configManager.get('profile');
        await this.experienceManager.load();
        const experiences = await this.experienceManager.getAll();
        await this.projectManager.load();
        const projects = await this.projectManager.getAll();
        
        // Get user's language preference
        const userLanguages = profile?.languages || ['English'];
        const primaryLanguage = userLanguages[0];
        
        // Determine the language to use for AI response
        let languageName = 'English';
        if (primaryLanguage) {
          const langLower = primaryLanguage.toLowerCase();
          if (langLower.includes('chinese') || langLower.includes('中文') || langLower.includes('mandarin')) {
            languageName = 'Chinese';
          } else if (langLower.includes('spanish') || langLower.includes('español')) {
            languageName = 'Spanish';
          } else if (langLower.includes('french') || langLower.includes('français')) {
            languageName = 'French';
          } else if (langLower.includes('german') || langLower.includes('deutsch')) {
            languageName = 'German';
          } else if (langLower.includes('japanese') || langLower.includes('日本語')) {
            languageName = 'Japanese';
          } else if (langLower.includes('korean') || langLower.includes('한국어')) {
            languageName = 'Korean';
          }
        }
        
        // Build comprehensive prompt
        const yearsOfExperience = experiences.length > 0 
          ? Math.floor((Date.now() - new Date(experiences[0].startDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
          : 0;
        
        const technologies = new Set<string>();
        experiences.forEach(exp => exp.technologies?.forEach(t => technologies.add(t)));
        projects.forEach(proj => proj.technologies?.forEach(t => technologies.add(t)));
        
        const prompt = `Generate a professional summary in ${languageName} for a software engineer with the following profile:

Years of Experience: ${yearsOfExperience}
Current Role: ${experiences[0]?.title || 'Software Engineer'}
Current Company: ${experiences[0]?.company || 'N/A'}
Key Technologies: ${Array.from(technologies).slice(0, 10).join(', ')}
Number of Projects: ${projects.length}
Education: ${profile?.education?.degree || 'Bachelor\'s'} in ${profile?.education?.field || 'Computer Science'}

Requirements:
1. 2-3 sentence professional summary
2. Highlight technical expertise and key achievements
3. Include career objectives
4. Professional and engaging

IMPORTANT: Generate the ENTIRE summary in ${languageName} language.`;
        
        await this.aiManager.initialize();
        summary = await this.aiManager.processPrompt(prompt);
        spinner.succeed('AI generated your summary!');
        
        console.log(chalk.cyan('\n📝 Generated Summary:\n'));
        console.log(summary);
        
        const { accept } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'accept',
            message: 'Use this summary?',
            default: true
          }
        ]);
        
        if (!accept) {
          return this.addSummary();
        }
      } catch (error) {
        spinner.fail('AI generation failed');
        console.log(chalk.yellow('\nFalling back to manual input...\n'));
        return this.addSummary();
      }
    }
    
    // Save summary
    const profile: any = await this.configManager.get('profile') || {};
    profile.personalSummary = summary;
    await this.configManager.set('profile', profile);
    
    console.log(chalk.green('\n✓ Professional summary saved!\n'));
  }

  private async editContent(): Promise<void> {
    while (true) {
      const { section } = await inquirer.prompt([
        {
          type: 'list',
          name: 'section',
          message: 'What would you like to edit?',
          choices: [
            { name: '👤 Basic Information', value: 'basic' },
            { name: '📝 Summary/Objective', value: 'summary' },
            { name: '💼 Work Experience', value: 'experience' },
            { name: '📁 Projects', value: 'projects' },
            { name: '💡 Skills', value: 'skills' },
            { name: '🎓 Education', value: 'education' },
            new inquirer.Separator(),
            { name: '← Back', value: 'back' }
          ]
        }
      ]);
      
      if (section === 'back') return;
      
      switch (section) {
        case 'basic':
          await this.editBasicInfo();
          break;
        case 'summary':
          await this.editSummary();
          break;
        case 'experience':
          await this.editExperience();
          break;
        case 'projects':
          await this.editProjects();
          break;
        case 'skills':
          await this.editSkills();
          break;
        case 'education':
          await this.editEducation();
          break;
      }
    }
  }
  
  private async editBasicInfo(): Promise<void> {
    const profile: any = await this.configManager.get('profile') || {};
    
    console.log(chalk.cyan.bold('\n✏️  Edit Basic Information\n'));
    console.log(chalk.gray('Press Enter to keep current value\n'));
    
    const updated = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Name:',
        default: profile.name
      },
      {
        type: 'input',
        name: 'email',
        message: 'Email:',
        default: profile.email
      },
      {
        type: 'input',
        name: 'phone',
        message: 'Phone:',
        default: profile.phone
      },
      {
        type: 'input',
        name: 'location',
        message: 'Location:',
        default: profile.location
      },
      {
        type: 'input',
        name: 'githubUrl',
        message: 'GitHub URL:',
        default: profile.githubUrl
      },
      {
        type: 'input',
        name: 'linkedinUrl',
        message: 'LinkedIn URL:',
        default: profile.linkedinUrl
      }
    ]);
    
    Object.assign(profile, updated);
    await this.configManager.set('profile', profile);
    
    console.log(chalk.green('\n✓ Basic information updated!\n'));
  }
  
  
  private async editExperience(): Promise<void> {
    while (true) {
      await this.experienceManager.load();
      const experiences = await this.experienceManager.getAll();
      
      if (experiences.length === 0) {
        console.log(chalk.yellow('\n⚠️  No work experiences found. Add some first!\n'));
        return;
      }
      
      const choices = experiences.map(exp => ({
        name: `${exp.title} at ${exp.company} (${exp.startDate})`,
        value: exp.id
      }));
      choices.push(new inquirer.Separator() as any);
      choices.push({ name: '← Back', value: 'back' });
      
      const { expId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'expId',
          message: 'Select experience:',
          choices
        }
      ]);
      
      if (expId === 'back') return;
    
    const exp = experiences.find(e => e.id === expId);
    if (!exp) return;
    
    // Ask what to do with this experience
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: `What would you like to do with "${exp.title} at ${exp.company}"?`,
        choices: [
          { name: '✏️  Edit', value: 'edit' },
          { name: '🗑️  Delete', value: 'delete' },
          { name: '← Back', value: 'back' }
        ]
      }
    ]);
    
    if (action === 'back') continue;  // Continue the loop to show experience list again
    
    if (action === 'delete') {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete "${exp.title} at ${exp.company}"?`,
          default: false
        }
      ]);
      
      if (confirm) {
        await this.experienceManager.delete(expId);
        console.log(chalk.green('\n✓ Work experience deleted!\n'));
      }
      continue;  // Continue the loop instead of returning
    }
    
    // Edit the experience - now with more options
    console.log(chalk.cyan.bold('\n✏️  Edit Work Experience\n'));
    
    // Show current experience details
    console.log(chalk.yellow('Current Experience Details:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.cyan('Company:')} ${exp.company}`);
    console.log(`${chalk.cyan('Position:')} ${exp.title}`);
    console.log(`${chalk.cyan('Duration:')} ${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`);
    console.log(`${chalk.cyan('Description:')} ${exp.description || exp.rawDescription || 'Not provided'}`);
    if (exp.highlights && exp.highlights.length > 0) {
      console.log(chalk.cyan('Highlights:'));
      exp.highlights.forEach((h: string, idx: number) => {
        console.log(`  ${idx + 1}. ${h}`);
      });
    }
    console.log(`${chalk.cyan('Technologies:')} ${exp.technologies?.join(', ') || 'None'}`);
    if (exp.polished) {
      console.log(chalk.green('✨ This experience has been enhanced by AI'));
    }
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    
    // Ask what to edit
    const { editChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'editChoice',
        message: 'What would you like to edit?',
        choices: [
          { name: '📝 Basic Information (Company, Title, Dates)', value: 'basic' },
          { name: '📄 Description', value: 'description' },
          { name: '✨ Highlights/Achievements', value: 'highlights' },
          { name: '🛠️ Technologies', value: 'technologies' },
          { name: '🔄 Edit All Fields', value: 'all' },
          new inquirer.Separator(),
          { name: '← Back', value: 'back' }
        ]
      }
    ]);
    
    if (editChoice === 'back') return;
    
    let updated: any = {};
    
    switch (editChoice) {
      case 'basic': {
        const basicInfo = await inquirer.prompt([
          {
            type: 'input',
            name: 'company',
            message: 'Company:',
            default: exp.company
          },
          {
            type: 'input',
            name: 'title',
            message: 'Job title:',
            default: exp.title
          },
          {
            type: 'input',
            name: 'startDate',
            message: 'Start date (YYYY-MM):',
            default: exp.startDate
          },
          {
            type: 'confirm',
            name: 'current',
            message: 'Current position?',
            default: exp.current
          },
          {
            type: 'input',
            name: 'endDate',
            message: 'End date (YYYY-MM):',
            when: (answers: any) => !answers.current,
            default: exp.endDate
          }
        ]);
        updated = { ...basicInfo };
        break;
      }
      
      case 'description': {
        console.log(chalk.gray('\nCurrent description:'));
        console.log(chalk.white(exp.description || exp.rawDescription || 'No description yet'));
        console.log();
        
        const { descChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'descChoice',
            message: 'How would you like to edit the description?',
            choices: [
              { name: '✏️  Edit current description', value: 'edit' },
              { name: '📝 Provide raw description (for AI enhancement)', value: 'raw' },
              new inquirer.Separator('──────────────'),
              { name: '← Back', value: 'back' }
            ]
          }
        ]);
        
        if (descChoice === 'back') break;
        
        if (descChoice === 'edit') {
          const { description } = await inquirer.prompt([
            {
              type: 'input',
              name: 'description',
              message: 'Edit description:',
              default: exp.description || exp.rawDescription || ''
            }
          ]);
          updated = { description };
        } else {
          const { rawDescription } = await inquirer.prompt([
            {
              type: 'input',
              name: 'rawDescription',
              message: 'Enter raw description (for AI enhancement):',
              default: exp.rawDescription || ''
            }
          ]);
          updated = { rawDescription };
          
          // Ask if they want to enhance now
          const { enhance } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'enhance',
              message: 'Would you like to enhance this with AI now?',
              default: true
            }
          ]);
          
          if (enhance) {
            const spinner = ora('AI is enhancing your experience description...').start();
            try {
              const enhanced = await this.experienceManager.polish(expId, rawDescription);
              if (enhanced) {
                spinner.succeed('Experience enhanced successfully!');
                return; // Already updated by polish
              } else {
                spinner.fail('Enhancement failed');
              }
            } catch (error) {
              spinner.fail('Enhancement failed');
            }
          }
        }
        break;
      }
      
      case 'highlights': {
        // Show current highlights if they exist
        if (exp.highlights && exp.highlights.length > 0) {
          console.log(chalk.cyan('\nCurrent highlights:'));
          exp.highlights.forEach((h: string, idx: number) => {
            console.log(`  ${idx + 1}. ${h}`);
          });
          console.log();
        } else {
          console.log(chalk.yellow('\nNo highlights currently. Add some!\n'));
        }
        
        const { highlightAction } = await inquirer.prompt([
          {
            type: 'list',
            name: 'highlightAction',
            message: 'How would you like to edit highlights?',
            choices: [
              { name: '✏️  Edit individual highlights', value: 'individual' },
              { name: '🔄 Replace all highlights', value: 'replace' },
              { name: '➕ Add new highlights', value: 'add' },
              { name: '➖ Remove highlights', value: 'remove' },
              { name: '🤖 Regenerate with AI', value: 'ai' },
              new inquirer.Separator('──────────────'),
              { name: '← Back', value: 'back' }
            ]
          }
        ]);
        
        if (highlightAction === 'back') {
          // Don't update anything, just break
          updated = null;
          break;
        }
        
        let newHighlights = [...(exp.highlights || [])];
        
        switch (highlightAction) {
          case 'individual': {
            if (newHighlights.length === 0) {
              console.log(chalk.yellow('No highlights to edit individually. Please add some first.'));
              updated = null;  // Don't update anything
              break;
            }
            console.log(chalk.cyan('\nEdit each highlight (press Enter to keep current value):\n'));
            for (let i = 0; i < newHighlights.length; i++) {
              const { edited } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'edited',
                  message: `Edit highlight ${i + 1}:`,
                  default: newHighlights[i]
                }
              ]);
              // Only update if not empty
              if (edited && edited.trim()) {
                newHighlights[i] = edited.trim();
              }
            }
            break;
          }
          
          case 'replace': {
            const { highlights } = await inquirer.prompt([
              {
                type: 'input',
                name: 'highlights',
                message: 'Enter all highlights (semicolon-separated):',
                default: newHighlights.join('; ')
              }
            ]);
            newHighlights = highlights.split(';').map((s: string) => s.trim()).filter((s: string) => s);
            break;
          }
          
          case 'add': {
            const { additional } = await inquirer.prompt([
              {
                type: 'input',
                name: 'additional',
                message: 'Add highlights (comma-separated):'
              }
            ]);
            const addedHighlights = additional.split(',').map((s: string) => s.trim()).filter((s: string) => s);
            newHighlights = [...newHighlights, ...addedHighlights];
            break;
          }
          
          case 'remove': {
            if (newHighlights.length === 0) {
              console.log(chalk.yellow('No highlights to remove.'));
              break;
            }
            const { toRemove } = await inquirer.prompt([
              {
                type: 'checkbox',
                name: 'toRemove',
                message: 'Select highlights to remove:',
                choices: newHighlights
              }
            ]);
            newHighlights = newHighlights.filter(h => !toRemove.includes(h));
            break;
          }
          
          case 'ai': {
            const spinner = ora('AI is generating highlights for your experience...').start();
            try {
              // Use the polish method to regenerate highlights
              const enhanced = await this.experienceManager.polish(expId, exp.rawDescription || exp.description || '');
              if (enhanced && enhanced.highlights) {
                spinner.succeed('AI generated new highlights!');
                console.log(chalk.cyan('\n📝 Generated Highlights:\n'));
                enhanced.highlights.forEach((h: string, idx: number) => {
                  console.log(`  ${idx + 1}. ${h}`);
                });
                console.log();
                
                const { accept } = await inquirer.prompt([
                  {
                    type: 'confirm',
                    name: 'accept',
                    message: 'Use these highlights?',
                    default: true
                  }
                ]);
                
                if (accept) {
                  newHighlights = enhanced.highlights;
                }
              } else {
                spinner.fail('Failed to generate highlights');
              }
            } catch (error) {
              spinner.fail('AI generation failed');
              console.log(chalk.yellow('\nFailed to generate highlights with AI.\n'));
            }
            break;
          }
        }
        
        updated = { highlights: newHighlights };
        break;
      }
      
      case 'technologies': {
        const { techAction } = await inquirer.prompt([
          {
            type: 'list',
            name: 'techAction',
            message: 'How would you like to edit technologies?',
            choices: [
              { name: '🔄 Replace all', value: 'replace' },
              { name: '➕ Add technologies', value: 'add' },
              { name: '➖ Remove technologies', value: 'remove' },
              new inquirer.Separator('──────────────'),
              { name: '← Back', value: 'back' }
            ]
          }
        ]);
        
        if (techAction === 'back') break;
        
        let newTech = [...(exp.technologies || [])];
        
        switch (techAction) {
          case 'replace': {
            const { technologies } = await inquirer.prompt([
              {
                type: 'input',
                name: 'technologies',
                message: 'Enter all technologies (comma-separated):',
                default: newTech.join(', ')
              }
            ]);
            newTech = technologies.split(',').map((s: string) => s.trim()).filter((s: string) => s);
            break;
          }
          
          case 'add': {
            const { additional } = await inquirer.prompt([
              {
                type: 'input',
                name: 'additional',
                message: 'Add technologies (comma-separated):'
              }
            ]);
            const addedTech = additional.split(',').map((s: string) => s.trim()).filter((s: string) => s);
            newTech = [...new Set([...newTech, ...addedTech])];
            break;
          }
          
          case 'remove': {
            if (newTech.length === 0) {
              console.log(chalk.yellow('No technologies to remove.'));
              break;
            }
            const { toRemove } = await inquirer.prompt([
              {
                type: 'checkbox',
                name: 'toRemove',
                message: 'Select technologies to remove:',
                choices: newTech
              }
            ]);
            newTech = newTech.filter(t => !toRemove.includes(t));
            break;
          }
        }
        
        updated = { technologies: newTech };
        break;
      }
      
      case 'all': {
        const allFields = await inquirer.prompt([
          {
            type: 'input',
            name: 'company',
            message: 'Company:',
            default: exp.company
          },
          {
            type: 'input',
            name: 'title',
            message: 'Job title:',
            default: exp.title
          },
          {
            type: 'input',
            name: 'startDate',
            message: 'Start date (YYYY-MM):',
            default: exp.startDate
          },
          {
            type: 'confirm',
            name: 'current',
            message: 'Current position?',
            default: exp.current
          },
          {
            type: 'input',
            name: 'endDate',
            message: 'End date (YYYY-MM):',
            when: (answers: any) => !answers.current,
            default: exp.endDate
          },
          {
            type: 'input',
            name: 'description',
            message: 'Description:',
            default: exp.description || exp.rawDescription || ''
          },
          {
            type: 'input',
            name: 'highlights',
            message: 'Highlights (semicolon-separated):',
            default: exp.highlights?.join('; ') || ''
          },
          {
            type: 'input',
            name: 'technologies',
            message: 'Technologies (comma-separated):',
            default: exp.technologies?.join(', '),
            filter: (input: string) => input.split(',').map(s => s.trim()).filter(s => s)
          }
        ]);
        
        updated = {
          ...allFields,
          highlights: allFields.highlights.split(';').map((s: string) => s.trim()).filter((s: string) => s)
        };
        break;
      }
    }
    
    // Only update if we have changes
    if (updated !== null && updated !== undefined) {
      await this.experienceManager.update(expId, updated);
      console.log(chalk.green('\n✓ Work experience updated!\n'));
    } else {
      console.log(chalk.yellow('\n⚠️  No changes made.\n'));
    }
    }  // End of while loop
  }
  
  private async editProjects(): Promise<void> {
    while (true) {
      // Load projects using ProjectManager
      await this.projectManager.load();
      const projects = await this.projectManager.getAll();
      
      if (projects.length === 0) {
        console.log(chalk.yellow('\n⚠️  No projects found. Add some first!\n'));
        return;
      }
      
      const choices = projects.map(proj => ({
        name: `${proj.name} - ${proj.role}`,
        value: proj.id
      }));
      choices.push(new inquirer.Separator() as any);
      choices.push({ name: '← Back', value: 'back' });
      
      const { projId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'projId',
          message: 'Select project:',
          choices
        }
      ]);
      
      if (projId === 'back') return;
    
    const proj = await this.projectManager.get(projId);
    if (!proj) return;
    
    // Ask what to do with this project
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: `What would you like to do with "${proj.name}"?`,
        choices: [
          { name: '✏️  Edit', value: 'edit' },
          { name: '🗑️  Delete', value: 'delete' },
          { name: '← Back', value: 'back' }
        ]
      }
    ]);
    
    if (action === 'back') continue;  // Continue the loop to show project list again
    
    if (action === 'delete') {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete project "${proj.name}"?`,
          default: false
        }
      ]);
      
      if (confirm) {
        await this.projectManager.delete(projId);
        console.log(chalk.green('\n✓ Project deleted!\n'));
      }
      continue;  // Continue the loop instead of returning
    }
    
    // Edit the project - now with more options
    console.log(chalk.cyan.bold('\n✏️  Edit Project\n'));
    
    // Show current project details
    console.log(chalk.yellow('Current Project Details:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.cyan('Name:')} ${proj.name}`);
    console.log(`${chalk.cyan('Role:')} ${proj.role}`);
    console.log(`${chalk.cyan('Description:')} ${proj.description}`);
    if (proj.highlights && proj.highlights.length > 0) {
      console.log(chalk.cyan('Highlights:'));
      proj.highlights.forEach((h: string, idx: number) => {
        console.log(`  ${idx + 1}. ${h}`);
      });
    }
    console.log(`${chalk.cyan('Technologies:')} ${proj.technologies?.join(', ') || 'None'}`);
    if (proj.polished) {
      console.log(chalk.green('✨ This project has been enhanced by AI'));
    }
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    
    // Ask what to edit
    const { editChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'editChoice',
        message: 'What would you like to edit?',
        choices: [
          { name: '📝 Basic Information (Name, Role)', value: 'basic' },
          { name: '📄 Description', value: 'description' },
          { name: '✨ Highlights/Achievements', value: 'highlights' },
          { name: '🛠️ Technologies', value: 'technologies' },
          { name: '🔄 Edit All Fields', value: 'all' },
          new inquirer.Separator(),
          { name: '← Back', value: 'back' }
        ]
      }
    ]);
    
    if (editChoice === 'back') return;
    
    let updated: any = {};
    
    switch (editChoice) {
      case 'basic': {
        const basicInfo = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Project name:',
            default: proj.name
          },
          {
            type: 'input',
            name: 'role',
            message: 'Your role:',
            default: proj.role
          }
        ]);
        updated = { ...basicInfo };
        break;
      }
      
      case 'description': {
        console.log(chalk.gray('\nCurrent description:'));
        console.log(chalk.white(proj.description));
        console.log();
        
        const { description } = await inquirer.prompt([
          {
            type: 'input',
            name: 'description',
            message: 'Edit description:',
            default: proj.description
          }
        ]);
        updated = { description };
        break;
      }
      
      case 'highlights': {
        // Show current highlights if they exist
        if (proj.highlights && proj.highlights.length > 0) {
          console.log(chalk.cyan('\nCurrent highlights:'));
          proj.highlights.forEach((h: string, idx: number) => {
            console.log(`  ${idx + 1}. ${h}`);
          });
          console.log();
        } else {
          console.log(chalk.yellow('\nNo highlights currently. Add some!\n'));
        }
        
        const { highlightAction } = await inquirer.prompt([
          {
            type: 'list',
            name: 'highlightAction',
            message: 'How would you like to edit highlights?',
            choices: [
              { name: '✏️  Edit individual highlights', value: 'individual' },
              { name: '🔄 Replace all highlights', value: 'replace' },
              { name: '➕ Add new highlights', value: 'add' },
              { name: '➖ Remove highlights', value: 'remove' },
              { name: '🤖 Regenerate with AI', value: 'ai' },
              new inquirer.Separator('──────────────'),
              { name: '← Back', value: 'back' }
            ]
          }
        ]);
        
        if (highlightAction === 'back') {
          // Don't update anything, just break
          updated = null;
          break;
        }
        
        let newHighlights = [...(proj.highlights || [])];
        
        switch (highlightAction) {
          case 'individual': {
            if (newHighlights.length === 0) {
              console.log(chalk.yellow('No highlights to edit individually. Please add some first.'));
              updated = null;  // Don't update anything
              break;
            }
            console.log(chalk.cyan('\nEdit each highlight (press Enter to keep current value):\n'));
            for (let i = 0; i < newHighlights.length; i++) {
              const { edited } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'edited',
                  message: `Edit highlight ${i + 1}:`,
                  default: newHighlights[i]
                }
              ]);
              // Only update if not empty
              if (edited && edited.trim()) {
                newHighlights[i] = edited.trim();
              }
            }
            break;
          }
          
          case 'replace': {
            const { highlights } = await inquirer.prompt([
              {
                type: 'input',
                name: 'highlights',
                message: 'Enter all highlights (semicolon-separated):',
                default: newHighlights.join('; ')
              }
            ]);
            newHighlights = highlights.split(';').map((s: string) => s.trim()).filter((s: string) => s);
            break;
          }
          
          case 'add': {
            const { additional } = await inquirer.prompt([
              {
                type: 'input',
                name: 'additional',
                message: 'Add highlights (comma-separated):'
              }
            ]);
            const addedHighlights = additional.split(',').map((s: string) => s.trim()).filter((s: string) => s);
            newHighlights = [...newHighlights, ...addedHighlights];
            break;
          }
          
          case 'remove': {
            if (newHighlights.length === 0) {
              console.log(chalk.yellow('No highlights to remove.'));
              break;
            }
            const { toRemove } = await inquirer.prompt([
              {
                type: 'checkbox',
                name: 'toRemove',
                message: 'Select highlights to remove:',
                choices: newHighlights
              }
            ]);
            newHighlights = newHighlights.filter(h => !toRemove.includes(h));
            break;
          }
          
          case 'ai': {
            const spinner = ora('AI is analyzing your project to generate highlights...').start();
            try {
              // Use polish to regenerate highlights
              const enhanced = await this.projectManager.polish(projId, proj.description || '');
              
              if (enhanced && enhanced.highlights && enhanced.highlights.length > 0) {
                spinner.succeed('AI generated new highlights!');
                console.log(chalk.cyan('\n📝 Generated Highlights:\n'));
                enhanced.highlights.forEach((h: string, idx: number) => {
                  console.log(`  ${idx + 1}. ${h}`);
                });
                console.log();
                
                const { accept } = await inquirer.prompt([
                  {
                    type: 'confirm',
                    name: 'accept',
                    message: 'Use these highlights?',
                    default: true
                  }
                ]);
                
                if (accept) {
                  newHighlights = enhanced.highlights;
                }
              } else {
                spinner.fail('Failed to generate highlights');
              }
            } catch (error) {
              spinner.fail('AI generation failed');
              console.log(chalk.yellow('\nFailed to generate highlights with AI.\n'));
            }
            break;
          }
        }
        
        // Only update if we actually made changes or explicitly requested to update
        if (updated === null) {
          // Skip update - user cancelled or no changes made
        } else {
          updated = { highlights: newHighlights };
        }
        break;
      }
      
      case 'technologies': {
        // Show current technologies if they exist
        if (proj.technologies && proj.technologies.length > 0) {
          console.log(chalk.cyan('\nCurrent technologies:'));
          console.log(proj.technologies.join(', '));
          console.log();
        } else {
          console.log(chalk.yellow('\nNo technologies currently. Add some!\n'));
        }
        
        const { techAction } = await inquirer.prompt([
          {
            type: 'list',
            name: 'techAction',
            message: 'How would you like to edit technologies?',
            choices: [
              { name: '🔄 Replace all', value: 'replace' },
              { name: '➕ Add technologies', value: 'add' },
              { name: '➖ Remove technologies', value: 'remove' },
              new inquirer.Separator('──────────────'),
              { name: '← Back', value: 'back' }
            ]
          }
        ]);
        
        if (techAction === 'back') break;
        
        let newTech = [...(proj.technologies || [])];
        
        switch (techAction) {
          case 'replace': {
            const { technologies } = await inquirer.prompt([
              {
                type: 'input',
                name: 'technologies',
                message: 'Enter all technologies (comma-separated):',
                default: newTech.join(', ')
              }
            ]);
            newTech = technologies.split(',').map((s: string) => s.trim()).filter((s: string) => s);
            break;
          }
          
          case 'add': {
            const { additional } = await inquirer.prompt([
              {
                type: 'input',
                name: 'additional',
                message: 'Add technologies (comma-separated):'
              }
            ]);
            const addedTech = additional.split(',').map((s: string) => s.trim()).filter((s: string) => s);
            newTech = [...new Set([...newTech, ...addedTech])];
            break;
          }
          
          case 'remove': {
            if (newTech.length === 0) {
              console.log(chalk.yellow('No technologies to remove.'));
              break;
            }
            const { toRemove } = await inquirer.prompt([
              {
                type: 'checkbox',
                name: 'toRemove',
                message: 'Select technologies to remove:',
                choices: newTech
              }
            ]);
            newTech = newTech.filter(t => !toRemove.includes(t));
            break;
          }
        }
        
        updated = { technologies: newTech };
        break;
      }
      
      case 'all': {
        const allFields = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Project name:',
            default: proj.name
          },
          {
            type: 'input',
            name: 'role',
            message: 'Your role:',
            default: proj.role
          },
          {
            type: 'input',
            name: 'description',
            message: 'Description:',
            default: proj.description
          },
          {
            type: 'input',
            name: 'highlights',
            message: 'Highlights (semicolon-separated):',
            default: proj.highlights?.join('; ') || ''
          },
          {
            type: 'input',
            name: 'technologies',
            message: 'Technologies (comma-separated):',
            default: proj.technologies?.join(', '),
            filter: (input: string) => input.split(',').map(s => s.trim()).filter(s => s)
          }
        ]);
        
        updated = {
          ...allFields,
          highlights: allFields.highlights.split(';').map((s: string) => s.trim()).filter((s: string) => s)
        };
        break;
      }
    }
    
    // Only update if we have changes
    if (updated !== null && updated !== undefined) {
      await this.projectManager.update(projId, updated);
      console.log(chalk.green('\n✓ Project updated!\n'));
    } else {
      console.log(chalk.yellow('\n⚠️  No changes made.\n'));
    }
    }  // End of while loop
  }
  
  private async editSkills(): Promise<void> {
    const profile: any = await this.configManager.get('profile') || {};
    const currentSkills = profile.skills || [];
    
    if (currentSkills.length === 0) {
      console.log(chalk.yellow('\n⚠️  No skills found. Add some first!\n'));
      return;
    }
    
    console.log(chalk.cyan.bold('\n✏️  Edit Skills\n'));
    console.log(chalk.gray('Current skills:'));
    console.log(currentSkills.join(', '));
    console.log();
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '➕ Add more skills', value: 'add' },
          { name: '🔄 Replace all skills', value: 'replace' },
          { name: '➖ Remove specific skills', value: 'remove' },
          { name: '← Back', value: 'back' }
        ]
      }
    ]);
    
    if (action === 'back') return;
    
    if (action === 'add') {
      const { newSkills } = await inquirer.prompt([
        {
          type: 'input',
          name: 'newSkills',
          message: 'Add skills (comma-separated):',
          filter: (input: string) => input.split(',').map(s => s.trim()).filter(s => s)
        }
      ]);
      profile.skills = [...new Set([...currentSkills, ...newSkills])];
    } else if (action === 'replace') {
      const { newSkills } = await inquirer.prompt([
        {
          type: 'input',
          name: 'newSkills',
          message: 'Enter all skills (comma-separated):',
          default: currentSkills.join(', '),
          filter: (input: string) => input.split(',').map(s => s.trim()).filter(s => s)
        }
      ]);
      profile.skills = newSkills;
    } else if (action === 'remove') {
      const { toRemove } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'toRemove',
          message: 'Select skills to remove:',
          choices: currentSkills
        }
      ]);
      profile.skills = currentSkills.filter((s: string) => !toRemove.includes(s));
    }
    
    await this.configManager.set('profile', profile);
    console.log(chalk.green('\n✓ Skills updated!\n'));
  }
  
  private async editEducation(): Promise<void> {
    const profile: any = await this.configManager.get('profile') || {};
    
    if (!profile.education) {
      console.log(chalk.yellow('\n⚠️  No education information found. Add it first!\n'));
      return;
    }
    
    console.log(chalk.cyan.bold('\n✏️  Edit Education\n'));
    
    // Ask what to do with education
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '✏️  Edit', value: 'edit' },
          { name: '🗑️  Delete', value: 'delete' },
          { name: '← Back', value: 'back' }
        ]
      }
    ]);
    
    if (action === 'back') return;
    
    if (action === 'delete') {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to delete your education information?',
          default: false
        }
      ]);
      
      if (confirm) {
        delete profile.education;
        await this.configManager.set('profile', profile);
        console.log(chalk.green('\n✓ Education information deleted!\n'));
      }
      return;
    }
    
    console.log(chalk.gray('Press Enter to keep current value\n'));
    
    const updated = await inquirer.prompt([
      {
        type: 'input',
        name: 'degree',
        message: 'Degree:',
        default: profile.education.degree
      },
      {
        type: 'input',
        name: 'field',
        message: 'Field of study:',
        default: profile.education.field
      },
      {
        type: 'input',
        name: 'institution',
        message: 'Institution:',
        default: profile.education.institution
      },
      {
        type: 'input',
        name: 'startYear',
        message: 'Start year:',
        default: profile.education.startYear || profile.education.startDate
      },
      {
        type: 'input',
        name: 'endYear',
        message: 'Graduation year:',
        default: profile.education.endYear || profile.education.endDate || profile.education.graduationYear
      },
      {
        type: 'input',
        name: 'gpa',
        message: 'GPA (optional):',
        default: profile.education.gpa
      }
    ]);
    
    // Ensure date fields are set
    profile.education = {
      ...updated,
      startDate: updated.startYear,
      endDate: updated.endYear,
      graduationYear: updated.endYear
    };
    await this.configManager.set('profile', profile);
    
    console.log(chalk.green('\n✓ Education information updated!\n'));
  }

  private async editSummary(): Promise<void> {
    const profile: any = await this.configManager.get('profile') || {};
    
    if (!profile.personalSummary) {
      console.log(chalk.yellow('\n⚠️  No summary found. Add one first!\n'));
      return;
    }
    
    console.log(chalk.cyan.bold('\n✏️  Edit Professional Summary\n'));
    console.log(chalk.gray('Current summary:'));
    console.log(chalk.white(profile.personalSummary));
    console.log();
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '✏️  Edit manually', value: 'edit' },
          { name: '🤖 Regenerate with AI', value: 'regenerate' },
          { name: '🗑️  Delete', value: 'delete' },
          { name: '← Back', value: 'back' }
        ]
      }
    ]);
    
    if (action === 'back') return;
    
    if (action === 'delete') {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to delete your professional summary?',
          default: false
        }
      ]);
      
      if (confirm) {
        delete profile.personalSummary;
        await this.configManager.set('profile', profile);
        console.log(chalk.green('\n✓ Professional summary deleted!\n'));
      }
      return;
    }
    
    if (action === 'edit') {
      const { summary } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'summary',
          message: 'Edit your professional summary:',
          default: profile.personalSummary
        }
      ]);
      
      profile.personalSummary = summary;
      await this.configManager.set('profile', profile);
      console.log(chalk.green('\n✓ Professional summary updated!\n'));
    } else if (action === 'regenerate') {
      // Regenerate with AI
      const spinner = ora('AI is generating a new summary...').start();
      
      try {
        // Load experiences and projects for context
        await this.experienceManager.load();
        await this.projectManager.load();
        const experiences = await this.experienceManager.getAll();
        const projects = await this.projectManager.getAll();
        
        // Calculate years of experience
        const yearsOfExperience = experiences.length > 0 ? 
          new Date().getFullYear() - new Date(experiences[experiences.length - 1].startDate).getFullYear() : 0;
        
        // Get language preference
        const languageName = process.env.FAJ_RESUME_LANGUAGE === 'zh' ? 'Chinese' : 'English';
        
        // Collect technologies
        const technologies = new Set<string>();
        experiences.forEach(exp => exp.technologies?.forEach(t => technologies.add(t)));
        projects.forEach(proj => proj.technologies?.forEach(t => technologies.add(t)));
        
        const prompt = `Generate a professional summary in ${languageName} for a software engineer with the following profile:

Years of Experience: ${yearsOfExperience}
Current Role: ${experiences[0]?.title || 'Software Engineer'}
Current Company: ${experiences[0]?.company || 'N/A'}
Key Technologies: ${Array.from(technologies).slice(0, 10).join(', ')}
Number of Projects: ${projects.length}
Education: ${profile?.education?.degree || 'Bachelor\'s'} in ${profile?.education?.field || 'Computer Science'}

Requirements:
1. 2-3 sentence professional summary
2. Highlight technical expertise and key achievements
3. Include career objectives
4. Professional and engaging

IMPORTANT: Generate the ENTIRE summary in ${languageName} language.`;
        
        await this.aiManager.initialize();
        const newSummary = await this.aiManager.processPrompt(prompt);
        spinner.succeed('AI generated a new summary!');
        
        console.log(chalk.cyan('\n📝 Generated Summary:\n'));
        console.log(newSummary);
        
        const { accept } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'accept',
            message: 'Use this summary?',
            default: true
          }
        ]);
        
        if (accept) {
          profile.personalSummary = newSummary;
          await this.configManager.set('profile', profile);
          console.log(chalk.green('\n✓ Professional summary updated!\n'));
        }
      } catch (error) {
        spinner.fail('AI generation failed');
        console.log(chalk.yellow('\nFailed to generate summary with AI.\n'));
      }
    }
  }

  private async exportResume(): Promise<void> {
    // Build complete resume from all sources
    const resume = await this.buildCompleteResume();
    if (!resume) {
      console.log(chalk.yellow('\n⚠️  No resume to export. Create one first!\n'));
      return;
    }
    
    const { format } = await inquirer.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Export format:',
        choices: [
          { name: '🌐 HTML (.html)', value: 'html' },
          { name: '📝 Markdown (.md)', value: 'md' },
          { name: '📋 JSON (.json)', value: 'json' },
          new inquirer.Separator() as any,
          { name: '← Cancel', value: 'cancel' }
        ]
      }
    ]);
    
    if (format === 'cancel') return;
    
    // For HTML, always use professional theme
    let themeName: string | undefined;
    
    if (format === 'html') {
      themeName = 'professional';
    }
    
    const { filename } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'Filename:',
        default: `resume.${format}`
      }
    ]);
    
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
        return this.exportResume();
      }
    } catch {
      // File doesn't exist, proceed
    }
    
    const spinner = ora(`Exporting to ${filename}...`).start();
    try {
      let content: string | Buffer;
      
      if (format === 'json') {
        content = JSON.stringify(resume, null, 2);
      } else if (format === 'html') {
        content = await this.resumeManager.export('html', themeName);
      } else {
        content = await this.resumeManager.export(format as 'md');
      }
      
      await fs.writeFile(filename, content);
      spinner.succeed(`Resume exported to ${filename}`);
      
      // Show what to do next
      console.log(chalk.gray('\n💡 Next steps:'));
      if (format === 'md') {
        console.log(chalk.gray('  • Open in any markdown editor'));
        console.log(chalk.gray('  • Convert to PDF using pandoc'));
        console.log(chalk.gray('  • Share on GitHub'));
      } else if (format === 'html') {
        console.log(chalk.gray('  • Open in web browser'));
        console.log(chalk.gray('  • Print to PDF'));
        console.log(chalk.gray('  • Host online'));
      } else if (format === 'pdf') {
        console.log(chalk.gray('  • Open with any PDF viewer'));
        console.log(chalk.gray('  • Print directly'));
        console.log(chalk.gray('  • Send via email'));
      }
      console.log();
    } catch (error: any) {
      spinner.fail(`Export failed: ${error.message}`);
    }
  }

  private async configureSettings(): Promise<void> {
    MenuHelper.pushMenu('Main Menu');
    MenuHelper.showBreadcrumb();
    MenuHelper.showNavigationHints(false);
    
    const { setting } = await inquirer.prompt([
      {
        type: 'list',
        name: 'setting',
        message: 'Settings:',
        choices: [
          menuItem('🤖', 'AI Configuration', 'ai'),
          menuItem('👤', 'Personal Information', 'profile'),
          menuItem('🌐', 'Language Preferences', 'language'),
          menuItem('🎨', 'Resume Format', 'format'),
          menuItem('🔐', 'Privacy & Security', 'privacy'),
          menuSeparator(),
          menuItem('←', 'Back to Main Menu', 'back')
        ],
        loop: false,
        pageSize: 10
      }
    ]);
    
    if (setting === 'back') {
      MenuHelper.popMenu();
      return;
    }
    
    switch (setting) {
      case 'ai':
        await this.configureAI();
        break;
      case 'profile':
        await this.configureProfile();
        break;
      case 'language':
        await this.configureLanguages();
        break;
      case 'format':
        console.log(chalk.yellow('\nFormat settings - Coming soon!\n'));
        break;
      case 'privacy':
        console.log(chalk.yellow('\nPrivacy settings - Coming soon!\n'));
        break;
    }
  }

  private async configureAI(): Promise<void> {
    const currentAI = await this.configManager.get('ai');
    
    // Get all configured API keys
    const configuredProviders: string[] = [];
    if (currentAI?.apiKeys) {
      configuredProviders.push(...Object.keys(currentAI.apiKeys));
    }
    
    if (configuredProviders.length > 0) {
      console.log(chalk.cyan('\n📦 Configured AI Providers:'));
      configuredProviders.forEach(p => {
        const isActive = currentAI?.provider === p;
        console.log(chalk.gray(`  ${isActive ? '✓' : '○'} ${p}${isActive ? ' (active)' : ''}`));
      });
      console.log();
    }
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'AI Configuration:',
        choices: [
          { name: '➕ Add/Configure AI Provider', value: 'add' },
          { name: '🔄 Switch Active Provider', value: 'switch' },
          { name: '🔑 Update API Keys', value: 'keys' },
          { name: '🎯 Configure Models', value: 'models' },
          { name: '❌ Remove Provider', value: 'remove' },
          { name: '← Back', value: 'back' }
        ]
      }
    ]);
    
    if (action === 'back') return;
    
    if (action === 'add') {
      const { providers } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'providers',
          message: 'Select AI providers to configure:',
          choices: [
            { name: '✨ Google Gemini (gemini-2.5-pro)', value: 'gemini', checked: false },
            { name: '🧠 OpenAI (gpt-5)', value: 'openai', checked: false },
            { name: '🚀 DeepSeek (deepseek-reasoner)', value: 'deepseek', checked: false }
          ],
          validate: input => input.length > 0 || 'Please select at least one provider'
        }
      ]);
      
      // Configure each selected provider
      for (const provider of providers) {
        console.log(chalk.cyan(`\nConfiguring ${provider}...`));
        
        const { apiKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: `Enter your ${provider} API key:`,
            mask: '*',
            validate: input => input.length > 0 || 'API key is required'
          }
        ]);
        
        // Save API key
        await this.configManager.setAIApiKey(provider, apiKey);
        console.log(chalk.green(`✓ ${provider} configured`));
      }
      
      // Ask which one to set as active
      if (providers.length > 0) {
        const { activeProvider } = await inquirer.prompt([
          {
            type: 'list',
            name: 'activeProvider',
            message: 'Which provider should be active?',
            choices: providers.map((p: string) => ({
              name: p === 'gemini' ? 'Gemini (gemini-2.5-pro)' : 
                    p === 'openai' ? 'OpenAI (gpt-5)' : 
                    'DeepSeek (deepseek-reasoner)',
              value: p
            }))
          }
        ]);
        
        // Set active provider with default models for each provider
        const defaultModels: { [key: string]: string } = {
          'gemini': 'gemini-2.5-pro',
          'openai': 'gpt-5',
          'deepseek': 'deepseek-reasoner'
        };
        
        await this.configManager.set('ai', {
          ...currentAI,
          provider: activeProvider,
          models: defaultModels  // Store all default models
        });
        
        console.log(chalk.green(`\n✓ All providers configured! ${activeProvider} is now active.\n`));
      }
    } else if (action === 'switch') {
      if (configuredProviders.length === 0) {
        console.log(chalk.yellow('\n⚠️  No providers configured yet. Please add providers first.\n'));
        return;
      }
      
      const { newProvider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'newProvider',
          message: 'Select active provider:',
          choices: configuredProviders.map(p => ({
            name: p === 'gemini' ? 'Gemini (gemini-2.5-pro)' : 
                  p === 'openai' ? 'OpenAI (gpt-5)' : 
                  p === 'deepseek' ? 'DeepSeek (deepseek-reasoner)' :
                  p,
            value: p
          }))
        }
      ]);
      
      const defaultModels: { [key: string]: string } = {
        'gemini': 'gemini-2.5-pro',
        'openai': 'gpt-5',
        'deepseek': 'deepseek-reasoner'
      };
      
      await this.configManager.set('ai', {
        ...currentAI,
        provider: newProvider,
        models: currentAI?.models || defaultModels  // Keep existing models or use defaults
      });
      
      console.log(chalk.green(`\n✓ Switched to ${newProvider}\n`));
    } else if (action === 'keys') {
      if (configuredProviders.length === 0) {
        console.log(chalk.yellow('\n⚠️  No providers configured yet. Please add providers first.\n'));
        return;
      }
      
      const { provider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Update API key for:',
          choices: configuredProviders
        }
      ]);
      
      const { apiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: `Enter new API key for ${provider}:`,
          mask: '*',
          validate: input => input.length > 0 || 'API key is required'
        }
      ]);
      
      await this.configManager.setAIApiKey(provider, apiKey);
      console.log(chalk.green(`\n✓ API key updated for ${provider}!\n`));
    } else if (action === 'models') {
      if (!currentAI?.provider) {
        console.log(chalk.yellow('\n⚠️  No active provider. Please configure a provider first.\n'));
        return;
      }
      
      const modelChoices: { [key: string]: Array<{name: string, value: string}> } = {
        'gemini': [
          { name: 'Gemini 2.5 Pro (Default)', value: 'gemini-2.5-pro' },
          { name: 'Gemini 2.0 Flash Experimental', value: 'gemini-2.0-flash-exp' },
          { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
          { name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
        ],
        'openai': [
          { name: 'GPT-5 (Default)', value: 'gpt-5' },
          { name: 'GPT-4o', value: 'gpt-4o' },
          { name: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
          { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
        ],
        'deepseek': [
          { name: 'DeepSeek Reasoner (Default)', value: 'deepseek-reasoner' },
          { name: 'DeepSeek Chat', value: 'deepseek-chat' },
          { name: 'DeepSeek Coder', value: 'deepseek-coder' }
        ]
      };
      
      const choices = modelChoices[currentAI.provider] || [];
      
      if (choices.length === 0) {
        console.log(chalk.yellow(`\n⚠️  No model options available for ${currentAI.provider}\n`));
        return;
      }
      
      const currentModel = currentAI.models?.[currentAI.provider] || 
                          (currentAI.provider === 'gemini' ? 'gemini-2.5-pro' :
                           currentAI.provider === 'openai' ? 'gpt-5' :
                           currentAI.provider === 'deepseek' ? 'deepseek-reasoner' : '');
      
      const { model } = await inquirer.prompt([
        {
          type: 'list',
          name: 'model',
          message: `Select model for ${currentAI.provider}:`,
          choices,
          default: currentModel
        }
      ]);
      
      // Update models configuration
      const updatedModels = {
        ...currentAI.models,
        [currentAI.provider]: model
      };
      
      await this.configManager.set('ai', {
        ...currentAI,
        models: updatedModels
      });
      
      console.log(chalk.green(`\n✓ Model for ${currentAI.provider} updated to ${model}\n`));
    } else if (action === 'remove') {
      if (configuredProviders.length === 0) {
        console.log(chalk.yellow('\n⚠️  No providers to remove.\n'));
        return;
      }
      
      const { toRemove } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'toRemove',
          message: 'Select providers to remove:',
          choices: configuredProviders
        }
      ]);
      
      if (toRemove.length > 0) {
        const newApiKeys = { ...currentAI?.apiKeys };
        toRemove.forEach((p: string) => delete newApiKeys[p]);
        
        // If we're removing the active provider, clear it
        let newProvider = currentAI?.provider;
        if (toRemove.includes(currentAI?.provider || '')) {
          const remaining = Object.keys(newApiKeys);
          newProvider = remaining.length > 0 ? remaining[0] as AIProvider : undefined;
        }
        
        await this.configManager.set('ai', newProvider ? {
          ...currentAI,
          provider: newProvider,
          apiKeys: newApiKeys
        } : undefined);
        
        console.log(chalk.green(`\n✓ Removed ${toRemove.join(', ')}\n`));
      }
    }
  }

  private async configureLanguages(): Promise<void> {
    const profile: any = await this.configManager.get('profile') || {};
    const currentLanguages = profile.languages || ['English'];
    
    console.log(chalk.cyan.bold('\n🌐 Language Preferences\n'));
    console.log(chalk.gray('Configure languages for your resume and AI-generated content.\n'));
    console.log(chalk.yellow('Current languages:'), currentLanguages.join(', '));
    console.log();
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔄 Change primary language', value: 'primary' },
          { name: '➕ Add additional languages', value: 'add' },
          { name: '➖ Remove languages', value: 'remove' },
          { name: '📝 Set all languages', value: 'setall' },
          new inquirer.Separator(),
          { name: '← Back', value: 'back' }
        ]
      }
    ]);
    
    if (action === 'back') return;
    
    let newLanguages = [...currentLanguages];
    
    switch (action) {
      case 'primary': {
        const { primaryLang } = await inquirer.prompt([
          {
            type: 'list',
            name: 'primaryLang',
            message: 'Select your primary language (for AI-generated content):',
            choices: [
              { name: 'English', value: 'English' },
              { name: 'Chinese (中文)', value: 'Chinese' },
              { name: 'Spanish (Español)', value: 'Spanish' },
              { name: 'French (Français)', value: 'French' },
              { name: 'German (Deutsch)', value: 'German' },
              { name: 'Japanese (日本語)', value: 'Japanese' },
              { name: 'Korean (한국어)', value: 'Korean' },
              { name: 'Portuguese', value: 'Portuguese' },
              { name: 'Russian', value: 'Russian' },
              { name: 'Italian', value: 'Italian' }
            ],
            default: currentLanguages[0]
          }
        ]);
        
        // Remove if it exists and add to front
        newLanguages = newLanguages.filter(l => l !== primaryLang);
        newLanguages.unshift(primaryLang);
        break;
      }
      
      case 'add': {
        const availableLanguages = [
          'English', 'Chinese', 'Spanish', 'French', 'German', 
          'Japanese', 'Korean', 'Portuguese', 'Russian', 'Italian',
          'Dutch', 'Arabic', 'Hindi', 'Polish', 'Swedish'
        ].filter(lang => !currentLanguages.includes(lang));
        
        if (availableLanguages.length === 0) {
          console.log(chalk.yellow('\nAll available languages are already added.\n'));
          return;
        }
        
        const { additionalLangs } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'additionalLangs',
            message: 'Select languages to add:',
            choices: availableLanguages
          }
        ]);
        
        newLanguages = [...currentLanguages, ...additionalLangs];
        break;
      }
      
      case 'remove': {
        if (currentLanguages.length <= 1) {
          console.log(chalk.yellow('\nYou must have at least one language.\n'));
          return;
        }
        
        const { toRemove } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'toRemove',
            message: 'Select languages to remove:',
            choices: currentLanguages.slice(1), // Don't allow removing primary
            validate: (input) => {
              if (input.length >= currentLanguages.length - 1) {
                return 'You must keep at least one language';
              }
              return true;
            }
          }
        ]);
        
        newLanguages = currentLanguages.filter((lang: string) => !toRemove.includes(lang));
        break;
      }
      
      case 'setall': {
        const { languages } = await inquirer.prompt([
          {
            type: 'input',
            name: 'languages',
            message: 'Enter all languages (comma-separated, first is primary):',
            default: currentLanguages.join(', '),
            filter: (input: string) => input.split(',').map(s => s.trim()).filter(s => s),
            validate: (input: string) => {
              const langs = input.split(',').map(s => s.trim()).filter(s => s);
              if (langs.length === 0) {
                return 'Please enter at least one language';
              }
              return true;
            }
          }
        ]);
        
        newLanguages = languages;
        break;
      }
    }
    
    // Update profile with new languages
    profile.languages = newLanguages;
    await this.configManager.set('profile', profile);
    
    console.log(chalk.green('\n✓ Language preferences updated!\n'));
    console.log(chalk.cyan('New language order:'));
    newLanguages.forEach((lang, idx) => {
      if (idx === 0) {
        console.log(chalk.green(`  • ${lang} (Primary - used for AI-generated content)`));
      } else {
        console.log(`  • ${lang}`);
      }
    });
    console.log();
  }

  private async configureProfile(): Promise<void> {
    const profile: any = await this.configManager.get('profile') || {};
    
    const updated = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Your name:',
        default: profile.name || ''
      },
      {
        type: 'input',
        name: 'email',
        message: 'Email:',
        default: profile.email || ''
      },
      {
        type: 'input',
        name: 'phone',
        message: 'Phone (optional):',
        default: profile.phone || ''
      },
      {
        type: 'input',
        name: 'location',
        message: 'Location:',
        default: profile.location || ''
      },
      {
        type: 'input',
        name: 'githubUrl',
        message: 'GitHub URL (optional):',
        default: profile.githubUrl || ''
      },
      {
        type: 'input',
        name: 'linkedinUrl',
        message: 'LinkedIn URL (optional):',
        default: profile.linkedinUrl || ''
      }
    ]);
    
    // Merge with existing profile
    const newProfile = { ...profile, ...updated, role: 'developer' };
    await this.configManager.set('profile', newProfile);
    
    console.log(chalk.green('\n✓ Profile updated!\n'));
  }

  private async syncResume(): Promise<void> {
    console.log(chalk.cyan.bold('\n🔄 Sync & Refresh\n'));
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '📥 Reload all data sources', value: 'pull' },
          { name: '📊 Refresh project analysis', value: 'refresh' },
          { name: '🔄 Sync with GitHub profile', value: 'github' },
          { name: '🧹 Clean up duplicate entries', value: 'cleanup' },
          new inquirer.Separator(),
          { name: '← Back', value: 'back' }
        ]
      }
    ]);
    
    if (action === 'back') return;
    
    switch (action) {
      case 'pull':
        await this.pullLatestChanges();
        break;
      case 'refresh':
        await this.refreshProjects();
        break;
      case 'github':
        await this.syncWithGitHub();
        break;
      case 'cleanup':
        await this.cleanupData();
        break;
    }
  }
  
  private async pullLatestChanges(): Promise<void> {
    const spinner = ora('Pulling latest changes...').start();
    try {
      // Reload all data sources
      await this.configManager.load();
      await this.experienceManager.load();
      await this.projectManager.load();
      await this.resumeManager.loadOrCreate();
      
      spinner.succeed('All data synced successfully!');
      
      // Show summary of what was loaded
      const experiences = await this.experienceManager.getAll();
      const projects = await this.projectManager.getAll();
      const profile: any = await this.configManager.get('profile');
      
      console.log(chalk.green('\n📊 Sync Summary:'));
      console.log(`  • Profile: ${profile?.name || 'Not set'}`);
      console.log(`  • Work Experiences: ${experiences.length}`);
      console.log(`  • Projects: ${projects.length}`);
      console.log();
    } catch (error: any) {
      spinner.fail(`Sync failed: ${error.message}`);
    }
  }
  private async refreshProjects(): Promise<void> {
    await this.projectManager.load();
    const projects = await this.projectManager.getAll();
    
    if (projects.length === 0) {
      console.log(chalk.yellow('\n⚠️  No projects to refresh.\n'));
      return;
    }
    
    const { projectIds } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'projectIds',
        message: 'Select projects to refresh:',
        choices: projects.map(p => ({
          name: `${p.name} ${p.githubUrl ? '(GitHub)' : '(Local)'}`,
          value: p.id,
          checked: true
        }))
      }
    ]);
    
    if (projectIds.length === 0) return;
    
    for (const id of projectIds) {
      const project = await this.projectManager.get(id);
      if (!project) continue;
      
      const spinner = ora(`Refreshing ${project.name}...`).start();
      
      try {
        if (project.githubUrl) {
          // Re-analyze GitHub project
          const analysis = await this.projectAnalyzer.analyze(project.githubUrl);
          await this.projectManager.update(id, {
            metrics: analysis.metrics,
            technologies: Object.keys(analysis.languages || {}),
            highlights: analysis.highlights || project.highlights
          });
          spinner.succeed(`Updated ${project.name}`);
        } else {
          spinner.info(`${project.name} is a local project, skipping`);
        }
      } catch (error) {
        spinner.fail(`Failed to refresh ${project.name}`);
      }
    }
    
    console.log(chalk.green('\n✓ Projects refreshed!\n'));
  }
  
  private async syncWithGitHub(): Promise<void> {
    const profile: any = await this.configManager.get('profile');
    
    if (!profile?.githubUrl) {
      console.log(chalk.yellow('\n⚠️  GitHub profile not configured.\n'));
      
      const { githubUsername } = await inquirer.prompt([
        {
          type: 'input',
          name: 'githubUsername',
          message: 'Enter your GitHub username:',
          validate: input => input.length > 0 || 'Username is required'
        }
      ]);
      
      profile.githubUrl = `https://github.com/${githubUsername}`;
      profile.githubUsername = githubUsername;
      await this.configManager.set('profile', profile);
    }
    
    const spinner = ora('Syncing with GitHub profile...').start();
    
    try {
      // Save GitHub username to profile for future use
      spinner.succeed('GitHub profile linked successfully!');
      console.log(chalk.green(`\n✓ GitHub: ${profile.githubUrl}`));
      console.log(chalk.gray('\nYou can now import GitHub projects using this profile.'));
    } catch (error) {
      spinner.fail('Failed to sync with GitHub');
    }
  }
  
  private async cleanupData(): Promise<void> {
    console.log(chalk.cyan.bold('\n🧹 Data Cleanup\n'));
    
    const { cleanupType } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'cleanupType',
        message: 'What would you like to clean up?',
        choices: [
          { name: 'Remove duplicate work experiences', value: 'exp' },
          { name: 'Remove duplicate projects', value: 'proj' },
          { name: 'Remove duplicate skills', value: 'skills' },
          { name: 'Clear unused data', value: 'unused' }
        ]
      }
    ]);
    
    if (cleanupType.length === 0) return;
    
    let cleaned = 0;
    
    if (cleanupType.includes('exp')) {
      await this.experienceManager.load();
      const experiences = await this.experienceManager.getAll();
      
      // Remove duplicates based on company + title + startDate
      const seen = new Set<string>();
      for (const exp of experiences) {
        const key = `${exp.company}-${exp.title}-${exp.startDate}`;
        if (seen.has(key)) {
          await this.experienceManager.delete(exp.id);
          cleaned++;
        } else {
          seen.add(key);
        }
      }
    }
    
    if (cleanupType.includes('proj')) {
      await this.projectManager.load();
      const projects = await this.projectManager.getAll();
      
      // Remove duplicates based on name
      const seen = new Set<string>();
      for (const proj of projects) {
        if (seen.has(proj.name)) {
          await this.projectManager.delete(proj.id);
          cleaned++;
        } else {
          seen.add(proj.name);
        }
      }
    }
    
    if (cleanupType.includes('skills')) {
      const profile: any = await this.configManager.get('profile');
      if (profile?.skills) {
        const uniqueSkills = [...new Set(profile.skills)];
        const removed = profile.skills.length - uniqueSkills.length;
        profile.skills = uniqueSkills;
        await this.configManager.set('profile', profile);
        cleaned += removed;
      }
    }
    
    console.log(chalk.green(`\n✓ Cleaned up ${cleaned} duplicate entries!\n`));
  }

  private async buildCompleteResume(): Promise<any> {
    // Get base resume
    const existingResume = await this.resumeManager.get();
    const resume: any = existingResume || {
      basicInfo: {
        name: '',
        email: ''
      },
      content: {
        summary: '',
        experience: [],
        projects: [],
        skills: [],
        education: []
      },
      metadata: {}
    };
    
    // Get profile for basic info
    const profile: any = await this.configManager.get('profile');
    if (profile) {
      resume.basicInfo = {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        birthDate: profile.birthDate,
        nationality: profile.nationality,
        languages: profile.languages,
        githubUrl: profile.githubUrl || profile.githubUsername ? `https://github.com/${profile.githubUsername}` : undefined,
        linkedinUrl: profile.linkedinUrl,
        portfolioUrl: profile.portfolioUrl
      };
      
      // Add professional summary if available
      if (profile.personalSummary) {
        resume.content.summary = profile.personalSummary;
      }
      
      // Handle education - support both old single object and new array format
      if (profile.education) {
        const eduArray = Array.isArray(profile.education) ? profile.education : [profile.education];
        resume.content.education = eduArray
          .filter((edu: any) => edu && edu.degree && edu.field && edu.institution)
          .map((edu: any) => ({
            degree: edu.degree,
            field: edu.field,
            institution: edu.institution,
            location: edu.location,
            startDate: edu.startDate || edu.startYear || '',
            endDate: edu.endDate || edu.endYear || edu.graduationYear || '',
            current: edu.current || false,
            gpa: edu.gpa,
            highlights: edu.highlights || edu.achievements || []
          }));
      }
      
      if (profile.skills) {
        resume.content.skills = profile.skills.map((skill: string) => ({
          name: skill,
          level: 'proficient',
          category: 'other'
        }));
      }
    }
    
    // Get experiences from ExperienceManager
    await this.experienceManager.load();
    const experiences = await this.experienceManager.getAll();
    if (experiences.length > 0) {
      resume.content.experience = experiences.map(exp => ({
        title: exp.title,
        company: exp.company,
        startDate: exp.startDate,
        endDate: exp.endDate,
        current: exp.current,
        description: exp.description,
        highlights: exp.highlights || [],
        technologies: exp.technologies || []
      }));
    }
    
    // Get projects from projects.json
    try {
      const projectsPath = path.join(process.env.HOME || '', '.faj', 'projects.json');
      const projectsData = await fs.readFile(projectsPath, 'utf-8');
      const { projects } = JSON.parse(projectsData);
      
      if (projects && projects.length > 0) {
        resume.content.projects = projects.map((proj: any) => ({
          name: proj.name,
          description: proj.description,
          role: proj.role,
          technologies: proj.technologies || [],
          highlights: proj.highlights || []
        }));
      }
    } catch {
      // No projects file, keep existing projects
    }
    
    return resume;
  }

  private async createResume(): Promise<void> {
    // Simplified resume creation flow
    console.log(chalk.cyan.bold('\n📝 Let\'s create your resume!\n'));
    
    // Step 1: Basic info
    console.log(chalk.yellow('Step 1: Basic Information\n'));
    await this.configureProfile();
    
    // Step 2: Work experience
    const { hasExperience } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasExperience',
        message: 'Do you have work experience to add?',
        default: true
      }
    ]);
    
    if (hasExperience) {
      await this.addWorkExperience();
      
      const { addMore } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addMore',
          message: 'Add another work experience?',
          default: false
        }
      ]);
      
      if (addMore) {
        await this.addWorkExperience();
      }
    }
    
    // Step 3: Projects
    const { hasProjects } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasProjects',
        message: 'Do you have projects to add?',
        default: true
      }
    ]);
    
    if (hasProjects) {
      await this.addProject();
    }
    
    // Step 4: Skills
    await this.addSkills();
    
    console.log(chalk.green.bold('\n✨ Resume created successfully!\n'));
    
    // Offer to export
    const { exportNow } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'exportNow',
        message: 'Would you like to export your resume now?',
        default: true
      }
    ]);
    
    if (exportNow) {
      await this.exportResume();
    }
  }
  
  private async deleteEntireResume(): Promise<void> {
    console.log(chalk.yellow.bold('\n⚠️  WARNING: Delete Entire Resume\n'));
    console.log(chalk.red('This will permanently delete all your resume data including:'));
    console.log(chalk.gray('  • Work experiences'));
    console.log(chalk.gray('  • Projects'));
    console.log(chalk.gray('  • Skills'));
    console.log(chalk.gray('  • Education'));
    console.log(chalk.gray('  • And all other resume content\n'));
    
    const { confirmFirst } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmFirst',
        message: 'Are you sure you want to delete your entire resume?',
        default: false
      }
    ]);
    
    if (!confirmFirst) {
      console.log(chalk.gray('\nDeletion cancelled.\n'));
      return;
    }
    
    const { confirmSecond } = await inquirer.prompt([
      {
        type: 'input',
        name: 'confirmSecond',
        message: 'Type "DELETE" to confirm (this cannot be undone):',
        validate: (input) => {
          if (input === 'DELETE') {
            return true;
          }
          return 'Please type DELETE to confirm';
        }
      }
    ]);
    
    if (confirmSecond !== 'DELETE') {
      console.log(chalk.gray('\nDeletion cancelled.\n'));
      return;
    }
    
    const spinner = ora('Deleting resume data...').start();
    
    try {
      // Clear all data
      // Clear all experiences
      await this.experienceManager.load();
      const allExperiences = await this.experienceManager.getAll();
      for (const exp of allExperiences) {
        await this.experienceManager.delete(exp.id);
      }
      
      // Clear all projects
      await this.projectManager.clear();
      
      // Clear profile data related to resume
      const profile: any = await this.configManager.get('profile') || {};
      delete profile.skills;
      delete profile.education;
      delete profile.personalSummary;
      delete profile.certifications;
      delete profile.awards;
      await this.configManager.set('profile', profile);
      
      // Clear resume file
      const resumePath = path.join(os.homedir(), '.faj', 'resume.json');
      try {
        await fs.unlink(resumePath);
      } catch {
        // File might not exist
      }
      
      spinner.succeed('Resume deleted successfully');
      console.log(chalk.green('\n✓ All resume data has been deleted.\n'));
      console.log(chalk.gray('You can start fresh by selecting "Add Content" from the menu.\n'));
    } catch (error) {
      spinner.fail('Failed to delete resume');
      this.logger.error('Failed to delete resume', error);
      console.log(chalk.red('\n✗ Failed to delete resume. Please try again.\n'));
    }
  }
}