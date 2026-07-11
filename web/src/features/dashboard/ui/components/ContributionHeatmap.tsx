type ContributionDay = {
  date?: string;
  totalCount?: number;
  postsCount?: number;
  commentsCount?: number;
  feedbackCount?: number;
};

type ContributionHeatmapProps = {
  heatmap?: unknown;
};

const toContributionDays = (value: unknown): ContributionDay[] => (
  Array.isArray(value) ? value.filter((item): item is ContributionDay => typeof item === 'object' && item !== null) : []
);

const getIntensityClass = (count: number): string => {
  if (count <= 0) return 'color-empty';
  if (count <= 2) return 'color-scale-1';
  if (count <= 5) return 'color-scale-2';
  if (count <= 8) return 'color-scale-3';
  return 'color-scale-4';
};

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getSixMonthDays = (values: ContributionDay[]): ContributionDay[] => {
  const byDate = new Map(values.filter((day) => day.date).map((day) => [day.date, day]));
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(today.getMonth() - 6);
  const result: ContributionDay[] = [];

  for (const cursor = new Date(startDate); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
    const date = toDateKey(cursor);
    result.push(byDate.get(date) || { date, totalCount: 0 });
  }

  return result;
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const ContributionHeatmap = ({ heatmap }: ContributionHeatmapProps) => {
  const sourceDays = toContributionDays(heatmap);
  const days = getSixMonthDays(sourceDays);
  const total = sourceDays.reduce((sum, day) => sum + Number(day.totalCount || 0), 0);

  return (
    <section className="dashboard-heatmap-v1">
      <header className="dashboard-heatmap-v1__header">
        <div>
          <p>Contribution Activity</p>
          <h2>Last 6 months</h2>
        </div>
        <span>{total} total</span>
      </header>

      <div className="dashboard-heatmap-v1__scroll">
        <div className="dashboard-heatmap-v1__grid" aria-label="Contribution heatmap">
          {days.map((day) => {
            const totalCount = Number(day.totalCount || 0);
            const label = `${totalCount} contributions on ${formatDate(day.date)}`;

            return (
              <span
                key={day.date}
                className={`dashboard-heatmap-v1__day ${getIntensityClass(totalCount)}`}
                title={label}
                aria-label={label}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ContributionHeatmap;
