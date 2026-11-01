import React from 'react';

const labels: Record<string, string> = {
  payment_pending: '💳 Awaiting Payment',
  confirmed:       '✅ Confirmed',
  preparing:       '👨‍🍳 Preparing',
  quality_check:   '🔍 Quality Check',
  ready:           '🎉 Ready!',
  picked_up:       '📦 Picked Up',
  cancelled:       '❌ Cancelled',
};

const StatusBadge: React.FC<{ status: string; large?: boolean }> = ({ status, large }) => {
  const safeStatus = status || 'confirmed';
  return (
    <span className={`status-${safeStatus} font-semibold rounded-full px-3 py-1 ${large ? 'text-sm' : 'text-[11px]'}`}
      style={safeStatus === 'payment_pending' ? { background: '#FEF3C7', color: '#92400E' } : undefined}>
      {labels[safeStatus] || safeStatus}
    </span>
  );
};

export default StatusBadge;
