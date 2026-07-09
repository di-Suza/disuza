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
  if (count <= 9) return 'color-scale-3';
  return 'color-scale-4';
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const ContributionHeatmap = ({ heatmap }: ContributionHeatmapProps) => {
  const days = toContributionDays(heatmap);
  const total = days.reduce((sum, day) => sum + Number(day.totalCount || 0), 0);

  return (
    <section className="profile-card contribution-card">
      <div className="profile-card__header">
        <h2>Activity</h2>
        <p>{total} contributions in the last 6 months</p>
      </div>
      <div className="contribution-heatmap" aria-label="Contribution heatmap">
        {days.length === 0 ? (
          <p className="empty-copy">No contribution activity yet.</p>
        ) : days.map((day) => {
          const totalCount = Number(day.totalCount || 0);
          return (
            <span
              key={day.date}
              className={`contribution-heatmap__day ${getIntensityClass(totalCount)}`}
              title={`${formatDate(day.date)}: ${totalCount} contributions`}
              aria-label={`${formatDate(day.date)}: ${totalCount} contributions`}
            />
          );
        })}
      </div>
      <div className="contribution-legend" aria-hidden="true">
        <span>Less</span>
        <i className="color-empty" />
        <i className="color-scale-1" />
        <i className="color-scale-2" />
        <i className="color-scale-3" />
        <i className="color-scale-4" />
        <span>More</span>
      </div>
    </section>
  );
};

export default ContributionHeatmap;