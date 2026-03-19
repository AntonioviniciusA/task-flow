import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 1. Definir rotas públicas
  const publicRoutes = ["/", "/login", "/register"];

  // 2. Definir prefixos públicos (recursos estáticos, auth, cron)
  const publicPrefixes = [
    "/api/auth/",
    "/api/check-tasks",
    "/api/ai/process", // Se quiser permitir que deslogados usem IA (geralmente não)
    "/_next/",
    "/icons/",
    "/sw.js",
    "/manifest.json",
    "/icone-notime.png",
    "/placeholder",
  ];

  // 3. Rotas de compartilhamento podem ser acessadas por deslogados para VER,
  // mas o 'Join' deve exigir login (tratado na página/API)
  const isShareRoute = pathname.startsWith("/share/");
  const isPublicApiShare = pathname.startsWith("/api/share/");

  const isPublicRoute = publicRoutes.includes(pathname) || isShareRoute;
  const isPublicPrefix = publicPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  // Se for pública, permite acesso
  if (isPublicRoute || isPublicPrefix || isPublicApiShare) {
    return;
  }

  // 4. Proteção de rotas privadas (Dashboard e APIs privadas)
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isPrivateRoute = isDashboardRoute || pathname.startsWith("/api/");

  if (isPrivateRoute && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
