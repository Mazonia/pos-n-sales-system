/**
 * Akwaaba POS & Retail OS - Enterprise Backup & Disaster Recovery Engine
 * Manages manual and automated database backups with SHA-256 integrity verification.
 * Developed by Mazonia.
 */

import { db, SystemUser } from './dexieSync';
import { notify } from './notificationSystem';

export interface BackupMetadata {
  version: string;
  schemaVersion: number;
  timestamp: string;
  initiatedBy: {
    id: string;
    fullName: string;
    role: string;
  };
  developer: string;
  checksum: string;
  counts: {
    products: number;
    customers: number;
    shifts: number;
    orders: number;
    auditLogs: number;
    purchaseOrders: number;
  };
}

export interface FullBackupPayload {
  metadata: BackupMetadata;
  data: {
    products: any[];
    customers: any[];
    shifts: any[];
    orders: any[];
    offlineQueue: any[];
    auditLogs: any[];
    purchaseOrders: any[];
  };
}

async function computeSHA256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Simple fallback hash if crypto.subtle unavailable
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Creates a complete snapshot of all Dexie IndexedDB tables and initiates file download
 */
export async function createManualDatabaseBackup(currentUser: SystemUser): Promise<FullBackupPayload> {
  const [products, customers, shifts, orders, offlineQueue, auditLogs, purchaseOrders] = await Promise.all([
    db.products.toArray(),
    db.customers.toArray(),
    db.shifts.toArray(),
    db.orders.toArray(),
    db.offlineQueue.toArray(),
    db.auditLogs.toArray(),
    db.purchaseOrders.toArray(),
  ]);

  const rawData = {
    products,
    customers,
    shifts,
    orders,
    offlineQueue,
    auditLogs,
    purchaseOrders,
  };

  const dataString = JSON.stringify(rawData);
  const checksum = await computeSHA256(dataString);

  const payload: FullBackupPayload = {
    metadata: {
      version: '1.0.0',
      schemaVersion: 2,
      timestamp: new Date().toISOString(),
      initiatedBy: {
        id: currentUser.id,
        fullName: currentUser.fullName,
        role: currentUser.role,
      },
      developer: 'Mazonia',
      checksum,
      counts: {
        products: products.length,
        customers: customers.length,
        shifts: shifts.length,
        orders: orders.length,
        auditLogs: auditLogs.length,
        purchaseOrders: purchaseOrders.length,
      },
    },
    data: rawData,
  };

  // Trigger file download
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `AkwaabaPOS_Backup_${dateStr}_${Date.now().toString(36)}.akwaaba.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Log in immutable audit log
  await db.auditLogs.add({
    id: `audit-backup-${Date.now()}`,
    action: 'DATABASE_BACKUP_MANUAL',
    userId: currentUser.id,
    userName: currentUser.fullName,
    details: `Exported full database backup (${products.length} products, ${customers.length} customers, ${shifts.length} shifts). Checksum: ${checksum.slice(0, 12)}...`,
    timestamp: new Date().toISOString(),
  });

  // Also save copy to rolling local auto-backups
  await saveLocalSnapshot(payload, 'Manual Export');

  return payload;
}

/**
 * Saves automated rolling snapshot to localStorage / IndexedDB
 */
export async function triggerAutoBackup(triggerReason: string = 'Scheduled Auto-Backup'): Promise<void> {
  try {
    const [products, customers, shifts, orders, offlineQueue, auditLogs, purchaseOrders] = await Promise.all([
      db.products.toArray(),
      db.customers.toArray(),
      db.shifts.toArray(),
      db.orders.toArray(),
      db.offlineQueue.toArray(),
      db.auditLogs.toArray(),
      db.purchaseOrders.toArray(),
    ]);

    const rawData = { products, customers, shifts, orders, offlineQueue, auditLogs, purchaseOrders };
    const checksum = await computeSHA256(JSON.stringify(rawData));

    const payload: FullBackupPayload = {
      metadata: {
        version: '1.0.0',
        schemaVersion: 2,
        timestamp: new Date().toISOString(),
        initiatedBy: {
          id: 'system-auto',
          fullName: 'System Sentinel',
          role: 'SYSTEM',
        },
        developer: 'Mazonia',
        checksum,
        counts: {
          products: products.length,
          customers: customers.length,
          shifts: shifts.length,
          orders: orders.length,
          auditLogs: auditLogs.length,
          purchaseOrders: purchaseOrders.length,
        },
      },
      data: rawData,
    };

    await saveLocalSnapshot(payload, triggerReason);
  } catch (err) {
    console.warn('[Backup Engine] Auto-backup failed', err);
  }
}

const LOCAL_BACKUP_KEY = 'akwaaba_local_snapshots';
const MAX_LOCAL_SNAPSHOTS = 8;

export interface LocalSnapshotEntry {
  id: string;
  timestamp: string;
  trigger: string;
  checksum: string;
  counts: BackupMetadata['counts'];
  dataString: string;
}

async function saveLocalSnapshot(payload: FullBackupPayload, trigger: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const existingRaw = localStorage.getItem(LOCAL_BACKUP_KEY);
    const list: LocalSnapshotEntry[] = existingRaw ? JSON.parse(existingRaw) : [];

    const newEntry: LocalSnapshotEntry = {
      id: `snap-${Date.now()}`,
      timestamp: payload.metadata.timestamp,
      trigger,
      checksum: payload.metadata.checksum,
      counts: payload.metadata.counts,
      dataString: JSON.stringify(payload.data),
    };

    const updated = [newEntry, ...list].slice(0, MAX_LOCAL_SNAPSHOTS);
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(updated));
    localStorage.setItem('akwaaba_last_backup_time', new Date().toISOString());
  } catch (e) {
    console.warn('[Backup Engine] Local snapshot quota exceeded', e);
  }
}

export function getLocalSnapshotList(): LocalSnapshotEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Validates and restores database from a backup payload or JSON string
 */
export async function restoreDatabase(
  backupJson: string | FullBackupPayload,
  currentUser: SystemUser
): Promise<{ success: boolean; message: string }> {
  try {
    let payload: FullBackupPayload;
    if (typeof backupJson === 'string') {
      payload = JSON.parse(backupJson);
    } else {
      payload = backupJson;
    }

    if (!payload.metadata || !payload.data) {
      throw new Error('Invalid backup file structure: Missing metadata or data tables.');
    }

    // Verify Checksum
    const calculatedChecksum = await computeSHA256(JSON.stringify(payload.data));
    if (payload.metadata.checksum && payload.metadata.checksum !== calculatedChecksum) {
      throw new Error('Integrity verification failed! Checksum mismatch indicates file corruption or unauthorized tampering.');
    }

    // Perform atomic transaction replacement in Dexie
    await db.transaction('rw', [
      db.products,
      db.customers,
      db.shifts,
      db.orders,
      db.offlineQueue,
      db.auditLogs,
      db.purchaseOrders
    ], async () => {
      // Clear existing records
      await Promise.all([
        db.products.clear(),
        db.customers.clear(),
        db.shifts.clear(),
        db.orders.clear(),
        db.offlineQueue.clear(),
        db.auditLogs.clear(),
        db.purchaseOrders.clear(),
      ]);

      // Bulk restore
      if (payload.data.products?.length) await db.products.bulkAdd(payload.data.products);
      if (payload.data.customers?.length) await db.customers.bulkAdd(payload.data.customers);
      if (payload.data.shifts?.length) await db.shifts.bulkAdd(payload.data.shifts);
      if (payload.data.orders?.length) await db.orders.bulkAdd(payload.data.orders);
      if (payload.data.offlineQueue?.length) await db.offlineQueue.bulkAdd(payload.data.offlineQueue);
      if (payload.data.auditLogs?.length) await db.auditLogs.bulkAdd(payload.data.auditLogs);
      if (payload.data.purchaseOrders?.length) await db.purchaseOrders.bulkAdd(payload.data.purchaseOrders);

      // Record immutable restore log
      await db.auditLogs.add({
        id: `audit-restore-${Date.now()}`,
        action: 'DATABASE_RESTORE_EXECUTED',
        userId: currentUser.id,
        userName: currentUser.fullName,
        details: `DATABASE RESTORE: Successfully restored ${payload.data.products?.length || 0} products, ${payload.data.customers?.length || 0} customers, ${payload.data.shifts?.length || 0} shifts from backup dated ${payload.metadata.timestamp}. Executed by ${currentUser.fullName} (${currentUser.role}).`,
        timestamp: new Date().toISOString(),
      });
    });

    // Notify components to refresh data
    window.dispatchEvent(new CustomEvent('productsUpdated'));
    window.dispatchEvent(new CustomEvent('customersUpdated'));
    window.dispatchEvent(new CustomEvent('shiftsUpdated'));

    return {
      success: true,
      message: `Database restored cleanly! (${payload.data.products?.length || 0} products, ${payload.data.customers?.length || 0} customers restored).`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to restore database from backup file.',
    };
  }
}

/**
 * Setup Wizard Multi-Store Linking Helper:
 * Restores store catalog, inventory, and customer databases on a new terminal device
 */
export async function restoreFullBackup(
  backupJson: string,
  managerPin: string,
  managerName: string = 'General Manager'
): Promise<{ success: boolean; message: string; restoredCounts: { products: number; customers: number } }> {
  const adminUser: SystemUser = {
    id: 'mgr-admin-01',
    username: 'general-manager',
    fullName: managerName,
    role: 'GENERAL_MANAGER',
    branchId: 'branch-accra-01',
    branchName: 'Accra Central Hub',
    pin: managerPin,
  };
  const res = await restoreDatabase(backupJson, adminUser);
  let parsed: any = null;
  try {
    parsed = typeof backupJson === 'string' ? JSON.parse(backupJson) : backupJson;
  } catch (e) {}
  return {
    success: res.success,
    message: res.message,
    restoredCounts: {
      products: parsed?.data?.products?.length || 0,
      customers: parsed?.data?.customers?.length || 0,
    },
  };
}

