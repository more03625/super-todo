export function SkeletonCard() {
  return (
    <div className="card p-5">
      <div className="skeleton mb-2 h-3.5 w-2/5" />
      <div className="skeleton h-8 w-3/5" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4">
          <div className="skeleton mb-2 h-4 w-3/5" />
          <div className="skeleton h-3 w-2/5" />
        </div>
      ))}
    </div>
  );
}
