/**
 * MBTI Compatibility Scoring System - MBTI兼容性评分系统
 * 基于认知功能理论和实证研究的性格兼容性评分
 */

import type { MBTIType } from '@/types/database';

// ========================================
// 类型定义
// ========================================

/**
 * MBTI认知功能类型
 */
export type CognitiveFunction = 
  | 'Se' | 'Si' // 感觉功能（外向/内向）
  | 'Ne' | 'Ni' // 直觉功能（外向/内向）
  | 'Te' | 'Ti' // 思考功能（外向/内向）
  | 'Fe' | 'Fi'; // 情感功能（外向/内向）

/**
 * 兼容性级别
 */
export enum CompatibilityLevel {
  IDEAL = 'ideal',           // 理想匹配 (95-100)
  EXCELLENT = 'excellent',   // 极佳匹配 (85-94)
  GOOD = 'good',             // 良好匹配 (70-84)
  MODERATE = 'moderate',     // 一般匹配 (55-69)
  CHALLENGING = 'challenging' // 挑战匹配 (40-54)
}

/**
 * 兼容性结果接口
 */
export interface MBTICompatibilityResult {
  score: number;              // 兼容性分数 (0-100)
  level: CompatibilityLevel;  // 兼容性级别
  strengths: string[];        // 优势描述
  challenges: string[];       // 挑战描述
  advice: string;             // 建议
}

/**
 * MBTI类型信息接口
 */
export interface MBTITypeInfo {
  type: MBTIType;
  name: {
    en: string;
    zh: string;
  };
  description: {
    en: string;
    zh: string;
  };
  cognitiveFunctions: CognitiveFunction[];
}

// ========================================
// MBTI类型信息定义
// ========================================

