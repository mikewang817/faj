import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../core/config/ConfigManager';
import { AIManager } from '../../ai/AIManager';
import { UserRole, AIProvider } from '../../models';
import { Logger } from '../../utils/Logger';
import { ExperienceManager } from '../../core/experience/ExperienceManager';
import { ProjectAnalyzer } from '../../core/analyzer/ProjectAnalyzer';
import { ResumeManager } from '../../core/resume/ResumeManager';
import path from 'path';
import fs from 'fs/promises';

export class InitCommand {
  private logger: Logger;
  private configManager: ConfigManager;
  private aiManager: AIManager;
  private experienceManager: ExperienceManager;
  private projectAnalyzer: ProjectAnalyzer;
  private resumeManager: ResumeManager;

  constructor() {
    this.logger = new Logger('InitCommand');
    this.configManager = ConfigManager.getInstance();
    this.aiManager = AIManager.getInstance();
    this.experienceManager = ExperienceManager.getInstance();
    this.projectAnalyzer = new ProjectAnalyzer();
    this.resumeManager = ResumeManager.getInstance();
  }

  register(program: Command): void {
    program
      .command('init')
      .description('Complete setup wizard to create your resume')
      .option('--quick', 'Quick mode with minimal questions')
      .option('--resume-only', 'Focus only on resume creation')
      .action(async (options) => {
        try {
          await this.execute(options);
        } catch (error) {
          this.logger.error('Initialization failed', error);
          process.exit(1);
        }
      });
  }

