import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://example.com";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  // Static routes
  const staticRoutes = [
    "",
    "/freelancers",
    "/services",
    "/projects",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  let dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    const resFreelancers = await fetch(`${apiUrl}/freelancers?page=1&page_size=50`);
    if (resFreelancers.ok) {
      const data = await resFreelancers.json();
      const flRoutes = (data.items || []).map((f: any) => ({
        url: `${baseUrl}/freelancers/${f.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
      dynamicRoutes = [...dynamicRoutes, ...flRoutes];
    }
  } catch {
    // Graceful fallback during Next.js build-time step if API is not fully running
  }

  return [...staticRoutes, ...dynamicRoutes];
}
