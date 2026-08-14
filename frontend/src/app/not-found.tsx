import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center bg-slate-950 text-slate-100">
      <h1 className="text-9xl font-extrabold text-blue-600 tracking-widest">404</h1>
      <div className="bg-red-600 text-white px-2 text-sm rounded rotate-12 absolute mb-16">
        Page Not Found
      </div>
      <h2 className="text-2xl font-bold mt-6 text-white">Oops! You seem to be lost.</h2>
      <p className="text-slate-400 mt-2 max-w-md">
        The page you are looking for does not exist, has been removed, or is temporarily unavailable.
      </p>
      <Link
        href="/"
        className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-colors"
      >
        Go Back Home
      </Link>
    </div>
  );
}
