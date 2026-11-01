import React from 'react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string;
  gradient?: string;
  textLight?: boolean;
}

const StatCard: React.FC<Props> = ({ label, value, sub, icon, gradient, textLight }) => (
  <div className={`rounded-2xl p-4 border border-gray-100 shadow-glass ${gradient ? '' : 'bg-white'}`}
    style={gradient ? { background: gradient } : undefined}>
    {icon && <div className="text-2xl mb-3">{icon}</div>}
    <div className={`text-xs font-medium mb-1 ${textLight ? 'text-white/75' : 'text-gray-400'}`}>{label}</div>
    <div className={`font-poppins text-2xl font-bold ${textLight ? 'text-white' : 'text-gray-800'}`}>{value}</div>
    {sub && <div className={`text-[11px] mt-1 ${textLight ? 'text-white/60' : 'text-gray-400'}`}>{sub}</div>}
  </div>
);

export default StatCard;
