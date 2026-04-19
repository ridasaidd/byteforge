import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function StepHeading({ children }: { children: ReactNode }) {
  return <h3 className="bw-step-heading">{children}</h3>;
}

export function PrimaryButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  primaryColor: _primaryColor,
}: {
  children: ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  primaryColor: string;
}) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={disabled || loading}
      className="bw-btn"
    >
      {loading && <Loader2 size={16} className="bw-spinner" />}
      {children}
    </button>
  );
}
