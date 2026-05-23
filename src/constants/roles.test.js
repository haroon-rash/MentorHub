import { describe, expect, it } from 'vitest';
import { Role, ADMIN_ROLES, TUTOR_ROLES, STUDENT_ROLES } from './roles.js';

describe('Role constants', () => {
  it('defines STUDENT role', () => {
    expect(Role.STUDENT).toBe('STUDENT');
  });

  it('defines TUTOR role', () => {
    expect(Role.TUTOR).toBe('TUTOR');
  });

  it('defines ADMIN role', () => {
    expect(Role.ADMIN).toBe('ADMIN');
  });

  it('defines OWNER role', () => {
    expect(Role.OWNER).toBe('OWNER');
  });

  it('defines SUPER_ADMIN role', () => {
    expect(Role.SUPER_ADMIN).toBe('SUPER_ADMIN');
  });

  it('all role values are uppercase strings', () => {
    Object.values(Role).forEach((role) => {
      expect(typeof role).toBe('string');
      expect(role).toBe(role.toUpperCase());
    });
  });
});

describe('ADMIN_ROLES', () => {
  it('includes ADMIN', () => {
    expect(ADMIN_ROLES).toContain(Role.ADMIN);
  });

  it('includes OWNER', () => {
    expect(ADMIN_ROLES).toContain(Role.OWNER);
  });

  it('includes SUPER_ADMIN', () => {
    expect(ADMIN_ROLES).toContain(Role.SUPER_ADMIN);
  });

  it('does not include STUDENT', () => {
    expect(ADMIN_ROLES).not.toContain(Role.STUDENT);
  });

  it('does not include TUTOR', () => {
    expect(ADMIN_ROLES).not.toContain(Role.TUTOR);
  });
});

describe('TUTOR_ROLES', () => {
  it('includes TUTOR', () => {
    expect(TUTOR_ROLES).toContain(Role.TUTOR);
  });

  it('includes all admin roles', () => {
    ADMIN_ROLES.forEach((role) => {
      expect(TUTOR_ROLES).toContain(role);
    });
  });

  it('does not include STUDENT', () => {
    expect(TUTOR_ROLES).not.toContain(Role.STUDENT);
  });
});

describe('STUDENT_ROLES', () => {
  it('includes STUDENT', () => {
    expect(STUDENT_ROLES).toContain(Role.STUDENT);
  });

  it('includes all admin roles', () => {
    ADMIN_ROLES.forEach((role) => {
      expect(STUDENT_ROLES).toContain(role);
    });
  });

  it('does not include TUTOR', () => {
    expect(STUDENT_ROLES).not.toContain(Role.TUTOR);
  });
});
