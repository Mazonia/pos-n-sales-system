/**
 * Akwaaba POS & Retail OS - Terminal Workstation & Branch Binding Engine
 * 
 * Manages device-to-branch binding for PC terminals.
 * When the app is installed or opened on a PC, Super Admins or General Managers
 * configure the workstation branch. Only staff assigned to that branch (or roving HQ executives)
 * can access and operate the terminal on that PC.
 */

import { SystemUser, db } from './dexieSync';

export interface TerminalBranch {
  id: string;
  name: string;
  code: string;
  location: string;
  region: string;
}

export const ENTERPRISE_BRANCHES: TerminalBranch[] = [
  {
    id: 'branch-accra-01',
    name: 'Accra Central Mall Store',
    code: 'ACC-01',
    location: 'Makola & Central Business District, Accra',
    region: 'Greater Accra',
  },
  {
    id: 'branch-osu-02',
    name: 'Osu Oxford Street Branch',
    code: 'OSU-02',
    location: 'Oxford Street, Osu, Accra',
    region: 'Greater Accra',
  },
  {
    id: 'branch-spintex-03',
    name: 'Spintex Logistics & Retail Hub',
    code: 'SPX-03',
    location: 'Spintex Road Commercial Corridor, Accra',
    region: 'Greater Accra',
  },
  {
    id: 'branch-kumasi-04',
    name: 'Kumasi Adum Central Branch',
    code: 'KMS-04',
    location: 'Adum Heritage District, Kumasi',
    region: 'Ashanti Region',
  },
  {
    id: 'branch-takoradi-05',
    name: 'Takoradi Harbour Supermarket',
    code: 'TKD-05',
    location: 'Market Circle Commercial Area, Takoradi',
    region: 'Western Region',
  },
  {
    id: 'branch-tamale-06',
    name: 'Tamale Central Store',
    code: 'TML-06',
    location: 'Central Market Road, Tamale',
    region: 'Northern Region',
  },
];

const TERMINAL_STORAGE_KEY = 'akwaaba_terminal_workstation_branch';

/**
 * Retrieve the current terminal branch binding from localStorage
 */
export function getTerminalBranch(): TerminalBranch {
  try {
    const raw = localStorage.getItem(TERMINAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.name) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading terminal branch config', e);
  }

  // Default to primary flagship branch
  return ENTERPRISE_BRANCHES[0];
}

/**
 * Save terminal branch assignment (Authorized by Super Admin or General Manager)
 */
export async function setTerminalBranch(
  branch: TerminalBranch,
  authorizedBy: SystemUser
): Promise<void> {
  try {
    localStorage.setItem(TERMINAL_STORAGE_KEY, JSON.stringify(branch));

    // Audit log for non-repudiation
    await db.auditLogs.add({
      id: `audit-term-${Date.now()}`,
      action: 'WORKSTATION_TERMINAL_BRANCH_SET',
      userId: authorizedBy.id,
      userName: authorizedBy.fullName,
      details: `PC Terminal workstation bound to branch "${branch.name}" (${branch.code}, ${branch.region}) by ${authorizedBy.fullName} (${authorizedBy.role}). Previous binding replaced.`,
      timestamp: new Date().toISOString(),
    });

    // Notify window listeners
    window.dispatchEvent(
      new CustomEvent('terminalBranchChanged', {
        detail: branch,
      })
    );
  } catch (e) {
    console.error('Failed to persist terminal branch assignment', e);
    throw e;
  }
}

/**
 * Check if a user is permitted to log into this PC terminal
 * 
 * Rules:
 * - SUPER_ADMIN and GENERAL_MANAGER have roving enterprise privileges and can access any PC.
 * - Users whose branchId matches the terminal branchId or whose branchName matches can access.
 * - Users with 'branch-all' or 'Headquarters & Multi-Store' can access.
 * - Other users assigned to a different branch are locked out of this workstation PC.
 */
export function canUserAccessTerminal(
  user: SystemUser,
  terminalBranch: TerminalBranch
): {
  allowed: boolean;
  reason?: string;
  isRovingExecutive?: boolean;
} {
  // Super Admin & General Manager have executive roving powers across all enterprise terminals
  if (user.role === 'SUPER_ADMIN' || user.role === 'GENERAL_MANAGER') {
    return {
      allowed: true,
      isRovingExecutive: true,
    };
  }

  // Check branchId or branchName match
  const matchesBranchId = user.branchId === terminalBranch.id;
  const matchesBranchName =
    user.branchName.trim().toLowerCase() === terminalBranch.name.trim().toLowerCase();
  const isAllBranches =
    user.branchId === 'branch-all' ||
    user.branchName.toLowerCase().includes('headquarters') ||
    user.branchName.toLowerCase().includes('multi-store');

  if (matchesBranchId || matchesBranchName || isAllBranches) {
    return {
      allowed: true,
    };
  }

  return {
    allowed: false,
    reason: `User is assigned to "${user.branchName}". This PC workstation is locked to "${terminalBranch.name}". Only personnel allocated to this branch or executive managers can operate this machine.`,
  };
}
