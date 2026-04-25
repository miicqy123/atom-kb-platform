import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // 设置字符编码和语言头
  const response = NextResponse.next();
  response.headers.set('Content-Type', 'text/html; charset=utf-8');
  response.headers.set('Accept-Charset', 'utf-8');

  // 获取当前路径
  const pathname = request.nextUrl.pathname;

  // 定义不需要认证的公共路径
  const publicPaths = [
    '/login',
    '/api',
    '/knowledge',
    '/prompts',
    '/orchestration',
    '/governance',
    '/admin',
    '/',
  ];

  // 检查是否为公共路径
  const isPublicPath = publicPaths.some(path =>
    pathname === path || pathname.startsWith(path)
  );

  // 如果是公共路径，直接放行
  if (isPublicPath) {
    return response;
  }

  // 检查JWT令牌
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET
  });

  // 如果没有令牌且不在登录页面，则重定向到登录页面
  if (!token && pathname !== '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', request.nextUrl.href);
    return NextResponse.redirect(url);
  }

  // 如果用户已登录且在登录页面，则重定向到仪表板
  if (token && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/(dashboard)';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$|.*\\.css$|.*\\.js$).*)',
  ],
};