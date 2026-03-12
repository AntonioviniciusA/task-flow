import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/register', '/api/auth']
const publicPrefixes = ['/api/auth/', '/api/qstash/', '/_next/', '/icons/', '/sw.js', '/manifest.json']

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the route is public
  const isPublicRoute = publicRoutes.includes(pathname)
  const isPublicPrefix = publicPrefixes.some(prefix => pathname.startsWith(prefix))

  if (isPublicRoute || isPublicPrefix) {
    return NextResponse.next()
  }

  // Check authentication
  const session = await auth()

  if (!session) {
    // Redirect to login for protected routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }
    
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
