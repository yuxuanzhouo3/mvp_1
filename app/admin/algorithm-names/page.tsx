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

type Language = "zh" | "en";
type AlgorithmType = AlgoTypeEnum;
type RegionKey = "cn" | "intl";
type SourceRegion = "CN" | "INTL";

type AlgorithmNamesResponse = {
  cn?: Record<AlgorithmType, Record<Language, string>>;
  intl?: Record<AlgorithmType, Record<Language, string>>;
};

type EditableCell = {
  value: string;
  dirty: boolean;
  saving: boolean;
};

type EditableRegionState = Record<AlgorithmType, Record<Language, EditableCell>>;

const ALGORITHMS: Array<{ type: AlgorithmType; label: string }> = [
  { type: "compatible", label: "compatible" },
  { type: "romantic", label: "romantic" },
  { type: "pragmatic", label: "pragmatic" },
  { type: "serendipity", label: "serendipity" },
];

function toEditableRegionState(
  input: Record<AlgorithmType, Record<Language, string>>
): EditableRegionState {
  return Object.fromEntries(
    ALGORITHMS.map((a) => [
      a.type,
      {
        zh: { value: input[a.type]?.zh ?? "", dirty: false, saving: false },
        en: { value: input[a.type]?.en ?? "", dirty: false, saving: false },
      },
    ])
  ) as EditableRegionState;
}

function emptyRegionState(): EditableRegionState {
  return Object.fromEntries(
    ALGORITHMS.map((a) => [
      a.type,
      {
        zh: { value: "", dirty: false, saving: false },
        en: { value: "", dirty: false, saving: false },
      },
    ])
  ) as EditableRegionState;
}

export default function AdminAlgorithmNamesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RegionKey>("cn");
  const [data, setData] = useState<Record<RegionKey, EditableRegionState>>({
    cn: emptyRegionState(),
    intl: emptyRegionState(),
  });
  const [availableRegions, setAvailableRegions] = useState<Record<RegionKey, boolean>>({
    cn: true,
    intl: true,
  });

  const tabMeta = useMemo(
    () => [
      { key: "cn" as const, label: "CN（CloudBase）", source: "CN" as const },
      { key: "intl" as const, label: "INTL（Supabase）", source: "INTL" as const },
    ],
    []
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/algorithm-names");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as AlgorithmNamesResponse;
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
        description: "无法获取算法名称配置，请稍后重试。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function updateCell(region: RegionKey, algorithmType: AlgorithmType, language: Language, next: string) {
    setData((prev) => {
      const cell = prev[region][algorithmType][language];
      return {
        ...prev,
        [region]: {
          ...prev[region],
          [algorithmType]: {
            ...prev[region][algorithmType],
            [language]: {
              ...cell,
              value: next,
              dirty: true,
            },
          },
        },
      };
    });
  }

  async function saveRow(region: RegionKey, source: SourceRegion, algorithmType: AlgorithmType) {
    const zh = data[region][algorithmType].zh.value.trim();
    const en = data[region][algorithmType].en.value.trim();
    if (!zh || !en) {
      toast({
        title: "请填写完整",
        description: "中英文名称都不能为空。",
        variant: "destructive",
      });
      return;
    }

    setData((prev) => ({
      ...prev,
      [region]: {
        ...prev[region],
        [algorithmType]: {
          zh: { ...prev[region][algorithmType].zh, saving: true },
          en: { ...prev[region][algorithmType].en, saving: true },
        },
      },
    }));

    try {
      const res = await fetch("/api/admin/algorithm-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          algorithmType,
          updates: { zh, en },
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      toast({ title: "已保存", description: `${source} / ${algorithmType}` });
      setData((prev) => ({
        ...prev,
        [region]: {
          ...prev[region],
          [algorithmType]: {
            zh: { ...prev[region][algorithmType].zh, dirty: false, saving: false },
            en: { ...prev[region][algorithmType].en, dirty: false, saving: false },
          },
        },
      }));
    } catch (e) {
      toast({
        title: "保存失败",
        description: "写入失败，可能是目标环境未配置或代理不可用。",
        variant: "destructive",
      });
      setData((prev) => ({
        ...prev,
        [region]: {
          ...prev[region],
          [algorithmType]: {
            zh: { ...prev[region][algorithmType].zh, saving: false },
            en: { ...prev[region][algorithmType].en, saving: false },
          },
        },
      }));
    }
  }

  function renderRegion(region: RegionKey, title: string, source: SourceRegion) {
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
          {!availableRegions[region] && (
            <div className="text-sm text-slate-500 mb-4">
              当前环境暂时无法读取该侧数据（可能缺少数据库配置或跨环境代理失败）。页面仍可显示结构以便查看。
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">算法</TableHead>
                <TableHead>中文（zh）</TableHead>
                <TableHead>英文（en）</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ALGORITHMS.map((a) => {
                const row = data[region][a.type];
                const disabled = loading || row.zh.saving || row.en.saving;
                const dirty = row.zh.dirty || row.en.dirty;
                return (
                  <TableRow key={`${region}-${a.type}`}>
                    <TableCell className="font-medium">{a.label}</TableCell>
                    <TableCell>
                      <Input
                        value={row.zh.value}
                        onChange={(e) => updateCell(region, a.type, "zh", e.target.value)}
                        disabled={disabled}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.en.value}
                        onChange={(e) => updateCell(region, a.type, "en", e.target.value)}
                        disabled={disabled}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => saveRow(region, source, a.type)}
                        disabled={disabled || !dirty}
                      >
                        保存
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">算法名称</h1>
        <p className="text-slate-500 mt-1">
          管理四种匹配算法的展示名称（CN + INTL 均可查看与编辑）
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RegionKey)}>
        <TabsList>
          {tabMeta.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabMeta.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            {renderRegion(t.key, t.label, t.source)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
