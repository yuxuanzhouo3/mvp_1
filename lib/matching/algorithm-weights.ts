import { getServiceDbClient } from '@/lib/db-client';
import type { GenderEnum } from '@/types/database';
import {
  ALGORITHM_WEIGHTS,
  type AlgorithmType,
  type AlgorithmWeightsMap,
  type FactorWeights,
} from './types';

export const FACTOR_KEYS: Array<keyof FactorWeights> = [
  'wealth',
  'education',
  'age',
  'bmi',
  'appearance',
  'relationshipHistory',
  'personality',
  'jobStability',
  'location',
  'childrenPreference',
];

export function normalizeWeights(input: unknown): FactorWeights | null {
  if (!input || typeof input !== 'object') return null;
  const result: FactorWeights = {
    wealth: 0,
    education: 0,
    age: 0,
    bmi: 0,
    appearance: 0,
    relationshipHistory: 0,
    personality: 0,
    jobStability: 0,
    location: 0,
    childrenPreference: 0,
  };
  for (const key of FACTOR_KEYS) {
    const value = Number((input as any)[key]);
    if (!Number.isFinite(value) || value < 0) return null;
    result[key] = value;
  }
  return result;
}

export function isValidWeights(weights: FactorWeights): boolean {
  const sum = FACTOR_KEYS.reduce((total, key) => total + (weights[key] || 0), 0);
  return Math.abs(sum - 1) <= 0.01;
}

export function mergeAlgorithmWeights(
  overrides: Partial<AlgorithmWeightsMap>
): AlgorithmWeightsMap {
  const base = JSON.parse(JSON.stringify(ALGORITHM_WEIGHTS)) as AlgorithmWeightsMap;
  for (const algorithm of Object.keys(base) as AlgorithmType[]) {
    const override = overrides[algorithm];
    if (!override) continue;
    if (override.maleEvaluatingFemale && isValidWeights(override.maleEvaluatingFemale)) {
      base[algorithm].maleEvaluatingFemale = override.maleEvaluatingFemale;
    }
    if (override.femaleEvaluatingMale && isValidWeights(override.femaleEvaluatingMale)) {
      base[algorithm].femaleEvaluatingMale = override.femaleEvaluatingMale;
    }
  }
  return base;
}

function buildOverrides(rows: any[]): Partial<AlgorithmWeightsMap> {
  const overrides: Partial<AlgorithmWeightsMap> = {};
  for (const row of rows || []) {
    const algorithmType = row?.algorithm_type as AlgorithmType;
    const evaluatorGender = row?.evaluator_gender as GenderEnum;
    const targetGender = row?.target_gender as GenderEnum;
    const weights = normalizeWeights(row?.weights);
    if (!algorithmType || !(algorithmType in ALGORITHM_WEIGHTS) || !weights) continue;

    const genderKey =
      evaluatorGender === 'male' && targetGender === 'female'
        ? 'maleEvaluatingFemale'
        : evaluatorGender === 'female' && targetGender === 'male'
        ? 'femaleEvaluatingMale'
        : null;

    if (!genderKey) continue;
    overrides[algorithmType] = overrides[algorithmType] || ({} as AlgorithmWeightsMap[AlgorithmType]);
    overrides[algorithmType]![genderKey] = weights;
  }
  return overrides;
}

export async function loadAlgorithmWeightsFromDb(): Promise<AlgorithmWeightsMap> {
  try {
    const db = await getServiceDbClient();
    const { data, error } = await db
      .from('algorithm_weight_configs')
      .select('algorithm_type, evaluator_gender, target_gender, weights');
    if (error) {
      return ALGORITHM_WEIGHTS;
    }
    return mergeAlgorithmWeights(buildOverrides(data || []));
  } catch {
    return ALGORITHM_WEIGHTS;
  }
}
