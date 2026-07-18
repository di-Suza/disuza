import { Info } from 'lucide-react';

const HeatmapRules = () => (
  <span className="heatmap-rules-v1" onClick={(event) => event.stopPropagation()}>
    <span className="heatmap-rules-v1__trigger" aria-label="Activity rules">
      <Info size={14} aria-hidden="true" />
    </span>
    <span className="heatmap-rules-v1__popover" role="tooltip">
      <strong>Activity Rules</strong>
      <span><i />Self-post comments are not counted as contribution.</span>
      <span><i />Max 5-15 daily contributions based on account age.</span>
      <span><i />10-30s cooldown between same-type actions.</span>
      <b aria-hidden="true" />
    </span>
  </span>
);

export default HeatmapRules;
