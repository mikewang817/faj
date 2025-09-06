import * as fs from 'fs/promises';
import * as path from 'path';
import * as https from 'node:https';
import { Logger } from '../../utils/Logger';

export class CDNFontLoader {
  private logger: Logger;
  private cacheDir: string;
  
  // Using reliable font sources - these are the actual OTF files from Google
  private fontUrls: Record<string, string> = {
    // Direct links to Noto Sans SC from Google Fonts GitHub
    'noto-sc-regular': 'https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf',
    'noto-sc-bold': 'https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Bold.otf',
    // Alternative: smaller subset versions with better number rendering
    'noto-sc-subset-regular': 'https://github.com/googlefonts/noto-cjk/raw/main/Sans/Variable/OTF/Subset/NotoSansCJKsc-VF.otf',
    'noto-sc-subset-bold': 'https://github.com/googlefonts/noto-cjk/raw/main/Sans/SubsetOTF/SC/NotoSansSC-Bold.otf'
  };

  constructor() {
    this.logger = new Logger('CDNFontLoader');
    this.cacheDir = path.join(process.cwd(), '.font-cache');
  }

  async loadFonts(): Promise<{ regular: Buffer; bold: Buffer }> {
    // Ensure cache directory exists
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }

    // Check for cached fonts first
    const regularCachePath = path.join(this.cacheDir, 'noto-sc-regular.otf');
    const boldCachePath = path.join(this.cacheDir, 'noto-sc-bold.otf');

    let regularFont: Buffer;
    let boldFont: Buffer;

    try {
      // Try to load from cache
      regularFont = await fs.readFile(regularCachePath);
      boldFont = await fs.readFile(boldCachePath);
      this.logger.info('Using cached CDN fonts');
    } catch {
      // Download from CDN
      this.logger.info('Downloading optimized fonts from CDN...');
      
      try {
        // Try to use full fonts for better number rendering
        this.logger.info('Downloading fonts with better number support...');
        try {
          // First try the full CJK font for better rendering
          regularFont = await this.downloadFont(this.fontUrls['noto-sc-regular']);
          boldFont = await this.downloadFont(this.fontUrls['noto-sc-bold']);
          this.logger.info('Using full CJK fonts for better rendering');
        } catch (fullError) {
          // Fallback to subset if full fonts fail
          this.logger.info('Full fonts failed, using subset fonts...');
          regularFont = await this.downloadFont(this.fontUrls['noto-sc-subset-regular']);
          boldFont = await this.downloadFont(this.fontUrls['noto-sc-subset-bold']);
        }
        
        // Cache them for future use
        await fs.writeFile(regularCachePath, regularFont);
        await fs.writeFile(boldCachePath, boldFont);
        
        this.logger.success('Fonts downloaded and cached successfully');
        
        // Log file sizes
        const regularSize = Math.round(regularFont.length / 1024 / 1024 * 10) / 10;
        const boldSize = Math.round(boldFont.length / 1024 / 1024 * 10) / 10;
        this.logger.info(`Font sizes: Regular ${regularSize}MB, Bold ${boldSize}MB`);
        
      } catch (error) {
        this.logger.error('Failed to download fonts from CDN', error);
        throw new Error('Unable to load CJK fonts. Please check your internet connection.');
      }
    }

    return { regular: regularFont, bold: boldFont };
  }

  private downloadFont(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      https.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.downloadFont(redirectUrl).then(resolve).catch(reject);
            return;
          }
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download font: HTTP ${response.statusCode}`));
          return;
        }
        
        const totalSize = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedSize = 0;
        
        response.on('data', (chunk) => {
          chunks.push(chunk);
          downloadedSize += chunk.length;
          
          // Show download progress
          if (totalSize > 0) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            if (progress % 20 === 0) {
              this.logger.debug(`Download progress: ${progress}%`);
            }
          }
        });
        
        response.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        
        response.on('error', reject);
      }).on('error', reject);
    });
  }

  async clearCache(): Promise<void> {
    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
      this.logger.info('Font cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear cache', error);
    }
  }
}