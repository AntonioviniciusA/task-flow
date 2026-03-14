import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const publicRoutes = ["/", "/login", "/register"];
  const publicPrefixes = [
    "/api/auth/",
    "/api/check-tasks",
    "/_next/",
    "/icons/",
    "/sw.js",
    "/manifest.json",
  ];

  const isPublicRoute = publicRoutes.includes(pathname);
  const isPublicPrefix = publicPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isPublicRoute || isPublicPrefix) {
    return;
  }

  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
});
