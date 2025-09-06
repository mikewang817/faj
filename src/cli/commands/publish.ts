import { Command } from 'commander';
import chalk from 'chalk';
import { Logger } from '../../utils/Logger';

export class PublishCommand {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PublishCommand');
  }

  register(program: Command): void {
    program
      .command('publish')
      .description('Publish resume (currently disabled)')
      .option('--unpublish', 'Remove resume from network')
      .action(async () => {
        try {
          await this.showDisabledMessage();
        } catch (error) {
          this.logger.error('Operation failed', error);
          process.exit(1);
        }
      });
  }

  private async showDisabledMessage(): Promise<void> {
    console.log(chalk.yellow('\n⚠ Network publishing is currently disabled.'));
    console.log('\nThis feature has been temporarily removed to focus on local functionality.');
    console.log('\nYou can still:');
    console.log('  • Export your resume locally: ' + chalk.cyan('faj resume export'));
    console.log('  • Share the exported file directly with recruiters');
    console.log('  • Use the interactive mode: ' + chalk.cyan('faj'));
  }
}