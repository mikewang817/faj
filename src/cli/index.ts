import { Command } from 'commander';
import { InteractiveCommand } from './commands/interactive';

export class CLI {
  private interactiveCommand: InteractiveCommand;

  constructor() {
    this.interactiveCommand = new InteractiveCommand();
  }

  register(program: Command): void {
    // Register the interactive command as the default
    this.interactiveCommand.register(program);
    
    // Keep init for backward compatibility but it also leads to interactive mode
    program
      .command('init')
      .description('Initialize FAJ (interactive mode)')
      .action(async () => {
        // Just run the interactive mode
        const interactive = new InteractiveCommand();
        await interactive['start']();
      });

    // Add a help command that shows simplified usage
    program
      .command('help')
      .description('Show help')
      .action(() => {
        console.log('\n📚 FAJ Usage:\n');
        console.log('  Just run: faj');
        console.log('\n  Everything is interactive! No need to remember commands.\n');
        console.log('  The interactive menu will guide you through:');
        console.log('    • Creating your resume');
        console.log('    • Adding work experience');
        console.log('    • Analyzing projects');
        console.log('    • Exporting in various formats');
        console.log('    • Configuring AI and settings\n');
      });

    // Add global options
    program
      .option('-v, --version', 'Show version')
      .option('-d, --debug', 'Enable debug mode')
      .option('-q, --quiet', 'Suppress non-error output');
  }
}