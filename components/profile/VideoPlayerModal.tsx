"use client";

import { useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  title,
}: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const stopVideo = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }, []);

  // Auto-play when modal opens, stop when it closes
  useEffect(() => {
    if (isOpen) {
      // Use a small delay to ensure the video element is mounted in the DOM
      const timer = setTimeout(() => {
        const video = videoRef.current;
        if (video) {
          video.play().catch(() => {
            // Autoplay may be blocked by browser policy; user can click play manually
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopVideo();
    }
  }, [isOpen, stopVideo]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      stopVideo();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {title}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full rounded-md"
            playsInline
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </DialogContent>
    </Dialog>
  );
}
