export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-6xl animate-pulse space-y-8">
        <div className="space-y-3">
          <div className="h-10 w-64 rounded-lg bg-white/10" />
          <div className="h-5 w-80 rounded bg-white/5" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 rounded-2xl bg-white/5" />
          <div className="h-20 rounded-2xl bg-white/5" />
          <div className="h-20 rounded-2xl bg-white/5" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="h-44 rounded-2xl bg-white/5" />
            <div className="h-44 rounded-2xl bg-white/5" />
          </div>
          <div className="h-96 rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}
