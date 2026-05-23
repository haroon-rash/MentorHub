import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import TeacherCard from '../../components/student/TeacherCard.jsx';
import StudentAnnouncementCard from '../../components/student/StudentAnnouncementCard.jsx';
import {
  getStudentAnnouncements,
  getStudentTutors,
  getAnnouncementsFromTutor,
  fetchStudentOnboardingProfile,
  markAnnouncementAsRead,
} from '../../services/authApi.js';
import useAnnouncementUnread from '../../hooks/useAnnouncementUnread.js';
import UnreadBadge from '../../components/ui/UnreadBadge.jsx';
import { AlertCircle, CheckCircle } from 'lucide-react';

const StudentAnnouncementsPage = () => {
  const { token, role } = useAuth();
  const [studentProfileId, setStudentProfileId] = useState(null);
  const [activeTab, setActiveTab] = useState('tutors');
  const [tutors, setTutors] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const { totalUnread, refresh: refreshUnread } = useAnnouncementUnread();

  useEffect(() => {
    let cancelled = false;
    if (!token || String(role || '').toUpperCase() !== 'STUDENT') {
      setStudentProfileId(null);
      setLoading(false);
      return undefined;
    }
    (async () => {
      try {
        const profile = await fetchStudentOnboardingProfile(token);
        if (cancelled) return;
        setStudentProfileId(profile?.id ?? profile?.studentProfileId ?? null);
      } catch {
        if (!cancelled) setStudentProfileId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, role]);

  const loadTutors = useCallback(async () => {
    if (!token) return;
    try {
      const tutorsRes = await getStudentTutors(null, token);
      if (tutorsRes?.success && Array.isArray(tutorsRes.data)) {
        setTutors(tutorsRes.data);
      } else {
        setTutors([]);
      }
    } catch (error) {
      console.error('Error loading tutors:', error);
      setTutors([]);
    }
  }, [token]);

  const loadAnnouncements = useCallback(async () => {
    if (!studentProfileId || !token) {
      setAnnouncements([]);
      return;
    }
    try {
      const announcementsRes = await getStudentAnnouncements(studentProfileId, token);
      if (announcementsRes?.success && Array.isArray(announcementsRes.data)) {
        setAnnouncements(announcementsRes.data);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
      setAnnouncements([]);
    }
  }, [studentProfileId, token]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      await Promise.all([loadTutors(), loadAnnouncements()]);
    } catch (error) {
      showNotification('Failed to load data', 'error');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [token, loadTutors, loadAnnouncements]);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, loadData]);

  const handleTutorSelect = async (tutor) => {
    if (!studentProfileId || !token) return;
    setSelectedTutor(tutor);
    setLoading(true);
    try {
      const response = await getAnnouncementsFromTutor(studentProfileId, tutor.tutorProfileId, token);
      if (response?.success && Array.isArray(response.data)) {
        setAnnouncements(response.data);
      }
    } catch (error) {
      showNotification('Failed to load tutor announcements', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToAll = async () => {
    setSelectedTutor(null);
    if (!studentProfileId || !token) return;
    setLoading(true);
    try {
      const response = await getStudentAnnouncements(studentProfileId, token);
      if (response?.success && Array.isArray(response.data)) {
        setAnnouncements(response.data);
      }
    } catch (error) {
      showNotification('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const renderTutorsTab = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-200 h-64 rounded-lg animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (tutors.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel rounded-2xl p-12 text-center"
        >
          <div className="text-5xl mb-4">👨‍🏫</div>
          <h3 className="text-2xl font-bold text-[var(--mh-text)] mb-2">No Tutors Yet</h3>
          <p className="text-[var(--mh-text-muted)]">
            Book a session with a tutor — they will appear here once your booking is submitted (pending or confirmed).
          </p>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tutors.map((tutor, index) => (
          <motion.div
            key={tutor.tutorProfileId || tutor.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <TeacherCard teacher={tutor} onSelect={handleTutorSelect} selectedTutor={selectedTutor} />
          </motion.div>
        ))}
      </motion.div>
    );
  };

  const renderAnnouncementsView = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-200 h-24 rounded-lg animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (announcements.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center"
        >
          <div className="text-5xl mb-4">📢</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No Announcements</h3>
          <p className="text-gray-600">
            {selectedTutor
              ? `${selectedTutor.fullName || 'This tutor'} hasn't sent any announcements yet.`
              : "You don't have any announcements from your tutors yet."}
          </p>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {announcements.map((announcement, index) => (
          <motion.div
            key={announcement.id || index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <StudentAnnouncementCard
              announcement={announcement}
              onRead={async (id) => {
                if (!token || !id) return;
                try {
                  await markAnnouncementAsRead(id, token);
                  refreshUnread();
                  loadData();
                } catch {
                  /* ignore */
                }
              }}
            />
          </motion.div>
        ))}
      </motion.div>
    );
  };

  return (
    <motion.div className="min-h-screen space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-3xl font-bold text-[var(--mh-text)]">My Announcements</h1>
        <p className="mt-1 text-sm text-[var(--mh-text-muted)]">Tutors you have booked sessions with and their announcements.</p>
      </motion.div>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                notification.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : notification.type === 'error'
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              {notification.message}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 mb-8">
          <motion.button
            type="button"
            onClick={() => {
              setActiveTab('tutors');
              handleBackToAll();
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-6 py-3 font-semibold transition-all rounded-lg ${
              activeTab === 'tutors'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
            }`}
          >
            👨‍🏫 My Tutors ({tutors.length})
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setActiveTab('announcements')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-6 py-3 font-semibold transition-all rounded-lg ${
              activeTab === 'announcements'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              📢 Announcements ({announcements.length})
              {totalUnread > 0 && <UnreadBadge count={totalUnread} />}
            </span>
          </motion.button>
        </motion.div>

        {activeTab === 'announcements' && selectedTutor && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-blue-100 border border-blue-300 rounded-lg flex items-center justify-between"
          >
            <div>
              <p className="text-blue-900 font-semibold">
                Viewing announcements from: <span className="text-blue-700">{selectedTutor.fullName}</span>
              </p>
            </div>
            <motion.button
              type="button"
              onClick={handleBackToAll}
              whileHover={{ scale: 1.05 }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              View All
            </motion.button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {activeTab === 'tutors' && renderTutorsTab()}
            {activeTab === 'announcements' && renderAnnouncementsView()}
          </motion.div>
        </AnimatePresence>
    </motion.div>
  );
};

export default StudentAnnouncementsPage;