export const MBTI_TYPE_INFO: Record<MBTIType, MBTITypeInfo> = {
  // 分析师类型 (NT)
  INTJ: {
    type: 'INTJ',
    name: { en: 'Architect', zh: '建筑师' },
    description: { 
      en: 'Strategic, independent, determined',
      zh: '战略性、独立、坚定'
    },
    cognitiveFunctions: ['Ni', 'Te', 'Fi', 'Se']
  },
  INTP: {
    type: 'INTP',
    name: { en: 'Logician', zh: '逻辑学家' },
    description: {
      en: 'Analytical, objective, reserved',
      zh: '分析性、客观、内敛'
    },
    cognitiveFunctions: ['Ti', 'Ne', 'Si', 'Fe']
  },
  ENTJ: {
    type: 'ENTJ',
    name: { en: 'Commander', zh: '指挥官' },
    description: {
      en: 'Bold, strategic, charismatic leader',
      zh: '果断、战略性、魅力领袖'
    },
    cognitiveFunctions: ['Te', 'Ni', 'Se', 'Fi']
  },
  ENTP: {
    type: 'ENTP',
    name: { en: 'Debater', zh: '辩论家' },
    description: {
      en: 'Clever, curious, intellectual challenger',
      zh: '聪明、好奇、智识挑战者'
    },
    cognitiveFunctions: ['Ne', 'Ti', 'Fe', 'Si']
  },

  // 外交官类型 (NF)
  INFJ: {
    type: 'INFJ',
    name: { en: 'Advocate', zh: '提倡者' },
    description: {
      en: 'Insightful, principled, compassionate',
      zh: '洞察力强、有原则、富有同情心'
    },
    cognitiveFunctions: ['Ni', 'Fe', 'Ti', 'Se']
  },
  INFP: {
    type: 'INFP',
    name: { en: 'Mediator', zh: '调停者' },
    description: {
      en: 'Idealistic, empathetic, creative',
      zh: '理想主义、共情、有创造力'
    },
    cognitiveFunctions: ['Fi', 'Ne', 'Si', 'Te']
  },
  ENFJ: {
    type: 'ENFJ',
    name: { en: 'Protagonist', zh: '主人公' },
    description: {
      en: 'Charismatic, inspiring leader',
      zh: '魅力非凡、鼓舞人心的领袖'
    },
    cognitiveFunctions: ['Fe', 'Ni', 'Se', 'Ti']
  },
  ENFP: {
    type: 'ENFP',
    name: { en: 'Campaigner', zh: '竞选者' },
    description: {
      en: 'Enthusiastic, creative, sociable',
      zh: '热情、有创造力、善于社交'
    },
    cognitiveFunctions: ['Ne', 'Fi', 'Te', 'Si']
  },

  // 守卫者类型 (SJ)
  ISTJ: {
    type: 'ISTJ',
    name: { en: 'Logistician', zh: '物流师' },
    description: {
      en: 'Responsible, thorough, dependable',
      zh: '负责任、细致、可靠'
    },
    cognitiveFunctions: ['Si', 'Te', 'Fi', 'Ne']
  },
  ISFJ: {
    type: 'ISFJ',
    name: { en: 'Defender', zh: '守卫者' },
    description: {
      en: 'Supportive, reliable, patient',
      zh: '支持性强、可靠、有耐心'
    },
    cognitiveFunctions: ['Si', 'Fe', 'Ti', 'Ne']
  },
  ESTJ: {
    type: 'ESTJ',
    name: { en: 'Executive', zh: '总经理' },
    description: {
      en: 'Organized, group-oriented, dedicated',
      zh: '有组织力、重视团队、敬业'
    },
    cognitiveFunctions: ['Te', 'Si', 'Ne', 'Fi']
  },
  ESFJ: {
    type: 'ESFJ',
    name: { en: 'Consul', zh: '执政官' },
    description: {
      en: 'Caring, sociable, traditional',
      zh: '关爱他人、善于社交、传统'
    },
    cognitiveFunctions: ['Fe', 'Si', 'Ne', 'Ti']
  },

  // 探险家类型 (SP)
  ISTP: {
    type: 'ISTP',
    name: { en: 'Virtuoso', zh: '鉴赏家' },
    description: {
      en: 'Practical, observant, analytical',
      zh: '务实、善于观察、分析性'
    },
    cognitiveFunctions: ['Ti', 'Se', 'Ni', 'Fe']
  },
  ISFP: {
    type: 'ISFP',
    name: { en: 'Adventurer', zh: '探险家' },
    description: {
      en: 'Artistic, sensitive, gentle',
      zh: '艺术性、敏感、温和'
    },
    cognitiveFunctions: ['Fi', 'Se', 'Ni', 'Te']
  },
  ESTP: {
    type: 'ESTP',
    name: { en: 'Entrepreneur', zh: '企业家' },
    description: {
      en: 'Energetic, perceptive, bold',
      zh: '精力充沛、善于察觉、大胆'
    },
    cognitiveFunctions: ['Se', 'Ti', 'Fe', 'Ni']
  },
  ESFP: {
    type: 'ESFP',
    name: { en: 'Entertainer', zh: '表演者' },
    description: {
      en: 'Spontaneous, energetic, entertaining',
      zh: '自发性强、精力充沛、有娱乐性'
    },
    cognitiveFunctions: ['Se', 'Fi', 'Te', 'Ni']
  }
};

// ========================================
// 兼容性矩阵
// ========================================

/**
 * MBTI兼容性分数矩阵
 * 基于认知功能互补性和实证研究
 * 分数范围: 40-100
 */
