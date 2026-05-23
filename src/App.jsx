import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';

import { ADMIN_ROLES, MESSAGING_ROLES, STUDENT_ROLES, TUTOR_ROLES, Role } from './constants/roles.js';
import AuthAwareLayout from './components/layout/AuthAwareLayout.jsx';
import PublicLayout from './components/layout/PublicLayout.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import AdminRoute from './components/auth/AdminRoute.jsx';

import { HomeRouter } from './pages/StudentHome/StudentHomePage.jsx';
import TutorDiscovery from './pages/TutorDiscovery/TutorDiscovery.jsx';
import TutorProfile from './pages/TutorProfile/TutorProfile.jsx';
import Scheduling from './pages/Scheduling/Scheduling.jsx';
import Auth from './pages/Auth/Auth.jsx';
import ForgotPassword from './pages/Auth/ForgotPassword.jsx';
import AdminAuth from './pages/Auth/AdminAuth.jsx';
import Chat from './pages/Chat/Chat.jsx';
import OTPVerification from './pages/OTPVerification/OTPVerification.jsx';
import StudentProfile from './pages/StudentProfile/StudentProfile.jsx';
import TutorDashboard from './pages/TutorDashboard/TutorDashboard.jsx';
import TutorOnboarding from './pages/TutorOnboarding/TutorOnboarding.jsx';
import SuperAdminDashboard from './pages/SuperAdminDashboard/SuperAdminDashboard.jsx';
import UsersDirectory from './pages/SuperAdminDashboard/UsersDirectory.jsx';
import SystemHealth from './pages/SuperAdminDashboard/SystemHealth.jsx';
import StudentProgressDashboard from './pages/StudentProgressDashboard/StudentProgressDashboard.jsx';
import TutorServices from './pages/TutorServices/TutorServices.jsx';
import TutorStudentsPage from './pages/tutor/TutorStudentsPage.jsx';
import TutorTeachingHub from './pages/tutor/TutorTeachingHub.jsx';
import StudentEnrollmentsPage from './pages/student/StudentEnrollmentsPage.jsx';
import StudentReviewsPage from './pages/student/StudentReviewsPage.jsx';
import StudentAssignmentsPage from './pages/student/StudentAssignmentsPage.jsx';
import StudentStudyMaterialsPage from './pages/student/StudentStudyMaterialsPage.jsx';
import TutorProfileManage from './pages/tutor/TutorProfileManage.jsx';
import StudentAnnouncementsPage from './pages/student/StudentAnnouncementsPage.jsx';
import StaticPage from './pages/StaticPage/StaticPage.jsx';
import CmsManagement from './pages/SuperAdminDashboard/CmsManagement.jsx';
import PlatformCatalogAdmin from './pages/SuperAdminDashboard/PlatformCatalogAdmin.jsx';
import ModerationCenter from './pages/SuperAdminDashboard/ModerationCenter.jsx';
import AdminCommunications from './pages/SuperAdminDashboard/AdminCommunications.jsx';

const MotionDiv = motion.div;

