import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { Logger } from '../../utils/Logger';
import { ConfigManager } from '../../core/config/ConfigManager';
import { ExperienceManager } from '../../core/experience/ExperienceManager';

export class ExperienceCommand {
  private logger: Logger;
  private configManager: ConfigManager;
  private experienceManager: ExperienceManager;

  constructor() {
    this.logger = new Logger('ExperienceCommand');
    this.configManager = ConfigManager.getInstance();
    this.experienceManager = ExperienceManager.getInstance();
  }

  register(program: Command): void {
    const experience = program
      .command('experience')
      .alias('exp')
      .description('Manage your work experience');

    experience
      .command('add')
      .description('Add a new work experience')
      .option('-t, --template <type>', 'Use a template (internet/finance/gaming/startup/enterprise)')
      .option('-e, --example', 'Show an example before starting')
      .action(async (options: any) => {
        try {
          await this.add(options);
        } catch (error) {
          this.logger.error('Failed to add experience', error);
          process.exit(1);
        }
      });

    experience
      .command('list')
      .description('List all work experiences')
      .option('-d, --detailed', 'Show detailed information')
      .action(async (options: any) => {
        try {
          await this.list(options);
        } catch (error) {
          this.logger.error('Failed to list experiences', error);
          process.exit(1);
        }
      });

    experience
      .command('edit <id>')
      .description('Edit an existing work experience')
      .action(async (id: string) => {
        try {
          await this.edit(id);
        } catch (error) {
          this.logger.error('Failed to edit experience', error);
          process.exit(1);
        }
      });

    experience
      .command('delete <id>')
      .description('Delete a work experience')
      .action(async (id: string) => {
        try {
          await this.delete(id);
        } catch (error) {
          this.logger.error('Failed to delete experience', error);
          process.exit(1);
        }
      });

    experience
      .command('polish <id>')
      .description('Polish experience description with AI')
      .action(async (id: string) => {
        try {
          await this.polish(id);
        } catch (error) {
          this.logger.error('Failed to polish experience', error);
          process.exit(1);
        }
      });
  }

