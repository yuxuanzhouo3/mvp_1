/**
 * 下载配置文件
 * 支持CN环境（腾讯云CloudBase）和INTL环境（Supabase Storage）
 */

export type PlatformType =
  | "android"
  | "ios"
  | "windows"
  | "macos"
  | "linux";

export type MacOSArchType = "intel" | "apple-silicon";

export interface DownloadItem {
  platform: PlatformType;
  label: string;
  icon: string;
  fileID?: string;
  fileName?: string;
  url?: string;
  arch?: MacOSArchType;
  available?: boolean;
}

export interface RegionDownloadConfig {
  region: "CN" | "INTL";
  downloads: DownloadItem[];
}

/**
 * CN版本下载配置（国内）
 */
const chinaDownloads: RegionDownloadConfig = {
  region: "CN",
  downloads: [
    {
      platform: "android",
      label: "Android 应用",
      icon: "📱",
      fileID: process.env.CN_ANDROID_FILE_ID || "cloud://your-bucket/downloads/android-app.apk",
      fileName: "邻客-Android.apk",
      available: false,
    },
    {
      platform: "ios",
      label: "iOS 应用",
      icon: "🍎",
      fileID: process.env.CN_IOS_FILE_ID || "cloud://your-bucket/downloads/ios-app.ipa",
      fileName: "邻客-iOS.ipa",
      available: false,
    },
    {
      platform: "windows",
      label: "Windows 客户端",
      icon: "🪟",
      fileID: process.env.CN_WINDOWS_FILE_ID || "cloud://your-bucket/downloads/windows-app.msi",
      fileName: "邻客.msi",
      available: false,
    },
    {
      platform: "macos",
      label: "macOS (Intel)",
      icon: "💻",
      fileID: process.env.CN_MACOS_INTEL_FILE_ID || "cloud://your-bucket/downloads/macos-intel-app.dmg",
      fileName: "邻客-Intel.dmg",
      arch: "intel",
      available: false,
    },
    {
      platform: "macos",
      label: "macOS (Apple Silicon)",
      icon: "💻",
      fileID: process.env.CN_MACOS_APPLE_SILICON_FILE_ID || "cloud://your-bucket/downloads/macos-arm-app.dmg",
      fileName: "邻客-AppleSilicon.dmg",
      arch: "apple-silicon",
      available: false,
    },
    {
      platform: "linux",
      label: "Linux 客户端",
      icon: "🐧",
      fileID: process.env.CN_LINUX_FILE_ID || "cloud://your-bucket/downloads/linux-app.AppImage",
      fileName: "邻客-Linux.AppImage",
      available: false,
    },
  ],
};

/**
 * INTL版本下载配置（国际）
 */
const internationalDownloads: RegionDownloadConfig = {
  region: "INTL",
  downloads: [
    {
      platform: "android",
      label: "Android App",
      icon: "📱",
      url: process.env.NEXT_PUBLIC_INTL_ANDROID_URL || "https://play.google.com/store/apps/details?id=com.personalink.app",
      available: false,
    },
    {
      platform: "ios",
      label: "iOS App",
      icon: "🍎",
      url: process.env.NEXT_PUBLIC_INTL_IOS_URL || "https://apps.apple.com/app/personalink/id123456789",
      available: false,
    },
    {
      platform: "windows",
      label: "Windows Client",
      icon: "🪟",
      url: process.env.NEXT_PUBLIC_INTL_WINDOWS_URL || "supabase://downloads/Windows/PersonaLink.msi",
      fileName: "PersonaLink.msi",
      available: false,
    },
    {
      platform: "macos",
      label: "macOS (Intel)",
      icon: "💻",
      url: process.env.NEXT_PUBLIC_INTL_MACOS_INTEL_URL || "supabase://downloads/macOS/PersonaLink-Intel.dmg",
      arch: "intel",
      fileName: "PersonaLink-Intel.dmg",
      available: false,
    },
    {
      platform: "macos",
      label: "macOS (Apple Silicon)",
      icon: "💻",
      url: process.env.NEXT_PUBLIC_INTL_MACOS_APPLE_SILICON_URL || "https://github.com/personalink/releases/latest/download/PersonaLink-AppleSilicon.dmg",
      arch: "apple-silicon",
      available: false,
    },
    {
      platform: "linux",
      label: "Linux Client",
      icon: "🐧",
      url: process.env.NEXT_PUBLIC_INTL_LINUX_URL || "https://github.com/personalink/releases/latest/download/PersonaLink-Linux.AppImage",
      available: false,
    },
  ],
};

/**
 * 获取下载配置（根据部署区域）
 */
export function getDownloadConfig(region: "CN" | "INTL"): RegionDownloadConfig {
  return region === "CN" ? chinaDownloads : internationalDownloads;
}

/**
 * 检测用户设备平台
 */
export function detectUserPlatform(): PlatformType | null {
  if (typeof window === "undefined") return null;

  const userAgent = window.navigator.userAgent.toLowerCase();

  if (/android/.test(userAgent)) {
    return "android";
  }
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "ios";
  }
  if (/windows/.test(userAgent)) {
    return "windows";
  }
  if (/macintosh|mac os x/.test(userAgent)) {
    return "macos";
  }
  if (/linux/.test(userAgent)) {
    return "linux";
  }

  return null;
}

/**
 * 获取特定平台的下载链接
 */
export function getDownloadUrl(
  platform: PlatformType,
  isChina: boolean,
  arch?: MacOSArchType
): string {
  const config = getDownloadConfig(isChina ? "CN" : "INTL");
  const download = config.downloads.find((d) => {
    if (platform === "macos" && arch) {
      return d.platform === platform && d.arch === arch;
    }
    return d.platform === platform && !d.arch;
  });

  if (!download) {
    return "#";
  }

  if (isChina && download.fileID) {
    const params = new URLSearchParams({
      platform: download.platform,
      region: "CN",
    });
    if (arch) {
      params.append("arch", arch);
    }
    return `/api/downloads?${params.toString()}`;
  }

  if (!isChina && download.url) {
    if (download.url.startsWith("supabase://")) {
      const params = new URLSearchParams({
        platform: download.platform,
        region: "INTL",
      });
      if (arch) {
        params.append("arch", arch);
      }
      return `/api/downloads?${params.toString()}`;
    }
    return download.url;
  }

  return "#";
}
