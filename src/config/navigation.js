import { Role, ADMIN_ROLES } from '../constants/roles.js';

export function getRoleLabel(role, tutorStatus) {
  const normalized = String(role || '').toUpperCase();
  if (ADMIN_ROLES.includes(normalized)) return 'Administrator';
  if (normalized === Role.TUTOR) {
    return String(tutorStatus || '').toUpperCase() === 'APPROVED' ? 'Tutor' : 'Tutor (pending)';
  }
  if (normalized === Role.STUDENT) return 'Student';
  return 'Member';
}

export function getProfilePath(role, tutorStatus) {
  const normalized = String(role || '').toUpperCase();
  if (normalized === Role.TUTOR) {
    return String(tutorStatus || '').toUpperCase() === 'APPROVED' ? '/tutor/profile' : '/tutor-onboarding';
  }
  if (normalized === Role.STUDENT) return '/student-profile';
  if (ADMIN_ROLES.includes(normalized)) return '/super-admin-dashboard';
  return '/';
}

export function getDashboardPath(role, tutorStatus) {
  const normalized = String(role || '').toUpperCase();
  if (ADMIN_ROLES.includes(normalized)) return '/super-admin-dashboard';
  if (normalized === Role.TUTOR) {
    return String(tutorStatus || '').toUpperCase() === 'APPROVED' ? '/tutor-dashboard' : '/tutor-onboarding';
  }
  if (normalized === Role.STUDENT) return '/student-progress';
  return '/';
}

export function getNavItems(role, isAuthenticated, tutorStatus) {
  if (!isAuthenticated) {
    return [
      { to: '/', label: 'Home', icon: '🏠' },
      { to: '/tutors', label: 'Find Tutors', icon: '🔍' },
      { to: '/page/blogs', label: 'Blogs', icon: '📝' },
      { to: '/page/about-us', label: 'About', icon: 'ℹ️' },
    ];
  }

  const normalized = String(role || '').toUpperCase();

  if (normalized === Role.STUDENT) {
    return [
      { to: '/', label: 'Home', icon: '🏠' },
      { to: '/tutors', label: 'Find Tutors', icon: '🔍' },
      { to: '/student-progress', label: 'My Progress', icon: '📈' },
      { to: '/student/enrollments', label: 'My Courses', icon: '📚' },
      { to: '/student/reviews', label: 'My Reviews', icon: '⭐' },
      { to: '/student/assignments', label: 'Assignments', icon: '📝' },
      { to: '/student/materials', label: 'Materials', icon: '📖' },
      { to: '/student/announcements', label: 'Announcements', icon: '📢' },
      { to: '/chat', label: 'Messages', icon: '💬' },
      { to: '/student-profile', label: 'My Profile', icon: '👤' },
    ];
  }

  if (normalized === Role.TUTOR) {
    if (String(tutorStatus || '').toUpperCase() !== 'APPROVED') {
      return [
        { to: '/', label: 'Home', icon: '🏠' },
        { to: '/tutor-onboarding', label: 'Complete Profile', icon: '✅' },
        { to: '/page/blogs', label: 'Blogs', icon: '📝' },
      ];
    }
    return [
      { to: '/tutor-dashboard', label: 'Overview', icon: '📊', end: true },
      { to: '/tutor/profile', label: 'Manage Profile', icon: '👤' },
      { to: '/tutor-services', label: 'AI Tools', icon: '✨' },
      { to: '/tutor/my-students', label: 'My Students', icon: '🎓' },
      { to: '/chat', label: 'Messages', icon: '💬' },
    ];
  }

  if (ADMIN_ROLES.includes(normalized)) {
    return [
      { to: '/super-admin-dashboard', label: 'Dashboard', icon: '📊', end: true },
      { to: '/super-admin/users', label: 'Users', icon: '👥' },
      { to: '/super-admin/moderation', label: 'Moderation', icon: '⚠️' },
      { to: '/super-admin/communications', label: 'Comms', icon: '📧' },
      { to: '/super-admin/cms', label: 'CMS', icon: '📄' },
      { to: '/super-admin/catalog', label: 'Catalog', icon: '📚' },
      { to: '/super-admin/system-health', label: 'Health', icon: '💚' },
      { to: '/chat', label: 'Messages', icon: '💬' },
    ];
  }

  return [
    { to: '/', label: 'Home', icon: '🏠' },
    { to: '/page/blogs', label: 'Blogs', icon: '📝' },
  ];
}

/** Horizontal top bar links (glass nav pill) — shown on every authenticated page */
export function getTopNavItems(role, isAuthenticated, tutorStatus) {
  if (!isAuthenticated) {
    return getNavItems(null, false, null);
  }

  const normalized = String(role || '').toUpperCase();

  if (normalized === Role.STUDENT) {
    return [
      { to: '/', label: 'Home' },
      { to: '/tutors', label: 'Find Tutors' },
      { to: '/student-progress', label: 'My Progress' },
      { to: '/student/enrollments', label: 'My Courses' },
      { to: '/student/assignments', label: 'Assignments' },
      { to: '/student/materials', label: 'Materials' },
      { to: '/student/announcements', label: 'Announcements' },
      { to: '/chat', label: 'Messages' },
      { to: '/page/blogs', label: 'Blogs' },
    ];
  }

  if (normalized === Role.TUTOR) {
    if (String(tutorStatus || '').toUpperCase() !== 'APPROVED') {
      return [
        { to: '/', label: 'Home' },
        { to: '/tutor-onboarding', label: 'Complete Profile' },
        { to: '/page/blogs', label: 'Blogs' },
      ];
    }
    return [
      { to: '/', label: 'Home' },
      { to: '/tutor-dashboard', label: 'Tutor Panel', end: true },
      { to: '/tutor/teaching', label: 'Teaching Hub' },
      { to: '/tutor-services', label: 'My Services' },
      { to: '/tutor/my-students', label: 'My Students' },
      { to: '/chat', label: 'Messages' },
      { to: '/page/blogs', label: 'Blogs' },
    ];
  }

  if (ADMIN_ROLES.includes(normalized)) {
    return [
      { to: '/', label: 'Home' },
      { to: '/super-admin-dashboard', label: 'Dashboard', end: true },
      { to: '/super-admin/users', label: 'Users' },
      { to: '/super-admin/moderation', label: 'Moderation' },
      { to: '/super-admin/communications', label: 'Comms' },
      { to: '/chat', label: 'Messages' },
    ];
  }

  return [
    { to: '/', label: 'Home' },
    { to: '/page/blogs', label: 'Blogs' },
  ];
}