export const MBTI_COMPATIBILITY_MATRIX: Record<MBTIType, Record<MBTIType, number>> = {
  // INTJ 兼容性
  INTJ: {
    INTJ: 80, INTP: 85, ENTJ: 90, ENTP: 95,
    INFJ: 88, INFP: 75, ENFJ: 82, ENFP: 92,
    ISTJ: 70, ISFJ: 60, ESTJ: 65, ESFJ: 55,
    ISTP: 72, ISFP: 62, ESTP: 58, ESFP: 50
  },
  // INTP 兼容性
  INTP: {
    INTJ: 85, INTP: 78, ENTJ: 88, ENTP: 90,
    INFJ: 82, INFP: 80, ENFJ: 75, ENFP: 85,
    ISTJ: 72, ISFJ: 65, ESTJ: 68, ESFJ: 60,
    ISTP: 82, ISFP: 70, ESTP: 72, ESFP: 58
  },
  // ENTJ 兼容性
  ENTJ: {
    INTJ: 90, INTP: 88, ENTJ: 75, ENTP: 85,
    INFJ: 85, INFP: 80, ENFJ: 78, ENFP: 82,
    ISTJ: 78, ISFJ: 65, ESTJ: 72, ESFJ: 68,
    ISTP: 75, ISFP: 68, ESTP: 72, ESFP: 60
  },
  // ENTP 兼容性
  ENTP: {
    INTJ: 95, INTP: 90, ENTJ: 85, ENTP: 75,
    INFJ: 92, INFP: 85, ENFJ: 80, ENFP: 82,
    ISTJ: 65, ISFJ: 58, ESTJ: 62, ESFJ: 60,
    ISTP: 78, ISFP: 72, ESTP: 75, ESFP: 68
  },
  // INFJ 兼容性
  INFJ: {
    INTJ: 88, INTP: 82, ENTJ: 85, ENTP: 92,
    INFJ: 80, INFP: 88, ENFJ: 85, ENFP: 95,
    ISTJ: 65, ISFJ: 72, ESTJ: 58, ESFJ: 68,
    ISTP: 62, ISFP: 75, ESTP: 55, ESFP: 65
  },
  // INFP 兼容性
  INFP: {
    INTJ: 75, INTP: 80, ENTJ: 80, ENTP: 85,
    INFJ: 88, INFP: 78, ENFJ: 92, ENFP: 88,
    ISTJ: 58, ISFJ: 68, ESTJ: 55, ESFJ: 65,
    ISTP: 60, ISFP: 78, ESTP: 52, ESFP: 70
  },
  // ENFJ 兼容性
  ENFJ: {
    INTJ: 82, INTP: 75, ENTJ: 78, ENTP: 80,
    INFJ: 85, INFP: 92, ENFJ: 75, ENFP: 85,
    ISTJ: 68, ISFJ: 78, ESTJ: 70, ESFJ: 80,
    ISTP: 65, ISFP: 82, ESTP: 62, ESFP: 78
  },
  // ENFP 兼容性
  ENFP: {
    INTJ: 92, INTP: 85, ENTJ: 82, ENTP: 82,
    INFJ: 95, INFP: 88, ENFJ: 85, ENFP: 75,
    ISTJ: 60, ISFJ: 65, ESTJ: 58, ESFJ: 68,
    ISTP: 68, ISFP: 80, ESTP: 65, ESFP: 75
  },
  // ISTJ 兼容性
  ISTJ: {
    INTJ: 70, INTP: 72, ENTJ: 78, ENTP: 65,
    INFJ: 65, INFP: 58, ENFJ: 68, ENFP: 60,
    ISTJ: 82, ISFJ: 85, ESTJ: 88, ESFJ: 90,
    ISTP: 80, ISFP: 75, ESTP: 78, ESFP: 72
  },
  // ISFJ 兼容性
  ISFJ: {
    INTJ: 60, INTP: 65, ENTJ: 65, ENTP: 58,
    INFJ: 72, INFP: 68, ENFJ: 78, ENFP: 65,
    ISTJ: 85, ISFJ: 80, ESTJ: 85, ESFJ: 92,
    ISTP: 72, ISFP: 82, ESTP: 70, ESFP: 85
  },
  // ESTJ 兼容性
  ESTJ: {
    INTJ: 65, INTP: 68, ENTJ: 72, ENTP: 62,
    INFJ: 58, INFP: 55, ENFJ: 70, ENFP: 58,
    ISTJ: 88, ISFJ: 85, ESTJ: 78, ESFJ: 85,
    ISTP: 78, ISFP: 70, ESTP: 82, ESFP: 75
  },
  // ESFJ 兼容性
  ESFJ: {
    INTJ: 55, INTP: 60, ENTJ: 68, ENTP: 60,
    INFJ: 68, INFP: 65, ENFJ: 80, ENFP: 68,
    ISTJ: 90, ISFJ: 92, ESTJ: 85, ESFJ: 78,
    ISTP: 68, ISFP: 82, ESTP: 75, ESFP: 88
  },
  // ISTP 兼容性
  ISTP: {
    INTJ: 72, INTP: 82, ENTJ: 75, ENTP: 78,
    INFJ: 62, INFP: 60, ENFJ: 65, ENFP: 68,
    ISTJ: 80, ISFJ: 72, ESTJ: 78, ESFJ: 68,
    ISTP: 78, ISFP: 80, ESTP: 85, ESFP: 82
  },
  // ISFP 兼容性
  ISFP: {
    INTJ: 62, INTP: 70, ENTJ: 68, ENTP: 72,
    INFJ: 75, INFP: 78, ENFJ: 82, ENFP: 80,
    ISTJ: 75, ISFJ: 82, ESTJ: 70, ESFJ: 82,
    ISTP: 80, ISFP: 75, ESTP: 82, ESFP: 88
  },
  // ESTP 兼容性
  ESTP: {
    INTJ: 58, INTP: 72, ENTJ: 72, ENTP: 75,
    INFJ: 55, INFP: 52, ENFJ: 62, ENFP: 65,
    ISTJ: 78, ISFJ: 70, ESTJ: 82, ESFJ: 75,
    ISTP: 85, ISFP: 82, ESTP: 78, ESFP: 90
  },
  // ESFP 兼容性
  ESFP: {
    INTJ: 50, INTP: 58, ENTJ: 60, ENTP: 68,
    INFJ: 65, INFP: 70, ENFJ: 78, ENFP: 75,
    ISTJ: 72, ISFJ: 85, ESTJ: 75, ESFJ: 88,
    ISTP: 82, ISFP: 88, ESTP: 90, ESFP: 78
  }
};

