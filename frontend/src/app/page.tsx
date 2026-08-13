import Link from "next/link";
import Container from "@/components/ui/Container";

const categories = [
  { name: "Photographers", icon: "📸", count: 120 },
  { name: "Videographers", icon: "🎥", count: 85 },
  { name: "Video Editors", icon: "🎞️", count: 142 },
  { name: "Photo Editors", icon: "🎨", count: 98 },
  { name: "Cinematographers", icon: "🎬", count: 64 },
  { name: "Drone Operators", icon: "🛸", count: 41 },
  { name: "Reel Editors", icon: "📱", count: 115 },
  { name: "Motion Graphics Artists", icon: "✨", count: 73 },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-grow justify-center py-12">
      <Container>
        {/* Hero Section */}
        <section className="text-center py-16 px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Hire Premium Creative Media Professionals
          </h1>
          <p className="mt-6 text-lg md:text-xl text-[var(--muted-foreground)] leading-relaxed">
            Discover, book, and work with top-tier photographers, videographers, editors, drone operators, and motion designers.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/explore"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-blue-500/20 transition-all"
            >
              Explore Talent
            </Link>
            <Link
              href="/register"
              className="bg-slate-800 hover:bg-slate-700 text-[var(--foreground)] border border-[var(--border)] font-semibold px-6 py-3 rounded-lg transition-all"
            >
              Join as Freelancer
            </Link>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-12 border-t border-[var(--border)]">
          <h2 className="text-2xl font-bold text-center mb-8 text-[var(--foreground)]">
            Browse by Creative Expertise
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all group cursor-pointer"
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <h3 className="font-semibold group-hover:text-blue-400 transition-colors text-[var(--foreground)]">
                  {cat.name}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {cat.count} Professionals
                </p>
              </div>
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
}
