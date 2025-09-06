import { BaseAIProvider } from './BaseProvider';
import { ProjectAnalysis, Resume, JobRequirement } from '../../models';

/**
 * Mock AI Provider for testing when real AI APIs are not available
 */
export class MockProvider extends BaseAIProvider {
  constructor() {
    super('Mock', 'mock-api-key', 'mock-model');
  }

  async isAvailable(): Promise<boolean> {
    this.logger.info('Mock provider is always available for testing');
    return true;
  }

  async analyzeProject(project: ProjectAnalysis): Promise<{
    summary: string;
    skills: string[];
    highlights: string[];
  }> {
    this.logger.info('Mock analyzing project:', project.path);
    
    // Generate mock analysis based on actual project data
    const languages = Array.from(project.languages.keys());
    const primaryLang = languages[0] || 'JavaScript';
    
    return {
      summary: `A sophisticated ${primaryLang} project showcasing modern development practices, 
                clean architecture, and comprehensive testing. The codebase demonstrates 
                strong technical skills with ${project.metrics.filesCount} files and 
                ${project.metrics.linesOfCode} lines of well-structured code.`,
      skills: [
        ...languages,
        ...project.frameworks,
        ...project.libraries.slice(0, 5),
        'Test-Driven Development',
        'Clean Architecture',
        'CI/CD',
        'Version Control (Git)'
      ],
      highlights: [
        `Implemented complex ${primaryLang} application with ${project.metrics.filesCount} components`,
        `Achieved ${project.complexity} complexity score with maintainable code structure`,
        `Integrated ${project.frameworks.length} frameworks and ${project.libraries.length} libraries effectively`,
        `Demonstrated proficiency in ${languages.length} programming languages`,
        `Built scalable architecture supporting ${Math.round(project.metrics.linesOfCode / 100) * 10}+ users`
      ]
    };
  }

  async generateResume(
    projects: ProjectAnalysis[],
    profile: any
  ): Promise<Resume> {
    this.logger.info(`Mock generating resume from ${projects.length} projects`);
    
    // Aggregate skills from all projects
    const allSkills = new Set<string>();
    const allLanguages = new Set<string>();
    const allFrameworks = new Set<string>();
    
    projects.forEach(p => {
      Array.from(p.languages.keys()).forEach(l => allLanguages.add(l));
      p.frameworks.forEach(f => allFrameworks.add(f));
      p.libraries.slice(0, 3).forEach(l => allSkills.add(l));
    });

    // Generate skill objects with levels
    const skills = [
      ...Array.from(allLanguages).map(name => ({
        name,
        level: 'expert' as const,
        category: 'language' as const
      })),
      ...Array.from(allFrameworks).map(name => ({
        name,
        level: 'advanced' as const,
        category: 'framework' as const
      })),
      ...Array.from(allSkills).slice(0, 5).map(name => ({
        name,
        level: 'intermediate' as const,
        category: 'tool' as const
      }))
    ];

    // Generate project descriptions
    const projectsContent = projects.map(p => ({
      name: path.basename(p.path),
      description: `Developed a sophisticated ${Array.from(p.languages.keys())[0]} application 
                    with ${p.metrics.filesCount} components and ${p.metrics.linesOfCode} lines of code.`,
      role: profile.role || 'Full Stack Developer',
      technologies: [
        ...Array.from(p.languages.keys()).slice(0, 3),
        ...p.frameworks.slice(0, 2),
        ...p.libraries.slice(0, 3)
      ],
      highlights: [
        `Built scalable architecture with ${p.complexity} complexity`,
        `Implemented ${p.frameworks.length} frameworks integration`,
        `Achieved 90%+ code coverage with comprehensive testing`,
        `Optimized performance for ${Math.round(p.metrics.linesOfCode / 100)}x faster execution`
      ],
      startDate: '2023-01-01',
      endDate: 'Present',
      current: true
    }));

    const resume: Resume = {
      id: `resume-${Date.now()}`,
      developerId: profile.id || `dev-${Date.now()}`,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      aiProvider: 'gemini',
      content: {
        summary: `Experienced Full Stack Developer with expertise in ${allLanguages.size} programming languages 
                  and ${allFrameworks.size} frameworks. Proven track record of building scalable applications 
                  with clean architecture and comprehensive testing. Strong problem-solving skills with 
                  ${projects.reduce((acc, p) => acc + p.metrics.linesOfCode, 0)} lines of production code.`,
        skills,
        experience: [
          {
            title: profile.role || 'Senior Full Stack Developer',
            company: 'Independent Projects',
            startDate: '2020-01-01',
            endDate: 'Present',
            current: true,
            description: `Leading development of multiple high-impact projects using modern technologies. 
                         Specializing in ${Array.from(allLanguages)[0]} and ${Array.from(allFrameworks)[0] || 'modern frameworks'}.`,
            highlights: [
              'Developed and maintained multiple production applications',
              'Implemented CI/CD pipelines reducing deployment time by 70%',
              'Mentored junior developers and conducted code reviews',
              'Architected scalable microservices handling 1M+ requests/day'
            ],
            technologies: Array.from(new Set([...allLanguages, ...allFrameworks])).slice(0, 8)
          }
        ],
        projects: projectsContent,
        education: (() => {
          if (!profile.education) return [{
            degree: 'Bachelor of Science',
            field: 'Computer Science',
            institution: 'Technology University',
            startDate: '2016-09-01',
            endDate: '2020-06-01',
            current: false
          }];
          const eduArray = Array.isArray(profile.education) ? profile.education : [profile.education];
          return eduArray.filter((edu: any) => edu && edu.degree);
        })()
      },
      metadata: {
        hash: this.generateHash(projectsContent),
        published: false
      }
    };

    return resume;
  }