// ========================================
// 兼容性描述
// ========================================

interface CompatibilityDescription {
  strengths: {
    en: string[];
    zh: string[];
  };
  challenges: {
    en: string[];
    zh: string[];
  };
  advice: {
    en: string;
    zh: string;
  };
}

/**
 * 根据兼容性级别获取描述
 */
function getCompatibilityDescription(level: CompatibilityLevel, locale: 'en' | 'zh' = 'zh'): CompatibilityDescription {
  const descriptions: Record<CompatibilityLevel, CompatibilityDescription> = {
    [CompatibilityLevel.IDEAL]: {
      strengths: {
        en: ['Natural understanding and connection', 'Complementary cognitive functions', 'Strong emotional resonance'],
        zh: ['天然的理解和连接', '互补的认知功能', '强烈的情感共鸣']
      },
      challenges: {
        en: ['May become too similar over time', 'Potential for taking each other for granted'],
        zh: ['可能随时间变得过于相似', '可能会忽视对方的存在']
      },
      advice: {
        en: 'Maintain individual interests while nurturing your deep connection.',
        zh: '在培养深厚感情的同时保持各自的兴趣爱好。'
      }
    },
    [CompatibilityLevel.EXCELLENT]: {
      strengths: {
        en: ['Strong intellectual connection', 'Mutual growth potential', 'Good communication flow'],
        zh: ['强烈的智识连接', '共同成长的潜力', '良好的沟通流畅度']
      },
      challenges: {
        en: ['May need to work on emotional expression', 'Different energy levels possible'],
        zh: ['可能需要在情感表达上努力', '可能存在不同的能量水平']
      },
      advice: {
        en: 'Focus on understanding each other\'s emotional needs alongside intellectual pursuits.',
        zh: '在追求智识交流的同时关注彼此的情感需求。'
      }
    },
    [CompatibilityLevel.GOOD]: {
      strengths: {
        en: ['Complementary skills', 'Opportunity for personal growth', 'Balanced perspectives'],
        zh: ['互补的技能', '个人成长的机会', '平衡的视角']
      },
      challenges: {
        en: ['Communication styles may differ', 'Different approaches to decision-making'],
        zh: ['沟通方式可能不同', '决策方式可能不同']
      },
      advice: {
        en: 'Embrace your differences as opportunities to learn and grow together.',
        zh: '将差异视为共同学习和成长的机会。'
      }
    },
    [CompatibilityLevel.MODERATE]: {
      strengths: {
        en: ['Diverse perspectives', 'Potential for balance', 'Learning opportunities'],
        zh: ['多元化的视角', '平衡的潜力', '学习的机会']
      },
      challenges: {
        en: ['May struggle to understand each other', 'Different values or priorities possible'],
        zh: ['可能难以相互理解', '可能存在不同的价值观或优先级']
      },
      advice: {
        en: 'Patience and open communication are key. Focus on understanding before being understood.',
        zh: '耐心和开放的沟通是关键。先理解对方，再让对方理解自己。'
      }
    },
    [CompatibilityLevel.CHALLENGING]: {
      strengths: {
        en: ['Significant growth potential', 'Complementary blind spots', 'Unique perspectives'],
        zh: ['显著的成长潜力', '互补的盲点', '独特的视角']
      },
      challenges: {
        en: ['Fundamental differences in approach', 'May require significant effort to connect'],
        zh: ['处理方式存在根本差异', '可能需要付出很大努力才能建立连接']
      },
      advice: {
        en: 'Success requires commitment, patience, and willingness to adapt. Consider professional guidance.',
        zh: '成功需要承诺、耐心和适应的意愿。考虑寻求专业指导。'
      }
    }
  };

  return descriptions[level];
}

