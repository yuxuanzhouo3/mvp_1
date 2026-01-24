import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { geoRouter } from "@/lib/architecture-modules/core/geo-router";
import { RegionType } from "@/lib/architecture-modules/core/types";
import { fingerprintToken, verifySessionToken } from "@/lib/auth/session-edge";

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/chat',
  '/matching',
  '/payment',
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = [
  '/auth/login',
  '/auth/register',
];

/**
 * Create Supabase client for middleware
 */
function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        request.cookies.set({ name, value: '', ...options });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });
}

/**
 * IP检测和访问控制中间件
 * 实现以下功能：
 * 1. 检测用户IP地理位置
 * 2. 完全禁止欧洲IP访问（符合GDPR合规要求）- 仅国际版 (INTL) 启用
 * 3. 为响应添加地理信息头供前端使用
 * 4. 路由保护 - 未登录用户重定向到登录页
 *
 * 注意：不进行任何重定向，用户访问哪个域名就使用哪个系统
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 获取部署区域配置
  const hostHeader =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("x-original-host") ||
    request.headers.get("host") ||
    "";
  const host = hostHeader.toLowerCase();
  const inferredRegionFromHost =
    host.includes("mornscience.top") ? "CN" : host.includes("mornhub.lat") ? "INTL" : null;
  const envRegion = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION;
  const deploymentRegion =
    envRegion === "CN" || envRegion === "INTL" ? envRegion : inferredRegionFromHost || "INTL";
  const isInternationalDeployment = deploymentRegion === "INTL";

  // 跳过静态资源和Next.js内部路由
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    (pathname.includes(".") && !pathname.startsWith("/api/"))
  ) {
    return NextResponse.next();
  }

  const normalizeLang = (value: string | null): "zh" | "en" | null => {
    if (!value) return null;
    return value === "zh" || value === "en" ? value : null;
  };

  const urlLang = normalizeLang(searchParams.get("lang"));
  if (urlLang) {
    const redirectUrl = new URL(request.url);
    redirectUrl.searchParams.delete("lang");
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.cookies.set({
      name: "lang",
      value: urlLang,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return redirectResponse;
  }

  const cookieLang = normalizeLang(request.cookies.get("lang")?.value || null);
  const acceptLanguage = (request.headers.get("accept-language") || "").toLowerCase();
  const inferredLang: "zh" | "en" =
    acceptLanguage.includes("zh") ? "zh" : isInternationalDeployment ? "en" : "zh";
  const lang = cookieLang || inferredLang;

  // 跳过所有支付相关 API 路由，让它们直接通过
  if (pathname.startsWith("/api/payments/")) {
    return NextResponse.next();
  }

  // 跳过 admin API 路由，让它们直接通过（保留原始 headers）
  if (pathname.startsWith("/api/admin/")) {
    return NextResponse.next();
  }

  // Create response for potential modifications
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-lang", lang);
  requestHeaders.set("x-deployment-region", deploymentRegion);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  if (!cookieLang) {
    response.cookies.set({
      name: "lang",
      value: lang,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // Authentication check for protected and auth routes
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute || isAuthRoute) {
    const cnSession =
      request.cookies.get("cn_session")?.value ||
      request.cookies.get("cn_session_cross")?.value;
    let hasCnSession = false;
    if (cnSession) {
      const fp = await fingerprintToken(cnSession);
      const verified = await verifySessionToken(cnSession);
      if (verified.ok) {
        hasCnSession = true;
      } else {
        console.warn(
          JSON.stringify({
            ts: new Date().toISOString(),
            category: "Auth",
            event: "cn_session_invalid",
            route: pathname,
            reason: verified.reason,
            code: verified.code,
            tokenFingerprint: fp,
          })
        );
        response.cookies.set({ name: "cn_session", value: "", maxAge: 0, path: "/" });
        response.cookies.set({ name: "cn_session_cross", value: "", maxAge: 0, path: "/" });
      }
    }

    let hasIntlSession = false;
    if (!hasCnSession) {
      const supabase = createMiddlewareClient(request, response);
      if (supabase) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          hasIntlSession = !!session;
        } catch (error) {
          console.error("Auth check error:", error);
        }
      }
    }

    const isAuthenticated = hasCnSession || hasIntlSession;

    if (isProtectedRoute && !isAuthenticated) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set(
        "Cache-Control",
        "private, no-cache, no-store, must-revalidate, max-age=0"
      );
      redirectResponse.headers.set("Pragma", "no-cache");
      redirectResponse.headers.set("Expires", "0");
      redirectResponse.headers.set("X-Accel-Expires", "0");
      return redirectResponse;
    }

    if (isAuthRoute && isAuthenticated) {
      const redirectResponse = NextResponse.redirect(
        new URL("/dashboard", request.url)
      );
      redirectResponse.headers.set(
        "Cache-Control",
        "private, no-cache, no-store, must-revalidate, max-age=0"
      );
      redirectResponse.headers.set("Pragma", "no-cache");
      redirectResponse.headers.set("Expires", "0");
      redirectResponse.headers.set("X-Accel-Expires", "0");
      return redirectResponse;
    }

    // For authenticated routes, add no-cache headers to response
    if (isProtectedRoute && isAuthenticated) {
      response.headers.set(
        "Cache-Control",
        "private, no-cache, no-store, must-revalidate, max-age=0"
      );
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      response.headers.set("X-Accel-Expires", "0");
    }
  }

  // 请求体大小限制 (10MB) - 仅API路由
  if (pathname.startsWith("/api/") && request.method === "POST") {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return new NextResponse(
        JSON.stringify({
          error: "Request body too large",
          message: "Maximum request size is 10MB",
        }),
        {
          status: 413,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  try {
    // 检查URL参数中的debug模式（仅开发环境支持）
    const debugParam = searchParams.get("debug");
    const isDevelopment = process.env.NODE_ENV === "development";

    // 生产环境安全检查：禁止调试模式访问
    if (debugParam && !isDevelopment) {
      console.warn(`生产环境检测到调试模式参数，已禁止访问: ${debugParam}`);
      return new NextResponse(
        JSON.stringify({
          error: "Access Denied",
          message: "Debug mode is not allowed in production.",
          code: "DEBUG_MODE_BLOCKED",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Blocked": "true",
          },
        }
      );
    }

    // 如果是 API 请求，也检查 Referer 中的 debug 参数
    if (pathname.startsWith("/api/") && !isDevelopment) {
      const referer = request.headers.get("referer");
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          const refererDebug = refererUrl.searchParams.get("debug");

          // 生产环境禁用来自referer的调试模式
          if (refererDebug) {
            console.warn(
              `生产环境检测到来自referer的调试模式参数，已禁止访问: ${refererDebug}`
            );
            return new NextResponse(
              JSON.stringify({
                error: "Access Denied",
                message: "Debug mode is not allowed in production.",
                code: "DEBUG_MODE_BLOCKED",
              }),
              {
                status: 403,
                headers: {
                  "Content-Type": "application/json",
                  "X-Debug-Blocked": "true",
                },
              }
            );
          }
        } catch {
          // 忽略无效的referer URL
        }
      }
    }

    let geoResult;

    // 开发环境支持调试模式
    if (debugParam && isDevelopment) {
      console.log(`调试模式启用: ${debugParam}`);

      // 根据debug参数设置模拟的地理位置
      switch (debugParam.toLowerCase()) {
        case "china":
          geoResult = {
            region: RegionType.CHINA,
            countryCode: "CN",
            currency: "CNY",
          };
          break;
        case "usa":
        case "us":
          geoResult = {
            region: RegionType.USA,
            countryCode: "US",
            currency: "USD",
          };
          break;
        case "europe":
        case "eu":
          geoResult = {
            region: RegionType.EUROPE,
            countryCode: "DE",
            currency: "EUR",
          };
          break;
        default:
          // 无效的debug参数，回退到正常检测
          const clientIP = getClientIP(request);
          geoResult = await geoRouter.detect(clientIP || "");
      }
    } else {
      // 正常地理位置检测
      // 获取客户端真实IP并检测地理位置
      const clientIP = getClientIP(request);

      if (!clientIP) {
        console.warn("无法获取客户端IP，使用默认处理");
        // 使用空字符串触发geoRouter内部的降级策略（本地/默认海外）
        geoResult = await geoRouter.detect("");
      } else {
        // 检测地理位置
        geoResult = await geoRouter.detect(clientIP);
      }
    }

    console.log(
      `IP检测结果 - 国家: ${geoResult.countryCode}, 地区: ${geoResult.region}${
        debugParam && isDevelopment ? " (调试模式)" : ""
      }`
    );

    // 1. 禁止欧洲IP访问（仅国际版启用，开发环境调试模式除外）
    if (
      isInternationalDeployment &&
      geoResult.region === RegionType.EUROPE &&
      !(debugParam && isDevelopment)
    ) {
      console.log(`禁止欧洲IP访问: ${geoResult.countryCode}`);
      return new NextResponse(
        JSON.stringify({
          error: "Access Denied",
          message:
            "This service is not available in your region due to regulatory requirements.",
          code: "REGION_BLOCKED",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // 2. 为响应添加地理信息头（用于前端判断区域）
    response.headers.set("X-User-Region", geoResult.region);
    response.headers.set("X-User-Country", geoResult.countryCode);
    response.headers.set("X-User-Currency", geoResult.currency);

    // 开发环境添加调试模式标识
    if (debugParam && isDevelopment) {
      response.headers.set("X-Debug-Mode", debugParam);
    }

    return response;
  } catch (error) {
    console.error("地理分流中间件错误:", error);

    // 出错时使用降级策略：允许访问但记录错误
    response.headers.set("X-Geo-Error", "true");

    return response;
  }
}

/**
 * 获取客户端真实IP地址
 * 处理各种代理和CDN的情况
 */
