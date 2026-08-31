import React from "react";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  interactive?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  onChange?: (rating: number) => void;
}

export default function StarRating({
  rating,
  maxStars = 5,
  interactive = false,
  size = "sm",
  onChange,
}: StarRatingProps) {
  const sizeClasses = {
    xs: "text-xs gap-0.5",
    sm: "text-sm gap-1",
    md: "text-base gap-1.5",
    lg: "text-xl gap-2",
  };

  const starSizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  const roundedRating = Math.round(rating);

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index);
    }
  };

  return (
    <div className={`flex items-center ${sizeClasses[size]}`}>
      {Array.from({ length: maxStars }).map((_, idx) => {
        const starIndex = idx + 1;
        const isFilled = starIndex <= (interactive ? rating : roundedRating);

        return (
          <button
            key={idx}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(starIndex)}
            className={`transition focus:outline-none ${
              interactive ? "hover:scale-125 cursor-pointer" : "cursor-default"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={isFilled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`${starSizeClasses[size]} ${
                isFilled ? "text-amber-400" : "text-text-muted"
              }`}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
