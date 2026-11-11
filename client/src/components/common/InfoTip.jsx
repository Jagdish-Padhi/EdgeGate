import { Info } from 'lucide-react';
import { useId } from 'react';

/** Small accessible "i" button that provides technical context on hover or keyboard focus */
export function InfoTip({ label, align = 'start', children }) {
  const id = useId();
  return (
    <span className="infotip">
      <button
        type="button"
        className="infotip-button"
        aria-label={label}
        aria-describedby={id}
        onKeyDown={(event) => event.key === 'Escape' && event.currentTarget.blur()}
      >
        <Info size={14} strokeWidth={2} aria-hidden="true" />
      </button>
      <span role="tooltip" id={id} className={`infotip-body ${align}`}>
        {children}
      </span>
    </span>
  );
}

