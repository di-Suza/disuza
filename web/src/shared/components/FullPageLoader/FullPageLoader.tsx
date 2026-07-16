import './FullPageLoader.css';

type FullPageLoaderProps = {
  label?: string;
};

const FullPageLoader = ({ label = 'Syncing workspace' }: FullPageLoaderProps) => (
  <div className="full-page-loader" role="status" aria-live="polite" aria-label={label}>
    <div className="full-page-loader__grid" />
    <div className="full-page-loader__card">
      <div className="full-page-loader__mark">DLF</div>
      <h1>DevLoopFeed</h1>
      <p>{label}</p>
      <div className="full-page-loader__bar" aria-hidden="true">
        <span />
      </div>
    </div>
  </div>
);

export default FullPageLoader;