  private async execute(options: any = {}): Promise<void> {
    console.log(chalk.cyan.bold('\n🎯 FAJ Resume Creation Wizard\n'));
    console.log(chalk.gray('This wizard will help you create a complete professional resume.\n'));

    // Check if already initialized
    const existingConfig = await this.configManager.get('profile');
    if (existingConfig && !options.resumeOnly) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'FAJ is already initialized. Do you want to create a new resume from scratch?',
          default: false,
        },
      ]);

      if (!overwrite) {
        console.log(chalk.yellow('Use "faj resume" commands to modify existing resume.'));
        return;
      }
    }

    // Get user role
    const { role } = await inquirer.prompt<{ role: UserRole }>([
      {
        type: 'list',
        name: 'role',
        message: 'Select your role:',
        choices: [
          { name: 'Developer - Build resume from projects', value: 'developer' },
          { name: 'Recruiter - Find matching developers', value: 'recruiter' },
        ],
      },
    ]);

    // Get basic profile information
    const profileAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Your name:',
        validate: (input) => input.length > 0 || 'Name is required',
      },
      {
        type: 'input',
        name: 'email',
        message: 'Your email:',
        validate: (input) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || 'Please enter a valid email';
        },
      },
    ]);

    let profile: any = {
      id: this.generateId(),
      role,
      name: profileAnswers.name,
      email: profileAnswers.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Additional questions for developers
    if (role === 'developer') {
      const devAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'phone',
          message: 'Phone number (optional):',
        },
        {
          type: 'input',
          name: 'birthDate',
          message: 'Birth date (YYYY-MM-DD, optional):',
        },
        {
          type: 'input',
          name: 'nationality',
          message: 'Nationality (optional):',
        },
        {
          type: 'input',
          name: 'languages',
          message: 'Languages you speak (comma-separated, e.g., Chinese,English):',
          default: 'Chinese,English',
        },
        {
          type: 'input',
          name: 'githubUsername',
          message: 'GitHub username (optional):',
        },
        {
          type: 'input',
          name: 'linkedinUrl',
          message: 'LinkedIn URL (optional):',
        },
        {
          type: 'input',
          name: 'experience',
          message: 'Years of experience:',
          default: '0',
          validate: (input) => !isNaN(Number(input)) || 'Please enter a valid number',
        },
        {
          type: 'input',
          name: 'location',
          message: 'Location (city, country):',
          default: 'Beijing, China',
        },
      ]);

      // Education information
      console.log(chalk.cyan('\n📚 Education Information:\n'));
      const eduAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'degree',
          message: 'Degree (e.g., Bachelor of Science):',
          default: 'Bachelor of Science',
        },
        {
          type: 'input',
          name: 'field',
          message: 'Field of study:',
          default: 'Computer Science',
        },
        {
          type: 'input',
          name: 'institution',
          message: 'University/Institution:',
          validate: (input) => input.length > 0 || 'Institution is required',
        },
        {
          type: 'input',
          name: 'graduationYear',
          message: 'Graduation year:',
          default: '2020',
        },
        {
          type: 'input',
          name: 'gpa',
          message: 'GPA (optional, e.g., 3.8/4.0):',
        },
      ]);

      // Career objective and personal summary
      console.log(chalk.cyan('\n💼 Career Information:\n'));
      const careerAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'careerObjective',
          message: 'Career objective (1-2 sentences):',
          default: 'Seeking challenging opportunities to apply my technical skills in building innovative solutions.',
        },
        {
          type: 'input',
          name: 'personalSummary',
          message: 'Brief personal introduction (optional):',
        },
      ]);

      profile = {
        ...profile,
        phone: devAnswers.phone || undefined,
        birthDate: devAnswers.birthDate || undefined,
        nationality: devAnswers.nationality || undefined,
        languages: devAnswers.languages ? devAnswers.languages.split(',').map((l: string) => l.trim()) : [],
        githubUsername: devAnswers.githubUsername || undefined,
        linkedinUrl: devAnswers.linkedinUrl || undefined,
        experience: Number(devAnswers.experience),
        location: devAnswers.location || undefined,
        education: {
          degree: eduAnswers.degree,
          field: eduAnswers.field,
          institution: eduAnswers.institution,
          graduationYear: eduAnswers.graduationYear,
          gpa: eduAnswers.gpa || undefined,
        },
        careerObjective: careerAnswers.careerObjective || undefined,
        personalSummary: careerAnswers.personalSummary || undefined,
        skills: [],
      };
    }

    // Additional questions for recruiters
    if (role === 'recruiter') {
      const recAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'company',
          message: 'Company name:',
          validate: (input) => input.length > 0 || 'Company name is required',
        },
        {
          type: 'input',
          name: 'position',
          message: 'Your position (optional):',
        },
        {
          type: 'input',
          name: 'companyUrl',
          message: 'Company website (optional):',
        },
      ]);

      profile = {
        ...profile,
        company: recAnswers.company,
        position: recAnswers.position || undefined,
        companyUrl: recAnswers.companyUrl || undefined,
      };
    }

    // AI Provider configuration
    const { configureAI } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'configureAI',
        message: 'Would you like to configure an AI provider now?',
        default: true,
      },
    ]);

    let aiConfig;
    if (configureAI) {
      aiConfig = await this.configureAIProvider();
    }

    // Save configuration
    const spinner = ora('Saving configuration...').start();

    try {
      await this.configManager.set('profile', profile);
      
      if (aiConfig) {
        await this.configManager.set('ai', aiConfig);
      }

      spinner.succeed('Configuration saved successfully!');
      
      spinner.succeed('Configuration saved successfully!');
      
      // For developers, continue with full resume creation
      if (role === 'developer') {
        console.log(chalk.green('\n✓ Basic profile created!\n'));
        
        // Step 2: Collect Work Experience
        console.log(chalk.yellow.bold('\nStep 2: Work Experience'));
        await this.collectWorkExperiences(options.quick, aiConfig !== null);
        
        // Step 3: Analyze Projects
        console.log(chalk.yellow.bold('\nStep 3: Project Analysis'));
        const projects = await this.analyzeProjects();
        
        // Step 4: Generate Resume
        console.log(chalk.yellow.bold('\nStep 4: Generate Resume'));
        await this.generateCompleteResume(profile, projects, aiConfig !== null);
        
        // Step 5: Export Options
        await this.exportOptions();
        
        console.log(chalk.green.bold('\n✨ Resume creation completed successfully!\n'));
        console.log(chalk.cyan('You can now use these commands:'));
        console.log('  • ' + chalk.white('faj resume show') + ' - View your resume');
        console.log('  • ' + chalk.white('faj resume export md') + ' - Export as Markdown');
        console.log('  • ' + chalk.white('faj resume export html') + ' - Export as HTML');
        console.log('  • ' + chalk.white('faj experience add') + ' - Add more work experiences');
        console.log('  • ' + chalk.white('faj analyze <path>') + ' - Analyze more projects\n');
      } else {
        console.log(chalk.green('\n✓ FAJ initialized successfully!\n'));
        console.log('Next steps:');
        console.log('  1. Post a job: ' + chalk.cyan('faj post <job.json>'));
        console.log('  2. Search developers: ' + chalk.cyan('faj search'));
        console.log('  3. Subscribe to alerts: ' + chalk.cyan('faj subscribe'));
        console.log('\nRun ' + chalk.cyan('faj help') + ' to see all available commands.');
      }
    } catch (error) {
      spinner.fail('Failed to save configuration');
      throw error;
    }
  }

  private async configureAIProvider(): Promise<any> {
    const { provider } = await inquirer.prompt<{ provider: AIProvider | 'env' | 'later' }>([
      {
        type: 'list',
        name: 'provider',
        message: 'Choose AI provider for resume generation:',
        choices: [
          { name: 'OpenAI (GPT-4)', value: 'openai' },
          { name: 'Google Gemini', value: 'gemini' },
          { name: 'Anthropic Claude', value: 'anthropic' },
          { name: 'Use environment variable', value: 'env' },
          { name: 'Configure later', value: 'later' },
        ],
      },
    ]);

    if (provider === 'later') {
      console.log(chalk.yellow('\nYou can configure AI provider later with: faj config ai'));
      return null;
    }

    if (provider === 'env') {
      console.log(chalk.yellow('\nUsing environment variables for AI configuration.'));
      console.log('Set the following environment variables:');
      console.log('  - FAJ_AI_PROVIDER=<provider>');
      console.log('  - FAJ_<PROVIDER>_API_KEY=<your-api-key>');
      return null;
    }

    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: `Enter your ${provider} API key:`,
        mask: '*',
        validate: (input) => input.length > 0 || 'API key is required',
      },
    ]);

    // Test the API key
    const spinner = ora('Testing API key...').start();
    
    try {
      // Store API key in environment for this session
      process.env[`FAJ_${provider.toUpperCase()}_API_KEY`] = apiKey;
      
      await this.aiManager.initialize();
      const isValid = await this.aiManager.testProvider(provider as AIProvider);
      
      if (isValid) {
        spinner.succeed('API key validated successfully!');
        
        const { saveKey } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'saveKey',
            message: 'Save API key for future use? (stored securely)',
            default: true,
          },
        ]);

        if (saveKey) {
          // In a real implementation, use keytar or similar
          console.log(chalk.yellow('Note: Secure storage implementation pending. Using environment variable.'));
        }

        return {
          provider: provider as AIProvider,
          model: this.getDefaultModel(provider as AIProvider),
        };
      } else {
        spinner.fail('Invalid API key');
        console.log(chalk.red('The API key appears to be invalid. Please check and try again.'));
        return this.configureAIProvider(); // Recursive retry
      }
    } catch (error) {
      spinner.fail('API key validation failed');
      console.log(chalk.red('Error: ' + (error as Error).message));
      
      const { retry } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'retry',
          message: 'Would you like to try again?',
          default: true,
        },
      ]);

      if (retry) {
        return this.configureAIProvider();
      }
      
      return null;
    }
  }

  private getDefaultModel(provider: AIProvider): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4';
      case 'gemini':
        return 'gemini-pro';
      case 'anthropic':
        return 'claude-3-opus-20240229';
      default:
        return 'default';
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private async collectWorkExperiences(quick: boolean = false, aiConfigured: boolean = false): Promise<any[]> {
    await this.experienceManager.load();
    const experiences: any[] = [];
    const polishPromises: Promise<any>[] = [];
    
    const { hasExperience } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasExperience',
        message: 'Do you have work experience to add?',
        default: true
      }
    ]);

    if (!hasExperience) {
      console.log(chalk.gray('Skipping work experience...'));
      return experiences;
    }

    let addMore = true;
    while (addMore) {
      console.log(chalk.cyan(`\nWork Experience #${experiences.length + 1}:`));
      
      // Show template example for first experience
      if (!quick && experiences.length === 0) {
        console.log(chalk.gray('\nExample description:'));
        console.log(chalk.gray('I worked as a Senior Backend Engineer at Tencent, responsible for'));
        console.log(chalk.gray('developing WeChat Pay transaction systems. Led a team of 3 engineers,'));
        console.log(chalk.gray('optimized payment gateway reducing response time by 75%.'));
        console.log(chalk.gray('Used Java, Spring Boot, MySQL, Redis, Kubernetes.\n'));
      }

      const experience = await inquirer.prompt([
        {
          type: 'input',
          name: 'company',
          message: 'Company name:',
          validate: (input: string) => input.length > 0 || 'Company name is required'
        },
        {
          type: 'input',
          name: 'title',
          message: 'Job title:',
          validate: (input: string) => input.length > 0 || 'Job title is required'
        },
        {
          type: 'input',
          name: 'startDate',
          message: 'Start date (YYYY-MM):',
          default: '2020-01',
          validate: (input: string) => {
            return /^\d{4}-\d{2}$/.test(input) || 'Please use YYYY-MM format';
          }
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
          when: (answers: any) => !answers.current,
          validate: (input: string) => {
            return /^\d{4}-\d{2}$/.test(input) || 'Please use YYYY-MM format';
          }
        },
        {
          type: 'input',
          name: 'description',
          message: 'Describe your role and achievements (one line, you can add more details later):',
          validate: (input: string) => input.length > 10 || 'Please provide a meaningful description'
        },
        {
          type: 'input',
          name: 'technologies',
          message: 'Technologies used (comma-separated):',
          filter: (input: string) => input.split(',').map(s => s.trim()).filter(s => s)
        }
      ]);

      // Extract highlights from description
      const highlights = this.extractHighlights(experience.description);
      
      // Save experience
      const savedExp = await this.experienceManager.add({
        ...experience,
        highlights,
        rawDescription: experience.description,
        polished: false
      });
      
      experiences.push(savedExp);
      console.log(chalk.green(`✓ Work experience at ${experience.company} saved`));
      
      // Start AI polish in background if AI is configured
      if (aiConfigured && !quick) {
        console.log(chalk.gray('  🤖 AI polishing in background...'));
        const polishPromise = this.experienceManager.polish(savedExp.id, experience.description)
          .then(polished => {
            if (polished) {
              // Update the experience in the array
              const index = experiences.findIndex(e => e.id === savedExp.id);
              if (index >= 0) {
                experiences[index] = polished;
              }
              return polished;
            }
            return savedExp;
          })
          .catch(error => {
            this.logger.warn('AI polish failed, using original', error);
            return savedExp;
          });
        
        polishPromises.push(polishPromise);
      }

      // Ask if want to add more
      const { more } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'more',
          message: 'Add another work experience?',
          default: false
        }
      ]);
      addMore = more;
    }
    
    // Wait for all AI polish operations to complete
    if (polishPromises.length > 0) {
      console.log(chalk.cyan('\n⏳ Waiting for AI to polish experiences...'));
      const polishedResults = await Promise.all(polishPromises);
      
      // Show polish results
      console.log(chalk.green('\n✨ AI Polish Complete!\n'));
      let hasChanges = false;
      
      for (let i = 0; i < polishedResults.length; i++) {
        const polished = polishedResults[i];
        if (polished && polished.polished) {
          hasChanges = true;
          console.log(chalk.cyan(`📝 ${polished.title} at ${polished.company}:`));
          console.log(chalk.gray('Enhanced Description:'));
          console.log(`  ${polished.description}\n`);
          
          if (polished.highlights && polished.highlights.length > 0) {
            console.log(chalk.gray('Key Achievements:'));
            polished.highlights.slice(0, 3).forEach((h: string) => {
              console.log(`  • ${h}`);
            });
            console.log();
          }
        }
      }
      
      if (hasChanges) {
        const { acceptAll } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'acceptAll',
            message: 'Accept all AI enhancements?',
            default: true
          }
        ]);
        
        if (!acceptAll) {
          // If user doesn't accept, revert to original descriptions
          for (let i = 0; i < experiences.length; i++) {
            const original = experiences[i];
            if (original.rawDescription) {
              experiences[i] = {
                ...original,
                description: original.rawDescription,
                polished: false
              };
            }
          }
          console.log(chalk.yellow('Using original descriptions'));
        } else {
          console.log(chalk.green('✓ AI enhancements applied'));
        }
      }
    }

    return experiences;
  }

  private extractHighlights(description: string): string[] {
    const highlights: string[] = [];
    
    // Extract sentences with numbers or achievement keywords
    const sentences = description.split(/[.!?]+/).filter(s => s.trim());
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      // Check for achievement indicators
      if (/\d+/.test(trimmed) || // Has numbers
          /led|managed|improved|reduced|increased|built|created|developed|implemented/i.test(trimmed)) {
        if (trimmed.length > 20 && trimmed.length < 200) { // Reasonable length
          highlights.push(trimmed);
        }
      }
    }
    
    // Return top 5 highlights
    return highlights.slice(0, 5);
  }

  private async analyzeProjects(): Promise<any[]> {
    const { analyzeProjects } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'analyzeProjects',
        message: 'Do you want to analyze your code projects?',
        default: true
      }
    ]);

    if (!analyzeProjects) {
      console.log(chalk.gray('Skipping project analysis...'));
      return [];
    }

    const projects = [];
    let addMore = true;

    while (addMore) {
      const { projectType } = await inquirer.prompt([
        {
          type: 'list',
          name: 'projectType',
          message: 'Project type:',
          choices: [
            { name: 'Local directory', value: 'local' },
            { name: 'GitHub repository', value: 'github' },
            { name: 'Skip projects', value: 'skip' }
          ]
        }
      ]);

      if (projectType === 'skip') {
        break;
      }

      if (projectType === 'local') {
        const { projectPath } = await inquirer.prompt([
          {
            type: 'input',
            name: 'projectPath',
            message: 'Enter project path:',
            default: process.cwd(),
            validate: async (input: string) => {
              try {
                const stats = await fs.stat(input);
                return stats.isDirectory() || 'Path must be a directory';
              } catch {
                return 'Path does not exist';
              }
            }
          }
        ]);

        const spinner = ora('Analyzing project...').start();
        try {
          const analysis = await this.projectAnalyzer.analyze(projectPath);
          const projectAnalysis = analysis;
          projects.push(projectAnalysis);
          spinner.succeed(`Analyzed ${path.basename(projectPath)}`);
        } catch (error: any) {
          spinner.fail(`Failed to analyze: ${error.message}`);
        }
      } else if (projectType === 'github') {
        const { githubUrl } = await inquirer.prompt([
          {
            type: 'input',
            name: 'githubUrl',
            message: 'Enter GitHub repository URL:',
            validate: (input: string) => {
              return /^https:\/\/github\.com\/[\w-]+\/[\w-]+/.test(input) || 
                     'Please enter a valid GitHub URL';
            }
          }
        ]);

        const spinner = ora('Analyzing GitHub repository...').start();
        try {
          const analysis = await this.projectAnalyzer.analyze(githubUrl);
          const projectAnalysis = analysis;
          projects.push(projectAnalysis);
          spinner.succeed(`Analyzed ${githubUrl.split('/').pop()}`);
        } catch (error: any) {
          spinner.fail(`Failed to analyze: ${error.message}`);
        }
      }

      const { more } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'more',
          message: 'Analyze another project?',
          default: false
        }
      ]);
      addMore = more;
    }

    return projects;
  }

  private async generateCompleteResume(
    profile: any,
    projects: any[],
    aiConfigured: boolean
  ): Promise<void> {
    const spinner = ora('Generating resume...').start();
    
    try {
      // Load existing resume if any
      try {
        const resumePath = path.join(process.env.HOME || '', '.faj', 'resume.json');
        await fs.access(resumePath);
      } catch {
        // Resume doesn't exist yet, that's fine
      }
      
      if (projects.length > 0 && aiConfigured) {
        // Generate with AI if projects and AI are available
        await this.aiManager.initialize();
        
        // The ResumeManager will automatically use experiences from ExperienceManager
        await this.resumeManager.generateFromProjects(projects);
        spinner.succeed('Resume generated with AI');
      } else {
        // Create basic resume without AI
        const experiences = await this.experienceManager.getAll();
        
        const resume = {
          basicInfo: {
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            location: profile.location,
            birthDate: profile.birthDate,
            nationality: profile.nationality,
            languages: profile.languages,
            githubUrl: profile.githubUsername ? `https://github.com/${profile.githubUsername}` : undefined,
            linkedinUrl: profile.linkedinUrl,
            portfolioUrl: undefined
          },
          content: {
            summary: profile.careerObjective || profile.personalSummary || 
                    'Experienced software developer seeking challenging opportunities',
            experience: experiences.map((exp: any) => ({
              title: exp.title,
              company: exp.company,
              startDate: exp.startDate,
              endDate: exp.endDate,
              current: exp.current,
              description: exp.description,
              highlights: exp.highlights || [],
              technologies: exp.technologies || []
            })),
            projects: projects.map((proj: any) => ({
              name: proj.name,
              description: proj.description || 'Software development project',
              details: [],
              techStack: Object.keys(proj.languages || {})
            })),
            skills: this.extractSkillsFromData(experiences, projects),
            education: profile.education ? [{
              degree: profile.education.degree,
              field: profile.education.field,
              institution: profile.education.institution,
              graduationYear: profile.education.graduationYear,
              gpa: profile.education.gpa
            }] : []
          },
          metadata: {
            version: 1,
            generatedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            aiProvider: aiConfigured ? (await this.configManager.get('ai'))?.provider : 'none'
          }
        };
        
        // Save resume
        const resumePath = path.join(process.env.HOME || '', '.faj', 'resume.json');
        await fs.mkdir(path.dirname(resumePath), { recursive: true });
        await fs.writeFile(resumePath, JSON.stringify(resume, null, 2));
        
        spinner.succeed('Resume created successfully');
      }
    } catch (error: any) {
      spinner.fail(`Failed to generate resume: ${error.message}`);
      throw error;
    }
  }

  private extractSkillsFromData(experiences: any[], projects: any[]): any[] {
    const skills: any[] = [];
    const skillSet = new Set<string>();
    
    // Extract from experiences
    experiences.forEach((exp: any) => {
      if (exp.technologies) {
        exp.technologies.forEach((tech: string) => {
          if (!skillSet.has(tech)) {
            skillSet.add(tech);
            skills.push({
              name: tech,
              level: 'advanced',
              category: this.categorizeSkill(tech)
            });
          }
        });
      }
    });
    
    // Extract from projects
    projects.forEach((proj: any) => {
      if (proj.languages) {
        Object.keys(proj.languages).forEach((lang: string) => {
          if (!skillSet.has(lang)) {
            skillSet.add(lang);
            skills.push({
              name: lang,
              level: 'advanced',
              category: 'language'
            });
          }
        });
      }
    });
    
    return skills;
  }

  private categorizeSkill(skill: string): string {
    const databases = ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Cassandra'];
    const frameworks = ['React', 'Vue', 'Angular', 'Spring', 'Django', 'Express'];
    const tools = ['Docker', 'Kubernetes', 'Git', 'Jenkins', 'Nginx'];
    
    if (databases.some(db => skill.toLowerCase().includes(db.toLowerCase()))) {
      return 'database';
    }
    if (frameworks.some(fw => skill.toLowerCase().includes(fw.toLowerCase()))) {
      return 'framework';
    }
    if (tools.some(tool => skill.toLowerCase().includes(tool.toLowerCase()))) {
      return 'tool';
    }
    
    return 'other';
  }

  private async exportOptions(): Promise<void> {
    const { exportNow } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'exportNow',
        message: 'Do you want to export your resume now?',
        default: true
      }
    ]);

    if (!exportNow) {
      return;
    }

    const { format } = await inquirer.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Export format:',
        choices: [
          { name: 'Markdown (.md)', value: 'md' },
          { name: 'HTML (.html)', value: 'html' },
          { name: 'Skip export', value: 'skip' }
        ]
      }
    ]);

    if (format === 'skip') {
      return;
    }

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