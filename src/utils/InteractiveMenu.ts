import inquirer from 'inquirer';
import chalk from 'chalk';

// Custom menu state manager
class MenuStack {
  private stack: string[] = [];
  
  push(menu: string): void {
    this.stack.push(menu);
  }
  
  pop(): string | undefined {
    return this.stack.pop();
  }
  
  current(): string | undefined {
    return this.stack[this.stack.length - 1];
  }
  
  clear(): void {
    this.stack = [];
  }
  
  depth(): number {
    return this.stack.length;
  }
}

export const menuStack = new MenuStack();

/**
 * Enhanced menu prompt with navigation support
 */
export async function navigableMenu(
  title: string,
  choices: Array<{ name: string; value: string; action?: 'back' | 'enter' | 'menu' }>,
  options: {
    showHints?: boolean;
    allowEscape?: boolean;
    parentValue?: string;
  } = {}
): Promise<string> {
  const { showHints = true, allowEscape = true, parentValue = 'back' } = options;
  
  // Add keyboard hints
  if (showHints) {
    console.log(chalk.gray('\n  Navigation: ↑↓ Move | Enter Select | ESC Back\n'));
  }
  
  // Enhanced choices with back option
  const enhancedChoices = [...choices];
  
  // Add separator before back if there are other choices
  if (choices.length > 0 && !choices.some(c => c.value === parentValue)) {
    enhancedChoices.push(new inquirer.Separator('──────────────') as any);
    enhancedChoices.push({ 
      name: chalk.gray('← Back / ESC'), 
      value: parentValue,
      action: 'back'
    });
  }
  
  try {
    const { selection } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selection',
        message: title,
        choices: enhancedChoices.map(c => {
          if (typeof c === 'object' && 'name' in c) {
            return {
              name: c.name,
              value: c.value,
              short: c.name.replace(/[^\w\s]/g, '').trim()
            };
          }
          return c;
        }),
        loop: false,
        pageSize: 12
      }
    ]);
    
    return selection;
  } catch (error) {
    // Handle ESC key (user cancelled)
    if (allowEscape) {
      return parentValue;
    }
    throw error;
  }
}

/**
 * Create a breadcrumb trail for current menu location
 */
export function getBreadcrumb(path: string[]): string {
  if (path.length === 0) return '';
  return chalk.gray(`  ${path.join(' > ')}\n`);
}

/**
 * Standard menu builder with consistent styling
 */
export class InteractiveMenu {
  private menuPath: string[] = [];
  
  /**
   * Show main menu
   */
  async showMainMenu(
    items: Array<{ icon: string; label: string; value: string }>,
    title?: string
  ): Promise<string> {
    const header = title || '📋 Main Menu';
    const breadcrumb = getBreadcrumb(this.menuPath);
    
    const choices = items.map(item => ({
      name: `${item.icon} ${item.label}`,
      value: item.value
    }));
    
    if (breadcrumb) {
      console.log(breadcrumb);
    }
    
    return navigableMenu(header, choices, {
      showHints: this.menuPath.length === 0,
      parentValue: 'exit'
    });
  }
  
  /**
   * Show submenu with automatic back option
   */
  async showSubmenu(
    title: string,
    items: Array<{ icon?: string; label: string; value: string }>,
    parentMenu?: string
  ): Promise<string> {
    // Update menu path
    if (parentMenu) {
      this.menuPath.push(parentMenu);
    }
    
    const breadcrumb = getBreadcrumb(this.menuPath);
    const choices = items.map(item => ({
      name: item.icon ? `${item.icon} ${item.label}` : item.label,
      value: item.value
    }));
    
    if (breadcrumb) {
      console.log(breadcrumb);
    }
    
    const result = await navigableMenu(title, choices, {
      showHints: false,
      parentValue: 'back'
    });
    
    // Pop from path if going back
    if (result === 'back' && this.menuPath.length > 0) {
      this.menuPath.pop();
    }
    
    return result;
  }
  
  /**
   * Clear navigation history
   */
  clearHistory(): void {
    this.menuPath = [];
  }
  
  /**
   * Get current menu depth
   */
  getDepth(): number {
    return this.menuPath.length;
  }
  
  /**
   * Quick confirmation prompt
   */
  async confirm(message: string, defaultValue: boolean = false): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: defaultValue
      }
    ]);
    return confirmed;
  }
  
  /**
   * Quick input prompt
   */
  async input(message: string, defaultValue?: string): Promise<string> {
    const { value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message,
        default: defaultValue
      }
    ]);
    return value;
  }
}

// Export singleton instance
export const menu = new InteractiveMenu();

/**
 * Helper function to create consistent menu items
 */
export function menuItem(icon: string, label: string, value: string) {
  return { icon, label, value };
}

/**
 * Helper to create section separators
 */
export function menuSeparator(label?: string) {
  if (label) {
    return new inquirer.Separator(chalk.gray(`─── ${label} ───`));
  }
  return new inquirer.Separator(chalk.gray('──────────────'));
}