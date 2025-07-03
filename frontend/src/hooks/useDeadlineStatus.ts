import { useState, useEffect } from 'react';
import { useAppSettings } from './useAppSettings';

export const useDeadlineStatus = () => {
  const { settings, getTimeRemaining } = useAppSettings();
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const checkDeadline = () => {
      const timeRemaining = getTimeRemaining();
      setIsExpired(timeRemaining?.total === 0 || false);
    };

    checkDeadline();
    const interval = setInterval(checkDeadline, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [settings.application_deadline]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isExpired, deadline: settings.application_deadline };
};