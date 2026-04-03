import { Loader2, CheckCircle2, Clock } from 'lucide-react';

export default function PaymentStatus({ status }) {
  if (status === 'idle') return null;

  const steps = [
    { key: 'initiating', label: 'Signature' },
    { key: 'confirming', label: 'Algorand' },
    { key: 'calling_ai', label: 'AI API' },
    { key: 'done', label: 'Done' },
  ];

  const getStepState = (stepKey) => {
    if (status === 'error') return stepKey === 'initiating' ? 'failed' : 'pending';
    if (status === 'done') return 'completed';

    const stepIdx = steps.findIndex((s) => s.key === stepKey);
    const currentIdx = steps.findIndex((s) => s.key === status);

    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="bg-surface-container-low border border-surface-variant rounded-[6px] p-4 mb-6">
      <div className="flex justify-between gap-1">
        {steps.map((step) => {
          const state = getStepState(step.key);
          return (
            <div key={step.key} className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                  state === 'completed'
                    ? 'bg-secondary-container/50 text-on-secondary-container'
                    : state === 'active'
                      ? 'bg-primary/10 text-primary'
                      : state === 'failed'
                        ? 'bg-error-container text-error'
                        : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {state === 'completed' && <CheckCircle2 size={18} />}
                {state === 'active' && <Loader2 size={18} className="animate-spin" />}
                {state === 'pending' && <Clock size={18} />}
                {state === 'failed' && <span className="text-xs font-bold">!</span>}
              </div>
              <span
                className={`text-[10px] text-center font-medium leading-tight ${
                  state === 'active'
                    ? 'text-primary'
                    : state === 'completed'
                      ? 'text-on-secondary-container'
                      : 'text-on-surface-variant'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
