import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 定义公共路径 - 这些路径不需要认证
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/trpc", "/api/upload"];

// 定义仅限未认证用户的路径（例如登录页面）
const UNAUTHENTICATED_ONLY_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 检查是否为公共路径
  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  if (isPublicPath) {
    return NextResponse.next();
  }

  try {
    // 尝试获取认证令牌
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });

    // 如果用户已认证，但试图访问仅限未认证用户的页面，则重定向到主页
    if (token && UNAUTHENTICATED_ONLY_PATHS.some(p => pathname.startsWith(p))) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // 如果用户未认证，且试图访问需要认证的路径，则重定向到登录页面
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // 用户已认证，允许访问受保护的路径
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // 发生错误时，重定向到登录页面
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };