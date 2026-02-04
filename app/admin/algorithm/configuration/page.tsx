"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { AlgoTypeEnum } from "@/types/database";
import { getTranslations } from "@/lib/i18n";
import { isChinaDeployment } from "@/lib/config/deployment.config";
import {
  ALGORITHM_WEIGHTS,
  type AlgorithmWeightsMap,
  type FactorWeights,
} from "@/lib/matching/types";

type RegionKey = "cn" | "intl";
type SourceRegion = "CN" | "INTL";
type AlgorithmType = AlgoTypeEnum;
type GenderKey = "maleEvaluatingFemale" | "femaleEvaluatingMale";
type FactorKey = keyof FactorWeights;

type AlgorithmWeightsResponse = {
  cn?: AlgorithmWeightsMap;
  intl?: AlgorithmWeightsMap;
};

type EditableCell = {
  value: number;
  dirty: boolean;
};

type EditableGenderState = Record<FactorKey, EditableCell>;
type EditableAlgorithmState = Record<GenderKey, EditableGenderState>;
type EditableRegionState = Record<AlgorithmType, EditableAlgorithmState>;

const ALGORITHM_TYPES: AlgorithmType[] = [
  "compatible",
  "romantic",
  "pragmatic",
  "serendipity",
];

function getAlgorithmLabel(type: AlgorithmType, language: "zh" | "en") {
  const t = getTranslations(language) as any;
  const name = t?.matching?.algorithms?.[type]?.name;
  return typeof name === "string" && name.trim() ? name.trim() : type;
}

const FACTOR_LABELS: Record<FactorKey, string> = {
  wealth: "财富",
  education: "教育",
  age: "年龄",
  bmi: "BMI",
  appearance: "颜值",
  relationshipHistory: "恋爱史",
  personality: "性格",
  jobStability: "职业稳定",
  location: "距离",
  childrenPreference: "生育意愿",
};

const FACTOR_KEYS = Object.keys(FACTOR_LABELS) as FactorKey[];

function toEditableRegionState(weights: AlgorithmWeightsMap): EditableRegionState {
  return Object.fromEntries(
    ALGORITHM_TYPES.map((algorithmType) => [
      algorithmType,
      {
        maleEvaluatingFemale: Object.fromEntries(
          FACTOR_KEYS.map((factor) => [
            factor,
            {
              value: Number((weights[algorithmType].maleEvaluatingFemale[factor] || 0) * 100),
              dirty: false,
            },
          ])
        ) as EditableGenderState,
        femaleEvaluatingMale: Object.fromEntries(
          FACTOR_KEYS.map((factor) => [
            factor,
            {
              value: Number((weights[algorithmType].femaleEvaluatingMale[factor] || 0) * 100),
              dirty: false,
            },
          ])
        ) as EditableGenderState,
      },
    ])
  ) as EditableRegionState;
}

function emptyRegionState(): EditableRegionState {
  return toEditableRegionState(ALGORITHM_WEIGHTS);
}

function sumWeights(state: EditableGenderState): number {
  return FACTOR_KEYS.reduce((total, key) => total + (state[key]?.value || 0), 0);
}

function isApprox100(sum: number): boolean {
  return Math.abs(sum - 100) <= 0.5;
}

