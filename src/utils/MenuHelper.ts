import chalk from 'chalk';
import inquirer from 'inquirer';

export class MenuHelper {
  private static menuStack: string[] = [];
  
  /**
   * Push current menu to stack
   */
  static pushMenu(menuName: string): void {
    this.menuStack.push(menuName);
  }
  
  /**
   * Pop from menu stack
   */
  static popMenu(): string | undefined {
    return this.menuStack.pop();
  }
  
  /**
   * Get current menu depth
   */
  static getDepth(): number {
    return this.menuStack.length;
  }
  
  /**
   * Clear menu stack
   */
  static clearStack(): void {
    this.menuStack = [];
  }
  
  /**
   * Show breadcrumb navigation
   */
  static showBreadcrumb(): void {
    if (this.menuStack.length > 0) {
      const breadcrumb = this.menuStack.join(' > ');
      console.log(chalk.gray(`\n  📍 ${breadcrumb}\n`));
    }
  }
  
  /**
   * Show navigation hints based on menu level
   */
  static showNavigationHints(isMainMenu: boolean = false): void {
    if (isMainMenu) {
      console.log(chalk.gray('\n  Navigation: ↑↓ Select | Enter Confirm | Ctrl+C Exit\n'));
    } else {
      console.log(chalk.gray('\n  Navigation: ↑↓ Select | Enter Confirm | Select "← Back" to return\n'));
    }
  }
  
  /**
   * Format menu choices with consistent styling
   */
  static formatChoices(
    choices: Array<{ name: string; value: string; icon?: string }>,
    includeBack: boolean = true,
    backText: string = 'Back to Previous Menu'
  ): any[] {
    const formatted: any[] = choices.map(choice => {
      if (choice.icon) {
        return { name: `${choice.icon} ${choice.name}`, value: choice.value };
      }
      return { name: choice.name, value: choice.value };
    });
    
    if (includeBack) {
      formatted.push(new inquirer.Separator('──────────────') as any);
      formatted.push({ name: `← ${backText}`, value: 'back' });
    }
    
    return formatted;
  }
  
  /**
   * Create a standard submenu
   */
  static async showSubmenu(
    title: string,
    choices: Array<{ name: string; value: string; icon?: string }>,
    options: {
      parentMenu?: string;
      includeBack?: boolean;
      backText?: string;
      pageSize?: number;
    } = {}
  ): Promise<string> {
    const {
      parentMenu,
      includeBack = true,
      backText = 'Back',
      pageSize = 12
    } = options;
    
    // Push to stack if parent menu specified
    if (parentMenu) {
      this.pushMenu(parentMenu);
    }
    
    // Show breadcrumb and hints
    this.showBreadcrumb();
    this.showNavigationHints(false);
    
    const formattedChoices = this.formatChoices(choices, includeBack, backText);
    
    const { selection } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selection',
        message: title,
        choices: formattedChoices,
        loop: false,
        pageSize
      }
    ]);
    
    // Pop from stack if going back
    if (selection === 'back' && parentMenu) {
      this.popMenu();
    }
    
    return selection;
  }
  
  /**
   * Quick action menu with shortcuts
   */
  static async quickActionMenu(
    title: string,
    actions: Array<{
      key: string;
      name: string;
      value: string;
      icon?: string;
    }>
  ): Promise<string> {
    console.log(chalk.cyan(`\n${title}\n`));
    
    // Show shortcuts
    console.log(chalk.gray('  Quick Actions:'));
    actions.forEach(action => {
      const icon = action.icon || '';
      console.log(chalk.gray(`    [${action.key}] ${icon} ${action.name}`));
    });
    console.log();
    
    const choices: any[] = actions.map(a => ({
      name: `[${a.key}] ${a.icon || ''} ${a.name}`,
      value: a.value,
      short: a.name
    }));
    
    choices.push(new inquirer.Separator('──────────────') as any);
    choices.push({ name: '← Cancel', value: 'cancel', short: 'Cancel' });
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Choose action:',
        choices,
        loop: false
      }
    ]);
    
    return action;
  }
  
  /**
   * Create a wizard-style navigation
   */
  static createWizard(steps: string[]): {
    current: () => number;
    next: () => boolean;
    previous: () => boolean;
    isFirst: () => boolean;
    isLast: () => boolean;
    getStepName: () => string;
    showProgress: () => void;
  } {
    let currentStep = 0;
    
    return {
      current: () => currentStep,
      next: () => {
        if (currentStep < steps.length - 1) {
          currentStep++;
          return true;
        }
        return false;
      },
      previous: () => {
        if (currentStep > 0) {
          currentStep--;
          return true;
        }
        return false;
      },
      isFirst: () => currentStep === 0,
      isLast: () => currentStep === steps.length - 1,
      getStepName: () => steps[currentStep],
      showProgress: () => {
        const progress = `Step ${currentStep + 1} of ${steps.length}: ${steps[currentStep]}`;
        console.log(chalk.cyan(`\n${progress}`));
        
        // Show progress bar
        const filled = '█'.repeat(currentStep + 1);
        const empty = '░'.repeat(steps.length - currentStep - 1);
        console.log(chalk.gray(`  [${filled}${empty}]\n`));
      }
    };
  }
}

/**
 * Helper function to create consistent menu separators
 */
export function menuSeparator(text?: string): any {
  if (text) {
    return new inquirer.Separator(chalk.gray(`─── ${text} ───`));
  }
  return new inquirer.Separator('──────────────');
}

/**
 * Helper to create menu item with icon
 */
export function menuItem(icon: string, name: string, value: string) {
  return {
    name: `${icon} ${name}`,
    value,
    short: name
  };
}