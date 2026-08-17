import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper to decode JWT payload statelessly in Next.js Edge Middleware
function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    // Decode base64 string
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve token from cookies
  const tokenCookie = request.cookies.get("accessToken");
  const token = tokenCookie?.value;

  // Redirect root path if authenticated
  if (pathname === "/" && token) {
    const payload = parseJwt(token);
    if (payload && payload.role) {
      const url = request.nextUrl.clone();
      if (payload.role === "CLIENT") {
        url.pathname = "/client/dashboard";
      } else if (payload.role === "FREELANCER") {
        url.pathname = "/freelancer/dashboard";
      } else if (payload.role === "ADMIN") {
        url.pathname = "/admin/dashboard";
      }
      return NextResponse.redirect(url);
    }
  }

  // Paths requiring authentication
  const isClientPath = pathname.startsWith("/client");
  const isFreelancerPath = pathname.startsWith("/freelancer");
  const isAdminPath = pathname.startsWith("/admin");

  if (isClientPath || isFreelancerPath || isAdminPath) {
    if (!token) {
      // User is not logged in, redirect to login page
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      // Optional: save attempted path for redirecting back
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const payload = parseJwt(token);
    if (!payload || !payload.role) {
      // Token is invalid or doesn't have role, clear and redirect to login
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const response = NextResponse.redirect(url);
      response.cookies.delete("accessToken");
      response.cookies.delete("refreshToken");
      return response;
    }

    const userRole = payload.role;

    // Check permissions
    if (isClientPath && userRole !== "CLIENT") {
      // Client path accessed by non-client
      const url = request.nextUrl.clone();
      url.pathname = userRole === "FREELANCER" ? "/freelancer/dashboard" : "/admin/dashboard";
      return NextResponse.redirect(url);
    }

    if (isFreelancerPath && userRole !== "FREELANCER") {
      // Freelancer path accessed by non-freelancer
      const url = request.nextUrl.clone();
      url.pathname = userRole === "CLIENT" ? "/client/dashboard" : "/admin/dashboard";
      return NextResponse.redirect(url);
    }

    if (isAdminPath && userRole !== "ADMIN") {
      // Admin path accessed by non-admin
      const url = request.nextUrl.clone();
      url.pathname = userRole === "CLIENT" ? "/client/dashboard" : "/freelancer/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Allow login/register access, redirecting to their dashboard if already logged in
  if ((pathname === "/login" || pathname === "/register") && token) {
    const payload = parseJwt(token);
    if (payload && payload.role) {
      const url = request.nextUrl.clone();
      if (payload.role === "CLIENT") {
        url.pathname = "/client/dashboard";
      } else if (payload.role === "FREELANCER") {
        url.pathname = "/freelancer/dashboard";
      } else if (payload.role === "ADMIN") {
        url.pathname = "/admin/dashboard";
      }
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on these matching paths
  matcher: [
    "/",
    "/client/:path*",
    "/freelancer/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
