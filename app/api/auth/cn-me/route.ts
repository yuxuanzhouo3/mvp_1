import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const cnSession = request.cookies.get("cn_session")?.value;
  if (!cnSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const app = cloudbase.init({
      env: envId,
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY,
    });

    const db = app.database();
    const usersCollection = db.collection("users");

    let user: any | null = null;

    const byCustomId = await usersCollection.where({ id: cnSession }).limit(1).get();
    if (byCustomId?.data?.length) {
      user = byCustomId.data[0];
    }

    if (!user) {
      try {
        const byDocId = await usersCollection.doc(cnSession).get();
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

    return NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          email: user.email,
          displayName: user.display_name || user.email?.split("@")[0],
          avatarUrl: user.avatar_url,
          provider: user.provider || "email",
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("[CN Me] Error:", error);
    return NextResponse.json(
      { error: error.message || "获取用户信息失败" },
      { status: 500 }
    );
  }
}

