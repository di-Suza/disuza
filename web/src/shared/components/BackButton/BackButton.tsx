import { Undo2 } from 'lucide-react';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

type BackButtonProps = {
  className?: string;
};

const BackButton = ({ className = '' }: BackButtonProps) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={`back-button ${className}`}
      aria-label="Go back"
    >
      <Undo2 size={20} aria-hidden="true" />
    </button>
  );
};

export default memo(BackButton);
