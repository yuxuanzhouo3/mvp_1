export type DeviceTerminal = "Web" | "App" | "Mini Program" | "Unknown";

export type ParsedDeviceSignals = {
  deviceType: string;
  os: string;
  browser: string;
  terminal: DeviceTerminal;
};

function normalizeRawText(value: unknown): string {
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim().toLowerCase();
  return "";
}

function matchesMiniProgram(input: string): boolean {
  if (!input) return false;
  return /(miniprogram|mini[\s_-]?program|wxmini|wechat[\s_-]?mini)/i.test(input);
}

function matchesApp(input: string): boolean {
  if (!input) return false;
  return /(mobile[\s_-]?app|native[\s_-]?app|react[\s_-]?native|android[\s_-]?app|ios[\s_-]?app|app[\s_-]?webview|webview|(^|[^a-z])app($|[^a-z]))/i.test(
    input
  );
}

function matchesWeb(input: string): boolean {
  if (!input) return false;
  return /(browser|(^|[^a-z])web($|[^a-z])|h5|website)/i.test(input);
}

export function inferTerminalFromUserAgent(userAgent: string | null | undefined): DeviceTerminal {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return "Unknown";

  if (matchesMiniProgram(ua) || ua.includes("_wxjs_environment=miniprogram")) {
    return "Mini Program";
  }

  if (
    ua.includes("reactnative") ||
    ua.includes("react-native") ||
    ua.includes("reactnativewebview") ||
    ua.includes("androidwechatbridge") ||
    ua.includes("; wv") ||
    ua.includes(" webview") ||
    ua.includes("okhttp")
  ) {
    return "App";
  }

  if (
    ua.includes("mozilla/") ||
    ua.includes("chrome/") ||
    ua.includes("safari/") ||
    ua.includes("firefox/") ||
    ua.includes("edg/") ||
    ua.includes("micromessenger")
  ) {
    return "Web";
  }

  return "Unknown";
}

export function normalizeTerminalLabel(
  value: unknown,
  userAgent?: string | null
): DeviceTerminal {
  const raw = normalizeRawText(value);
  if (/(app\s*\/\s*web|mobile[\s_-]?app\s*\/\s*web)/i.test(raw)) {
    return inferTerminalFromUserAgent(userAgent || null);
  }
  if (matchesMiniProgram(raw)) return "Mini Program";
  if (matchesApp(raw)) return "App";
  if (matchesWeb(raw)) return "Web";
  return inferTerminalFromUserAgent(userAgent || null);
}

export function parseUserAgentSignals(
  userAgent: string | null | undefined
): ParsedDeviceSignals {
  const ua = (userAgent || "").toLowerCase();
  const terminal = inferTerminalFromUserAgent(userAgent);

  const deviceType = /ipad|tablet/.test(ua)
    ? "Tablet"
    : /iphone|ipod|android|mobile|phone|iemobile|blackberry/.test(ua)
      ? "Mobile"
      : /macintosh|windows|linux|x11|cros/.test(ua)
        ? "Desktop"
        : terminal === "App" || terminal === "Mini Program"
          ? "Mobile"
          : "Unknown";

  const os = /harmonyos/.test(ua)
    ? "HarmonyOS"
    : /android/.test(ua)
      ? "Android"
      : /iphone|ipad|ipod|ios/.test(ua)
        ? "iOS"
        : /windows/.test(ua)
          ? "Windows"
          : /macintosh|mac os x/.test(ua)
            ? "macOS"
            : /linux/.test(ua)
              ? "Linux"
              : "Unknown";

  const browser = terminal === "Mini Program"
    ? "WeChat Mini Program"
    : /micromessenger/.test(ua)
      ? "WeChat"
      : /edg\//.test(ua)
        ? "Edge"
        : /opr\//.test(ua)
          ? "Opera"
          : /firefox\//.test(ua)
            ? "Firefox"
            : /chrome\//.test(ua) && !/edg\//.test(ua)
              ? "Chrome"
              : /safari\//.test(ua) && !/chrome\//.test(ua)
                ? "Safari"
                : terminal === "App"
                  ? "App WebView"
                  : "Unknown";

  return { deviceType, os, browser, terminal };
}
