import { Agency } from '../types';

/**
 * Calculates current status and remaining days for unpaid/past_due agency subscriptions.
 * Policy:
 * 1. Unpaid: Status is not active (past_due, suspended, canceled).
 * 2. Days calculated from `subscriptionSuspendedAt`.
 * 3. Integrations active for 10 days (Grace Period).
 * 4. After 10 days, backup stored for 60 days (total 70 days from suspended).
 * 5. After 70 days, all data deleted from database.
 */
export interface SubscriptionStatusInfo {
  isUnpaid: boolean;
  daysUnpaid: number;
  gracePeriodExpired: boolean;
  backupPeriodExpired: boolean;
  integrationsActive: boolean;
  daysRemainingGrace: number;
  daysRemainingBackup: number;
  policyPhase: 'active' | 'grace_period' | 'backup_only' | 'expired_for_deletion';
}

export function getSubscriptionStatus(agency: Agency | null | undefined): SubscriptionStatusInfo {
  const defaultRes: SubscriptionStatusInfo = {
    isUnpaid: false,
    daysUnpaid: 0,
    gracePeriodExpired: false,
    backupPeriodExpired: false,
    integrationsActive: true,
    daysRemainingGrace: 10,
    daysRemainingBackup: 60,
    policyPhase: 'active'
  };

  if (!agency) return defaultRes;

  // If status is active, everything is fine!
  if (agency.status === 'active') {
    return defaultRes;
  }

  // If status is unpaid/suspended, calculate days
  const suspendedAtStr = agency.subscriptionSuspendedAt;
  if (!suspendedAtStr) {
    // If unpaid but no suspension date in DB, default to today
    return {
      isUnpaid: true,
      daysUnpaid: 0,
      gracePeriodExpired: false,
      backupPeriodExpired: false,
      integrationsActive: true,
      daysRemainingGrace: 10,
      daysRemainingBackup: 60,
      policyPhase: 'grace_period'
    };
  }

  const suspendedDate = new Date(suspendedAtStr);
  const currentDate = new Date();
  
  // Calculate difference in full calendar days
  const diffTime = currentDate.getTime() - suspendedDate.getTime();
  const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  const daysRemainingGrace = Math.max(0, 10 - diffDays);
  const gracePeriodExpired = diffDays > 10;
  
  // Backup period is 60 days AFTER grace period (total 70 days from suspension)
  const daysRemainingBackup = Math.max(0, 70 - diffDays);
  const backupPeriodExpired = diffDays > 70;

  // Integrations active only during first 10 days of suspension
  const integrationsActive = !gracePeriodExpired;

  let policyPhase: 'active' | 'grace_period' | 'backup_only' | 'expired_for_deletion' = 'grace_period';
  if (gracePeriodExpired && !backupPeriodExpired) {
    policyPhase = 'backup_only';
  } else if (backupPeriodExpired) {
    policyPhase = 'expired_for_deletion';
  }

  return {
    isUnpaid: true,
    daysUnpaid: diffDays,
    gracePeriodExpired,
    backupPeriodExpired,
    integrationsActive,
    daysRemainingGrace,
    daysRemainingBackup,
    policyPhase
  };
}
