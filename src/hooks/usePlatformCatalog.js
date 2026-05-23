import { useEffect, useState } from 'react';
import { fetchPlatformCatalogGrouped } from '../services/authApi.js';
import {
  SUBJECTS,
  LANGUAGES,
  GRADE_LEVELS,
  TIME_SLOTS,
  DAYS_OF_WEEK,
} from '../data/onboardingConstants.js';

const FALLBACK = {
  subject: SUBJECTS,
  language: LANGUAGES,
  grade_level: GRADE_LEVELS,
  time_slot: TIME_SLOTS,
  day_of_week: DAYS_OF_WEEK,
  interest: [],
  skill: [],
};

export function usePlatformCatalog() {
  const [catalog, setCatalog] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchPlatformCatalogGrouped()
      .then((grouped) => {
        if (!active || !grouped) return;

        const mapped = { ...FALLBACK };
        Object.keys(grouped).forEach((category) => {
          const items = grouped[category];
          if (Array.isArray(items) && items.length > 0) {
            mapped[category] = items.map((item) => item.label || item.value);
          }
        });
        setCatalog(mapped);
      })
      .catch(() => {
        if (active) setCatalog(FALLBACK);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { catalog, loading };
}
