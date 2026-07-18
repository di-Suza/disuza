import { Activity, BarChart3, Eye, FileText, Heart, MessageCircle, MessageSquareText, Repeat2, UserPlus } from 'lucide-react';
import { useState } from 'react';

import { useGetDashboardAnalyticsQuery } from '@/features/users/api/user.api';
import type { DashboardAnalyticsRange, DashboardAnalyticsTotals } from '@/features/users/model/user.types';
import '../pages/DashboardPage.css';

type ContributionDay = {
  date?: string;
  totalCount?: number;
  postsCount?: number;
  commentsCount?: number;
  feedbackCount?: number;
};

type ContributionHeatmapProps = {
  heatmap?: unknown;
  showAnalytics?: boolean;
};

type AnalyticsMetricKey = keyof DashboardAnalyticsTotals;

const analyticsRanges: Array<{ label: string; value: DashboardAnalyticsRange }> = [
  { label: 'Today', value: '1d' },
  { label: 'Week', value: '7d' },
  { label: 'Month', value: '30d' },
  { label: 'Quarter', value: '90d' },
];

const analyticsMetrics: Array<{ key: AnalyticsMetricKey; label: string; icon: typeof Activity }> = [
  { key: 'reach', label: 'Reach', icon: BarChart3 },
  { key: 'profileViews', label: 'Views', icon: Eye },
  { key: 'followers', label: 'Followers', icon: UserPlus },
  { key: 'posts', label: 'Posts', icon: FileText },
  { key: 'likes', label: 'Likes', icon: Heart },
  { key: 'comments', label: 'Comments', icon: MessageCircle },
  { key: 'feedbacks', label: 'Feedbacks', icon: MessageSquareText },
  { key: 'reposts', label: 'Reposts', icon: Repeat2 },
];

const formatMetric = (value: number) => new Intl.NumberFormat(undefined, { notation: value >= 10000 ? 'compact' : 'standard' }).format(value);

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

const ContributionHeatmap = ({ heatmap, showAnalytics = false }: ContributionHeatmapProps) => {
  const [analyticsRange, setAnalyticsRange] = useState<DashboardAnalyticsRange>('30d');
  const analyticsQuery = useGetDashboardAnalyticsQuery(
    { range: analyticsRange },
    { skip: !showAnalytics },
  );
  const sourceDays = toContributionDays(heatmap);
  const days = getSixMonthDays(sourceDays);
  const total = sourceDays.reduce((sum, day) => sum + Number(day.totalCount || 0), 0);
  const analytics = analyticsQuery.data?.analytics;
  const totals = analytics?.totals;
  const series = analytics?.series || [];
  const maxReach = Math.max(1, ...series.map((day) => Number(day.reach || 0)));

  return (
    <section className="dashboard-heatmap-v1">
      <header className="dashboard-heatmap-v1__header">
        <div>
          <h2>Activity</h2>
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

      {showAnalytics && (
        <section className="dashboard-analytics-v1" aria-label="Profile analytics">
          <header className="dashboard-analytics-v1__header">
            <h3>Analytics</h3>
            <div className="dashboard-analytics-v1__filters" role="tablist" aria-label="Analytics range">
              {analyticsRanges.map((range) => (
                <button
                  key={range.value}
                  type="button"
                  className={analyticsRange === range.value ? 'is-active' : ''}
                  onClick={() => setAnalyticsRange(range.value)}
                  role="tab"
                  aria-selected={analyticsRange === range.value}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </header>

          <div className="dashboard-analytics-v1__cards" aria-busy={analyticsQuery.isFetching}>
            {analyticsMetrics.map(({ key, label, icon: Icon }) => (
              <article key={key} className={`dashboard-analytics-v1__card is-${key}`}>
                <span><Icon size={16} aria-hidden="true" /></span>
                <strong>{formatMetric(Number(totals?.[key] || 0))}</strong>
                <small>{label}</small>
              </article>
            ))}
          </div>

          <div className="dashboard-analytics-v1__chart">
            {series.map((day) => {
              const reach = Number(day.reach || 0);
              const height = reach > 0 ? Math.max(8, Math.round((reach / maxReach) * 100)) : 4;

              return (
                <span
                  key={day.date}
                  className={reach > 0 ? 'has-value' : ''}
                  style={{ height: `${height}%` }}
                  title={`${formatMetric(reach)} reach on ${formatDate(day.date)}`}
                  aria-label={`${formatMetric(reach)} reach on ${formatDate(day.date)}`}
                />
              );
            })}
          </div>

          {analyticsQuery.isError && <p className="dashboard-analytics-v1__status">Analytics could not be loaded.</p>}
        </section>
      )}
    </section>
  );
};

export default ContributionHeatmap;
