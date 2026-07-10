import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  max?: number;
  className?: string;
  size?: number;
}

export function StarRating({
  rating,
  max = 5,
  className,
  size = 16,
}: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = max - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      data-testid={`star-rating-${rating}`}
    >
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star
          key={`full-${i}`}
          className="fill-secondary text-secondary"
          size={size}
        />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <Star className="text-muted-foreground" size={size} />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="fill-secondary text-secondary" size={size} />
          </div>
        </div>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star
          key={`empty-${i}`}
          className="text-muted-foreground"
          size={size}
        />
      ))}
    </div>
  );
}
