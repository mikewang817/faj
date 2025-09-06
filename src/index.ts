#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { CLI } from './cli';
import { version, description } from '../package.json';

// Note: .env file is deprecated - configuration is now stored in encrypted ~/.faj/config.json
// Environment variables are still supported for backward compatibility only

// ASCII Art Banner
const banner = `
╔══════════════════════════════════════╗
║        ______   ___       _          ║
║       |  ____| / _ \\     | |         ║
║       | |__   / /_\\ \\    | |         ║
║       |  __|  |  _  |    | |         ║
║       | |     | | | | _  | |         ║
║       |_|     |_| |_|(_) |_|         ║
║                                      ║
║    Find A Job - AI Resume Builder    ║
╚══════════════════════════════════════╝
`;

async function main() {
  console.log(chalk.cyan(banner));

  const program = new Command();
  const cli = new CLI();

  program
    .name('faj')
    .description(description)
    .version(version);

  // Register all CLI commands
  cli.register(program);

  // Parse command line arguments
  await program.parseAsync(process.argv);
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Unexpected error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled promise rejection:'), reason);
  process.exit(1);
});

// Run the CLI
main().catch((error) => {
  console.error(chalk.red('Failed to start FAJ:'), error.message);
  process.exit(1);
});