// ========================================
// 核心函数
// ========================================

/**
 * 计算两个MBTI类型之间的兼容性分数
 * @param type1 - 第一个MBTI类型
 * @param type2 - 第二个MBTI类型
 * @returns 兼容性分数 (0-100)
 */
export function calculateMBTICompatibility(
  type1: MBTIType | null | undefined,
  type2: MBTIType | null | undefined
): number {
  // 如果任一类型为空，返回默认中等分数
  if (!type1 || !type2) {
    return 65; // 默认中等兼容性
  }

  return MBTI_COMPATIBILITY_MATRIX[type1][type2];
}

/**
 * 获取兼容性级别
 * @param score - 兼容性分数
 * @returns 兼容性级别
 */
export function getCompatibilityLevel(score: number): CompatibilityLevel {
  if (score >= 95) return CompatibilityLevel.IDEAL;
  if (score >= 85) return CompatibilityLevel.EXCELLENT;
  if (score >= 70) return CompatibilityLevel.GOOD;
  if (score >= 55) return CompatibilityLevel.MODERATE;
  return CompatibilityLevel.CHALLENGING;
}

/**
 * 获取完整的兼容性分析结果
 * @param type1 - 第一个MBTI类型
 * @param type2 - 第二个MBTI类型
 * @param locale - 语言 ('en' | 'zh')
 * @returns 完整的兼容性分析结果
 */
export function getMBTICompatibilityResult(
  type1: MBTIType | null | undefined,
  type2: MBTIType | null | undefined,
  locale: 'en' | 'zh' = 'zh'
): MBTICompatibilityResult {
  const score = calculateMBTICompatibility(type1, type2);
  const level = getCompatibilityLevel(score);
  const description = getCompatibilityDescription(level, locale);

  return {
    score,
    level,
    strengths: description.strengths[locale],
    challenges: description.challenges[locale],
    advice: description.advice[locale]
  };
}

/**
 * 计算用户性格评分（基于MBTI）
 * 该函数用于市场价值评分系统中的性格维度
 * @param mbti - 用户的MBTI类型
 * @param targetMbti - 目标用户的MBTI类型（可选，用于匹配评分）
 * @returns 性格评分 (0-100)
 */
export function calculatePersonalityScore(
  mbti: MBTIType | null | undefined,
  targetMbti?: MBTIType | null | undefined
): number {
  if (!mbti) {
    return 70;
  }

  if (targetMbti) {
    return calculateMBTICompatibility(mbti, targetMbti);
  }

  const compatibilities = MBTI_COMPATIBILITY_MATRIX[mbti];
  const values = Object.values(compatibilities);
  if (values.length === 0) {
    return 70;
  }

  const avg = values.reduce((sum, score) => sum + score, 0) / values.length;
  return Math.round(avg * 10) / 10;
}

/**
 * 获取最佳匹配的MBTI类型列表
 * @param mbti - 用户的MBTI类型
 * @param topN - 返回的数量
 * @returns 最佳匹配的MBTI类型列表
 */
export function getBestMatchingTypes(
  mbti: MBTIType,
  topN: number = 4
): { type: MBTIType; score: number }[] {
  const compatibilities = Object.entries(MBTI_COMPATIBILITY_MATRIX[mbti])
    .map(([type, score]) => ({ type: type as MBTIType, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return compatibilities;
}

/**
 * 获取MBTI类型信息
 * @param mbti - MBTI类型
 * @param locale - 语言
 * @returns MBTI类型信息
 */
export function getMBTITypeInfo(
  mbti: MBTIType,
  locale: 'en' | 'zh' = 'zh'
): { name: string; description: string } {
  const info = MBTI_TYPE_INFO[mbti];
  return {
    name: info.name[locale],
    description: info.description[locale]
  };
}

/**
 * 获取所有MBTI类型
 * @returns MBTI类型数组
 */
export function getAllMBTITypes(): MBTIType[] {
  return Object.keys(MBTI_TYPE_INFO) as MBTIType[];
}

/**
 * 验证MBTI类型是否有效
 * @param type - 待验证的类型
 * @returns 是否为有效的MBTI类型
 */
export function isValidMBTIType(type: string): type is MBTIType {
  return type in MBTI_TYPE_INFO;
}

