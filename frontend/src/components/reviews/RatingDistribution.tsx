import React from "react";

interface RatingDistributionProps {
  reviews: any[];
}

export default function RatingDistribution({ reviews }: RatingDistributionProps) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let total = 0;

  reviews.forEach((r) => {
    const star = Math.round(r.overall_rating) as 5 | 4 | 3 | 2 | 1;
    if (counts[star] !== undefined) {
      counts[star] += 1;
      total += 1;
    }
  });

  return (
    <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
      <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Rating Distribution</h3>

      <div className="space-y-2">
        {([5, 4, 3, 2, 1] as const).map((stars) => {
          const count = counts[stars];
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={stars} className="flex items-center gap-3 text-xs">
              <span className="w-10 text-text-sub font-semibold text-right">{stars} ★</span>
              
              {/* Progress bar container */}
              <div className="flex-grow h-2 bg-background rounded-full overflow-hidden border border-border-custom">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                ></div>
              </div>

              <span className="w-12 text-right text-text-sub font-bold">
                {count} ({percent}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
