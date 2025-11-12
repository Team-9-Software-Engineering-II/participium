import { Activity, AlertTriangle, BarChart3, CheckCircle2, Clock, MapPin } from 'lucide-react';

const highlightCards = [
  {
    name: 'Open reports',
    value: '128',
    icon: AlertTriangle,
    trend: '+8.4%',
    trendDescription: 'vs last week',
    accent: 'rgba(var(--chart-1))',
  },
  {
    name: 'Resolved today',
    value: '32',
    icon: CheckCircle2,
    trend: '+12.1%',
    trendDescription: 'response time',
    accent: 'rgba(var(--chart-2))',
  },
  {
    name: 'Average response time',
    value: '3h 24m',
    icon: Clock,
    trend: '-17%',
    trendDescription: 'since yesterday',
    accent: 'rgba(var(--chart-3))',
  },
];

const insights = [
  {
    title: 'Districts with most reports',
    icon: MapPin,
    items: [
      { label: 'Historic Center', value: '42 reports', emphasis: true },
      { label: 'Riverbank', value: '36 reports' },
      { label: 'Industrial Area', value: '28 reports' },
    ],
  },
  {
    title: 'Performance indicators',
    icon: BarChart3,
    items: [
      { label: 'Resolution rate', value: '78%', emphasis: true },
      { label: 'Average assignment time', value: '18 minutes' },
      { label: 'Escalated cases', value: '5' },
    ],
  },
  {
    title: 'Active initiatives',
    icon: Activity,
    items: [
      { label: 'Street lighting upgrade', value: 'Phase 2' },
      { label: 'Waste management pilot', value: 'Testing' },
      { label: 'Smart signage', value: 'Planning' },
    ],
  },
];

export default function Overview() {
  return (
    <div className="space-y-10">
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-100 px-4 py-3 text-sm text-amber-800 shadow-sm">
        This overview is currently populated with static data. Live dashboards are under active development.
      </div>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary/80">
            Executive summary
          </p>
          <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Dashboard overview
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Monitor platform activity, prioritize critical reports, and track the overall health of
            municipal operations at a glance.
          </p>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-5 py-4 text-sm text-primary shadow-sm backdrop-blur">
          Next data refresh in <span className="font-semibold">00:12:41</span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {highlightCards.map((card) => (
          <article
            key={card.name}
            className="relative overflow-hidden rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70"
          >
            <div
              className="absolute inset-x-6 top-0 h-px"
              style={{ background: `${card.accent}` }}
              aria-hidden="true"
            />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.name}</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{card.value}</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-6 flex items-center text-xs text-muted-foreground">
              <span className="font-semibold text-primary">{card.trend}</span>
              <span className="ml-1">{card.trendDescription}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <article className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Live activity feed</h2>
                <p className="text-sm text-muted-foreground">
                  Latest actions from municipal teams and citizen reports.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/60 hover:text-primary"
              >
                <Activity className="h-4 w-4" aria-hidden="true" />
                View timeline
              </button>
            </div>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-start gap-3 rounded-xl border border-transparent bg-background/60 p-4 shadow-sm">
                <div className="mt-1 h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
                <div>
                  <p className="font-medium text-foreground">
                    Maintenance team closed <span className="text-primary">#342</span> in Riverbank.
                  </p>
                  <p className="text-xs text-muted-foreground">29 minutes ago · verified completion</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-transparent bg-background/60 p-4 shadow-sm">
                <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
                <div>
                  <p className="font-medium text-foreground">
                    New report submitted by citizen in Historic Center.
                  </p>
                  <p className="text-xs text-muted-foreground">47 minutes ago · awaiting triage</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-transparent bg-background/60 p-4 shadow-sm">
                <div className="mt-1 h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                <div>
                  <p className="font-medium text-foreground">
                    Escalation requested for streetlight outage cluster.
                  </p>
                  <p className="text-xs text-muted-foreground">1 hour ago · pending approval</p>
                </div>
              </div>
            </div>
          </article>
        </div>
        <div className="space-y-6">
          {insights.map((section) => (
            <article
              key={section.title}
              className="overflow-hidden rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <section.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
              </div>
              <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item.label} className="flex items-start justify-between gap-3">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className={item.emphasis ? 'font-semibold text-primary' : ''}>
                      {item.value}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

