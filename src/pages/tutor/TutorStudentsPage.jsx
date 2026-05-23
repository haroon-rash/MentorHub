import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import StudentCard from '../../components/tutor/StudentCard.jsx';
import AnnouncementModal from '../../components/tutor/AnnouncementModal.jsx';
import AnnouncementHistory from '../../components/tutor/AnnouncementHistory.jsx';
import {
  getTutorStudents,
  createAnnouncement,
  getTutorAnnouncements,
  deleteAnnouncement,
  fetchTutorOnboardingProfile,
} from '../../services/authApi.js';
import { AlertCircle, CheckCircle } from 'lucide-react';

const TutorStudentsPage = () => {
  const { token, role } = useAuth();
  const [tutorProfileId, setTutorProfileId] = useState(null);
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!token || String(role || '').toUpperCase() !== 'TUTOR') {
      setTutorProfileId(null);
      setLoading(false);
      return undefined;
    }
    (async () => {
      try {
        const profile = await fetchTutorOnboardingProfile(token);
        if (cancelled) return;
        const id = profile?.id ?? profile?.tutorProfileId;
        setTutorProfileId(id || null);
      } catch {
        if (!cancelled) setTutorProfileId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, role]);

  const loadData = useCallback(async () => {
    if (!tutorProfileId || !token) return;
    setLoading(true);
    try {
      const [studentsResult, announcementsResult] = await Promise.allSettled([
        getTutorStudents(tutorProfileId, token),
        getTutorAnnouncements(tutorProfileId, token),
      ]);

      if (studentsResult.status === 'fulfilled' && studentsResult.value?.success && Array.isArray(studentsResult.value.data)) {
        setStudents(studentsResult.value.data);
      } else {
        setStudents([]);
        if (studentsResult.status === 'rejected') {
          console.error('Failed to load students:', studentsResult.reason);
          showNotification('Could not load student list', 'error');
        }
      }

      if (announcementsResult.status === 'fulfilled' && announcementsResult.value?.success && Array.isArray(announcementsResult.value.data)) {
        setAnnouncements(announcementsResult.value.data);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      showNotification('Failed to load data', 'error');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [tutorProfileId, token]);

  useEffect(() => {
    if (tutorProfileId && token) {
      loadData();
    }
  }, [tutorProfileId, token, loadData]);

  const handleAnnounceClick = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const handleViewClick = (student) => {
    console.log('View student:', student);
  };

  const handleSubmitAnnouncement = async (formData) => {
    if (!tutorProfileId || !token) return;
    setSubmittingAnnouncement(true);
    try {
      const targetType = selectedStudent ? 2 : Number(formData.targetType);
      const targetStudentId = selectedStudent
        ? selectedStudent.studentProfileId
        : (targetType === 2 ? formData.targetStudentId : null);

      const payload = {
        title: formData.title.trim(),
        announcementText: formData.announcementText.trim(),
        announcementType: Number(formData.announcementType),
        targetType,
        targetStudentId: targetStudentId || null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        testSessionId: formData.testSessionId || null,
      };

      const response = await createAnnouncement(tutorProfileId, payload, token);
      const created = response?.data ?? response;

      if (response?.success !== false && created?.id) {
        showNotification('Announcement sent successfully!', 'success');
        setShowModal(false);
        setSelectedStudent(null);
        setAnnouncements((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
        setSubmittingAnnouncement(false);

        getTutorAnnouncements(tutorProfileId, token)
          .then((announcementsRes) => {
            if (announcementsRes?.success && Array.isArray(announcementsRes.data)) {
              setAnnouncements(announcementsRes.data);
            }
          })
          .catch(() => {});
        return;
      }
      showNotification(response?.message || 'Failed to send announcement', 'error');
    } catch (error) {
      showNotification(error.message || 'Error sending announcement', 'error');
      console.error('Error:', error);
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!token) return;
    try {
      const response = await deleteAnnouncement(announcementId, token);
      if (response?.success) {
        showNotification('Announcement deleted successfully', 'success');
        setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
      } else {
        showNotification(response?.message || 'Failed to delete announcement', 'error');
      }
    } catch (error) {
      showNotification('Error deleting announcement', 'error');
      console.error('Error:', error);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const renderStudentsTab = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-96 animate-pulse rounded-2xl bg-[var(--mh-input-bg)]"
            />
          ))}
        </div>
      );
    }

    if (!tutorProfileId) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel rounded-2xl border border-amber-500/30 p-12 text-center"
        >
          <h3 className="text-xl font-bold text-[var(--mh-text)] mb-2">Complete your tutor profile</h3>
          <p className="text-[var(--mh-text-muted)]">Finish onboarding so we can load your tutor profile ID.</p>
        </motion.div>
      );
    }

    if (students.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel rounded-2xl p-12 text-center"
        >
          <motion.div className="text-5xl mb-4">👥</motion.div>
          <h3 className="text-2xl font-bold text-[var(--mh-text)] mb-2">No Students Yet</h3>
          <p className="text-[var(--mh-text-muted)] mb-4">
            When a student books a session with you, they will appear here — including pending requests awaiting your acceptance.
          </p>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {students.map((student, index) => (
          <motion.div
            key={student.studentProfileId || student.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <StudentCard student={student} onAnnounce={handleAnnounceClick} onView={handleViewClick} />
          </motion.div>
        ))}
      </motion.div>
    );
  };

  return (
    <motion.div className="min-h-screen space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-3xl font-bold text-[var(--mh-text)]">My Students</h1>
        <p className="mt-1 text-sm text-[var(--mh-text-muted)]">Students who booked sessions with you — pending, confirmed, and completed.</p>
      </motion.div>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${
                notification.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
                  : notification.type === 'error'
                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-100'
                    : 'border-indigo-500/40 bg-indigo-500/15 text-indigo-100'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              {notification.message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-8 flex gap-4 border-b border-[var(--mh-border)]">
          {[
            { id: 'students', label: '👥 My Students', count: students.length },
            { id: 'history', label: '📜 Announcement History', count: announcements.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-6 py-3 font-semibold transition-all ${
                activeTab === tab.id ? 'text-indigo-400' : 'text-[var(--mh-text-muted)] hover:text-[var(--mh-text)]'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 rounded-full bg-indigo-600 px-2 py-1 text-xs text-white">{tab.count}</span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {activeTab === 'students' && renderStudentsTab()}
            {activeTab === 'history' && (
              <AnnouncementHistory
                announcements={announcements}
                onDelete={handleDeleteAnnouncement}
                isLoading={loading}
              />
            )}
          </motion.div>
        </AnimatePresence>

      <AnnouncementModal
        isOpen={showModal}
        student={selectedStudent}
        students={students}
        onClose={() => {
          setShowModal(false);
          setSelectedStudent(null);
        }}
        onSubmit={handleSubmitAnnouncement}
        isLoading={submittingAnnouncement}
      />
    </motion.div>
  );
};

export default TutorStudentsPage;
