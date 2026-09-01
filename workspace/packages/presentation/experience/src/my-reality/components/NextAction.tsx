import React from "react";

export interface NextActionProps {
  label: string;
  actionId: string;
  onAction?: (actionId: string) => void;
  variant?: 'primary' | 'secondary';
}

export function NextAction({ label, actionId, onAction, variant = 'primary' }: NextActionProps) {
  const variantClasses = {
    primary: "bg-brand-primary text-text-inverse hover:opacity-90 hover:shadow-token-md focus:ring-4 focus:ring-brand-primary/30 focus:outline-none shadow-token-sm transition-all duration-eos-fast",
    secondary: "bg-surface-sunken text-text-primary hover:bg-surface border border-surface-border hover:border-surface-border-strong focus:ring-4 focus:ring-status-info/30 focus:outline-none transition-all duration-eos-fast"
  };

  const handleClick = () => {
    if (onAction) {
      onAction(actionId);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full px-4 py-3 rounded-lg font-medium text-sm ${variantClasses[variant]}`}
      type="button"
    >
      {label}
    </button>
  );
}

export function NextActionList({ actions }: { actions: NextActionProps[] }) {
  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <NextAction key={action.actionId} {...action} />
      ))}
    </div>
  );
}