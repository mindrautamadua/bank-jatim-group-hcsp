export default function Loading() {
  return (
    <div className="max-w-7xl">
      <div className="mb-8 space-y-3">
        <div className="bb-skeleton h-7 w-72" />
        <div className="bb-skeleton h-4 w-[28rem] max-w-full" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bb-card p-5">
            <div className="bb-skeleton h-3 w-24" />
            <div className="bb-skeleton mt-4 h-9 w-20" />
            <div className="bb-skeleton mt-3 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="bb-card p-5 lg:col-span-2">
          <div className="bb-skeleton h-4 w-56" />
          <div className="bb-skeleton mt-4 h-[260px] w-full" />
        </div>
        <div className="bb-card p-5">
          <div className="bb-skeleton h-4 w-40" />
          <div className="bb-skeleton mt-4 h-[180px] w-full" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bb-skeleton h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
