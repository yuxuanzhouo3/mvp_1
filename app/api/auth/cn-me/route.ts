import { NextRequest, NextResponse } from "next/server";
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { AuthError, jsonAuthError, requireUser } from '@/lib/auth/requireUser';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!isChinaDeployment()) {
    return NextResponse.json({ error: 'This endpoint is only available in CN environment' }, { status: 403 });
  }

  let cloudbase: any;
  try {
    cloudbase = await import("@cloudbase/node-sdk");
  } catch (importError) {
    console.error("[CN Me] Cloudbase SDK import error:", importError);
    return NextResponse.json(
      { error: "Cloudbase SDK not installed. Run: npm install @cloudbase/node-sdk" },
      { status: 500 }
    );
  }

  const envId =
    process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || "";

  if (!envId) {
    console.error("[CN Me] Cloudbase ENV_ID not configured");
    return NextResponse.json(
      { error: "服务配置错误：Cloudbase ENV_ID 未设置" },
      { status: 500 }
    );
  }

  try {
    const authUser = await requireUser(request);
    const app = cloudbase.init({
      env: envId,
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY,
    });

    const db = app.database();
    const usersCollection = db.collection("users");

    let user: any | null = null;

    const byCustomId = await usersCollection.where({ id: authUser.userId }).limit(1).get();
    if (byCustomId?.data?.length) {
      user = byCustomId.data[0];
    }

    if (!user) {
      try {
        const byDocId = await usersCollection.doc(authUser.userId).get();
        if (byDocId?.data) {
          user = byDocId.data;
        }
      } catch {
        // ignore
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = user.id || user._id;

    // 🔒 重要：添加严格的防缓存头，防止 CDN 缓存用户身份信息
    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: user.email,
        displayName: user.display_name || user.email?.split("@")[0],
        avatarUrl: user.avatar_url,
        provider: user.provider || "email",
      },
    });
    
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Accel-Expires', '0'); // Nginx 缓存控制
    
    return response;
  } catch (error: any) {
    if (error instanceof AuthError) {
      return jsonAuthError(error);
    }
    if (error?.status === 401 || error?.code === 'missing_token' || error?.code === 'invalid_token') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("[CN Me] Error:", error);
    return NextResponse.json(
      { error: error.message || "获取用户信息失败" },
      { status: 500 }
    );
  }
}
