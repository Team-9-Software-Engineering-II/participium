import { CalendarCheck, Filter, MapPin, MoreHorizontal, Tag } from 'lucide-react';

const reportFilters = [
  { label: 'All reports', count: 342 },
  { label: 'Resolved', count: 198 },
];

const reportItems = [
  {
    id: 'RPT-8931',
    title: 'Streetlight outage in Via Garibaldi',
    location: 'Via Roma',
    submittedAt: 'Today, 08:24',
    tags: ['Lighting'],
    status: 'Awaiting assignment',
  },
  {
    id: 'RPT-8927',
    title: 'Damaged pedestrian crossing',
    location: 'Via Po',
    submittedAt: 'Yesterday, 16:10',
    tags: ['Road'],
    status: 'In progress · Team 04',
  },
  {
    id: 'RPT-8919',
    title: 'Overflowing waste containers',
    location: 'San Marco',
    submittedAt: 'Yesterday, 09:32',
    tags: ['Waste'],
    status: 'Escalated · Public works',
  },
];

const priorityColor = {
  High: 'bg-red-500/10 text-red-500',
  Medium: 'bg-amber-500/10 text-amber-500',
  Low: 'bg-emerald-500/10 text-emerald-500',
};

export default function Reports() {
  return (
    <div className="space-y-10">
      <div 
      data-cy="reports-alert"
      className="rounded-xl border border-dashed border-amber-200 bg-amber-100 px-4 py-3 text-sm text-amber-800 shadow-sm">
        This reporting workspace uses placeholder data. Real-time incident tracking is currently in progress.
      </div>
      <header className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary/80">
              Incident management
            </p>
            <h1 data-cy="reports-title" className="mt-1 text-3xl font-bold text-foreground">Citizen reports</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Track reports submitted across the municipality, assign tasks to teams, and monitor
              resolution progress in real time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              data-cy="reports-filter"
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary/60 hover:text-primary"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              Advanced filter
            </button>
            <button
              data-cy="reports-schedule"
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/20"
            >
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              Schedule report
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Overview
            </h2>
            <p className="mt-2 text-3xl font-bold text-foreground">342</p>
            <p className="text-xs text-muted-foreground">reports registered this month</p>
          </div>

          <div className="space-y-2 text-sm">
            {reportFilters.map((filter) => (
              <button
                data-cy={`report-filter-${filter.label.toLowerCase().replaceAll(/\s+/g, '-')}`}
                key={filter.label}
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-left font-medium text-muted-foreground transition hover:border-primary/60 hover:text-primary"
              >
                <span>{filter.label}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {filter.count}
                </span>
              </button>
            ))}
          </div>

        </aside>

        <div className="space-y-4">
          {reportItems.map((report) => (
            <article
              data-cy={`report-item-${report.id}`}
              key={report.id}
              className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm transition hover:border-primary/60 hover:shadow-md backdrop-blur supports-[backdrop-filter]:bg-card/70"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <span>{report.id}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{report.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {report.location}
                    </span>
                    <span>{report.submittedAt}</span>
                    <span>{report.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {report.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-1 font-medium text-muted-foreground"
                      >
                        <Tag className="h-3 w-3 text-primary" aria-hidden="true" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  data-cy={`report-actions-${report.id}`}
                  type="button"
                  className="self-start rounded-full border border-border p-2 text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                  aria-label={`Report actions for ${report.id}`}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  data-cy={`assign-report-${report.id}`}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                >
                  Assign
                </button>
                <button
                  data-cy={`view-timeline-${report.id}`}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                >
                  View timeline
                </button>
                <button
                  data-cy={`export-report-${report.id}`}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                >
                  Export report
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

