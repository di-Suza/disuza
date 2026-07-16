import { AlertTriangle, Loader2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import type { ReportReason, ReportTargetModel } from '@/features/reports/model/report.types';
import { useReportModal } from '@/features/reports/ui/hooks/useReportModal';
import Button from '@/shared/ui/Button';
import '@/shared/components/StatePanel/StatePanel.css';
import '@/shared/ui/Modal.css';
import '@/shared/ui/Spinner.css';
import './ReportModal.css';

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  onModel: ReportTargetModel;
};

const reportCopy: Record<ReportTargetModel, { title: string; description: string }> = {
  Post: {
    title: 'Report Post',
    description: "Help us understand what's wrong with this post. Your report will be reviewed by our team.",
  },
  User: {
    title: 'Report Profile',
    description: "Help us understand what's wrong with this profile. Your report will be reviewed by our team.",
  },
  Message: {
    title: 'Report Message',
    description: "Help us understand what's wrong with this message. Your report will be reviewed by our team.",
  },
};

const ReportModal = ({ isOpen, onClose, onModel, targetId }: ReportModalProps) => {
  const {
    description,
    handleClose,
    handleSubmit,
    isSubmitting,
    reason,
    reportReasons,
    setDescription,
    setReason,
  } = useReportModal({ isOpen, onClose, onModel, targetId });
  const copy = reportCopy[onModel];

  if (!isOpen || !targetId) return null;

  return createPortal(
    <div className="modal-backdrop report-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={handleClose}>
      <section className="modal-card report-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-card__header report-modal__header">
          <span className="report-modal__icon">
            <AlertTriangle size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="state-panel__eyebrow">Report</p>
            <h1>{copy.title}</h1>
          </div>
          <Button variant="ghost" className="button--icon" onClick={handleClose} aria-label="Close report modal">
            <X size={18} aria-hidden="true" />
          </Button>
        </header>

        <div className="report-modal__body">
          <p>{copy.description}</p>

          <label className="field">
            <span>Report type</span>
            <select className="input report-modal__select" value={reason} onChange={(event) => setReason(event.target.value as ReportReason)}>
              <option value="" disabled>Select a reason</option>
              {reportReasons.map((option) => (
                <option value={option} key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Details</span>
            <textarea
              className="input textarea report-modal__textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Please provide more details about why you're reporting this content."
              maxLength={500}
            />
            <small className="report-modal__count">{description.length}/500</small>
          </label>
        </div>

        <footer className="report-modal__footer">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} disabled={!reason || !description.trim() || isSubmitting}>
            {isSubmitting ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <AlertTriangle size={17} aria-hidden="true" />}
            {isSubmitting ? 'Submitting...' : 'Submit report'}
          </Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
};

export default ReportModal;
