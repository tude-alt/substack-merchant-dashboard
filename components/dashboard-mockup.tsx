/** CSS-only product preview for the marketing page — no screenshots required. */
export function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-emerald-500/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-elevated">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="mx-auto rounded-md bg-background px-3 py-1 text-[11px] text-muted-foreground">
            app.subflow.africa/dashboard
          </div>
        </div>

        <div className="flex min-h-[320px]">
          {/* Sidebar */}
          <div className="hidden w-44 shrink-0 border-r border-border bg-sidebar p-3 sm:block">
            <div className="mb-4 flex items-center gap-2 px-1">
              <div className="h-6 w-6 rounded-md bg-primary" />
              <span className="text-xs font-bold text-foreground">Subflow</span>
            </div>
            {["Dashboard", "Subscribers", "Plans", "Transactions"].map((item, i) => (
              <div
                key={item}
                className={`mb-1 rounded-lg px-2 py-1.5 text-[11px] font-medium ${
                  i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                {item}
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="flex-1 bg-dot-grid p-4 sm:p-5">
            <div className="mb-4">
              <div className="h-3 w-24 rounded bg-foreground/10" />
              <div className="mt-1.5 h-2 w-40 rounded bg-foreground/5" />
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "MRR", value: "₦2.4M", accent: true },
                { label: "Active", value: "148" },
                { label: "Failed", value: "3", warn: true },
                { label: "Churn", value: "2.1%" },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-border bg-card p-3 shadow-card"
                >
                  <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                  <p
                    className={`mt-1 text-sm font-bold ${
                      kpi.accent ? "text-primary" : kpi.warn ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-5">
              <div className="rounded-xl border border-border bg-card p-3 shadow-card sm:col-span-3">
                <p className="text-[10px] text-muted-foreground">Revenue — 30 days</p>
                <svg viewBox="0 0 200 60" className="mt-2 h-16 w-full text-primary">
                  <defs>
                    <linearGradient id="mockFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 45 L25 38 L50 42 L75 28 L100 32 L125 18 L150 22 L175 12 L200 8 L200 60 L0 60 Z"
                    fill="url(#mockFill)"
                  />
                  <path
                    d="M0 45 L25 38 L50 42 L75 28 L100 32 L125 18 L150 22 L175 12 L200 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 shadow-card sm:col-span-2">
                <p className="text-[10px] text-muted-foreground">Recent activity</p>
                <div className="mt-2 space-y-2">
                  {["New subscriber — Growth plan", "Charge successful — ₦15,000", "Webhook delivered"].map(
                    (line) => (
                      <div key={line} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <p className="truncate text-[10px] text-foreground/80">{line}</p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
