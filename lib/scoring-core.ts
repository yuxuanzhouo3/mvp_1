import type { GenderEnum } from '@/types/database'

export enum ScoringFactor {
  WEALTH = 'wealth',
  EDUCATION = 'education',
  AGE = 'age',
  BMI = 'bmi',
  APPEARANCE = 'appearance',
  RELATIONSHIP_HISTORY = 'relationshipHistory',
  PERSONALITY = 'personality',
  JOB_STABILITY = 'jobStability',
  LOCATION = 'location',
  CHILDREN_PREFERENCE = 'childrenPreference',
}

export type AlgorithmType =
  | 'compatible_match'
  | 'romantic_match'
  | 'pragmatic_match'
  | 'serendipity'

export interface WeightConfig {
  [ScoringFactor.WEALTH]: number
  [ScoringFactor.EDUCATION]: number
  [ScoringFactor.AGE]: number
  [ScoringFactor.BMI]: number
  [ScoringFactor.APPEARANCE]: number
  [ScoringFactor.RELATIONSHIP_HISTORY]: number
  [ScoringFactor.PERSONALITY]: number
  [ScoringFactor.JOB_STABILITY]: number
  [ScoringFactor.LOCATION]: number
  [ScoringFactor.CHILDREN_PREFERENCE]: number
}

export function getWeights(
  algorithm: AlgorithmType,
  evaluatorGender: GenderEnum | string,
  targetGender: GenderEnum | string
): WeightConfig {
  const femaleEvaluatingMale: WeightConfig = {
    [ScoringFactor.WEALTH]: 0.3,
    [ScoringFactor.EDUCATION]: 0.1,
    [ScoringFactor.AGE]: 0.15,
    [ScoringFactor.BMI]: 0.05,
    [ScoringFactor.APPEARANCE]: 0.15,
    [ScoringFactor.RELATIONSHIP_HISTORY]: 0.05,
    [ScoringFactor.PERSONALITY]: 0.05,
    [ScoringFactor.JOB_STABILITY]: 0.05,
    [ScoringFactor.LOCATION]: 0.05,
    [ScoringFactor.CHILDREN_PREFERENCE]: 0.05,
  }

  const maleEvaluatingFemale: WeightConfig = {
    [ScoringFactor.WEALTH]: 0.1,
    [ScoringFactor.EDUCATION]: 0.1,
    [ScoringFactor.AGE]: 0.2,
    [ScoringFactor.BMI]: 0.05,
    [ScoringFactor.APPEARANCE]: 0.25,
    [ScoringFactor.RELATIONSHIP_HISTORY]: 0.1,
    [ScoringFactor.PERSONALITY]: 0.05,
    [ScoringFactor.JOB_STABILITY]: 0.05,
    [ScoringFactor.LOCATION]: 0.05,
    [ScoringFactor.CHILDREN_PREFERENCE]: 0.05,
  }

  switch (algorithm) {
    case 'romantic_match':
      if (evaluatorGender === 'female' && targetGender === 'male') {
        return {
          ...femaleEvaluatingMale,
          [ScoringFactor.APPEARANCE]: 0.2,
          [ScoringFactor.PERSONALITY]: 0.1,
          [ScoringFactor.WEALTH]: 0.25,
        }
      }
      if (evaluatorGender === 'male' && targetGender === 'female') {
        return {
          ...maleEvaluatingFemale,
          [ScoringFactor.APPEARANCE]: 0.3,
          [ScoringFactor.PERSONALITY]: 0.1,
          [ScoringFactor.AGE]: 0.15,
        }
      }
      break

    case 'pragmatic_match':
      if (evaluatorGender === 'female' && targetGender === 'male') {
        return {
          ...femaleEvaluatingMale,
          [ScoringFactor.WEALTH]: 0.35,
          [ScoringFactor.JOB_STABILITY]: 0.1,
          [ScoringFactor.APPEARANCE]: 0.1,
        }
      }
      if (evaluatorGender === 'male' && targetGender === 'female') {
        return {
          ...maleEvaluatingFemale,
          [ScoringFactor.EDUCATION]: 0.15,
          [ScoringFactor.JOB_STABILITY]: 0.1,
          [ScoringFactor.APPEARANCE]: 0.2,
        }
      }
      break

    case 'serendipity':
      return {
        [ScoringFactor.WEALTH]: 0.1,
        [ScoringFactor.EDUCATION]: 0.1,
        [ScoringFactor.AGE]: 0.1,
        [ScoringFactor.BMI]: 0.1,
        [ScoringFactor.APPEARANCE]: 0.1,
        [ScoringFactor.RELATIONSHIP_HISTORY]: 0.1,
        [ScoringFactor.PERSONALITY]: 0.1,
        [ScoringFactor.JOB_STABILITY]: 0.1,
        [ScoringFactor.LOCATION]: 0.1,
        [ScoringFactor.CHILDREN_PREFERENCE]: 0.1,
      }

    case 'compatible_match':
    default:
      break
  }

  if (evaluatorGender === 'female' && targetGender === 'male') {
    return femaleEvaluatingMale
  }
  if (evaluatorGender === 'male' && targetGender === 'female') {
    return maleEvaluatingFemale
  }

  return {
    [ScoringFactor.WEALTH]: 0.15,
    [ScoringFactor.EDUCATION]: 0.1,
    [ScoringFactor.AGE]: 0.15,
    [ScoringFactor.BMI]: 0.05,
    [ScoringFactor.APPEARANCE]: 0.2,
    [ScoringFactor.RELATIONSHIP_HISTORY]: 0.1,
    [ScoringFactor.PERSONALITY]: 0.05,
    [ScoringFactor.JOB_STABILITY]: 0.05,
    [ScoringFactor.LOCATION]: 0.1,
    [ScoringFactor.CHILDREN_PREFERENCE]: 0.05,
  }
}
