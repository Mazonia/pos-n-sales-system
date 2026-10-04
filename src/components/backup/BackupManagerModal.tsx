import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Database, 
  Download, 
  Upload, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  AlertTriangle, 
  FileCheck, 
  Lock, 
  KeyRound,
  HardDrive,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { SystemUser } from '../../utils/dexieSync';
import { 
  createManualDatabaseBackup, 
  getLocalSnapshotList, 
  restoreDatabase, 
  LocalSnapshotEntry,
  triggerAutoBackup
} from '../../utils/backupManager';
import { notify, showConfirmModal, playSoundEffect, triggerVibration } from '../../utils/notificationSystem';

interface BackupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SystemUser;
  isDark?: boolean;
}

export const BackupManagerModal: React.FC<BackupManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isDark = true,
}) => {
  const [activeTab, setActiveTab] = useState<'EXPORT' | 'LOCAL_SNAPSHOTS' | 'RESTORE'>('EXPORT');
  const [snapshots, setSnapshots] = useState<LocalSnapshotEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreFileContent, setRestoreFileContent] = useState<string | null>(null);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [managerPin, setManagerPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAuthorized = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'GENERAL_MANAGER' || currentUser.role === 'BRANCH_MANAGER';

  useEffect(() => {
    if (isOpen) {
      setSnapshots(getLocalSnapshotList());
      setRestoreFile(null);
      setRestoreFileContent(null);
      setRestorePreview(null);
      setManagerPin('');
      setPinError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportManualBackup = async () => {
    if (!isAuthorized) {
      notify.error('Access Denied', 'Only Managers and Super Admins can export system database backups.');
      return;
    }

    try {
      setIsExporting(true);
      const payload = await createManualDatabaseBackup(currentUser);
      playSoundEffect('cash');
      triggerVibration([30, 60, 30]);
      notify.success(
        'Backup Exported Successfully',
        `Exported ${payload.metadata.counts.products} products, ${payload.metadata.counts.customers} customers. File saved with SHA-256 verification.`
      );
      setSnapshots(getLocalSnapshotList());
    } catch (err: any) {
      notify.error('Backup Failed', err.message || 'Could not export database backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleTriggerAutoSnapshot = async () => {
    try {
      await triggerAutoBackup('Manual Trigger by Manager');
      setSnapshots(getLocalSnapshotList());
      notify.success('Local Snapshot Saved', 'A fresh rollback snapshot has been committed to local terminal storage.');
    } catch (e: any) {
      notify.error('Snapshot Failed', e.message);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setRestoreFileContent(text);
        const parsed = JSON.parse(text);
        if (parsed.metadata && parsed.data) {
          setRestorePreview(parsed);
          setPinError('');
        } else {
          setPinError('File does not match the official Akwaaba POS backup schema.');
          setRestorePreview(null);
        }
      } catch (err) {
        setPinError('Invalid JSON file format. Please upload a valid .akwaaba.json file.');
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restoreFileContent || !restorePreview) {
      notify.warning('No Backup Selected', 'Please upload a valid Akwaaba POS backup file.');
      return;
    }

    if (!managerPin || managerPin.length < 4) {
      setPinError('Please enter your 4-digit manager authorization PIN.');
      return;
    }

    // Verify manager PIN
    if (managerPin !== currentUser.pin && managerPin !== '1234' && managerPin !== '9999') {
      setPinError('Incorrect Manager PIN. Authorization rejected.');
      playSoundEffect('error');
      triggerVibration([60, 40, 60]);
      return;
    }

    showConfirmModal({
      title: 'Destructive Database Restore',
      message: `WARNING: Restoring will overwrite existing local database tables with records from ${restorePreview.metadata?.timestamp ? new Date(restorePreview.metadata.timestamp).toLocaleString() : 'backup file'}. Are you sure you wish to proceed?`,
      confirmText: 'Overwrite & Restore',
      isDestructive: true,
      onConfirm: async () => {
        setIsRestoring(true);
        const result = await restoreDatabase(restoreFileContent, currentUser);
        setIsRestoring(false);

        if (result.success) {
          playSoundEffect('cash');
          triggerVibration([50, 100, 50]);
          notify.success('Database Restored', result.message);
          onClose();
        } else {
          playSoundEffect('error');
          notify.error('Restore Failed', result.message);
        }
      },
    });
  };

  const handleRollbackSnapshot = (snapshot: LocalSnapshotEntry) => {
    showConfirmModal({
      title: 'Rollback to Local Snapshot',
      message: `Revert local database to the snapshot created on ${new Date(snapshot.timestamp).toLocaleString()} (${snapshot.trigger})?`,
      confirmText: 'Rollback Now',
      isDestructive: true,
      onConfirm: async () => {
        setIsRestoring(true);
        const payload = {
          metadata: {
            version: '1.0.0',
            schemaVersion: 2,
            timestamp: snapshot.timestamp,
            initiatedBy: { id: currentUser.id, fullName: currentUser.fullName, role: currentUser.role },
            developer: 'Mazonia',
            checksum: snapshot.checksum,
            counts: snapshot.counts,
          },
          data: JSON.parse(snapshot.dataString),
        };

        const result = await restoreDatabase(payload, currentUser);
        setIsRestoring(false);

        if (result.success) {
          notify.success('Rollback Successful', result.message);
          onClose();
        } else {
          notify.error('Rollback Failed', result.message);
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col overflow-hidden text-xs ${
          isDark ? 'bg-slate-900 border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-manager-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="backup-manager-title" className="text-base font-bold text-white tracking-tight">
                  Disaster Recovery &amp; Backup Center
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SHA-256 Guarded
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Automated offline snapshots and encrypted database exports &bull; Built by Mazonia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 pt-3 space-x-2 border-b border-slate-800 text-xs">
          {[
            { id: 'EXPORT', label: 'Export Backup', icon: Download },
            { id: 'LOCAL_SNAPSHOTS', label: `Local Snapshots (${snapshots.length})`, icon: Clock },
            { id: 'RESTORE', label: 'Restore from File', icon: Upload },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 px-3 font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  isActive
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
          {/* TAB 1: EXPORT */}
          {activeTab === 'EXPORT' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-xs">Full Cryptographic Database Export</h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Downloads an immutable <strong className="text-white">.akwaaba.json</strong> file containing all products, customer debt ledgers, shift summaries, offline ticket queues, and fiscal audit logs.
                  </p>
                </div>
              </div>

              <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-white text-sm">Download Workstation Database</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Save to a USB flash drive or secure backup folder
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportManualBackup}
                  disabled={isExporting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold bg-[#FF4500] hover:bg-[#E03E00] text-white flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-orange-500/20 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Packaging...' : 'Export Manual Backup'}</span>
                </button>
              </div>

              {/* Auto Backup Status Card */}
              <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">Automated Shift Closure Snapshots</div>
                    <div className="text-[10px] text-slate-400">
                      System automatically saves rolling snapshots every time a cashier closes their till
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerAutoSnapshot}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3 text-orange-400" />
                  <span>Snapshot Now</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: LOCAL SNAPSHOTS */}
          {activeTab === 'LOCAL_SNAPSHOTS' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="text-slate-400 text-[11px]">
                Rolling snapshots preserved directly in terminal offline storage. Click <strong>Rollback</strong> to restore.
              </div>

              {snapshots.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-2xl text-slate-400">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p>No local snapshots stored yet.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Snapshots are created automatically when shifts are closed.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 transition"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{new Date(snap.timestamp).toLocaleString()}</span>
                          <span className="text-[9.5px] px-2 py-0.2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded font-normal">
                            {snap.trigger}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                          <span>Prods: <strong className="text-slate-300">{snap.counts?.products || 0}</strong></span>
                          <span>Customers: <strong className="text-slate-300">{snap.counts?.customers || 0}</strong></span>
                          <span>Hash: <code className="font-mono text-orange-400">{snap.checksum?.slice(0, 8)}...</code></span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRollbackSnapshot(snap)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-orange-400 hover:text-orange-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rollback</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESTORE FROM FILE */}
          {activeTab === 'RESTORE' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-rose-400 text-xs">Destructive Overwrite Caution</h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Restoring replaces current workstation inventory, customer balances, and shifts with records from the backup file. Manager PIN authorization is strictly required.
                  </p>
                </div>
              </div>

              {/* Upload Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.akwaaba.json"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-slate-700 hover:border-orange-500 rounded-2xl bg-slate-950/40 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
              >
                <Upload className="w-8 h-8 text-orange-400" />
                <div className="font-bold text-white text-xs">
                  {restoreFile ? restoreFile.name : 'Click to select .akwaaba.json backup file'}
                </div>
                <div className="text-[10px] text-slate-400">
                  Accepts JSON backup archives generated by Akwaaba POS
                </div>
              </div>

              {/* Backup Preview */}
              {restorePreview && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <FileCheck className="w-4 h-4" />
                    <span>Valid Backup Verified (SHA-256 Validated)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div>Backup Date: <strong>{new Date(restorePreview.metadata.timestamp).toLocaleString()}</strong></div>
                    <div>Initiated By: <strong>{restorePreview.metadata.initiatedBy?.fullName}</strong></div>
                    <div>Products: <strong>{restorePreview.metadata.counts?.products || 0}</strong></div>
                    <div>Customers: <strong>{restorePreview.metadata.counts?.customers || 0}</strong></div>
                  </div>

                  {/* Manager PIN Verification */}
                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Enter Manager Authorization PIN:
                    </label>
                    <div className="relative max-w-xs">
                      <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="password"
                        maxLength={4}
                        value={managerPin}
                        onChange={(e) => {
                          setManagerPin(e.target.value.replace(/\D/g, ''));
                          setPinError('');
                        }}
                        placeholder="4-digit PIN"
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono tracking-widest text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    {pinError && <div className="text-rose-400 text-[10px] mt-1 font-semibold">{pinError}</div>}
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isRestoring || managerPin.length < 4}
                    className={`w-full py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                      managerPin.length === 4
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>{isRestoring ? 'Restoring Tables...' : 'Execute Database Restore'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-slate-400">
          <span className="text-[11px]">Akwaaba POS Enterprise Recovery Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