function getClientIP(request: NextRequest): string | null {
  // 优先级：X-Real-IP > X-Forwarded-For > request.ip

  // 1. 检查 X-Real-IP（Nginx等代理设置）
  const realIP = request.headers.get("x-real-ip");
  if (realIP && isValidIP(realIP)) {
    return realIP;
  }

  // 2. 检查 X-Forwarded-For（多个代理的情况）
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // X-Forwarded-For 可能包含多个IP，取第一个（最原始的客户端IP）
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    for (const ip of ips) {
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  // 3. 检查其他可能的头
  const possibleHeaders = [
    "x-client-ip",
    "x-forwarded",
    "forwarded-for",
    "forwarded",
    "cf-connecting-ip", // Cloudflare
    "true-client-ip", // Akamai
  ];

  for (const header of possibleHeaders) {
    const ip = request.headers.get(header);
    if (ip && isValidIP(ip)) {
      return ip;
    }
  }

  // 4. 使用 Next.js 提供的 request.ip 作为最后的兜底
  const fallbackIp = request.ip;
  if (fallbackIp && isValidIP(fallbackIp)) {
    return fallbackIp;
  }

  return null;
}

/**
 * 验证IP地址格式
 */
function isValidIP(ip: string): boolean {
  // IPv4 验证
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".").map(Number);
    return parts.every((part) => part >= 0 && part <= 255);
  }

  // IPv6 验证（简化版）
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，包括 API 路由（需要设置区域 Header）
     * 排除：
     * - Next.js 内部路由 (/_next/...)
     * - 静态文件 (favicon.ico 等)
     */
    "/((?!_next/|favicon.ico).*)",
  ],
};
