"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isChinaDeployment } from "@/lib/config/deployment.config";

interface VideoDemoData {
  video_url: string;
  title: string;
  description?: string;
}

export function VideoDemoPanel() {
  const [videoData, setVideoData] = useState<VideoDemoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const unavailableText = isChinaDeployment() ? "暂无可用演示视频" : "No demo video available";

  useEffect(() => {
    async function fetchVideoDemo() {
      try {
        const res = await fetch("/api/video-demo", { cache: "no-store" });
        if (!res.ok) {
          setVideoData(null);
          return;
        }

        const json = await res.json();
        if (json.success && json.data?.video_url) {
          setVideoData({
            video_url: json.data.video_url,
            title: json.data.title || "Demo Video",
            description: json.data.description || "",
          });
        } else {
          setVideoData(null);
        }
      } catch {
        setVideoData(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVideoDemo();
  }, []);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4" />
            Demo Video
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="aspect-[9/16] rounded-md bg-slate-100 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!videoData) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4" />
            Demo Video
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="aspect-[9/16] rounded-md border border-dashed border-slate-300 flex items-center justify-center text-sm text-slate-500">
            {unavailableText}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Play className="h-4 w-4" />
          {videoData.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-hidden rounded-md border bg-black">
          <video
            src={videoData.video_url}
            controls
            preload="metadata"
            playsInline
            className="w-full h-auto max-h-[70vh]"
          >
            Your browser does not support the video tag.
          </video>
        </div>
        {videoData.description ? (
          <p className="text-xs text-slate-500 mt-2 line-clamp-3">{videoData.description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
