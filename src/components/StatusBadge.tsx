import React from 'react';
import { ApplicationStatus } from '@/types';

interface StatusBadgeProps {
  status: ApplicationStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'submitted':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'under_review':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'funded':
      case 'settled':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'declined':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = () => {
    if (status === 'funded') return 'Settled';
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold border min-w-[92px] text-center ${getStatusStyles()}`}
    >
      {getStatusText()}
    </span>
  );
};

export default StatusBadge;
