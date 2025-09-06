/**
 * Section title localization for resumes
 */

export interface SectionTitles {
  professionalSummary: string;
  workExperience: string;
  projects: string;
  education: string;
  skills: string;
  technicalSkills: string;
  certifications: string;
  languages: string;
  awards: string;
}

const SECTION_TITLES: Record<string, SectionTitles> = {
  en: {
    professionalSummary: 'Professional Summary',
    workExperience: 'Work Experience',
    projects: 'Projects',
    education: 'Education',
    skills: 'Skills',
    technicalSkills: 'Technical Skills',
    certifications: 'Certifications',
    languages: 'Languages',
    awards: 'Awards'
  },
  zh: {
    professionalSummary: '专业概述',
    workExperience: '工作经历',
    projects: '项目经验',
    education: '教育背景',
    skills: '技能',
    technicalSkills: '技术技能',
    certifications: '证书',
    languages: '语言',
    awards: '获奖'
  },
  'zh-CN': {
    professionalSummary: '专业概述',
    workExperience: '工作经历',
    projects: '项目经验',
    education: '教育背景',
    skills: '技能',
    technicalSkills: '技术技能',
    certifications: '证书',
    languages: '语言',
    awards: '获奖'
  },
  'zh-TW': {
    professionalSummary: '專業概述',
    workExperience: '工作經歷',
    projects: '專案經驗',
    education: '教育背景',
    skills: '技能',
    technicalSkills: '技術技能',
    certifications: '證書',
    languages: '語言',
    awards: '獲獎'
  }
};

/**
 * Get section titles based on user's language preference
 * @param languages User's language array, e.g., ['Chinese', 'English']
 * @returns Localized section titles
 */
export function getSectionTitles(languages?: string[]): SectionTitles {
  if (!languages || languages.length === 0) {
    return SECTION_TITLES.en;
  }

  const primaryLanguage = languages[0].toLowerCase();
  
  // Check for Chinese variants
  if (primaryLanguage.includes('chinese') || 
      primaryLanguage.includes('中文') ||
      primaryLanguage.includes('mandarin')) {
    return SECTION_TITLES.zh;
  }
  
  if (primaryLanguage.includes('cantonese') || 
      primaryLanguage.includes('繁體') ||
      primaryLanguage.includes('traditional')) {
    return SECTION_TITLES['zh-TW'];
  }
  
  // Default to English
  return SECTION_TITLES.en;
}

/**
 * Get a specific section title
 * @param section Section name
 * @param languages User's language array
 * @returns Localized section title
 */
export function getSectionTitle(section: keyof SectionTitles, languages?: string[]): string {
  const titles = getSectionTitles(languages);
  return titles[section];
}

/**
 * Education degree translations
 */
export interface EducationDegrees {
  highSchool: string;
  associate: string;
  bachelors: string;
  masters: string;
  doctorate: string;
  professional: string;
  other: string;
}

const EDUCATION_DEGREES: Record<string, EducationDegrees> = {
  en: {
    highSchool: 'High School',
    associate: 'Associate',
    bachelors: "Bachelor's",
    masters: "Master's",
    doctorate: 'Doctorate',
    professional: 'Professional',
    other: 'Other'
  },
  zh: {
    highSchool: '高中',
    associate: '大专',
    bachelors: '学士',
    masters: '硕士',
    doctorate: '博士',
    professional: '专业学位',
    other: '其他'
  },
  'zh-CN': {
    highSchool: '高中',
    associate: '大专',
    bachelors: '学士',
    masters: '硕士',
    doctorate: '博士',
    professional: '专业学位',
    other: '其他'
  },
  'zh-TW': {
    highSchool: '高中',
    associate: '大專',
    bachelors: '學士',
    masters: '碩士',
    doctorate: '博士',
    professional: '專業學位',
    other: '其他'
  }
};

/**
 * Get education degree translations based on user's language preference
 * @param languages User's language array
 * @returns Localized education degrees
 */
export function getEducationDegrees(languages?: string[]): EducationDegrees {
  if (!languages || languages.length === 0) {
    return EDUCATION_DEGREES.en;
  }

  const primaryLanguage = languages[0].toLowerCase();
  
  // Check for Chinese variants
  if (primaryLanguage.includes('chinese') || 
      primaryLanguage.includes('中文') ||
      primaryLanguage.includes('mandarin')) {
    return EDUCATION_DEGREES.zh;
  }
  
  if (primaryLanguage.includes('cantonese') || 
      primaryLanguage.includes('繁體') ||
      primaryLanguage.includes('traditional')) {
    return EDUCATION_DEGREES['zh-TW'];
  }
  
  // Default to English
  return EDUCATION_DEGREES.en;
}