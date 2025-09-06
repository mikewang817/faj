import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import { ProjectAnalysis } from '../../models';
import { Logger } from '../../utils/Logger';

export class ProjectAnalyzer {
  private logger: Logger;
  private languageExtensions: Map<string, string> = new Map([
    ['.ts', 'TypeScript'],
    ['.tsx', 'TypeScript'],
    ['.js', 'JavaScript'],
    ['.jsx', 'JavaScript'],
    ['.py', 'Python'],
    ['.java', 'Java'],
    ['.go', 'Go'],
    ['.rs', 'Rust'],
    ['.cpp', 'C++'],
    ['.c', 'C'],
    ['.cs', 'C#'],
    ['.rb', 'Ruby'],
    ['.php', 'PHP'],
    ['.swift', 'Swift'],
    ['.kt', 'Kotlin'],
    ['.scala', 'Scala'],
    ['.r', 'R'],
    ['.m', 'MATLAB'],
    ['.vue', 'Vue'],
    ['.dart', 'Dart'],
  ]);

  private frameworkIndicators: Map<string, string[]> = new Map([
    ['React', ['react', 'react-dom', 'next.js', 'gatsby']],
    ['Vue', ['vue', 'nuxt']],
    ['Angular', ['@angular/core', '@angular/common']],
    ['Express', ['express']],
    ['Django', ['django']],
    ['Flask', ['flask']],
    ['Spring', ['spring-boot', 'spring-framework']],
    ['Rails', ['rails']],
    ['Laravel', ['laravel']],
    ['FastAPI', ['fastapi']],
    ['NestJS', ['@nestjs/core']],
    ['Next.js', ['next']],
    ['Nuxt', ['nuxt']],
    ['Svelte', ['svelte']],
  ]);

  constructor() {
    this.logger = new Logger('ProjectAnalyzer');
  }

  async analyze(pathOrUrl: string): Promise<ProjectAnalysis> {
    if (this.isGitHubUrl(pathOrUrl)) {
      return this.analyzeGitHub(pathOrUrl);
    } else {
      return this.analyzeLocal(pathOrUrl);
    }
  }

  private isGitHubUrl(input: string): boolean {
    return input.includes('github.com');
  }

