import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../../utils/Logger';
import * as os from 'os';

export class SystemFontLoader {
  private logger: Logger;
  
  // Common system font paths for different platforms
  // Prioritize OTF/TTF over TTC for better compatibility
  private fontPaths: Record<string, string[]> = {
    darwin: [ // macOS
      '/Library/Fonts/Arial Unicode.ttf',
      '/System/Library/Fonts/PingFang.ttc',
      '/System/Library/Fonts/Helvetica.ttc',
      '/System/Library/Fonts/STHeiti Light.ttc',
      '/System/Library/Fonts/STHeiti Medium.ttc',
      '/System/Library/Fonts/Hiragino Sans GB.ttc'
    ],
    linux: [ // Linux - prioritize OTF files over TTC
      '/usr/share/fonts/opentype/noto-cjk/NotoSansCJK-Regular.otf',
      '/usr/share/fonts/opentype/noto-cjk/NotoSansCJK-Bold.otf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/wqy/wqy-microhei.ttf',
      '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttf',
      '/usr/share/fonts/opentype/noto/NotoSansCJK-SC-Regular.otf',
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/truetype/google-noto-cjk/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/wenquanyi/wqy-microhei/wqy-microhei.ttc'
    ],
    win32: [ // Windows (via WSL or Wine paths)
      'C:\\Windows\\Fonts\\msyh.ttc',
      'C:\\Windows\\Fonts\\simsun.ttc',
      'C:\\Windows\\Fonts\\simhei.ttf',
      'C:\\Windows\\Fonts\\simkai.ttf',
      'C:\\Windows\\Fonts\\STKAITI.TTF',
      'C:\\Windows\\Fonts\\STFANGSO.TTF'
    ]
  };

  // WSL paths for Windows fonts
  private wslFontPaths = [
    '/mnt/c/Windows/Fonts/msyh.ttc',
    '/mnt/c/Windows/Fonts/simsun.ttc',
    '/mnt/c/Windows/Fonts/simhei.ttf',
    '/mnt/c/Windows/Fonts/STKAITI.TTF'
  ];

  constructor() {
    this.logger = new Logger('SystemFontLoader');
  }

  async findSystemFonts(): Promise<{ regular: Buffer | null; bold: Buffer | null }> {
    const platform = os.platform();
    this.logger.info(`Detecting system fonts on ${platform}...`);
    
    let regularFont: Buffer | null = null;
    let boldFont: Buffer | null = null;
    
    // Get platform-specific font paths
    let pathsToCheck = this.fontPaths[platform] || [];
    
    // Also check WSL paths if on Linux (might be WSL)
    if (platform === 'linux') {
      pathsToCheck = [...pathsToCheck, ...this.wslFontPaths];
    }
    
    // Check additional font directories
    const additionalDirs = await this.getAdditionalFontDirs();
    for (const dir of additionalDirs) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (file.match(/\.(ttf|otf|ttc)$/i)) {
            pathsToCheck.push(path.join(dir, file));
          }
        }
      } catch {
        // Directory doesn't exist or can't be read
      }
    }
    
    // Try to find suitable fonts
    for (const fontPath of pathsToCheck) {
      try {
        await fs.access(fontPath);
        const fontData = await fs.readFile(fontPath);
        
        // Check if it's a CJK font by name
        const fontName = path.basename(fontPath).toLowerCase();
        
        // Skip TTC files as they're not well supported by pdf-lib
        if (fontName.endsWith('.ttc')) {
          this.logger.debug(`Skipping TTC font: ${fontPath}`);
          continue;
        }
        
        const isCJKFont = this.isCJKFont(fontName);
        
        if (isCJKFont) {
          if (!regularFont) {
            regularFont = fontData;
            this.logger.success(`Found CJK font: ${fontPath}`);
          }
          
          // Try to find a bold variant
          if (!boldFont && (fontName.includes('bold') || fontName.includes('heavy'))) {
            boldFont = fontData;
            this.logger.success(`Found bold CJK font: ${fontPath}`);
          }
        }
        
        // If we have both, we can stop
        if (regularFont && boldFont) {
          break;
        }
      } catch {
        // Font file not accessible
      }
    }
    
    // If no bold font found, use regular for both
    if (regularFont && !boldFont) {
      boldFont = regularFont;
      this.logger.info('Using regular font for bold as well');
    }
    
    if (!regularFont) {
      this.logger.warn('No CJK fonts found on system. PDF may not display Chinese/Japanese/Korean text correctly.');
      this.logger.info('Consider installing fonts like Noto Sans CJK, WenQuanYi, or Microsoft YaHei.');
    }
    
    return { regular: regularFont, bold: boldFont };
  }

  private async getAdditionalFontDirs(): Promise<string[]> {
    const dirs: string[] = [];
    
    // User font directories
    const homeDir = os.homedir();
    dirs.push(
      path.join(homeDir, '.fonts'),
      path.join(homeDir, '.local', 'share', 'fonts')
    );
    
    // System font directories
    dirs.push(
      '/usr/share/fonts',
      '/usr/local/share/fonts',
      '/opt/local/share/fonts'
    );
    
    return dirs;
  }

  private isCJKFont(fontName: string): boolean {
    const cjkPatterns = [
      'cjk', 'chinese', 'sc', 'tc', 'cn', 'jp', 'kr',
      'noto', 'pingfang', 'heiti', 'songti', 'kaiti',
      'microsoft yahei', 'msyh', 'simsun', 'simhei',
      'wenquanyi', 'wqy', 'droid sans fallback',
      'hiragino', 'yu gothic', 'meiryo', 'malgun',
      'arial unicode', 'code2000', 'unifont'
    ];
    
    return cjkPatterns.some(pattern => fontName.includes(pattern));
  }

  async listAvailableFonts(): Promise<string[]> {
    const platform = os.platform();
    const availableFonts: string[] = [];
    
    let pathsToCheck = this.fontPaths[platform] || [];
    if (platform === 'linux') {
      pathsToCheck = [...pathsToCheck, ...this.wslFontPaths];
    }
    
    for (const fontPath of pathsToCheck) {
      try {
        await fs.access(fontPath);
        availableFonts.push(fontPath);
      } catch {
        // Not available
      }
    }
    
    return availableFonts;
  }
}