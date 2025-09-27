import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AppSettings {
  application_deadline: string | null;
  eligibility_threshold: number;
  allocation_amount: number;
}

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>({
    application_deadline: null,
    eligibility_threshold: 80,
    allocation_amount: 1000
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load app settings from database
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['application_deadline', 'eligibility_threshold', 'allocation_amount']);

      if (error) throw error;

      const settingsMap: AppSettings = {
        application_deadline: null,
        eligibility_threshold: 80,
        allocation_amount: 1000
      };

      data?.forEach(setting => {
        if (setting.setting_key === 'application_deadline') {
          settingsMap.application_deadline = setting.setting_value;
        } else if (setting.setting_key === 'eligibility_threshold') {
          settingsMap.eligibility_threshold = parseFloat(setting.setting_value) || 80;
        } else if (setting.setting_key === 'allocation_amount') {
          settingsMap.allocation_amount = parseFloat(setting.setting_value) || 1000;
        }
      });

      setSettings(settingsMap);
    } catch (err) {
      console.error('Error loading app settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Update specific setting
  const updateSetting = async (key: keyof AppSettings, value: string) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: key,
          setting_value: value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      // Update local state
      setSettings(prev => ({
        ...prev,
        [key]: value
      }));

      return true;
    } catch (err) {
      console.error('Error updating setting:', err);
      setError(err instanceof Error ? err.message : 'Failed to update setting');
      return false;
    }
  };

  // Check if deadline has passed
  const isDeadlinePassed = (): boolean => {
    if (!settings.application_deadline) return false;
    return new Date() > new Date(settings.application_deadline);
  };

  // Get time remaining until deadline
  const getTimeRemaining = (): {
    days: number;
    hours: number;
    minutes: number;
    total: number;
  } | null => {
    if (!settings.application_deadline) return null;

    const deadline = new Date(settings.application_deadline);
    const now = new Date();
    const total = deadline.getTime() - now.getTime();

    if (total <= 0) {
      return { days: 0, hours: 0, minutes: 0, total: 0 };
    }

    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, total };
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    updateSetting,
    isDeadlinePassed,
    getTimeRemaining,
    refreshSettings: loadSettings
  };
};