interface Props {
  className?: string;
  width?: string;
  height?: string;
}

export default function Skeleton({ className = '', width, height }: Props) {
  return (
    <div
      className={`animate-shimmer rounded-lg ${className}`}
      style={{ width, height }}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
