import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} CreativeMarket. All rights reserved.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/about" className="hover:text-[var(--foreground)]">About</Link>
          <Link href="/contact" className="hover:text-[var(--foreground)]">Contact</Link>
          <a href="#" className="hover:text-[var(--foreground)]">Privacy Policy</a>
          <a href="#" className="hover:text-[var(--foreground)]">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
