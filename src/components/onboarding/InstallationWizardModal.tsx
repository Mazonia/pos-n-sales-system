import React, { useState } from 'react';
import { 
  Sparkles, 
  Store, 
  Printer, 
  ShieldCheck, 
  FileText, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Landmark, 
  Coins, 
  Barcode, 
  Wifi, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  Scale
} from 'lucide-react';
import { ENTERPRISE_BRANCHES, setTerminalBranch } from '../../utils/terminalConfig';
import { TaxSchemeType } from '../../utils/ghanaTaxEngine';
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

  // Step 2: Hardware & Till Peripherals
  const [receiptWidth, setReceiptWidth] = useState<'80mm' | '58mm'>('80mm');
  const [scannerType, setScannerType] = useState<'USB_HARDWARE' | 'TABLET_CAMERA'>('USB_HARDWARE');
  const [printerConnection, setPrinterConnection] = useState<'ESC_POS' | 'BLUETOOTH' | 'SYSTEM_PRINT'>('ESC_POS');

  // Step 3: Legal Terms & Developer Non-Liability Acceptance
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToLiabilityWaiver, setAgreedToLiabilityWaiver] = useState(false);

  // Step 4: Float Setup
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

  const handleFinishSetup = () => {
    if (!agreedToTerms || !agreedToLiabilityWaiver) {
      notify.warning('Legal Consent Required', 'You must read and tick both the Terms of Service and Developer Liability Waiver before operating this POS terminal.');
      return;
    }

    // Save terminal configuration
    const selectedBranch = ENTERPRISE_BRANCHES.find((b) => b.id === selectedBranchId) || ENTERPRISE_BRANCHES[0];
    setTerminalBranch(selectedBranch);

    // Save preferences
    localStorage.setItem('akwaaba_store_name', storeName);
    localStorage.setItem('akwaaba_receipt_width', receiptWidth);
    localStorage.setItem('akwaaba_scanner_type', scannerType);
    localStorage.setItem('akwaaba_printer_connection', printerConnection);
    localStorage.setItem('akwaaba_setup_completed', 'true');
    localStorage.setItem('akwaaba_terms_accepted_date', new Date().toISOString());

    playSoundEffect('cash');
    triggerVibration([50, 100, 50]);
    notify.success('System Initialized', `Welcome to ${storeName}! Terminal bound to ${selectedBranch.name}.`);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
      <div 
        className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col overflow-hidden text-xs ${
          isDark ? 'bg-slate-900 border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
      >
        {/* Wizard Header with Step Indicator */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF5722] via-[#FF4500] to-[#E03E00] text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 id="wizard-title" className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Terminal Setup &amp; Installation Wizard</span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Initial workstation onboarding, hardware pairing, and statutory legal agreement
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
                Step {currentStep} of 4
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: 'Store Profile' },
              { num: 2, label: 'Hardware' },
              { num: 3, label: 'Legals & Terms' },
              { num: 4, label: 'Till Float' },
            ].map((s) => (
              <div key={s.num} className="space-y-1">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentStep >= s.num ? 'bg-[#FF4500]' : 'bg-slate-800'
                  }`} 
                />
                <span className={`text-[10px] font-semibold block truncate ${
                  currentStep >= s.num ? 'text-orange-400' : 'text-slate-500'
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
          {/* STEP 1: Store & Tax Scheme */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-orange-400 shrink-0" />
                <p className="text-slate-300 leading-relaxed text-xs">
                  Configure your store identification, retail branch location, and Ghana Revenue Authority (GRA) fiscal tax scheme for this workstation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Business / Store Trading Name:
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-medium text-xs focus:border-orange-500 focus:outline-none"
                  placeholder="e.g. Makola Central Provisions & Cold Store"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Physical Workstation Branch Location:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ENTERPRISE_BRANCHES.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBranchId(b.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        selectedBranchId === b.id
                          ? 'bg-orange-500/15 border-orange-500 text-white shadow-sm'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{b.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{b.address}</div>
                      <span className="text-[9.5px] mt-1.5 text-orange-400 font-mono">{b.phone}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  GRA Statutory Tax Scheme:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'STANDARD_VAT', label: 'Standard VAT (21.90%)', desc: '15% VAT + 2.5% NHIL + 2.5% GETFund + 1% COVID' },
                    { id: 'FLAT_RATE', label: 'VAT Flat Rate (4.0%)', desc: '3% VFRS + 1% COVID-19 Levy for Retailers' },
                    { id: 'EXEMPT', label: 'Exempt / Zero Rate (0%)', desc: 'Raw produce, medications, zero-rated exports' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTaxScheme(t.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        taxScheme === t.id
                          ? 'bg-emerald-500/15 border-emerald-500 text-white'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{t.label}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Hardware Configuration */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl flex items-center gap-3">
                <Printer className="w-5 h-5 text-cyan-400 shrink-0" />
                <p className="text-slate-300 leading-relaxed text-xs">
                  Pair your hardware receipt printer, cash drawer pulse, and barcode scanning hardware.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Thermal Receipt Paper Width:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: '80mm', label: '80mm Standard POS Roll', desc: 'Recommended for desktop workstation tills & supermarkets' },
                    { id: '58mm', label: '58mm Mobile Compact Roll', desc: 'Ideal for handheld Bluetooth thermal printers & small kiosks' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setReceiptWidth(p.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                        receiptWidth === p.id
                          ? 'bg-orange-500/15 border-orange-500 text-white'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{p.label}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Printer Interface Driver:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ESC_POS', label: 'Raw ESC/POS USB', desc: 'Direct silent print & cash drawer kick' },
                    { id: 'BLUETOOTH', label: 'Bluetooth Wireless', desc: 'SPP thermal printer for Android / iPad' },
                    { id: 'SYSTEM_PRINT', label: 'Standard System', desc: 'Browser print dialog / Network printer' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setPrinterConnection(d.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        printerConnection === d.id
                          ? 'bg-cyan-500/15 border-cyan-500 text-white'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{d.label}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Barcode Scanner Mode:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'USB_HARDWARE', label: 'USB / HID Barcode Gun', desc: 'Instant hardware keyboard wedge input with zero latency' },
                    { id: 'TABLET_CAMERA', label: 'Device Camera Scanner', desc: 'Uses tablet camera to scan barcodes and QR codes' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setScannerType(s.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                        scannerType === s.id
                          ? 'bg-emerald-500/15 border-emerald-500 text-white'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{s.label}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Legal Disclaimers, Terms of Service & Developer Non-Liability */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                <Scale className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-400 text-xs">Statutory Legal Agreement &amp; Accountability Notice</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Please review developer liability limits and merchant operational responsibilities.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] space-y-3 leading-relaxed text-slate-300 max-h-56 overflow-y-auto">
                <div>
                  <strong className="text-white block mb-1">
                    1. Developer ("Mazonia") Non-Liability Clause:
                  </strong>
                  <p className="text-slate-400">
                    Akwaaba POS &amp; Retail OS is engineered and provided by <strong>Mazonia</strong> on an "as-is" basis. The developer (Mazonia) shall NOT be held accountable or liable for: (a) physical cash shortages, theft, or till reconciliation discrepancies; (b) product spoilage or inventory loss resulting from electrical power outages (Dumsor) or freezer failure; (c) hardware defects, paper jams, or third-party Bluetooth printer issues; (d) inaccurate price, cost, or discount inputs entered by cashiers or managers; or (e) tax penalties, fines, or audit assessments issued by the Ghana Revenue Authority (GRA) resulting from merchant tax misclassification or erroneous reporting.
                  </p>
                </div>

                <div>
                  <strong className="text-white block mb-1">
                    2. Merchant Sole Custody &amp; Operational Responsibilities:
                  </strong>
                  <p className="text-slate-400">
                    The business owner/merchant assumes sole and exclusive accountability for: (a) physical cash counts, denomination audits, and bank deposits; (b) verifying Mobile Money (MTN, Telecel, AT) transaction references on official operator handsets prior to releasing goods; (c) safeguarding 4-digit supervisor and manager PINs; (d) creating frequent database backups via the Backup Manager; and (e) maintaining statutory fiscal compliance with the Value Added Tax Act, 2013 (Act 870) and GRA regulations.
                  </p>
                </div>

                <div>
                  <strong className="text-white block mb-1">
                    3. Local Data Sovereignty &amp; Privacy Guarantee:
                  </strong>
                  <p className="text-slate-400">
                    All inventory records, sales ledgers, customer phone numbers, and debt records are stored locally on your device within encrypted IndexedDB storage. The developer does NOT harvest, sell, or monetize merchant business records.
                  </p>
                </div>

                <div>
                  <strong className="text-white block mb-1">
                    4. Support &amp; Problem Reporting:
                  </strong>
                  <p className="text-slate-400">
                    Technical bug reports, enhancement requests, and issues should be submitted directly via the official project repository:
                    <br />
                    <span className="font-mono text-orange-400">https://github.com/Mazonia/pos-n-sales-system/issues</span>
                  </p>
                </div>
              </div>

              {/* Mandatory Acceptance Checkboxes */}
              <div className="space-y-2.5 pt-1">
                <label 
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer select-none"
                >
                  <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 transition ${
                    agreedToTerms ? 'bg-[#FF4500] border-[#FF4500] text-white' : 'border-slate-600 bg-slate-800'
                  }`}>
                    {agreedToTerms && <Check className="w-3 h-3" />}
                  </div>
                  <span className="text-[11px] text-slate-300">
                    I agree to the <strong>Terms of Service</strong> and <strong>Data Privacy Policy</strong> for operating Akwaaba POS &amp; Retail OS.
                  </span>
                </label>

                <label 
                  onClick={() => setAgreedToLiabilityWaiver(!agreedToLiabilityWaiver)}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer select-none"
                >
                  <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 transition ${
                    agreedToLiabilityWaiver ? 'bg-[#FF4500] border-[#FF4500] text-white' : 'border-slate-600 bg-slate-800'
                  }`}>
                    {agreedToLiabilityWaiver && <Check className="w-3 h-3" />}
                  </div>
                  <span className="text-[11px] text-slate-300">
                    I acknowledge that the developer (<strong>Mazonia</strong>) is not liable for cash shortages, tax assessments, or physical store losses, and that the merchant is solely responsible for financial custody and tax filings.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: Initial Cashier Float */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                <Coins className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-slate-300 leading-relaxed text-xs">
                  Set the starting cash float in the cash drawer for shift opening change.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Opening Cash Float Amount (GH₵):
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-bold text-sm">GH₵</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                    className="w-full pl-14 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono text-base font-bold focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[100, 200, 500, 1000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOpeningFloat(val)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      GH₵ {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Onboarding Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                  <div>Store: <strong className="text-white">{storeName}</strong></div>
                  <div>Paper Roll: <strong className="text-white">{receiptWidth}</strong></div>
                  <div>Tax Scheme: <strong className="text-white">{taxScheme}</strong></div>
                  <div>Developer: <strong className="text-orange-400">Mazonia</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 font-semibold cursor-pointer"
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
              className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-lg ${
                currentStep === 3 && (!agreedToTerms || !agreedToLiabilityWaiver)
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-[#FF4500] hover:bg-[#E03E00] text-white shadow-orange-500/20'
              }`}
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinishSetup}
              className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-600/20"
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
