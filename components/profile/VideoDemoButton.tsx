"use client";

import { useState, useEffect } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayerModal } from "@/components/profile/VideoPlayerModal";

interface VideoDemoData {
  video_url: string;
  title: string;
}

export function VideoDemoButton() {
  const [videoData, setVideoData] = useState<VideoDemoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const buttonLabel = "Demo Video";

  useEffect(() => {
    async function fetchVideoDemo() {
      try {
        const res = await fetch("/api/video-demo", { cache: "no-store" });
        if (!res.ok) {
          setVideoData(null);
          return;
        }
        const json = await res.json();
        if (json.success && json.data) {
          setVideoData({
            video_url: json.data.video_url,
            title: json.data.title,
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

  if (isLoading || !videoData) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setIsModalOpen(true)}
        aria-label={`${buttonLabel}: ${videoData.title}`}
        title={videoData.title}
      >
        <Play className="h-4 w-4" />
        <span className="hidden sm:inline">{buttonLabel}</span>
      </Button>
      <VideoPlayerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        videoUrl={videoData.video_url}
        title={videoData.title}
      />
    </>
  );
}
