import { AlertTriangle, FileText, Loader2, MessageSquare, RotateCw, ShieldCheck, UserRound, X } from 'lucide-react';
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

const mergeReports = (current: Report[], next: Report[]) => {
  const existingIds = new Set(current.map((report) => report._id));
  return [...current, ...next.filter((report) => !existingIds.has(report._id))];
};

const getTargetTitle = (report: Report): string => {
  const target = report.targetId;
  if (typeof target === 'object' && target && 'caption' in target && typeof target.caption === 'string') return target.caption || 'Reported post';
  if (typeof target === 'object' && target && 'userName' in target && typeof target.userName === 'string') return target.userName || 'Reported profile';
  return `Reported ${report.onModel.toLowerCase()}`;
};

const getStatusClass = (status: Report['status']): string => `is-${status.toLowerCase()}`;

const DashboardReportsModal = ({ isOpen, onClose }: DashboardReportsModalProps) => {
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<Report[]>([]);
  const { data, isError, isFetching, refetch } = useGetMyReportsQuery({ page, limit: 10 }, { skip: !isOpen });
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
      <section className="modal-card dashboard-reports-v1" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="dashboard-reports-v1__close" onClick={onClose} aria-label="Close reports modal"><X size={16} /></button>
        <header className="dashboard-reports-v1__header">
          <span><ShieldCheck size={20} aria-hidden="true" /></span>
          <div><p>Moderation</p><h2>Your Reports</h2></div>
        </header>

        <div className="dashboard-reports-v1__scroll">
          {isFetching && reports.length === 0 ? (
            <div className="dashboard-reports-v1__state"><Loader2 className="spin" size={22} /><strong>Loading reports...</strong></div>
          ) : isError ? (
            <div className="dashboard-reports-v1__state">
              <AlertTriangle size={24} /><strong>Reports could not be loaded</strong>
              <Button onClick={() => refetch()}><RotateCw size={16} />Retry</Button>
            </div>
          ) : reports.length > 0 ? (
            <div className="dashboard-reports-v1__content">
              <div className="dashboard-reports-v1__summary">
                <strong>{Number(data?.totalReports || reports.length)} submitted reports</strong>
                <button type="button" onClick={() => refetch()} disabled={isFetching}><RotateCw className={isFetching ? 'spin' : ''} size={14} />Refresh</button>
              </div>

              <div className="dashboard-reports-v1__list">
                {reports.map((report) => {
                  const Icon = report.onModel === 'User' ? UserRound : report.onModel === 'Message' ? MessageSquare : FileText;
                  return (
                    <article className="dashboard-report-v1" key={report._id}>
                      <header>
                        <span><Icon size={20} aria-hidden="true" /></span>
                        <div><h3>Report on {report.onModel}</h3><p>{formatDate(report.createdAt)}</p></div>
                        <em className={getStatusClass(report.status)}>{report.status}</em>
                      </header>
                      <div>
                        <section><small>Target</small><strong>{getTargetTitle(report)}</strong></section>
                        <section><small>Reason</small><strong>{report.reason}</strong></section>
                        <section className="is-wide"><small>Description</small><p>{report.description || 'No description provided.'}</p></section>
                        {report.response && <section className="is-wide"><small>Response</small><p>{report.response}</p></section>}
                      </div>
                    </article>
                  );
                })}
              </div>

              {data?.hasMore && (
                <div className="dashboard-reports-v1__load-more">
                  <button type="button" onClick={() => setPage((current) => current + 1)} disabled={isFetching}>
                    {isFetching ? <Loader2 className="spin" size={16} /> : <RotateCw size={16} />}Load more
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="dashboard-reports-v1__state"><ShieldCheck size={28} /><strong>No reports submitted yet.</strong></div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default DashboardReportsModal;
