"use client";

import { useEffect } from "react";
import { isChinaDeployment } from "@/lib/config/deployment.config";
import { parseUserAgentSignals } from "@/lib/observability/device-signals";
import { isWechatMiniProgramWebView } from "@/lib/utils/miniprogram-compat";

type DeviceTerminal = "Web" | "App" | "Mini Program" | "Unknown";
type RuntimeWindow = Window & {
  AndroidWeChatBridge?: unknown;
  ReactNativeWebView?: unknown;
  __APP_VERSION__?: unknown;
  __PERSONALINK_VERSION__?: unknown;
  __BUILD_VERSION__?: unknown;
};

const STORAGE_PREFIX = "device_track_v1";
const TRACK_TTL_MS = 12 * 60 * 60 * 1000;

function resolveTerminal(): DeviceTerminal {
  if (typeof window === "undefined") return "Unknown";
  const runtimeWindow = window as RuntimeWindow;

  if (isWechatMiniProgramWebView()) return "Mini Program";

  const maybeAndroidBridge = runtimeWindow.AndroidWeChatBridge;
  const maybeReactNative = runtimeWindow.ReactNativeWebView;
  if (maybeAndroidBridge || maybeReactNative) return "App";

  return "Web";
}

function shouldTrack(key: string): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return true;
    const lastTime = Number(raw);
    if (!Number.isFinite(lastTime)) return true;
    return Date.now() - lastTime >= TRACK_TTL_MS;
  } catch {
    return true;
  }
}

function markTracked(key: string): void {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {}
}

function getAppVersion(): string {
  if (typeof window !== "undefined") {
    const runtimeWindow = window as RuntimeWindow;
    const fromWindow =
      runtimeWindow.__APP_VERSION__ ||
      runtimeWindow.__PERSONALINK_VERSION__ ||
      runtimeWindow.__BUILD_VERSION__;
    if (typeof fromWindow === "string" && fromWindow.trim()) return fromWindow.trim();
  }

  const fromEnv = process.env.NEXT_PUBLIC_APP_VERSION;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();

  return "web";
}

export function DeviceTracker() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    const userAgent = navigator.userAgent || "";
    const uaSignals = parseUserAgentSignals(userAgent);
    const region = isChinaDeployment() ? "CN" : "INTL";
    const resolvedTerminal = resolveTerminal();
    const terminal = resolvedTerminal === "Unknown" ? uaSignals.terminal : resolvedTerminal;
    const storageKey = `${STORAGE_PREFIX}:${region}:${terminal}`;

    if (!shouldTrack(storageKey)) return;
    const runtimeWindow = window as RuntimeWindow;

    const payload = {
      platform: terminal,
      appVersion: getAppVersion(),
      deviceType: uaSignals.deviceType,
      os: uaSignals.os,
      browser: uaSignals.browser,
      pathname: window.location.pathname,
      referrer: document.referrer || "",
      language: navigator.language || "",
      metadata: {
        host: window.location.host,
        href: window.location.href,
      },
      bridge: {
        hasAndroidWeChatBridge: !!runtimeWindow.AndroidWeChatBridge,
        hasReactNativeWebView: !!runtimeWindow.ReactNativeWebView,
        isMiniProgram: isWechatMiniProgramWebView(),
      },
    };

    fetch("/api/device/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (response.ok) {
          markTracked(storageKey);
        }
      })
      .catch(() => {});
  }, []);

  return null;
}

export default DeviceTracker;
