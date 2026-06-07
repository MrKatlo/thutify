export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8 animate-pulse">
      <div className="space-y-3">
        <div className="h-8 w-48 rounded-xl bg-gray-100" />
        <div className="h-4 w-72 max-w-full rounded-lg bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="h-28 rounded-3xl bg-gray-100" />
        ))}
      </div>
      <div className="h-64 rounded-3xl bg-gray-100" />
    </div>
  );
}
