import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Logger } from '../../utils/Logger';
import { ProjectAnalyzer } from '../../core/analyzer/ProjectAnalyzer';
import { ResumeManager } from '../../core/resume/ResumeManager';
import { ConfigManager } from '../../core/config/ConfigManager';
import { ProjectAnalysis } from '../../models';

export class AnalyzeCommand {
  private logger: Logger;
  private projectAnalyzer: ProjectAnalyzer;
  private resumeManager: ResumeManager;
  private configManager: ConfigManager;

  constructor() {
    this.logger = new Logger('AnalyzeCommand');
    this.projectAnalyzer = new ProjectAnalyzer();
    this.resumeManager = ResumeManager.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  register(program: Command): void {
    program
      .command('analyze <paths...>')
      .description('Analyze projects and generate resume')
      .option('-o, --output <format>', 'Output format (json, md, html)', 'json')
      .option('--dry-run', 'Perform analysis without generating resume')
      .option('--no-ai', 'Skip AI resume generation')
      .action(async (paths: string[], options: any) => {
        try {
          await this.execute(paths, options);
        } catch (error) {
          this.logger.error('Analysis failed', error);
          process.exit(1);
        }
      });
  }

  private async execute(paths: string[], options: any): Promise<void> {
    // Check if user is configured
    const profile = await this.configManager.get('profile');
    if (!profile || profile.role !== 'developer') {
      console.log(chalk.yellow('\n⚠ Developer profile not configured.'));
      console.log('Please run ' + chalk.cyan('faj init') + ' first.');
      return;
    }

    console.log(chalk.cyan(`\n📊 Analyzing ${paths.length} project(s)...\n`));

    const analyses: ProjectAnalysis[] = [];

    // Analyze each project
    for (const path of paths) {
      const spinner = ora(`Analyzing ${path}...`).start();
      
      try {
        const analysis = await this.projectAnalyzer.analyze(path);
        analyses.push(analysis);
        
        spinner.succeed(`Analyzed ${path}`);
        
        // Display analysis summary
        console.log(chalk.gray('  Languages: ') + Array.from(analysis.languages.keys()).join(', '));
        console.log(chalk.gray('  Frameworks: ') + analysis.frameworks.join(', '));
        console.log(chalk.gray('  Complexity: ') + analysis.complexity);
        console.log(chalk.gray('  Files: ') + analysis.metrics.filesCount);
        console.log(chalk.gray('  Lines of code: ') + analysis.metrics.linesOfCode);
        console.log();
      } catch (error) {
        spinner.fail(`Failed to analyze ${path}: ${(error as Error).message}`);
        if (!options.force) {
          throw error;
        }
      }
    }

    if (analyses.length === 0) {
      console.log(chalk.red('✗ No projects were successfully analyzed.'));
      return;
    }

    // Display highlights
    console.log(chalk.cyan('\n📋 Project Highlights:\n'));
    for (const analysis of analyses) {
      console.log(chalk.bold(`${analysis.path}:`));
      for (const highlight of analysis.highlights) {
        console.log(chalk.gray('  • ') + highlight);
      }
      console.log();
    }

    if (options.dryRun) {
      console.log(chalk.yellow('\n⚠ Dry run mode - resume not generated.'));
      
      // Output analysis in requested format
      if (options.output === 'json') {
        console.log(JSON.stringify(analyses, null, 2));
      }
      return;
    }

    // Generate resume using AI
    if (!options.noAi) {
      const aiSpinner = ora('Generating resume with AI...').start();
      
      try {
        await this.resumeManager.generateFromProjects(analyses);
        aiSpinner.succeed('Resume generated successfully!');
        
        // Export in requested format
        const exported = await this.resumeManager.export(options.output);
        
        if (options.output === 'json') {
          console.log('\n' + exported);
        } else {
          // Save to file
          const filename = `resume.${options.output}`;
          const fs = await import('fs/promises');
          await fs.writeFile(filename, exported, 'utf-8');
          console.log(chalk.green(`\n✓ Resume saved to ${filename}`));
        }
        
        console.log(chalk.cyan('\nNext steps:'));
        console.log('  • Review your resume: ' + chalk.cyan('faj resume show'));
        console.log('  • Update if needed: ' + chalk.cyan('faj resume update'));
        console.log('  • Publish to network: ' + chalk.cyan('faj publish'));
      } catch (error) {
        aiSpinner.fail(`Failed to generate resume: ${(error as Error).message}`);
        
        if ((error as Error).message.includes('API key')) {
          console.log(chalk.yellow('\nTip: Configure your AI provider with:'));
          console.log(chalk.cyan('  faj config ai'));
        }
      }
    } else {
      console.log(chalk.yellow('\n⚠ AI generation skipped. Resume not generated.'));
    }
  }
}