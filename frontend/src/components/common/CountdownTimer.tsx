import React, { useState, useEffect } from 'react';
import { useAppSettings } from '../../hooks/useAppSettings';

interface CountdownTimerProps {
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
  className = '', 
  showIcon = true, 
  size = 'md' 
}) => {
  const { settings, getTimeRemaining } = useAppSettings();
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    total: number;
  } | null>(null);

  // Update time remaining every minute
  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(getTimeRemaining());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [settings.application_deadline]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTimeRemaining = () => {
    if (!timeRemaining) return 'No deadline set';
    
    if (timeRemaining.total <= 0) {
      return 'Submissions have ended';
    }

    const { days, hours, minutes } = timeRemaining;
    
    // Show different formats based on remaining time
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  const getUrgencyColor = () => {
    if (!timeRemaining || timeRemaining.total <= 0) return 'text-red-600 bg-red-50 border-red-200';
    if (timeRemaining.days === 0 && timeRemaining.hours < 24) return 'text-red-600 bg-red-50 border-red-200';
    if (timeRemaining.days <= 1) return 'text-red-600 bg-red-50 border-red-200';
    if (timeRemaining.days <= 7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getIconColor = () => {
    if (!timeRemaining || timeRemaining.total <= 0) return 'text-red-600';
    if (timeRemaining.days === 0 && timeRemaining.hours < 24) return 'text-red-600';
    if (timeRemaining.days <= 1) return 'text-red-600';
    if (timeRemaining.days <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-base px-4 py-3';
      default:
        return 'text-sm px-3 py-2';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-5 w-5';
      default:
        return 'h-4 w-4';
    }
  };

  if (!settings.application_deadline) {
    return (
      <div className={`inline-flex items-center rounded-lg border bg-gray-50 border-gray-200 text-gray-600 ${getSizeClasses()} ${className}`}>
        {showIcon && (
          <svg className={`mr-2 ${getIconSize()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span className="font-medium">No deadline set</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center rounded-lg border ${getUrgencyColor()} ${getSizeClasses()} ${className}`}>
      {showIcon && (
        <svg className={`mr-2 ${getIconSize()} ${getIconColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <div>
        <span className="font-medium">
          {timeRemaining && timeRemaining.total > 0 ? 'Submissions end in: ' : ''}
          {formatTimeRemaining()}
        </span>
        {timeRemaining && timeRemaining.total > 0 && settings.application_deadline && (
          <div className="text-xs opacity-75 mt-1">
            Deadline: {new Date(settings.application_deadline).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

