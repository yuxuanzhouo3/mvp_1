"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

type Source = "CN" | "INTL";

interface VideoDemo {
  id: string;
  video_url: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  source: Source;
}

export default function AdminVideoDemoPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<VideoDemo[]>([]);
  const [selectedSource, setSelectedSource] = useState<Source>("CN");
  const [showBoth, setShowBoth] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<VideoDemo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    source: "CN" as Source,
    title: "",
    description: "",
    is_active: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const sourceParam = showBoth ? "ALL" : selectedSource;
      const res = await fetch(`/api/admin/video-demo?source=${sourceParam}&t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      setVideos(Array.isArray(payload.data) ? payload.data : []);
    } catch {
      toast({
        title: "加载失败",
        description: "无法获取视频列表，请稍后重试。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedSource, showBoth, toast]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, source: selectedSource }));
  }, [selectedSource]);

  async function handleCreate() {
    const title = form.title.trim();
    const description = form.description.trim();

    if (!title) {
      toast({ title: "请输入标题", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "请选择本地视频文件", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("source", form.source);
      body.append("title", title);
      body.append("description", description);
      body.append("is_active", form.is_active ? "true" : "false");
      body.append("file", file);

      const res = await fetch("/api/admin/video-demo", {
        method: "POST",
        body,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }

      toast({ title: "创建成功" });
      setForm((prev) => ({ ...prev, title: "", description: "", is_active: true }));
      setFile(null);
      await fetchVideos();
    } catch (e: any) {
      toast({
        title: "创建失败",
        description: e?.message || "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(video: VideoDemo) {
    setTogglingId(video.id);
    try {
      const res = await fetch(`/api/admin/video-demo/${video.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: video.source,
          is_active: !video.is_active,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      toast({ title: video.is_active ? "已停用" : "已激活" });
      await fetchVideos();
    } catch (e: any) {
      toast({
        title: "操作失败",
        description: e?.message || "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/video-demo/${deleteTarget.id}?source=${deleteTarget.source}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      toast({ title: "已删除" });
      setDeleteTarget(null);
      await fetchVideos();
    } catch (e: any) {
      toast({
        title: "删除失败",
        description: e?.message || "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  const previewVideo = useMemo(
    () => videos.find((item) => item.id === previewId) || null,
    [previewId, videos]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">视频演示</h1>
        <p className="text-slate-500 mt-1">管理 Profile Setup 页面的演示视频（CN + INTL 同时可见）</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={selectedSource} onValueChange={(v) => setSelectedSource(v as Source)}>
          <TabsList>
            <TabsTrigger value="CN">CN</TabsTrigger>
            <TabsTrigger value="INTL">INTL</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant={showBoth ? "default" : "outline"}
          onClick={() => setShowBoth((prev) => !prev)}
          className={showBoth ? "bg-slate-900 hover:bg-slate-800" : ""}
        >
          {showBoth ? "同屏：开" : "同屏：关"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>添加视频（本地上传）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">目标环境 *</div>
              <Tabs
                value={form.source}
                onValueChange={(v) => setForm((prev) => ({ ...prev, source: v as Source }))}
              >
                <TabsList>
                  <TabsTrigger value="CN">CN</TabsTrigger>
                  <TabsTrigger value="INTL">INTL</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">标题 *</div>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="输入视频标题"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="text-sm font-medium">本地视频文件 *</div>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={submitting}
              />
              <div className="text-xs text-slate-500">{file ? `已选择：${file.name}` : "未选择文件"}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">描述</div>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="输入视频描述（可选）"
              disabled={submitting}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600 flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                disabled={submitting}
              />
              上传后设为激活
            </label>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "提交中..." : "添加"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>视频列表</span>
            <Button variant="outline" size="sm" onClick={fetchVideos} disabled={loading}>
              刷新
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">标题</TableHead>
                <TableHead className="w-[100px]">环境</TableHead>
                <TableHead>描述</TableHead>
                <TableHead className="w-[100px]">状态</TableHead>
                <TableHead className="w-[160px]">创建时间</TableHead>
                <TableHead className="w-[280px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-slate-500 py-8">
                    {loading ? "加载中..." : "暂无视频"}
                  </TableCell>
                </TableRow>
              ) : (
                videos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell className="font-medium">{video.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{video.source}</Badge>
                    </TableCell>
                    <TableCell className="truncate max-w-[300px]" title={video.description}>
                      {video.description || "-"}
                    </TableCell>
                    <TableCell>
                      {video.is_active ? (
                        <Badge variant="default">激活</Badge>
                      ) : (
                        <Badge variant="secondary">停用</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(video.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewId(previewId === video.id ? null : video.id)}
                        >
                          {previewId === video.id ? "收起" : "预览"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleToggleActive(video)}
                          disabled={loading || togglingId === video.id}
                        >
                          {video.is_active ? "停用" : "激活"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget(video)}
                          disabled={loading}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {previewVideo && (
            <div className="mt-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
              <div className="text-sm font-medium mb-2">
                预览：{previewVideo.title} <Badge variant="outline">{previewVideo.source}</Badge>
              </div>
              <video
                key={previewVideo.id}
                src={previewVideo.video_url}
                controls
                className="w-full max-w-2xl rounded"
                style={{ maxHeight: "400px" }}
              >
                您的浏览器不支持视频播放
              </video>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除视频「{deleteTarget?.title}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

