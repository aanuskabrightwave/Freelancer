import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const path = request.nextUrl.pathname;

  // Paths that require no protection
  if (
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/forgot-password")
  ) {
    return NextResponse.next();
  }

  // If attempting to access protected route without token
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Decode JWT payload safely in Edge middleware
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const role = payload.role; // Backend includes role in access token

    // Strict Role-Based Routing Enforcement
    if (path.startsWith("/client") && role !== "CLIENT") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (path.startsWith("/freelancer") && role !== "FREELANCER") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (path.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Malformed token or decode failure
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/client/:path*",
    "/freelancer/:path*",
    "/admin/:path*",
  ],
};

