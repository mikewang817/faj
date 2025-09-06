import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { Logger } from '../../utils/Logger';
import { ConfigManager } from '../../core/config/ConfigManager';
import { AIManager } from '../../ai/AIManager';

export class DescribeCommand {
  private logger: Logger;
  private configManager: ConfigManager;
  private aiManager: AIManager;

  constructor() {
    this.logger = new Logger('DescribeCommand');
    this.configManager = ConfigManager.getInstance();
    this.aiManager = AIManager.getInstance();
  }

  register(program: Command): void {
    program
      .command('describe')
      .description('Describe your work experience in natural language and polish with AI')
      .option('-o, --output <file>', 'Save to file')
      .action(async (options: any) => {
        try {
          await this.execute(options);
        } catch (error) {
          this.logger.error('Failed to create description', error);
          process.exit(1);
        }
      });
  }

  private async execute(options: any): Promise<void> {
    // Check if user is configured
    const profile = await this.configManager.get('profile');
    if (!profile || profile.role !== 'developer') {
      console.log(chalk.yellow('\n⚠ Developer profile not configured.'));
      console.log('Please run ' + chalk.cyan('faj init') + ' first.');
      return;
    }

    console.log(chalk.cyan('\n📝 Describe Your Experience\n'));
    console.log(chalk.gray('Describe your work experience in your own words. The AI will help polish it.\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'company',
        message: 'Company name:',
        validate: (input) => input.length > 0 || 'Company name is required',
      },
      {
        type: 'input',
        name: 'position',
        message: 'Position/Title:',
        validate: (input) => input.length > 0 || 'Position is required',
      },
      {
        type: 'input',
        name: 'duration',
        message: 'Duration (e.g., 2020-2023, 3 years):',
        validate: (input) => input.length > 0 || 'Duration is required',
      },
      {
        type: 'editor',
        name: 'rawDescription',
        message: 'Describe your experience (opens in editor):',
        validate: (input) => input.length > 50 || 'Please provide at least 50 characters',
      },
      {
        type: 'input',
        name: 'keyAchievements',
        message: 'Key achievements (comma-separated):',
      },
      {
        type: 'input',
        name: 'technologies',
        message: 'Technologies used (comma-separated):',
      },
    ]);

    // Initialize AI
    const spinner = ora('Polishing description with AI...').start();
    
    try {
      await this.aiManager.initialize();
      
      // Create prompt for AI polishing
      const prompt = `
You are a professional resume writer. Polish the following work experience description.

Company: ${answers.company}
Position: ${answers.position}
Duration: ${answers.duration}

Original Description:
${answers.rawDescription}

Key Achievements:
${answers.keyAchievements}

Technologies:
${answers.technologies}

Please provide:
1. A polished, professional description (3-4 sentences) that highlights the role's scope and impact
2. 8-10 bullet points with specific metrics and achievements (each must contain numbers)
3. Improved technology list with proper categorization

Requirements:
- Use action verbs
- Include specific numbers and percentages
- Highlight technical achievements
- Show business impact
- Use professional language
- Language: ${process.env.FAJ_RESUME_LANGUAGE === 'zh' ? 'Chinese' : 'English'}

Format as JSON:
{
  "description": "...",
  "highlights": ["bullet1", "bullet2", ...],
  "technologies": ["tech1", "tech2", ...],
  "suggestions": ["improvement1", "improvement2", ...]
}
`;

      const result = await this.aiManager.processPrompt(prompt);
      
      spinner.succeed('Description polished successfully!');
      
      // Parse and display results
      try {
        const parsed = JSON.parse(result);
        
        console.log(chalk.cyan('\n✨ Polished Description:\n'));
        console.log(chalk.white(parsed.description));
        
        console.log(chalk.cyan('\n📊 Professional Highlights:\n'));
        parsed.highlights.forEach((highlight: string, index: number) => {
          console.log(chalk.gray(`${index + 1}. `) + highlight);
        });
        
        console.log(chalk.cyan('\n🔧 Technologies:\n'));
        console.log(chalk.gray(parsed.technologies.join(', ')));
        
        if (parsed.suggestions && parsed.suggestions.length > 0) {
          console.log(chalk.yellow('\n💡 Suggestions for Improvement:\n'));
          parsed.suggestions.forEach((suggestion: string) => {
            console.log(chalk.gray('• ' + suggestion));
          });
        }
        
        // Save to file if requested
        if (options.output) {
          const fs = await import('fs/promises');
          const output = {
            company: answers.company,
            position: answers.position,
            duration: answers.duration,
            original: answers.rawDescription,
            polished: parsed,
            timestamp: new Date().toISOString(),
          };
          await fs.writeFile(options.output, JSON.stringify(output, null, 2));
          console.log(chalk.green(`\n✓ Saved to ${options.output}`));
        }
        
        // Ask if user wants to add to resume
        const { addToResume } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'addToResume',
            message: 'Add this experience to your resume?',
            default: true,
          },
        ]);
        
        if (addToResume) {
          // TODO: Implement adding to resume
          console.log(chalk.yellow('\nNote: Adding to resume feature coming soon.'));
          console.log(chalk.cyan('For now, you can use: faj resume update'));
        }
        
      } catch (parseError) {
        console.log(chalk.yellow('\nRaw AI Response:'));
        console.log(result);
      }
      
    } catch (error) {
      spinner.fail('Failed to polish description');
      throw error;
    }
  }
}