  private async add(options: any): Promise<void> {
    // Check if user is configured
    const profile = await this.configManager.get('profile');
    if (!profile || profile.role !== 'developer') {
      console.log(chalk.yellow('\n⚠ Developer profile not configured.'));
      console.log('Please run ' + chalk.cyan('faj init') + ' first.');
      return;
    }

    await this.experienceManager.load();

    console.log(chalk.cyan('\n📝 Add Work Experience\n'));

    // Show example if requested
    if (options.example) {
      console.log(chalk.bold('Example:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(this.experienceManager.getExperienceExample());
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
    }

    // Show template if requested
    if (options.template) {
      const templates = this.experienceManager.getExperienceTemplates();
      const template = templates[options.template];
      
      if (template) {
        console.log(chalk.bold(`Template: ${options.template}`));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.gray(template));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.yellow('\n请根据模板填写您的实际经历：\n'));
      }
    }

    // Collect basic information
    const basicInfo = await inquirer.prompt([
      {
        type: 'input',
        name: 'company',
        message: 'Company name:',
        validate: (input) => input.length > 0 || 'Company name is required'
      },
      {
        type: 'input',
        name: 'title',
        message: 'Position/Title:',
        validate: (input) => input.length > 0 || 'Position is required'
      },
      {
        type: 'input',
        name: 'startDate',
        message: 'Start date (e.g., 2020-01):',
        validate: (input) => {
          const pattern = /^\d{4}-\d{2}$/;
          return pattern.test(input) || 'Please use format: YYYY-MM';
        }
      },
      {
        type: 'confirm',
        name: 'current',
        message: 'Is this your current position?',
        default: false
      }
    ]);

    let endDate;
    if (!basicInfo.current) {
      const { end } = await inquirer.prompt([
        {
          type: 'input',
          name: 'end',
          message: 'End date (e.g., 2023-12):',
          validate: (input) => {
            const pattern = /^\d{4}-\d{2}$/;
            return pattern.test(input) || 'Please use format: YYYY-MM';
          }
        }
      ]);
      endDate = end;
    }

    // Collect description
    console.log(chalk.cyan('\n描述您的工作经历：'));
    console.log(chalk.gray('提示：包含具体职责、成就、团队规模、使用的技术等'));
    
    const { description } = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Describe your experience (opens in editor):',
        validate: (input) => input.length > 50 || 'Please provide at least 50 characters'
      }
    ]);

    // Ask about key achievements
    const { achievements } = await inquirer.prompt([
      {
        type: 'input',
        name: 'achievements',
        message: 'Key achievements (comma-separated, optional):'
      }
    ]);

    // Ask about technologies
    const { technologies } = await inquirer.prompt([
      {
        type: 'input',
        name: 'technologies',
        message: 'Technologies used (comma-separated):'
      }
    ]);

    // Create experience object
    const experience = {
      title: basicInfo.title,
      company: basicInfo.company,
      startDate: basicInfo.startDate,
      endDate: endDate,
      current: basicInfo.current,
      description: description,
      rawDescription: description,
      highlights: achievements ? achievements.split(',').map((a: string) => a.trim()).filter(Boolean) : [],
      technologies: technologies ? technologies.split(',').map((t: string) => t.trim()).filter(Boolean) : []
    };

    // Ask if user wants to polish with AI
    const { shouldPolish } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldPolish',
        message: 'Would you like AI to polish this description?',
        default: true
      }
    ]);

    const spinner = ora('Saving experience...').start();
    
    try {
      const saved = await this.experienceManager.add(experience);
      spinner.succeed('Experience added successfully!');
      
      if (shouldPolish) {
        spinner.start('Polishing with AI...');
        const polished = await this.experienceManager.polish(saved.id, description);
        
        if (polished) {
          spinner.succeed('Experience polished successfully!');
          
          console.log(chalk.cyan('\n✨ Polished Description:\n'));
          console.log(polished.description);
          
          if (polished.highlights.length > 0) {
            console.log(chalk.cyan('\n📊 Key Achievements:\n'));
            polished.highlights.forEach((h, i) => {
              console.log(`${i + 1}. ${h}`);
            });
          }
        }
      }
      
      console.log(chalk.green(`\n✓ Experience ID: ${saved.id}`));
      console.log(chalk.gray('Use this ID to edit or delete this experience'));
      
    } catch (error) {
      spinner.fail('Failed to save experience');
      throw error;
    }
  }

  private async list(options: any): Promise<void> {
    await this.experienceManager.load();
    const experiences = await this.experienceManager.getAll();

    if (experiences.length === 0) {
      console.log(chalk.yellow('\n📂 No work experiences found.'));
      console.log('Add your first experience with: ' + chalk.cyan('faj experience add'));
      return;
    }

    console.log(chalk.cyan(`\n📋 Work Experiences (${experiences.length} total)\n`));

    for (const exp of experiences) {
      console.log(chalk.bold(`${exp.title} at ${exp.company}`));
      console.log(chalk.gray(`ID: ${exp.id}`));
      console.log(`📅 ${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`);
      
      if (options.detailed) {
        console.log(`\n${exp.description}\n`);
        
        if (exp.highlights.length > 0) {
          console.log(chalk.gray('Key Achievements:'));
          exp.highlights.forEach(h => console.log(`  • ${h}`));
        }
        
        if (exp.technologies.length > 0) {
          console.log(chalk.gray(`Technologies: ${exp.technologies.join(', ')}`));
        }
        
        console.log(chalk.gray(`Polished: ${exp.polished ? 'Yes ✓' : 'No'}`));
      }
      
      console.log(chalk.gray('─'.repeat(50)));
    }
  }

  private async edit(id: string): Promise<void> {
    await this.experienceManager.load();
    const experience = await this.experienceManager.get(id);

    if (!experience) {
      console.log(chalk.red(`\n❌ Experience with ID '${id}' not found.`));
      console.log('Use ' + chalk.cyan('faj experience list') + ' to see all experiences.');
      return;
    }

    console.log(chalk.cyan('\n✏️  Edit Work Experience\n'));
    console.log(chalk.gray(`Current: ${experience.title} at ${experience.company}`));

    const { field } = await inquirer.prompt([
      {
        type: 'list',
        name: 'field',
        message: 'What would you like to edit?',
        choices: [
          { name: 'Title', value: 'title' },
          { name: 'Company', value: 'company' },
          { name: 'Start Date', value: 'startDate' },
          { name: 'End Date', value: 'endDate' },
          { name: 'Description', value: 'description' },
          { name: 'Achievements', value: 'highlights' },
          { name: 'Technologies', value: 'technologies' },
          { name: 'Cancel', value: 'cancel' }
        ]
      }
    ]);

    if (field === 'cancel') {
      console.log(chalk.gray('Edit cancelled'));
      return;
    }

    let update: any = {};

    switch (field) {
      case 'title':
      case 'company':
      case 'startDate':
      case 'endDate':
      case 'description':
        const { value } = await inquirer.prompt([
          {
            type: field === 'description' ? 'editor' : 'input',
            name: 'value',
            message: `New ${field}:`,
            default: (experience as any)[field]
          }
        ]);
        update[field] = value;
        break;
      
      case 'highlights':
        const { highlights } = await inquirer.prompt([
          {
            type: 'input',
            name: 'highlights',
            message: 'Edit achievements (one per line):',
            default: experience.highlights.join('\n')
          }
        ]);
        update.highlights = highlights.split('\n').filter(Boolean);
        break;
      
      case 'technologies':
        const { techs } = await inquirer.prompt([
          {
            type: 'input',
            name: 'techs',
            message: 'Technologies (comma-separated):',
            default: experience.technologies.join(', ')
          }
        ]);
        update.technologies = techs.split(',').map((t: string) => t.trim()).filter(Boolean);
        break;
    }

    const spinner = ora('Updating experience...').start();
    
    try {
      await this.experienceManager.update(id, update);
      spinner.succeed('Experience updated successfully!');
    } catch (error) {
      spinner.fail('Failed to update experience');
      throw error;
    }
  }

  private async delete(id: string): Promise<void> {
    await this.experienceManager.load();
    const experience = await this.experienceManager.get(id);

    if (!experience) {
      console.log(chalk.red(`\n❌ Experience with ID '${id}' not found.`));
      return;
    }

    console.log(chalk.yellow('\n⚠️  Delete Work Experience'));
    console.log(`${experience.title} at ${experience.company}`);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to delete this experience?',
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.gray('Deletion cancelled'));
      return;
    }

    const spinner = ora('Deleting experience...').start();
    
    try {
      await this.experienceManager.delete(id);
      spinner.succeed('Experience deleted successfully!');
    } catch (error) {
      spinner.fail('Failed to delete experience');
      throw error;
    }
  }

  private async polish(id: string): Promise<void> {
    await this.experienceManager.load();
    const experience = await this.experienceManager.get(id);

    if (!experience) {
      console.log(chalk.red(`\n❌ Experience with ID '${id}' not found.`));
      return;
    }

    console.log(chalk.cyan('\n✨ Polish Experience with AI\n'));
    console.log(`${experience.title} at ${experience.company}`);

    let description = experience.rawDescription || experience.description;
    
    // Allow user to edit description before polishing
    const { editFirst } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'editFirst',
        message: 'Would you like to edit the description before polishing?',
        default: false
      }
    ]);

    if (editFirst) {
      const { newDesc } = await inquirer.prompt([
        {
          type: 'input',
          name: 'newDesc',
          message: 'Edit description:',
          default: description
        }
      ]);
      description = newDesc;
    }

    const spinner = ora('Polishing with AI...').start();
    
    try {
      const polished = await this.experienceManager.polish(id, description);
      
      if (polished) {
        spinner.succeed('Experience polished successfully!');
        
        console.log(chalk.cyan('\n📝 Polished Description:\n'));
        console.log(polished.description);
        
        if (polished.highlights.length > 0) {
          console.log(chalk.cyan('\n📊 Key Achievements:\n'));
          polished.highlights.forEach((h, i) => {
            console.log(`${i + 1}. ${h}`);
          });
        }
        
        if (polished.technologies.length > 0) {
          console.log(chalk.cyan('\n🔧 Technologies:\n'));
          console.log(polished.technologies.join(', '));
        }
      }
    } catch (error) {
      spinner.fail('Failed to polish experience');
      throw error;
    }
  }
}