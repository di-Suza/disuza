import { FileText, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useGetMyReportsQuery } from '@/features/reports/api/report.api';
import type { Report } from '@/features/reports/model/report.types';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import Button from '@/shared/ui/Button';

type DashboardReportsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const formatDate = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const getReportTitle = (report: Report): string => {
  const target = report.targetId;

  if (typeof target === 'object' && target && 'caption' in target && typeof target.caption === 'string') {
    return target.caption || 'Reported post';
  }

  if (typeof target === 'object' && target && 'userName' in target && typeof target.userName === 'string') {
    return target.userName || 'Reported profile';
  }

  return `Reported ${report.onModel.toLowerCase()}`;
};

const mergeReports = (current: Report[], next: Report[]) => {
  const existingIds = new Set(current.map((report) => report._id));
  return [...current, ...next.filter((report) => !existingIds.has(report._id))];
};

const DashboardReportsModal = ({ isOpen, onClose }: DashboardReportsModalProps) => {
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<Report[]>([]);
  const { data, isFetching } = useGetMyReportsQuery({ page, limit: 10 }, { skip: !isOpen });
  const latestReports = data?.reports || [];

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setReports([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || latestReports.length === 0) return;
    setReports((current) => (page === 1 ? latestReports : mergeReports(current, latestReports)));
  }, [isOpen, latestReports, page]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop report-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <section className="modal-card dashboard-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-card__header report-modal__header">
          <span className="report-modal__icon">
            <FileText size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="state-panel__eyebrow">Moderation</p>
            <h1>Your Reports</h1>
          </div>
          <Button variant="ghost" className="button--icon" onClick={onClose} aria-label="Close reports modal">
            <X size={18} aria-hidden="true" />
          </Button>
        </header>

        <div className="dashboard-modal__list">
          {isFetching && reports.length === 0 && <p className="empty-copy">Loading reports...</p>}
          {!isFetching && reports.length === 0 && <p className="empty-copy">No reports submitted yet.</p>}
          {reports.map((report) => (
            <article className="dashboard-modal__row dashboard-report-row" key={report._id}>
              <span className="dashboard-modal__icon"><FileText size={18} aria-hidden="true" /></span>
              <span>
                <strong>{getReportTitle(report)}</strong>
                <small>{report.reason} - {report.status}{formatDate(report.createdAt) ? ` - ${formatDate(report.createdAt)}` : ''}</small>
                {report.response && <small>{report.response}</small>}
              </span>
            </article>
          ))}
        </div>

        <footer className="report-modal__footer">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {data?.hasMore && (
            <Button onClick={() => setPage((current) => current + 1)} disabled={isFetching}>
              {isFetching ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <FileText size={17} aria-hidden="true" />}
              Load more
            </Button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
};

export default DashboardReportsModal;
