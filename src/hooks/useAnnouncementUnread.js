import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Role } from '../constants/roles.js';
import { fetchAnnouncementUnreadSummary } from '../services/authApi.js';

export default function useAnnouncementUnread() {
  const { token, role } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!token || String(role || '').toUpperCase() !== Role.STUDENT) {
      setTotalUnread(0);
      return;
    }
    try {
      const res = await fetchAnnouncementUnreadSummary(token);
      const n = res?.totalUnread ?? res?.data?.totalUnread ?? 0;
      setTotalUnread(Number(n) || 0);
    } catch {
      setTotalUnread(0);
    }
  }, [token, role]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [refresh]);

  return { totalUnread, refresh };
}