  async updateResume(
    resume: Resume,
    changes: Partial<Resume>
  ): Promise<Resume> {
    this.logger.info('Mock updating resume');
    
    return {
      ...resume,
      ...changes,
      version: resume.version + 1,
      updatedAt: new Date(),
      metadata: {
        ...resume.metadata
      }
    };
  }

  async matchScore(
    resume: Resume,
    job: JobRequirement
  ): Promise<number> {
    this.logger.info('Mock calculating match score');
    
    // Calculate a realistic match score based on skills overlap
    const resumeSkills = new Set(resume.content.skills.map(s => s.name.toLowerCase()));
    const requiredSkills = new Set(job.requirements.skills.map(s => s.toLowerCase()));
    
    let matchCount = 0;
    requiredSkills.forEach(skill => {
      if (resumeSkills.has(skill)) {
        matchCount++;
      }
    });
    
    const skillMatch = requiredSkills.size > 0 
      ? (matchCount / requiredSkills.size) * 100 
      : 50;
    
    // Factor in experience requirement
    const experienceYears = resume.content.experience[0]?.startDate
      ? new Date().getFullYear() - new Date(resume.content.experience[0].startDate).getFullYear()
      : 0;
    
    const experienceMatch = job.requirements.experience > 0
      ? Math.min(100, (experienceYears / job.requirements.experience) * 100)
      : 100;
    
    // Calculate overall score
    const overallScore = Math.round((skillMatch * 0.6) + (experienceMatch * 0.4));
    
    return Math.min(100, Math.max(0, overallScore));
  }

  private generateHash(data: any): string {
    return Buffer.from(JSON.stringify(data))
      .toString('base64')
      .substring(0, 16);
  }

  async processGeneralPrompt(prompt: string): Promise<string> {
    this.logger.info('Mock processing general prompt');
    
    // Simple mock response
    if (prompt.includes('polish') && prompt.includes('experience')) {
      return JSON.stringify({
        description: "Led the development of critical backend services, managing a team of developers and ensuring successful project delivery within tight deadlines.",
        highlights: [
          "Reduced system response time by 60% through optimization",
          "Managed a team of 5 developers across 3 projects",
          "Implemented 20+ microservices handling 10,000 requests/day",
          "Achieved 99.9% uptime over 12 months",
          "Delivered projects 15% under budget",
          "Increased code coverage from 45% to 90%",
          "Reduced bug count by 75% through TDD practices",
          "Mentored 3 junior developers who were promoted within 1 year"
        ],
        technologies: ["TypeScript", "Node.js", "Docker", "Kubernetes", "PostgreSQL", "Redis", "AWS"],
        suggestions: ["Add more specific metrics", "Include team size information", "Mention specific achievements"]
      }, null, 2);
    }
    
    return "Mock AI response for: " + prompt.substring(0, 100);
  }
}

// For path operations
import * as path from 'path';