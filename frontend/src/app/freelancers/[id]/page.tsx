import type { Metadata } from "next";
import FreelancerDetailClient from "./FreelancerDetailClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_URL}/freelancers/${id}`);
    if (res.ok) {
      const profile = await res.json();
      const name = profile.user?.full_name || "Creative Professional";
      const title = profile.professional_title || "Freelancer";
      const city = profile.city || "";
      const country = profile.country || "";
      const location = city ? ` in ${city}, ${country}` : "";

      return {
        title: `${name} — ${title}${location} | Creative Marketplace`,
        description: profile.bio ? profile.bio.substring(0, 160) : `Check out ${name}'s portfolio and creative services.`,
        openGraph: {
          title: `${name} — ${title}`,
          description: profile.bio ? profile.bio.substring(0, 160) : `Check out ${name}'s portfolio.`,
          images: [profile.profile_photo_url || "/placeholder-profile.png"],
        },
      };
    }
  } catch {
    // Fallback on fetch error
  }

  return {
    title: "Freelancer Profile | Creative Marketplace",
    description: "View creative professional portfolio and history.",
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <FreelancerDetailClient id={id} />;
}