function AnimatedPage({ children }) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionDiv>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Auth pages — no sidebar */}
        <Route element={<PublicLayout />}>
          <Route path="/auth" element={<AnimatedPage><Auth /></AnimatedPage>} />
          <Route path="/forgot-password" element={<AnimatedPage><ForgotPassword /></AnimatedPage>} />
          <Route path="/admin" element={<Navigate to="/super-admin-dashboard" replace />} />
          <Route path="/admin/" element={<Navigate to="/super-admin-dashboard" replace />} />
          <Route path="/admin/auth" element={<AnimatedPage><AdminAuth /></AnimatedPage>} />
          <Route path="/verify-otp" element={<AnimatedPage><OTPVerification /></AnimatedPage>} />
        </Route>

        {/* App + marketing (sidebar when logged in) */}
        <Route element={<AuthAwareLayout />}>
          <Route path="/" element={<AnimatedPage><HomeRouter /></AnimatedPage>} />
          <Route
            path="/tutors"
            element={<AnimatedPage><ProtectedRoute allowedRoles={STUDENT_ROLES}><TutorDiscovery /></ProtectedRoute></AnimatedPage>}
          />
          <Route path="/profile/:tutorId" element={<AnimatedPage><TutorProfile /></AnimatedPage>} />
          <Route path="/page/:slug" element={<AnimatedPage><StaticPage /></AnimatedPage>} />

          <Route
            path="/schedule/:tutorId"
            element={<AnimatedPage><ProtectedRoute allowedRoles={STUDENT_ROLES}><Scheduling /></ProtectedRoute></AnimatedPage>}
          />
          <Route
            path="/student-profile"
            element={<AnimatedPage><ProtectedRoute allowedRoles={STUDENT_ROLES}><StudentProfile /></ProtectedRoute></AnimatedPage>}
          />
          <Route
            path="/student-progress"
            element={<AnimatedPage><ProtectedRoute allowedRoles={STUDENT_ROLES}><StudentProgressDashboard /></ProtectedRoute></AnimatedPage>}
          />
          <Route
            path="/student/announcements"
            element={<AnimatedPage><ProtectedRoute allowedRoles={STUDENT_ROLES}><StudentAnnouncementsPage /></ProtectedRoute></AnimatedPage>}
          />
          <Route
            path="/student/enrollments"
            element={<AnimatedPage><ProtectedRoute allowedRoles={STUDENT_ROLES}><StudentEnrollmentsPage /></ProtectedRoute></AnimatedPage>}
          />
          <Route
            path="/student/reviews"
            element={<AnimatedPage><ProtectedRoute allowedRoles={STUDENT_ROLES}><StudentReviewsPage /></ProtectedRoute></AnimatedPage>}
          />
          <Route
            path="/student/assignments"
            element={<AnimatedPage><ProtectedRoute allowedRoles={STUDENT_ROLES}><StudentAssignmentsPage /></ProtectedRoute></AnimatedPage>}
          />
          <Route
            path="/student/materials"
            element={<AnimatedPage><ProtectedRoute allowedRoles={STUDENT_ROLES}><StudentStudyMaterialsPage /></ProtectedRoute></AnimatedPage>}
          />

          <Route
            path="/tutor-dashboard"
            element={<AnimatedPage><ProtectedRoute allowedRoles={TUTOR_ROLES} requireApprovedTutor><TutorDashboard /></ProtectedRoute></AnimatedPage>}
          />
          <Route
            path="/tutor-services"
            element={<AnimatedPage><ProtectedRoute allowedRoles={TUTOR_ROLES} requireApprovedTutor><TutorServices /></ProtectedRoute></AnimatedPage>}
          />
          <Route
            path="/tutor/my-students"
            element={<AnimatedPage><ProtectedRoute allowedRoles={TUTOR_ROLES} requireApprovedTutor><TutorStudentsPage /></ProtectedRoute></AnimatedPage>}
          />
          <Route
            path="/tutor/teaching"
            element={<AnimatedPage><ProtectedRoute allowedRoles={TUTOR_ROLES} requireApprovedTutor><TutorTeachingHub /></ProtectedRoute></AnimatedPage>}
          />
          <Route
            path="/tutor/profile"
            element={<AnimatedPage><ProtectedRoute allowedRoles={TUTOR_ROLES} requireApprovedTutor><TutorProfileManage /></ProtectedRoute></AnimatedPage>}
          />
          <Route
            path="/tutor-onboarding"
            element={<AnimatedPage><ProtectedRoute allowedRoles={TUTOR_ROLES}><TutorOnboarding /></ProtectedRoute></AnimatedPage>}
          />

          <Route
            path="/chat"
            element={(
              <AnimatedPage>
                <ProtectedRoute allowedRoles={MESSAGING_ROLES}>
                  <Chat />
                </ProtectedRoute>
              </AnimatedPage>
            )}
          />

          <Route
            path="/super-admin-dashboard"
            element={<AnimatedPage><AdminRoute><SuperAdminDashboard /></AdminRoute></AnimatedPage>}
          />
          <Route
            path="/super-admin/users"
            element={<AnimatedPage><AdminRoute><UsersDirectory /></AdminRoute></AnimatedPage>}
          />
          <Route
            path="/super-admin/cms"
            element={<AnimatedPage><AdminRoute><CmsManagement /></AdminRoute></AnimatedPage>}
          />
          <Route
            path="/super-admin/system-health"
            element={<AnimatedPage><AdminRoute><SystemHealth /></AdminRoute></AnimatedPage>}
          />
          <Route
            path="/super-admin/catalog"
            element={<AnimatedPage><AdminRoute><PlatformCatalogAdmin /></AdminRoute></AnimatedPage>}
          />
          <Route
            path="/super-admin/moderation"
            element={<AnimatedPage><AdminRoute><ModerationCenter /></AdminRoute></AnimatedPage>}
          />
          <Route
            path="/super-admin/communications"
            element={<AnimatedPage><AdminRoute><AdminCommunications /></AdminRoute></AnimatedPage>}
          />

          <Route
            path="*"
            element={(
              <AnimatedPage>
                <div className="glass-panel mx-auto mt-12 max-w-xl rounded-3xl p-10 text-center">
                  <h1 className="font-heading text-4xl font-bold text-[var(--mh-text)]">404</h1>
                  <p className="mt-3 text-[var(--mh-text-muted)]">This page drifted into another timeline.</p>
                </div>
              </AnimatedPage>
            )}
          />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <div className="app-atmosphere relative min-h-screen">
        <AnimatedRoutes />
        <Toaster position="top-right" richColors closeButton />
      </div>
    </Router>
  );
}

export default App;
