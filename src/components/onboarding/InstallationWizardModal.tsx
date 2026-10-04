import React, { useState } from 'react';
import { 
  Store, 
  Printer, 
  Scale, 
  FileText, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Coins, 
  CheckCircle2, 
  Sparkles,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { ENTERPRISE_BRANCHES, setTerminalBranch } from '../../utils/terminalConfig';
import { TaxSchemeType } from '../../utils/ghanaTaxEngine';
import { SYSTEM_USERS } from '../../utils/dexieSync';
import { playSoundEffect, triggerVibration, notify } from '../../utils/notificationSystem';

interface InstallationWizardModalProps {
  isOpen: boolean;
  onComplete: () => void;
  isDark?: boolean;
}

export const InstallationWizardModal: React.FC<InstallationWizardModalProps> = ({
  isOpen,
  onComplete,
  isDark = true,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Enterprise Profile
  const [storeName, setStoreName] = useState('Akwaaba Supermarket & Retail OS');
  const [selectedBranchId, setSelectedBranchId] = useState('branch-accra-01');
  const [taxScheme, setTaxScheme] = useState<TaxSchemeType>('STANDARD_VAT');

  // Step 2: Hardware & Till Peripherals (Optional / Can configure later)
  const [receiptWidth, setReceiptWidth] = useState<'80mm' | '58mm'>('80mm');
  const [scannerType, setScannerType] = useState<'USB_HARDWARE' | 'TABLET_CAMERA'>('USB_HARDWARE');
  const [printerConnection, setPrinterConnection] = useState<'ESC_POS' | 'BLUETOOTH' | 'SYSTEM_PRINT'>('ESC_POS');
  const [hardwareConfiguredLater, setHardwareConfiguredLater] = useState(false);

  // Step 3: Legal Terms & Developer Non-Liability Acceptance (Mandatory)
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToLiabilityWaiver, setAgreedToLiabilityWaiver] = useState(false);

  // Step 4: Float Setup (Optional / Can set at shift open)
  const [openingFloat, setOpeningFloat] = useState(200);

  if (!isOpen) return null;

  const handleNext = () => {
    playSoundEffect('click');
    triggerVibration(20);
    setCurrentStep((prev) => Math.min(4, prev + 1));
  };

  const handleBack = () => {
    playSoundEffect('click');
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSkipHardware = () => {
    playSoundEffect('click');
    setHardwareConfiguredLater(true);
    // Apply sensible defaults
    setReceiptWidth('80mm');
    setPrinterConnection('ESC_POS');
    setScannerType('USB_HARDWARE');
    notify.info('Hardware Deferred', 'Standard 80mm ESC/POS defaults selected. You can adjust this anytime in Terminal Settings.');
    setCurrentStep(3);
  };

  const handleFinishSetup = (floatVal: number = openingFloat) => {
    if (!agreedToTerms || !agreedToLiabilityWaiver) {
      notify.warning('Legal Consent Required', 'You must read and tick both the Terms of Service and Developer Liability Waiver before operating this POS terminal.');
      return;
    }

    // Save terminal configuration
    const selectedBranch = ENTERPRISE_BRANCHES.find((b) => b.id === selectedBranchId) || ENTERPRISE_BRANCHES[0];
    setTerminalBranch(selectedBranch, SYSTEM_USERS[0]);

    // Save preferences using project standards
    localStorage.setItem('akwaaba_store_name', storeName);
    localStorage.setItem('akwaaba_receipt_width', receiptWidth);
    localStorage.setItem('akwaaba_scanner_type', scannerType);
    localStorage.setItem('akwaaba_printer_connection', printerConnection);
    localStorage.setItem('akwaaba_tax_scheme', taxScheme);
    localStorage.setItem('akwaaba_opening_float_default', floatVal.toString());
    localStorage.setItem('akwaaba_setup_completed', 'true');
    localStorage.setItem('akwaaba_terms_accepted_date', new Date().toISOString());

    playSoundEffect('cash');
    triggerVibration([50, 100, 50]);
    notify.success('Terminal Initialized', `Welcome to ${storeName}! Registered to ${selectedBranch.name}.`);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col overflow-hidden text-xs transition-colors ${
          isDark 
            ? 'bg-[#16181F] border-[#282B34] text-[#F4F4F6]' 
            : 'bg-white border-[#CBD5E1] text-[#0F172A]'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
      >
        {/* Wizard Header with Clean Steps */}
        <div className={`p-5 sm:p-6 border-b ${
          isDark ? 'border-[#282B34] bg-[#121316]' : 'border-[#CBD5E1] bg-[#EBEEF2]/70'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5722] via-[#FF4500] to-[#E03E00] text-white flex items-center justify-center shadow-md shadow-[#FF4500]/25 shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 id="wizard-title" className="text-base sm:text-lg font-bold tracking-tight">
                  Workstation Onboarding &amp; Setup
                </h2>
                <p className={`text-[11px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
                  Initial store profile, hardware preferences, and statutory compliance agreement
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-[#FF4500]/15 text-[#FF4500] dark:text-[#FF5722] border border-[#FF4500]/25">
                Step {currentStep} of 4
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: 'Store Identity' },
              { num: 2, label: 'Hardware' },
              { num: 3, label: 'Legal & Terms' },
              { num: 4, label: 'Till Float' },
            ].map((s) => (
              <div key={s.num} className="space-y-1">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentStep >= s.num ? 'bg-[#FF4500]' : isDark ? 'bg-[#282B34]' : 'bg-[#CBD5E1]'
                  }`} 
                />
                <span className={`text-[10px] font-semibold block truncate ${
                  currentStep >= s.num 
                    ? 'text-[#FF4500] dark:text-[#FF5722]' 
                    : isDark ? 'text-[#6B7280]' : 'text-[#64748B]'
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content Container */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[60vh] space-y-4">
          
          {/* STEP 1: Store & Workstation Profile */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-[#F4F4F6]' : 'text-[#0F172A]'}`}>
                  Trading Business / Store Name:
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-[#FF4500] transition ${
                    isDark 
                      ? 'bg-[#121316] border-[#282B34] text-white' 
                      : 'bg-white border-[#CBD5E1] text-[#0F172A]'
                  }`}
                  placeholder="e.g. Makola Central Provisions & Wholesale Ltd"
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-[#F4F4F6]' : 'text-[#0F172A]'}`}>
                  Assigned Branch Workstation:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ENTERPRISE_BRANCHES.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBranchId(b.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        selectedBranchId === b.id
                          ? 'bg-[#FF4500]/10 border-[#FF4500] text-[#FF4500] font-bold shadow-xs'
                          : isDark
                          ? 'bg-[#121316] border-[#282B34] text-[#9CA3AF] hover:border-[#383C48]'
                          : 'bg-white border-[#CBD5E1] text-[#334155] hover:border-slate-400'
                      }`}
                    >
                      <div className="font-bold text-xs truncate">{b.name}</div>
                      <div className={`text-[10px] mt-0.5 truncate ${isDark ? 'text-[#6B7280]' : 'text-[#64748B]'}`}>{b.location}</div>
                      <span className="text-[9.5px] mt-1 text-[#FF4500] font-mono block font-bold">{b.region}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-[#F4F4F6]' : 'text-[#0F172A]'}`}>
                  GRA Statutory Tax Profile:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'STANDARD_VAT', label: 'Standard VAT (21.90%)', desc: '15% VAT + 2.5% NHIL + 2.5% GETFund + 1% COVID' },
                    { id: 'FLAT_RATE_VFRS', label: 'VAT Flat Rate (4.0%)', desc: '3% VFRS + 1% COVID-19 Levy for Retailers' },
                    { id: 'EXEMPT_SME', label: 'Exempt / SME (0%)', desc: 'Raw produce, medications, zero-rated SME' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTaxScheme(t.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        taxScheme === t.id
                          ? 'bg-[#008B8B]/15 border-[#00CED1] text-[#00CED1] font-bold'
                          : isDark
                          ? 'bg-[#121316] border-[#282B34] text-[#9CA3AF] hover:border-[#383C48]'
                          : 'bg-white border-[#CBD5E1] text-[#334155] hover:border-slate-400'
                      }`}
                    >
                      <div className="font-bold text-xs">{t.label}</div>
                      <div className={`text-[10px] mt-1 ${isDark ? 'text-[#6B7280]' : 'text-[#64748B]'}`}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Hardware Configuration (With "Configure Later" option) */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-[#EBEEF2]/70 border-[#CBD5E1]'
              }`}>
                <div className="flex items-center gap-2.5">
                  <Printer className="w-4 h-4 text-[#FF4500] shrink-0" />
                  <span className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-[#334155]'}`}>
                    Hardware peripherals are optional right now and can be configured at any point later.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSkipHardware}
                  className="px-3 py-1.5 rounded-lg border border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500] font-bold text-xs hover:bg-[#FF4500]/20 transition shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Configure Later</span>
                </button>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-[#F4F4F6]' : 'text-[#0F172A]'}`}>
                  Thermal Receipt Paper Width:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: '80mm', label: '80mm Standard POS Roll', desc: 'Recommended for checkout counters, supermarkets & desktop workstations' },
                    { id: '58mm', label: '58mm Compact Roll', desc: 'Recommended for mobile Bluetooth printers, tablets & small stalls' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setReceiptWidth(p.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        receiptWidth === p.id
                          ? 'bg-[#FF4500]/10 border-[#FF4500] text-[#FF4500] font-bold'
                          : isDark
                          ? 'bg-[#121316] border-[#282B34] text-[#9CA3AF] hover:border-[#383C48]'
                          : 'bg-white border-[#CBD5E1] text-[#334155] hover:border-slate-400'
                      }`}
                    >
                      <div className="font-bold text-xs">{p.label}</div>
                      <div className={`text-[10px] mt-1 ${isDark ? 'text-[#6B7280]' : 'text-[#64748B]'}`}>{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-[#F4F4F6]' : 'text-[#0F172A]'}`}>
                  Printer Interface Connection:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ESC_POS', label: 'Direct ESC/POS', desc: 'USB / Serial silent print & drawer pulse' },
                    { id: 'BLUETOOTH', label: 'Bluetooth SPP', desc: 'Wireless for Android tablets & iPads' },
                    { id: 'SYSTEM_PRINT', label: 'System Dialog', desc: 'Standard Windows/Mac print dialog' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setPrinterConnection(d.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        printerConnection === d.id
                          ? 'bg-[#008B8B]/15 border-[#00CED1] text-[#00CED1] font-bold'
                          : isDark
                          ? 'bg-[#121316] border-[#282B34] text-[#9CA3AF] hover:border-[#383C48]'
                          : 'bg-white border-[#CBD5E1] text-[#334155] hover:border-slate-400'
                      }`}
                    >
                      <div className="font-bold text-xs">{d.label}</div>
                      <div className={`text-[10px] mt-1 ${isDark ? 'text-[#6B7280]' : 'text-[#64748B]'}`}>{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-[#F4F4F6]' : 'text-[#0F172A]'}`}>
                  Barcode Input Mode:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'USB_HARDWARE', label: 'USB / Wireless Scanner Gun', desc: 'Instant hardware keyboard wedge input with zero latency' },
                    { id: 'TABLET_CAMERA', label: 'Tablet / Device Camera', desc: 'Uses tablet camera to scan standard 1D & 2D barcodes' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setScannerType(s.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        scannerType === s.id
                          ? 'bg-[#FF4500]/10 border-[#FF4500] text-[#FF4500] font-bold'
                          : isDark
                          ? 'bg-[#121316] border-[#282B34] text-[#9CA3AF] hover:border-[#383C48]'
                          : 'bg-white border-[#CBD5E1] text-[#334155] hover:border-slate-400'
                      }`}
                    >
                      <div className="font-bold text-xs">{s.label}</div>
                      <div className={`text-[10px] mt-1 ${isDark ? 'text-[#6B7280]' : 'text-[#64748B]'}`}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Legal Disclaimers, Terms of Service & Developer Non-Liability */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-[#EBEEF2]/70 border-[#CBD5E1]'
              }`}>
                <Scale className="w-5 h-5 text-[#FF4500] shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-[#FF4500] dark:text-[#FF5722]">
                    Statutory Legal Agreement &amp; Non-Liability Clause
                  </h4>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
                    Please review the terms of use, developer non-liability boundary, and merchant custody duties.
                  </p>
                </div>
              </div>

              {/* Legal Terms Box with Clean Sub-clause Indentation */}
              <div className={`p-4 rounded-xl border text-[11px] space-y-4 leading-relaxed max-h-60 overflow-y-auto ${
                isDark ? 'bg-[#121316] border-[#282B34] text-[#F4F4F6]' : 'bg-slate-50 border-[#CBD5E1] text-[#0F172A]'
              }`}>
                
                {/* Clause 1: Developer Non-Liability */}
                <div>
                  <div className="font-bold text-xs text-[#FF4500] dark:text-[#FF5722] mb-1.5 flex items-center gap-1.5">
                    <span>1. Developer ("Mazonia") Non-Liability Disclaimer:</span>
                  </div>
                  <p className={`mb-2 ${isDark ? 'text-[#9CA3AF]' : 'text-[#334155]'}`}>
                    Akwaaba POS &amp; Retail OS is engineered and supplied by developer <strong>Mazonia</strong> on an "as-is" and "as-available" basis. To the maximum extent permitted by applicable law, the developer (Mazonia) shall NOT be held accountable or liable for:
                  </p>
                  <div className="space-y-1.5 pl-4 border-l-2 border-[#FF4500]/40 my-2 text-[10.5px]">
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-[#FF4500] shrink-0">(a)</span>
                      <span>Physical cash drawer shortages, staff theft, or unverified cash reconciliation discrepancies;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-[#FF4500] shrink-0">(b)</span>
                      <span>Perishable food spoilage, freezer defrosting, or inventory decay resulting from grid power outages (Dumsor) or backup generator downtime;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-[#FF4500] shrink-0">(c)</span>
                      <span>Third-party hardware malfunctions, ESC/POS printhead defects, thermal paper jams, or local Bluetooth drops;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-[#FF4500] shrink-0">(d)</span>
                      <span>Erroneous price overrides, manual discount errors, or mistaken cost values entered by cashiers or branch operators;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-[#FF4500] shrink-0">(e)</span>
                      <span>Tax penalties, surcharge assessments, or audit fines issued by the Ghana Revenue Authority (GRA) resulting from merchant tax misclassification or incorrect VAT reporting.</span>
                    </div>
                  </div>
                </div>

                {/* Clause 2: Merchant Custody & Responsibility */}
                <div className="pt-2 border-t border-slate-700/40">
                  <div className="font-bold text-xs text-[#00CED1] dark:text-[#00CED1] mb-1.5 flex items-center gap-1.5">
                    <span>2. Merchant Sole Custody &amp; Operational Responsibilities:</span>
                  </div>
                  <p className={`mb-2 ${isDark ? 'text-[#9CA3AF]' : 'text-[#334155]'}`}>
                    The business owner and merchant assume sole and exclusive custody for:
                  </p>
                  <div className="space-y-1.5 pl-4 border-l-2 border-[#00CED1]/40 my-2 text-[10.5px]">
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-[#00CED1] shrink-0">(a)</span>
                      <span>Physical cash counts, drawer denomination auditing, safe deposits, and bank cash transfers;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-[#00CED1] shrink-0">(b)</span>
                      <span>Verifying Mobile Money (MTN, Telecel, AT) transaction IDs and balances on physical SIM handsets prior to dispensing merchandise;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-[#00CED1] shrink-0">(c)</span>
                      <span>Confidentiality of Supervisor, Manager, and Administrator 4-digit and 6-digit PIN codes;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-[#00CED1] shrink-0">(d)</span>
                      <span>Creating frequent database backups (.akwaaba.json snapshots) via the Disaster Recovery center;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-[#00CED1] shrink-0">(e)</span>
                      <span>Maintaining statutory compliance with the Value Added Tax Act, 2013 (Act 870) and filing timely tax declarations.</span>
                    </div>
                  </div>
                </div>

                {/* Clause 3: Privacy & Data Sovereignty */}
                <div className="pt-2 border-t border-slate-700/40">
                  <div className="font-bold text-xs mb-1">
                    3. Local-First Data Sovereignty:
                  </div>
                  <p className={isDark ? 'text-[#9CA3AF]' : 'text-[#334155]'}>
                    All inventory catalogs, cashier shifts, sales records, and customer credit ledgers reside locally on your device in secure IndexedDB storage. The developer does NOT harvest or resell merchant transaction records.
                  </p>
                </div>

                {/* Clause 4: Support & Feedback */}
                <div className="pt-2 border-t border-slate-700/40">
                  <div className="font-bold text-xs mb-1">
                    4. Technical Support &amp; Problem Reporting:
                  </div>
                  <p className={isDark ? 'text-[#9CA3AF]' : 'text-[#334155]'}>
                    Since no developer emails are assigned for this project, all bug reports, technical inquiries, and user complaints must be filed directly via GitHub Issues:
                    <br />
                    <span className="font-mono font-bold text-[#FF4500] dark:text-[#FF5722]">https://github.com/Mazonia/pos-n-sales-system/issues</span>
                  </p>
                </div>
              </div>

              {/* Mandatory Acceptance Checkboxes */}
              <div className="space-y-2 pt-1">
                <label 
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer select-none ${
                    agreedToTerms 
                      ? 'bg-[#FF4500]/10 border-[#FF4500]' 
                      : isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-slate-50 border-[#CBD5E1]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 transition ${
                    agreedToTerms ? 'bg-[#FF4500] border-[#FF4500] text-white' : isDark ? 'border-[#383C48] bg-[#1A1C22]' : 'border-slate-400 bg-white'
                  }`}>
                    {agreedToTerms && <Check className="w-3 h-3" />}
                  </div>
                  <span className={`text-[11px] leading-tight ${isDark ? 'text-[#F4F4F6]' : 'text-[#0F172A]'}`}>
                    I have read, understood, and accept the <strong>Akwaaba POS Terms of Service</strong> and Operational Custody Requirements.
                  </span>
                </label>

                <label 
                  onClick={() => setAgreedToLiabilityWaiver(!agreedToLiabilityWaiver)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer select-none ${
                    agreedToLiabilityWaiver 
                      ? 'bg-[#FF4500]/10 border-[#FF4500]' 
                      : isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-slate-50 border-[#CBD5E1]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 transition ${
                    agreedToLiabilityWaiver ? 'bg-[#FF4500] border-[#FF4500] text-white' : isDark ? 'border-[#383C48] bg-[#1A1C22]' : 'border-slate-400 bg-white'
                  }`}>
                    {agreedToLiabilityWaiver && <Check className="w-3 h-3" />}
                  </div>
                  <span className={`text-[11px] leading-tight ${isDark ? 'text-[#F4F4F6]' : 'text-[#0F172A]'}`}>
                    I acknowledge that developer <strong>Mazonia</strong> is NOT liable for cash variances, Dumsor spoilage losses, hardware faults, or GRA tax assessments.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: Initial Cashier Float (Optional / Can set at shift open) */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-[#EBEEF2]/70 border-[#CBD5E1]'
              }`}>
                <div className="flex items-center gap-2.5">
                  <Coins className="w-4 h-4 text-[#FF4500] shrink-0" />
                  <span className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-[#334155]'}`}>
                    You can set an initial cash float now, or enter it later when opening your cashier shift.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleFinishSetup(0)}
                  className="px-3 py-1.5 rounded-lg border border-[#00CED1]/30 bg-[#00CED1]/10 text-[#00CED1] font-bold text-xs hover:bg-[#00CED1]/20 transition shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Set at Shift Open</span>
                </button>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-[#F4F4F6]' : 'text-[#0F172A]'}`}>
                  Opening Cash Float Amount:
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-[#FF4500] font-bold text-sm">GH₵</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                    className={`w-full pl-14 pr-4 py-2.5 rounded-xl border text-sm font-bold font-mono focus:outline-none focus:border-[#FF4500] transition ${
                      isDark 
                        ? 'bg-[#121316] border-[#282B34] text-white' 
                        : 'bg-white border-[#CBD5E1] text-[#0F172A]'
                    }`}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[0, 100, 200, 500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOpeningFloat(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition ${
                        openingFloat === val
                          ? 'bg-[#FF4500]/15 border-[#FF4500] text-[#FF4500]'
                          : isDark
                          ? 'bg-[#121316] border-[#282B34] text-[#9CA3AF] hover:text-white'
                          : 'bg-white border-[#CBD5E1] text-[#334155] hover:text-black'
                      }`}
                    >
                      GH₵ {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Onboarding Summary Box */}
              <div className={`p-4 rounded-xl border space-y-2 ${
                isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-[#EBEEF2]/70 border-[#CBD5E1]'
              }`}>
                <div className="font-bold text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FF4500]" />
                  <span>Onboarding Summary</span>
                </div>
                <div className={`grid grid-cols-2 gap-2 text-[11px] pt-1 ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
                  <div>Store: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{storeName}</strong></div>
                  <div>Paper Roll: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{receiptWidth}</strong></div>
                  <div>Tax Scheme: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{taxScheme}</strong></div>
                  <div>Developer: <strong className="text-[#FF4500] font-bold">Mazonia</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation with Prev/Next/Finish */}
        <div className={`p-4 sm:p-5 border-t flex items-center justify-between ${
          isDark ? 'border-[#282B34] bg-[#121316]' : 'border-[#CBD5E1] bg-[#EBEEF2]/70'
        }`}>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className={`px-4 py-2 rounded-xl border flex items-center gap-1.5 font-semibold cursor-pointer transition ${
                isDark 
                  ? 'border-[#282B34] text-[#9CA3AF] hover:text-white hover:bg-[#1A1C22]' 
                  : 'border-[#CBD5E1] text-[#334155] hover:text-black hover:bg-white'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={currentStep === 3 && (!agreedToTerms || !agreedToLiabilityWaiver)}
              className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-md ${
                currentStep === 3 && (!agreedToTerms || !agreedToLiabilityWaiver)
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-[#FF4500] hover:bg-[#E03E00] text-white shadow-[#FF4500]/25'
              }`}
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleFinishSetup()}
              className="px-5 py-2.5 rounded-xl font-bold bg-[#FF4500] hover:bg-[#E03E00] text-white flex items-center gap-2 transition cursor-pointer shadow-md shadow-[#FF4500]/25"
            >
              <Check className="w-4 h-4" />
              <span>Complete Setup &amp; Launch POS</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
