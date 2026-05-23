function SkeletonCard() {
  return (
    <div className="glass-panel h-72 animate-pulse rounded-3xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-slate-200/80" />
        <div className="flex-1">
          <div className="mb-2 h-4 w-2/3 rounded bg-slate-200/80" />
          <div className="h-3 w-1/2 rounded bg-slate-200/70" />
        </div>
      </div>
      <div className="mb-2 h-3 w-full rounded bg-slate-200/70" />
      <div className="mb-2 h-3 w-5/6 rounded bg-slate-200/70" />
      <div className="mb-6 h-3 w-2/3 rounded bg-slate-200/70" />
      <div className="mt-auto flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-slate-200/80" />
        <div className="h-9 w-28 rounded-2xl bg-slate-200/80" />
      </div>
    </div>
  );
}

export default SkeletonCard;
