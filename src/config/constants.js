export const ROLES = {
  SUPER_ADMIN: 'superadmin',
  GYM_OWNER: 'gymowner',
  STAFF: 'staff',
  TRAINER: 'trainer',
  MEMBER: 'member',
};

export const PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  MANAGE_MEMBERS: 'manage_members',
  VIEW_MEMBERS: 'view_members',
  SCAN_QR: 'scan_qr',
  VIEW_ATTENDANCE: 'view_attendance',
  VIEW_REPORTS: 'view_reports',
  MANAGE_PLANS: 'manage_plans',
  VIEW_ALERTS: 'view_alerts',
};

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    // Super Admin only manages gyms/clubs at system level
    // No gym-operational permissions (members, attendance, plans, etc.)
    PERMISSIONS.VIEW_REPORTS, // System-wide reports only
  ],
  [ROLES.GYM_OWNER]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.SCAN_QR,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_PLANS,
    PERMISSIONS.VIEW_ALERTS,
  ],
  [ROLES.STAFF]: [
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.SCAN_QR,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.VIEW_ALERTS,
  ],
  [ROLES.TRAINER]: [
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.VIEW_ATTENDANCE,
  ],
  [ROLES.MEMBER]: [],
};

export const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  FROZEN: 'frozen',
  CANCELLED: 'cancelled',
};

export const FEE_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
  OVERDUE: 'overdue',
};

export const ALERT_TYPES = {
  MEMBERSHIP_EXPIRED: 'membership_expired',
  MEMBERSHIP_EXPIRING: 'membership_expiring',
  FEE_OVERDUE: 'fee_overdue',
  ACCESS_DENIED: 'access_denied',
};