  private async analyzeLocal(projectPath: string): Promise<ProjectAnalysis> {
    this.logger.info(`Analyzing local project: ${projectPath}`);

    // Check if path exists
    try {
      await fs.access(projectPath);
    } catch {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    // Extract project metadata
    const projectInfo = await this.extractProjectInfo(projectPath);
    
    // Analyze files
    const files = await this.getAllFiles(projectPath);
    const languages = await this.detectLanguages(files);
    const { frameworks, libraries } = await this.detectFrameworks(projectPath);
    const metrics = await this.calculateMetrics(files);
    const complexity = this.determineComplexity(metrics);

    return {
      path: projectPath,
      name: projectInfo.name,
      type: 'local',
      languages,
      frameworks,
      libraries,
      complexity,
      description: projectInfo.description || await this.generateDescription(projectPath),
      highlights: await this.generateHighlights(files, languages, frameworks),
      metrics,
    };
  }

  private async extractProjectInfo(projectPath: string): Promise<{
    name: string;
    description?: string;
  }> {
    let projectName = path.basename(projectPath);
    let projectDescription: string | undefined;

    // Try package.json first for Node.js projects
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      if (packageJson.name) {
        projectName = packageJson.name;
      }
      if (packageJson.description) {
        projectDescription = packageJson.description;
      }
    } catch {
      // Not a Node.js project or no package.json
    }

    // Try pyproject.toml for Python projects
    if (!projectDescription) {
      try {
        const pyprojectPath = path.join(projectPath, 'pyproject.toml');
        const pyprojectContent = await fs.readFile(pyprojectPath, 'utf-8');
        // Simple extraction - in production would use TOML parser
        const nameMatch = pyprojectContent.match(/name\s*=\s*["']([^"']+)["']/);
        const descMatch = pyprojectContent.match(/description\s*=\s*["']([^"']+)["']/);
        if (nameMatch) projectName = nameMatch[1];
        if (descMatch) projectDescription = descMatch[1];
      } catch {
        // Not a Python project or no pyproject.toml
      }
    }

    // Try Cargo.toml for Rust projects
    if (!projectDescription) {
      try {
        const cargoPath = path.join(projectPath, 'Cargo.toml');
        const cargoContent = await fs.readFile(cargoPath, 'utf-8');
        const nameMatch = cargoContent.match(/name\s*=\s*["']([^"']+)["']/);
        const descMatch = cargoContent.match(/description\s*=\s*["']([^"']+)["']/);
        if (nameMatch) projectName = nameMatch[1];
        if (descMatch) projectDescription = descMatch[1];
      } catch {
        // Not a Rust project or no Cargo.toml
      }
    }

    // Try README as fallback for description
    if (!projectDescription) {
      try {
        const readmePath = path.join(projectPath, 'README.md');
        const readme = await fs.readFile(readmePath, 'utf-8');
        // Extract first meaningful paragraph
        const lines = readme.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('![') && !trimmed.startsWith('[')) {
            projectDescription = trimmed.substring(0, 200);
            break;
          }
        }
      } catch {
        // No README
      }
    }

    return {
      name: projectName,
      description: projectDescription
    };
  }

  private async analyzeGitHub(repoUrl: string): Promise<ProjectAnalysis> {
    this.logger.info(`Analyzing GitHub repository: ${repoUrl}`);

    // Extract owner and repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL');
    }

    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

    try {
      // Fetch repo info
      const repoResponse = await axios.get(apiUrl);
      const repoData = repoResponse.data;

      // Fetch languages
      const langResponse = await axios.get(`${apiUrl}/languages`);
      const langData = langResponse.data;

      // Convert language data to our format
      const totalBytes = Object.values(langData as Record<string, number>).reduce(
        (sum, bytes) => sum + bytes,
        0
      );
      const languages = new Map<string, number>();
      for (const [lang, bytes] of Object.entries(langData as Record<string, number>)) {
        languages.set(lang, Math.round((bytes / totalBytes) * 100));
      }

      // Fetch package.json to detect frameworks (if exists)
      let frameworks: string[] = [];
      let libraries: string[] = [];
      try {
        const packageResponse = await axios.get(
          `https://raw.githubusercontent.com/${owner}/${repo}/main/package.json`
        );
        const packageJson = packageResponse.data;
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        const detected = this.detectFrameworksFromDeps(deps);
        frameworks = detected.frameworks;
        libraries = detected.libraries;
      } catch {
        // No package.json or different structure
      }

      return {
        path: repoUrl,
        name: repoData.name,
        type: 'github',
        languages,
        frameworks,
        libraries,
        complexity: this.determineComplexityFromGitHub(repoData),
        description: repoData.description || 'No description available',
        highlights: this.generateGitHubHighlights(repoData),
        metrics: {
          linesOfCode: repoData.size * 1024, // Approximate
          filesCount: 0, // Would need tree API
          commitsCount: repoData.default_branch ? 0 : 0, // Would need commits API
          contributorsCount: repoData.subscribers_count,
        },
      };
    } catch (error) {
      this.logger.error('Failed to analyze GitHub repository', error);
      throw new Error(`Failed to analyze GitHub repository: ${(error as Error).message}`);
    }
  }

  private async getAllFiles(dir: string, fileList: string[] = []): Promise<string[]> {
    const files = await fs.readdir(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules, .git, etc
        if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'build') {
          await this.getAllFiles(filePath, fileList);
        }
      } else {
        fileList.push(filePath);
      }
    }

    return fileList;
  }

  private async detectLanguages(files: string[]): Promise<Map<string, number>> {
    const languageCounts = new Map<string, number>();
    let totalFiles = 0;

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const language = this.languageExtensions.get(ext);

      if (language) {
        languageCounts.set(language, (languageCounts.get(language) || 0) + 1);
        totalFiles++;
      }
    }

    // Convert to percentages
    const languages = new Map<string, number>();
    for (const [lang, count] of languageCounts) {
      languages.set(lang, Math.round((count / totalFiles) * 100));
    }

    return languages;
  }

  private async detectFrameworks(projectPath: string): Promise<{
    frameworks: string[];
    libraries: string[];
  }> {
    const frameworks: Set<string> = new Set();
    const libraries: Set<string> = new Set();

    // Check package.json for Node projects
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const detected = this.detectFrameworksFromDeps(deps);
      detected.frameworks.forEach(f => frameworks.add(f));
      detected.libraries.forEach(l => libraries.add(l));
    } catch {
      // Not a Node project or no package.json
    }

    // Check requirements.txt for Python projects
    try {
      const reqPath = path.join(projectPath, 'requirements.txt');
      const requirements = await fs.readFile(reqPath, 'utf-8');
      if (requirements.includes('django')) frameworks.add('Django');
      if (requirements.includes('flask')) frameworks.add('Flask');
      if (requirements.includes('fastapi')) frameworks.add('FastAPI');
      if (requirements.includes('numpy')) libraries.add('NumPy');
      if (requirements.includes('pandas')) libraries.add('Pandas');
      if (requirements.includes('tensorflow')) libraries.add('TensorFlow');
      if (requirements.includes('torch')) libraries.add('PyTorch');
    } catch {
      // Not a Python project or no requirements.txt
    }

    // Check pom.xml for Java projects
    try {
      const pomPath = path.join(projectPath, 'pom.xml');
      const pomContent = await fs.readFile(pomPath, 'utf-8');
      if (pomContent.includes('spring-boot')) frameworks.add('Spring Boot');
    } catch {
      // Not a Maven project
    }

    // Check go.mod for Go projects
    try {
      const goModPath = path.join(projectPath, 'go.mod');
      const goMod = await fs.readFile(goModPath, 'utf-8');
      if (goMod.includes('gin-gonic/gin')) frameworks.add('Gin');
      if (goMod.includes('fiber')) frameworks.add('Fiber');
      if (goMod.includes('echo')) frameworks.add('Echo');
    } catch {
      // Not a Go project
    }

    return {
      frameworks: Array.from(frameworks),
      libraries: Array.from(libraries),
    };
  }

  private detectFrameworksFromDeps(deps: Record<string, string>): {
    frameworks: string[];
    libraries: string[];
  } {
    const frameworks: string[] = [];
    const libraries: string[] = [];

    if (!deps) return { frameworks, libraries };

    // Detect frameworks
    for (const [framework, indicators] of this.frameworkIndicators) {
      if (indicators.some(indicator => deps[indicator])) {
        frameworks.push(framework);
      }
    }

    // Common libraries
    const commonLibs = [
      'axios', 'lodash', 'moment', 'date-fns', 'uuid', 
      'winston', 'jest', 'mocha', 'chai', 'eslint',
      'prettier', 'webpack', 'babel', 'typescript'
    ];

    for (const lib of commonLibs) {
      if (deps[lib]) {
        libraries.push(lib);
      }
    }

    return { frameworks, libraries };
  }

  private async calculateMetrics(files: string[]): Promise<{
    linesOfCode: number;
    filesCount: number;
    commitsCount?: number;
    contributorsCount?: number;
  }> {
    let linesOfCode = 0;

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (this.languageExtensions.has(ext)) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          linesOfCode += content.split('\n').length;
        } catch {
          // Skip files that can't be read
        }
      }
    }

    return {
      linesOfCode,
      filesCount: files.length,
    };
  }

  private determineComplexity(metrics: { linesOfCode: number; filesCount: number }): 'low' | 'medium' | 'high' {
    if (metrics.linesOfCode < 1000 || metrics.filesCount < 20) {
      return 'low';
    } else if (metrics.linesOfCode < 10000 || metrics.filesCount < 100) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  private determineComplexityFromGitHub(repoData: any): 'low' | 'medium' | 'high' {
    const size = repoData.size; // Size in KB
    if (size < 1000) {
      return 'low';
    } else if (size < 10000) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  private async generateDescription(projectPath: string): Promise<string> {
    // Try to read README
    try {
      const readmePath = path.join(projectPath, 'README.md');
      const readme = await fs.readFile(readmePath, 'utf-8');
      // Extract first paragraph or description
      const lines = readme.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      if (lines.length > 0) {
        return lines[0].substring(0, 200);
      }
    } catch {
      // No README
    }

    // Try package.json description
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      if (packageJson.description) {
        return packageJson.description;
      }
    } catch {
      // No package.json
    }

    return 'A software development project';
  }

  private async generateHighlights(
    files: string[],
    languages: Map<string, number>,
    frameworks: string[]
  ): Promise<string[]> {
    const highlights: string[] = [];

    // Language diversity
    if (languages.size > 3) {
      highlights.push('Multi-language project demonstrating versatility');
    }

    // Primary language expertise
    const primaryLang = Array.from(languages.entries()).sort((a, b) => b[1] - a[1])[0];
    if (primaryLang) {
      highlights.push(`Strong ${primaryLang[0]} expertise (${primaryLang[1]}% of codebase)`);
    }

    // Framework usage
    if (frameworks.length > 0) {
      highlights.push(`Experience with ${frameworks.join(', ')}`);
    }

    // Test coverage
    const hasTests = files.some(f => f.includes('test') || f.includes('spec'));
    if (hasTests) {
      highlights.push('Includes comprehensive test suite');
    }

    // Documentation
    const hasDocs = files.some(f => f.toLowerCase().includes('readme') || f.includes('docs'));
    if (hasDocs) {
      highlights.push('Well-documented with clear README');
    }

    // CI/CD
    const hasCI = files.some(f => f.includes('.github/workflows') || f.includes('.gitlab-ci'));
    if (hasCI) {
      highlights.push('Implements CI/CD best practices');
    }

    return highlights;
  }

  private generateGitHubHighlights(repoData: any): string[] {
    const highlights: string[] = [];

    if (repoData.stargazers_count > 100) {
      highlights.push(`Popular project with ${repoData.stargazers_count} stars`);
    } else if (repoData.stargazers_count > 10) {
      highlights.push(`Community recognition with ${repoData.stargazers_count} stars`);
    }

    if (repoData.forks_count > 10) {
      highlights.push(`Active community with ${repoData.forks_count} forks`);
    }

    if (repoData.open_issues_count > 0) {
      highlights.push('Actively maintained with recent updates');
    }

    if (repoData.license) {
      highlights.push(`Open source project (${repoData.license.name})`);
    }

    if (repoData.topics && repoData.topics.length > 0) {
      highlights.push(`Technologies: ${repoData.topics.slice(0, 3).join(', ')}`);
    }

    return highlights;
  }
}