export const Role = {
  STUDENT: 'STUDENT',
  TUTOR: 'TUTOR',
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

export const ADMIN_ROLES = [Role.ADMIN, Role.OWNER, Role.SUPER_ADMIN];
export const TUTOR_ROLES = [Role.TUTOR, ...ADMIN_ROLES];
export const STUDENT_ROLES = [Role.STUDENT, ...ADMIN_ROLES];
/** Student + tutor messaging (active role); admins included */
export const MESSAGING_ROLES = [Role.STUDENT, Role.TUTOR, ...ADMIN_ROLES];
