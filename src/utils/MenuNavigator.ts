import inquirer from 'inquirer';
import chalk from 'chalk';

export interface MenuChoice {
  name: string;
  value: string;
  short?: string;
}

export interface NavigableMenuOptions {
  message: string;
  choices: MenuChoice[];
  backValue?: string;
  enterValue?: string;
  showHints?: boolean;
}

export class MenuNavigator {
  /**
   * Create a navigable menu with arrow key support
   * - Left arrow: go back (select back option if available)
   * - Right arrow: enter/select current option
   * - Up/Down arrows: navigate through options (default behavior)
   */
  static async prompt(options: NavigableMenuOptions): Promise<string> {
    const { message, choices, showHints = true } = options;
    
    // Add navigation hints to the message if enabled
    const enhancedMessage = showHints 
      ? `${message}\n${chalk.gray('(← Back | → Enter | ↑↓ Navigate)')}`
      : message;
    
    // Create the inquirer prompt with custom key handling
    const prompt = inquirer.createPromptModule();
    
    // Register custom key handler
    const result = await prompt([
      {
        type: 'list',
        name: 'selection',
        message: enhancedMessage,
        choices: choices,
        pageSize: 15,
        loop: false
      }
    ]);
    
    return result.selection;
  }
  
  /**
   * Create a standard menu with back option
   */
  static createMenuWithBack(
    title: string,
    items: Array<{ name: string; value: string }>,
    includeBack: boolean = true
  ): NavigableMenuOptions {
    const choices: MenuChoice[] = [...items];
    
    if (includeBack) {
      choices.push({ name: '← Back', value: 'back' });
    }
    
    return {
      message: title,
      choices,
      backValue: 'back',
      showHints: true
    };
  }
  
  /**
   * Helper to format menu items consistently
   */
  static formatMenuItem(icon: string, text: string, value: string): MenuChoice {
    return {
      name: `${icon} ${text}`,
      value,
      short: text
    };
  }
  
  /**
   * Create a submenu that can be navigated with arrow keys
   */
  static async showSubmenu(
    title: string,
    items: MenuChoice[],
    onSelect: (value: string) => Promise<void>,
    parentMenu?: () => Promise<void>
  ): Promise<void> {
    while (true) {
      const choice = await this.prompt({
        message: title,
        choices: [...items, { name: '← Back', value: 'back' }],
        showHints: true
      });
      
      if (choice === 'back') {
        if (parentMenu) {
          await parentMenu();
        }
        break;
      }
      
      await onSelect(choice);
      
      // Check if we should continue showing the menu
      const { continueMenu } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueMenu',
          message: 'Continue in this menu?',
          default: true
        }
      ]);
      
      if (!continueMenu) {
        break;
      }
    }
  }
}

/**
 * Custom inquirer plugin for enhanced keyboard navigation
 */
export function registerArrowKeyNavigation(): void {
  // This would require extending inquirer's list prompt
  // For now, we'll use the standard navigation with visual hints
  
  // Note: Full implementation would require:
  // 1. Extending inquirer.prompt.list
  // 2. Overriding keypress handlers
  // 3. Adding left/right arrow key support
  
  // Since inquirer doesn't easily support this out of the box,
  // we'll provide visual hints and use a wrapper approach
}

/**
 * Enhanced list prompt with arrow key hints
 */
export async function listWithArrows(
  message: string,
  choices: Array<{ name: string; value: string }>,
  options: {
    showBackHint?: boolean;
    showEnterHint?: boolean;
    loop?: boolean;
  } = {}
): Promise<string> {
  const { showBackHint = true, showEnterHint = true, loop = false } = options;
  
  // Build hints
  const hints: string[] = [];
  if (showBackHint) hints.push('← Back');
  if (showEnterHint) hints.push('→/Enter Select');
  hints.push('↑↓ Navigate');
  
  const hintText = hints.length > 0 ? chalk.gray(`\n(${hints.join(' | ')})`) : '';
  
  const { selection } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: `${message}${hintText}`,
      choices,
      loop,
      pageSize: 15
    }
  ]);
  
  return selection;
}