export interface EducationStrings {
  addEducationTitle: string;
  degreeLevel: string;
  fieldOfStudy: string;
  institution: string;
  startYear: string;
  graduationYear: string;
  gpa: string;
  achievements: string;
  degrees: {
    bachelors: string;
    masters: string;
    phd: string;
    associate: string;
    certificate: string;
    bootcamp: string;
    other: string;
  };
  fieldDefault: string;
  institutionRequired: string;
  enterValidYear: string;
  gpaOptional: string;
  achievementsHelp: string;
  educationAdded: string;
}

export function getEducationStrings(language: string): EducationStrings {
  const langLower = language.toLowerCase();
  
  if (langLower.includes('chinese') || langLower.includes('中文') || langLower.includes('mandarin')) {
    return {
      addEducationTitle: '🎓 添加教育经历',
      degreeLevel: '学位级别:',
      fieldOfStudy: '专业领域:',
      institution: '大学/机构:',
      startYear: '入学年份:',
      graduationYear: '毕业年份（或预期）:',
      gpa: 'GPA（可选）:',
      achievements: '成就/荣誉（分号分隔）:',
      degrees: {
        bachelors: '学士',
        masters: '硕士',
        phd: '博士',
        associate: '专科',
        certificate: '证书',
        bootcamp: '训练营',
        other: '其他'
      },
      fieldDefault: '计算机科学',
      institutionRequired: '机构名称是必需的',
      enterValidYear: '请输入有效年份',
      gpaOptional: '例如: 3.8/4.0',
      achievementsHelp: '例如: 院长名单; 优秀毕业生; ACM竞赛一等奖',
      educationAdded: '✓ 教育经历添加成功！'
    };
  } else if (langLower.includes('spanish') || langLower.includes('español')) {
    return {
      addEducationTitle: '🎓 Agregar Educación',
      degreeLevel: 'Nivel de grado:',
      fieldOfStudy: 'Campo de estudio:',
      institution: 'Universidad/Institución:',
      startYear: 'Año de inicio:',
      graduationYear: 'Año de graduación (o esperado):',
      gpa: 'GPA (opcional):',
      achievements: 'Logros/Honores (separados por punto y coma):',
      degrees: {
        bachelors: 'Licenciatura',
        masters: 'Maestría',
        phd: 'Doctorado',
        associate: 'Técnico',
        certificate: 'Certificado',
        bootcamp: 'Bootcamp',
        other: 'Otro'
      },
      fieldDefault: 'Ciencias de la Computación',
      institutionRequired: 'La institución es requerida',
      enterValidYear: 'Ingrese un año válido',
      gpaOptional: 'Ej: 3.8/4.0',
      achievementsHelp: 'Ej: Lista del decano; Graduado con honores; Primer lugar ACM',
      educationAdded: '✓ ¡Educación agregada exitosamente!'
    };
  } else if (langLower.includes('french') || langLower.includes('français')) {
    return {
      addEducationTitle: '🎓 Ajouter Formation',
      degreeLevel: 'Niveau de diplôme:',
      fieldOfStudy: 'Domaine d\'études:',
      institution: 'Université/Institution:',
      startYear: 'Année de début:',
      graduationYear: 'Année de diplôme (ou prévue):',
      gpa: 'GPA (optionnel):',
      achievements: 'Réalisations/Honneurs (séparés par point-virgule):',
      degrees: {
        bachelors: 'Licence',
        masters: 'Master',
        phd: 'Doctorat',
        associate: 'BTS/DUT',
        certificate: 'Certificat',
        bootcamp: 'Bootcamp',
        other: 'Autre'
      },
      fieldDefault: 'Informatique',
      institutionRequired: 'L\'institution est requise',
      enterValidYear: 'Entrez une année valide',
      gpaOptional: 'Ex: 3.8/4.0',
      achievementsHelp: 'Ex: Tableau d\'honneur; Diplômé avec mention; 1er prix ACM',
      educationAdded: '✓ Formation ajoutée avec succès!'
    };
  } else if (langLower.includes('german') || langLower.includes('deutsch')) {
    return {
      addEducationTitle: '🎓 Bildung hinzufügen',
      degreeLevel: 'Abschlussebene:',
      fieldOfStudy: 'Studienbereich:',
      institution: 'Universität/Institution:',
      startYear: 'Startjahr:',
      graduationYear: 'Abschlussjahr (oder erwartet):',
      gpa: 'GPA (optional):',
      achievements: 'Erfolge/Auszeichnungen (Semikolon-getrennt):',
      degrees: {
        bachelors: 'Bachelor',
        masters: 'Master',
        phd: 'Doktorat',
        associate: 'Fachhochschule',
        certificate: 'Zertifikat',
        bootcamp: 'Bootcamp',
        other: 'Andere'
      },
      fieldDefault: 'Informatik',
      institutionRequired: 'Institution ist erforderlich',
      enterValidYear: 'Gültiges Jahr eingeben',
      gpaOptional: 'z.B: 3.8/4.0',
      achievementsHelp: 'z.B: Dekansliste; Mit Auszeichnung; ACM 1. Platz',
      educationAdded: '✓ Bildung erfolgreich hinzugefügt!'
    };
  } else if (langLower.includes('japanese') || langLower.includes('日本語')) {
    return {
      addEducationTitle: '🎓 学歴を追加',
      degreeLevel: '学位レベル:',
      fieldOfStudy: '専攻分野:',
      institution: '大学/機関:',
      startYear: '入学年:',
      graduationYear: '卒業年（または予定）:',
      gpa: 'GPA（任意）:',
      achievements: '成果/受賞（セミコロン区切り）:',
      degrees: {
        bachelors: '学士',
        masters: '修士',
        phd: '博士',
        associate: '準学士',
        certificate: '認定証',
        bootcamp: 'ブートキャンプ',
        other: 'その他'
      },
      fieldDefault: 'コンピュータサイエンス',
      institutionRequired: '機関名は必須です',
      enterValidYear: '有効な年を入力してください',
      gpaOptional: '例: 3.8/4.0',
      achievementsHelp: '例: 学部長リスト; 優等卒業; ACM一等賞',
      educationAdded: '✓ 学歴が正常に追加されました！'
    };
  } else if (langLower.includes('korean') || langLower.includes('한국어')) {
    return {
      addEducationTitle: '🎓 학력 추가',
      degreeLevel: '학위 수준:',
      fieldOfStudy: '전공 분야:',
      institution: '대학/기관:',
      startYear: '입학 연도:',
      graduationYear: '졸업 연도 (또는 예정):',
      gpa: 'GPA (선택사항):',
      achievements: '성과/수상 (세미콜론으로 구분):',
      degrees: {
        bachelors: '학사',
        masters: '석사',
        phd: '박사',
        associate: '전문학사',
        certificate: '자격증',
        bootcamp: '부트캠프',
        other: '기타'
      },
      fieldDefault: '컴퓨터 과학',
      institutionRequired: '기관명은 필수입니다',
      enterValidYear: '유효한 연도를 입력하세요',
      gpaOptional: '예: 3.8/4.0',
      achievementsHelp: '예: 학장 명단; 우등 졸업; ACM 1등상',
      educationAdded: '✓ 학력이 성공적으로 추가되었습니다!'
    };
  } else {
    // Default to English
    return {
      addEducationTitle: '🎓 Add Education',
      degreeLevel: 'Degree level:',
      fieldOfStudy: 'Field of study:',
      institution: 'University/Institution:',
      startYear: 'Start year:',
      graduationYear: 'Graduation year (or expected):',
      gpa: 'GPA (optional):',
      achievements: 'Achievements/Honors (semicolon-separated):',
      degrees: {
        bachelors: 'Bachelor\'s',
        masters: 'Master\'s',
        phd: 'PhD',
        associate: 'Associate',
        certificate: 'Certificate',
        bootcamp: 'Bootcamp',
        other: 'Other'
      },
      fieldDefault: 'Computer Science',
      institutionRequired: 'Institution is required',
      enterValidYear: 'Enter a valid year',
      gpaOptional: 'e.g., 3.8/4.0',
      achievementsHelp: 'e.g., Dean\'s List; Summa Cum Laude; ACM Contest 1st Place',
      educationAdded: '✓ Education added successfully!'
    };
  }
}

export function getCommonFields(language: string): { [key: string]: string } {
  const langLower = language.toLowerCase();
  
  if (langLower.includes('chinese') || langLower.includes('中文') || langLower.includes('mandarin')) {
    return {
      'Computer Science': '计算机科学',
      'Software Engineering': '软件工程',
      'Data Science': '数据科学',
      'Artificial Intelligence': '人工智能',
      'Information Technology': '信息技术',
      'Electrical Engineering': '电气工程',
      'Mathematics': '数学',
      'Physics': '物理学',
      'Business Administration': '工商管理',
      'Economics': '经济学'
    };
  }
  
  // For other languages, return the original English names for now
  return {
    'Computer Science': 'Computer Science',
    'Software Engineering': 'Software Engineering',
    'Data Science': 'Data Science',
    'Artificial Intelligence': 'Artificial Intelligence',
    'Information Technology': 'Information Technology',
    'Electrical Engineering': 'Electrical Engineering',
    'Mathematics': 'Mathematics',
    'Physics': 'Physics',
    'Business Administration': 'Business Administration',
    'Economics': 'Economics'
  };
}