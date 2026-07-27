import { AlertCircle, Loader2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { useReportAProblemModal } from '@/features/issues/ui/hooks/useReportAProblemModal';
import Button from '@/shared/ui/Button';
import '@/features/reports/ui/components/ReportModal.css';
import '@/shared/components/StatePanel/StatePanel.css';
import '@/shared/ui/Modal.css';
import '@/shared/ui/Spinner.css';

type ReportAProblemModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ReportAProblemModal = ({ isOpen, onClose }: ReportAProblemModalProps) => {
  const {
    categories,
    category,
    description,
    handleCategoryChange,
    handleClose,
    handleDescriptionChange,
    handleSubmit,
    isSubmitting,
  } = useReportAProblemModal({ isOpen, onClose });

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop report-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={handleClose}>
      <section className="modal-card report-modal dashboard-support-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-card__header report-modal__header">
          <span className="report-modal__icon">
            <AlertCircle size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="state-panel__eyebrow">Support</p>
            <h1>Report a Problem</h1>
          </div>
          <Button variant="ghost" className="button--icon" onClick={handleClose} aria-label="Close problem report modal">
            <X size={18} aria-hidden="true" />
          </Button>
        </header>

        <div className="report-modal__body">
          <p>Help us improve Disuza by reporting any issues you encounter.</p>

          <label className="field">
            <span>Category</span>
            <select className="input report-modal__select" value={category} onChange={handleCategoryChange}>
              {categories.map((option) => (
                <option value={option} key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              className="input textarea report-modal__textarea"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Please describe the problem in detail."
              maxLength={1000}
            />
            <small className="report-modal__count">{description.length}/1000</small>
          </label>
        </div>

        <footer className="report-modal__footer">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} disabled={!description.trim() || isSubmitting}>
            {isSubmitting ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <AlertCircle size={17} aria-hidden="true" />}
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
};

export default ReportAProblemModal;
