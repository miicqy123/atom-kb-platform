export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDownloadUrl } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "缺少 url 参数" }, { status: 400 });
    }

    // 生成临时下载链接（默认有效期 1 小时）
    const downloadUrl = await getDownloadUrl(url);

    // 直接 302 重定向到签名 URL
    return NextResponse.redirect(downloadUrl);
  } catch (error: any) {
    console.error("Blob preview error:", error);
    return NextResponse.json(
      { error: error.message || "获取预览链接失败" },
      { status: 500 }
    );
  }
}
