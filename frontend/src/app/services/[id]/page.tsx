import type { Metadata } from "next";
import ServiceDetailClient from "./ServiceDetailClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_URL}/services/${id}`);
    if (res.ok) {
      const service = await res.json();
      const title = service.title || "Creative Service";
      const price = service.starting_price ? ` starting from ₹${service.starting_price}` : "";
      const desc = service.short_description || "";

      return {
        title: `${title}${price} | Creative Marketplace`,
        description: desc.substring(0, 160),
        openGraph: {
          title: title,
          description: desc.substring(0, 160),
        },
      };
    }
  } catch {
    // Fallback on fetch error
  }

  return {
    title: "Marketplace Service | Creative Marketplace",
    description: "Explore premium creative services.",
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <ServiceDetailClient id={id} />;
}