function toFactorWeights(state: EditableGenderState): FactorWeights {
  const base: FactorWeights = {
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
  return FACTOR_KEYS.reduce((acc, key) => {
    acc[key] = Number(state[key]?.value || 0) / 100;
    return acc;
  }, { ...base });
}

export default function AdminAlgorithmConfigurationPage() {
  const { toast } = useToast();
  const isCn = isChinaDeployment();
  const envLanguage = isCn ? "zh" : "en";
  const algorithms = useMemo(
    () =>
      ALGORITHM_TYPES.map((type) => ({
        type,
        label: getAlgorithmLabel(type, envLanguage),
      })),
    [envLanguage]
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RegionKey>("cn");
  const [activeAlgorithm, setActiveAlgorithm] = useState<AlgorithmType>("compatible");
  const [data, setData] = useState<Record<RegionKey, EditableRegionState>>({
    cn: emptyRegionState(),
    intl: emptyRegionState(),
  });
  const [availableRegions, setAvailableRegions] = useState<Record<RegionKey, boolean>>({
    cn: true,
    intl: true,
  });
  const [saving, setSaving] = useState<Record<RegionKey, boolean>>({ cn: false, intl: false });

  const tabMeta = useMemo(
    () => [
      { key: "cn" as const, label: "CN (CloudBase)", source: "CN" as const },
      { key: "intl" as const, label: "INTL (Supabase)", source: "INTL" as const },
    ],
    []
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/algorithm-weights");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as AlgorithmWeightsResponse;
      setData({
        cn: payload.cn ? toEditableRegionState(payload.cn) : emptyRegionState(),
        intl: payload.intl ? toEditableRegionState(payload.intl) : emptyRegionState(),
      });
      setAvailableRegions({
        cn: !!payload.cn,
        intl: !!payload.intl,
      });
    } catch (e) {
      toast({
        title: "加载失败",
        description: "无法获取算法配比配置，请稍后重试。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function updateCell(
    region: RegionKey,
    algorithmType: AlgorithmType,
    genderKey: GenderKey,
    factor: FactorKey,
    nextValue: number
  ) {
    setData((prev) => {
      const cell = prev[region][algorithmType][genderKey][factor];
      return {
        ...prev,
        [region]: {
          ...prev[region],
          [algorithmType]: {
            ...prev[region][algorithmType],
            [genderKey]: {
              ...prev[region][algorithmType][genderKey],
              [factor]: {
                ...cell,
                value: nextValue,
                dirty: true,
              },
            },
          },
        },
      };
    });
  }

  async function saveAlgorithm(region: RegionKey, source: SourceRegion, algorithmType: AlgorithmType) {
    if (!availableRegions[region]) {
      toast({
        title: "不可保存",
        description: "当前环境无法写入该侧数据。",
        variant: "destructive",
      });
      return;
    }

    const algorithmState = data[region][algorithmType];
    const maleSum = sumWeights(algorithmState.maleEvaluatingFemale);
    const femaleSum = sumWeights(algorithmState.femaleEvaluatingMale);

    if (!isApprox100(maleSum) || !isApprox100(femaleSum)) {
      toast({
        title: "请检查总和",
        description: "男评女 / 女评男 总和应约等于 100%。",
        variant: "destructive",
      });
      return;
    }

    setSaving((prev) => ({ ...prev, [region]: true }));
    try {
      const res = await fetch("/api/admin/algorithm-weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          algorithmType,
          updates: {
            maleEvaluatingFemale: toFactorWeights(algorithmState.maleEvaluatingFemale),
            femaleEvaluatingMale: toFactorWeights(algorithmState.femaleEvaluatingMale),
          },
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast({ title: "已保存", description: `${source} / ${algorithmType}` });
      setData((prev) => {
        const cleared = { ...prev[region][algorithmType] } as EditableAlgorithmState;
        (Object.keys(cleared) as GenderKey[]).forEach((genderKey) => {
          FACTOR_KEYS.forEach((factorKey) => {
            cleared[genderKey][factorKey] = {
              ...cleared[genderKey][factorKey],
              dirty: false,
            };
          });
        });
        return {
          ...prev,
          [region]: {
            ...prev[region],
            [algorithmType]: cleared,
          },
        };
      });
    } catch (e) {
      toast({
        title: "保存失败",
        description: "写入失败，可能是目标环境未配置或代理不可用。",
        variant: "destructive",
      });
    } finally {
      setSaving((prev) => ({ ...prev, [region]: false }));
    }
  }

  function renderRegion(region: RegionKey, title: string, source: SourceRegion) {
    const regionData = data[region];
    const editable = availableRegions[region];
    const busy = loading || saving[region];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
              刷新
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!editable && (
            <div className="text-sm text-slate-500 mb-4">
              当前环境暂时无法读取该侧数据（可能缺失数据库配置或跨环境代理失败）。页面仍保留结构以便查看。
            </div>
          )}

          <Tabs value={activeAlgorithm} onValueChange={(v) => setActiveAlgorithm(v as AlgorithmType)}>
            <TabsList>
                {algorithms.map((algorithm) => (
                  <TabsTrigger key={algorithm.type} value={algorithm.type}>
                    {algorithm.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {algorithms.map((algorithm) => {
                const algorithmState = regionData[algorithm.type];
                const maleSum = sumWeights(algorithmState.maleEvaluatingFemale);
                const femaleSum = sumWeights(algorithmState.femaleEvaluatingMale);
              const dirty =
                FACTOR_KEYS.some((factor) => algorithmState.maleEvaluatingFemale[factor].dirty) ||
                FACTOR_KEYS.some((factor) => algorithmState.femaleEvaluatingMale[factor].dirty);

              return (
                <TabsContent key={algorithm.type} value={algorithm.type} className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-slate-500">
                      男评女 / 女评男 合计应约等于 100%
                    </div>
                    <Button
                      size="sm"
                      onClick={() => saveAlgorithm(region, source, algorithm.type)}
                      disabled={busy || !dirty || !editable}
                    >
                      保存
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">因子</TableHead>
                        <TableHead>男评女 (%)</TableHead>
                        <TableHead>女评男 (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {FACTOR_KEYS.map((factor) => {
                        const maleCell = algorithmState.maleEvaluatingFemale[factor];
                        const femaleCell = algorithmState.femaleEvaluatingMale[factor];
                        return (
                          <TableRow key={`${region}-${algorithm.type}-${factor}`}>
                            <TableCell className="font-medium">{FACTOR_LABELS[factor]}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={Number.isFinite(maleCell.value) ? maleCell.value : 0}
                                onChange={(e) =>
                                  updateCell(
                                    region,
                                    algorithm.type,
                                    "maleEvaluatingFemale",
                                    factor,
                                    Number(e.target.value)
                                  )
                                }
                                disabled={!editable || busy}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={Number.isFinite(femaleCell.value) ? femaleCell.value : 0}
                                onChange={(e) =>
                                  updateCell(
                                    region,
                                    algorithm.type,
                                    "femaleEvaluatingMale",
                                    factor,
                                    Number(e.target.value)
                                  )
                                }
                                disabled={!editable || busy}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow>
                        <TableCell className="font-medium">合计</TableCell>
                        <TableCell className={isApprox100(maleSum) ? "text-emerald-600" : "text-rose-600"}>
                          {maleSum.toFixed(1)}%
                        </TableCell>
                        <TableCell className={isApprox100(femaleSum) ? "text-emerald-600" : "text-rose-600"}>
                          {femaleSum.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">算法配比</h1>
        <p className="text-slate-500 mt-1">
          管理四种匹配算法的因子权重（CN + INTL 均可查看与编辑）
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RegionKey)}>
        <TabsList>
          {tabMeta.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabMeta.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="mt-4">
            {renderRegion(tab.key, tab.label, tab.source)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
