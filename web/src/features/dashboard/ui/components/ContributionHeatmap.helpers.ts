export type ContributionDay = {
  date?: string;
  totalCount?: number;
  postsCount?: number;
  commentsCount?: number;
  feedbackCount?: number;
};

export const formatMetric = (value: number) => (
  new Intl.NumberFormat(undefined, { notation: value >= 10000 ? 'compact' : 'standard' }).format(value)
);

export const toContributionDays = (value: unknown): ContributionDay[] => (
  Array.isArray(value) ? value.filter((item): item is ContributionDay => typeof item === 'object' && item !== null) : []
);

export const getIntensityClass = (count: number): string => {
  if (count <= 0) return 'color-empty';
  if (count <= 2) return 'color-scale-1';
  if (count <= 5) return 'color-scale-2';
  if (count <= 8) return 'color-scale-3';
  return 'color-scale-4';
};

export const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getSixMonthDays = (values: ContributionDay[], todayInput = new Date()): ContributionDay[] => {
  const byDate = new Map(values.filter((day) => day.date).map((day) => [day.date, day]));
  const today = new Date(todayInput);
  const startDate = new Date(today);
  startDate.setMonth(today.getMonth() - 6);
  const result: ContributionDay[] = [];

  for (const cursor = new Date(startDate); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
    const date = toDateKey(cursor);
    result.push(byDate.get(date) || { date, totalCount: 0 });
  }

  return result;
};

export const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const getAnalyticsBarHeight = (reach: number, maxReach: number) => {
  if (reach <= 0) return 4;
  return Math.max(8, Math.round((reach / Math.max(1, maxReach)) * 100));
};
