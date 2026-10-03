import React, { useState } from 'react';
import {
  ReceiptConfig,
  getReceiptConfig,
  saveReceiptConfig,
  DEFAULT_RECEIPT_CONFIG,
} from '../../utils/receiptConfig';
import { triggerHaptic } from '../../utils/haptics';
import { stripEmojis } from '../../utils/emojiSanitizer';
import {
  Receipt,
  CheckCircle2,
  X,
  Sliders,
  RotateCcw,
  Eye,
  Store,
  QrCode,
  ShieldCheck,
  Percent,
} from 'lucide-react';

interface ReceiptCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  userRole: string;
}

export const ReceiptCustomizerModal: React.FC<ReceiptCustomizerModalProps> = ({
  isOpen,
  onClose,
  isDark,
  userRole,
}) => {
  const [config, setConfig] = useState<ReceiptConfig>(() => getReceiptConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const isAuthorized = userRole === 'SUPER_ADMIN' || userRole === 'GENERAL_MANAGER' || userRole === 'BRANCH_MANAGER';

  const handleToggle = (key: keyof ReceiptConfig) => {
    triggerHaptic('tap');
    setConfig(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleTextChange = (key: keyof ReceiptConfig, val: string) => {
    setConfig(prev => ({
      ...prev,
      [key]: stripEmojis(val),
    }));
  };

  const handleSave = () => {
    triggerHaptic('success');
    saveReceiptConfig(config);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleResetDefaults = () => {
    triggerHaptic('tap');
    setConfig(DEFAULT_RECEIPT_CONFIG);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className={`w-full max-w-4xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-all ${
        isDark ? 'bg-[#14161D] border-[#282B34] text-stone-100' : 'bg-[#EBEEF2] border-slate-300 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-[#282B34] bg-[#101217]' : 'border-slate-300 bg-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#008285]/15 dark:bg-[#00CED1]/20 border border-[#008285]/30 flex items-center justify-center text-[#008285] dark:text-[#00CED1]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Customer Receipt & Discount Policy Customizer</h3>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-[#008285] dark:text-[#00CED1] border border-teal-500/30">
                  Manager Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-stone-400">
                Configure corporate header branding, tax disclosures, QR codes, and cashier discount toggles.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-300 dark:border-[#282B34] text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: 2 Columns (Controls on Left, Live Thermal Preview on Right) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Global Cashier Discount Switch */}
            <div className={`p-4 rounded-2xl border ${
              config.allowCashierDiscounts
                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-[#FF4500]" />
                    <span>Cashier Discretionary Discounts:</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-stone-400 mt-0.5">
                    {config.allowCashierDiscounts
                      ? 'Attendants can apply line/ticket discounts up to 5% without manager override.'
                      : 'LOCKED: Discount button disabled for cashiers. Requires Manager PIN override.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('allowCashierDiscounts')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                    config.allowCashierDiscounts
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  {config.allowCashierDiscounts ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Store Information */}
            <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-[#111319] border-[#282B34]' : 'bg-white border-slate-300'}`}>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Store Header & Brand Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-stone-400 mb-1">Company / Store Name:</label>
                  <input
                    type="text"
                    value={config.storeName}
                    onChange={e => handleTextChange('storeName', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#282B34] bg-slate-50 dark:bg-[#1A1D27] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-stone-400 mb-1">Brand Tagline:</label>
                  <input
                    type="text"
                    value={config.tagline}
                    onChange={e => handleTextChange('tagline', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#282B34] bg-slate-50 dark:bg-[#1A1D27] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-stone-400 mb-1">GPS Digital Address:</label>
                  <input
                    type="text"
                    value={config.digitalAddress}
                    onChange={e => handleTextChange('digitalAddress', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#282B34] bg-slate-50 dark:bg-[#1A1D27] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-stone-400 mb-1">Official Telephone / WhatsApp:</label>
                  <input
                    type="text"
                    value={config.phone}
                    onChange={e => handleTextChange('phone', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#282B34] bg-slate-50 dark:bg-[#1A1D27] outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-stone-400 mb-1">GRA Taxpayer TIN Number:</label>
                  <input
                    type="text"
                    value={config.tinNumber}
                    onChange={e => handleTextChange('tinNumber', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#282B34] bg-slate-50 dark:bg-[#1A1D27] outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Display Elements Toggle Grid */}
            <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-[#111319] border-[#282B34]' : 'bg-white border-slate-300'}`}>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Receipt Itemization & Privacy Toggles
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'showCashierName' as const, label: 'Print Attendant / Cashier Name' },
                  { key: 'showCustomerInfo' as const, label: 'Print Customer Name & Phone' },
                  { key: 'showItemizedTaxes' as const, label: 'Itemize NHIL, GETFund & COVID' },
                  { key: 'showGraQrCode' as const, label: 'Render GRA Fiscal QR Code' },
                  { key: 'showLoyaltyPoints' as const, label: 'Print Loyalty Points Earned' },
                  { key: 'showOrderTypeBadge' as const, label: 'Show Wholesale / Retail Badge' },
                ].map(item => (
                  <label
                    key={item.key}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                      config[item.key]
                        ? 'border-[#008285] bg-teal-50/60 dark:bg-teal-950/30 font-semibold'
                        : 'border-slate-300 dark:border-[#282B34] text-slate-500'
                    }`}
                  >
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(config[item.key])}
                      onChange={() => handleToggle(item.key)}
                      className="rounded accent-[#008285] w-4 h-4 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Return Policy & Footer Notes */}
            <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-[#111319] border-[#282B34]' : 'bg-white border-slate-300'}`}>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Policy Notices & Farewell Notes
              </h4>
              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-stone-400 mb-1">Receipt Footer Note:</label>
                  <input
                    type="text"
                    value={config.footerMessage}
                    onChange={e => handleTextChange('footerMessage', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#282B34] bg-slate-50 dark:bg-[#1A1D27] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-stone-400 mb-1">Return & Refund Policy Statement:</label>
                  <textarea
                    rows={2}
                    value={config.returnPolicyNotice}
                    onChange={e => handleTextChange('returnPolicyNotice', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#282B34] bg-slate-50 dark:bg-[#1A1D27] outline-none resize-none"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Live Interactive Thermal Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="text-[11px] font-bold text-slate-600 dark:text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1 font-mono">
              <Eye className="w-3.5 h-3.5 text-[#008285] dark:text-[#00CED1]" />
              <span>Live Thermal Receipt Preview (80mm)</span>
            </div>

            {/* Thermal Preview Paper Slip */}
            <div className="w-full max-w-[320px] bg-white text-black p-4 rounded-xl shadow-xl border border-slate-300 font-mono text-[10px] leading-tight space-y-2 select-none">
              {/* Header */}
              <div className="text-center pb-2 border-b border-dashed border-gray-400">
                <div className="font-black text-xs uppercase tracking-wider">{config.storeName}</div>
                <div className="text-[9px] text-gray-600 italic">{config.tagline}</div>
                <div className="text-[9px] text-gray-700">{config.digitalAddress}</div>
                <div className="text-[9px] text-gray-700">Tel: {config.phone}</div>
                <div className="text-[9px] text-gray-700">TIN: {config.tinNumber} | VAT REG: YES</div>
              </div>

              {/* Meta */}
              <div className="py-1 border-b border-dashed border-gray-400 text-[9px] space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>RCPT #:</span>
                  <span>RCP-ACC-20261003-8812</span>
                </div>
                {config.showOrderTypeBadge && (
                  <div className="flex justify-between font-bold text-[#008285]">
                    <span>SALE TYPE:</span>
                    <span>WHOLESALE ORDER</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date().toLocaleDateString('en-GB')} 14:32</span>
                </div>
                {config.showCashierName && (
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>Kwame Mensah</span>
                  </div>
                )}
                {config.showCustomerInfo && (
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-bold">Mama Adjoa Store</span>
                  </div>
                )}
              </div>

              {/* Items Preview */}
              <div className="py-1 border-b border-dashed border-gray-400">
                <div className="flex justify-between font-bold pb-1 text-[9px] border-b border-gray-200">
                  <span>ITEM</span>
                  <span>TOTAL</span>
                </div>
                <div className="space-y-1 pt-1 text-[9px]">
                  <div>
                    <div className="font-bold">Kivo Fine Gari 200g</div>
                    <div className="flex justify-between text-gray-600">
                      <span>10 Roll @ GH₵58.00</span>
                      <span className="font-bold text-black">GH₵580.00</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold">Indomie Super Pack 120g</div>
                    <div className="flex justify-between text-gray-600">
                      <span>20 Pack @ GH₵6.20 (-5%)</span>
                      <span className="font-bold text-black">GH₵117.80</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="py-1 border-b border-dashed border-gray-400 text-[9px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>GH₵704.00</span>
                </div>
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Discounts (5%):</span>
                  <span>-GH₵6.20</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-200">
                  <span>TOTAL PAYABLE:</span>
                  <span>GH₵697.80</span>
                </div>
              </div>

              {/* Tax Details */}
              {config.showItemizedTaxes ? (
                <div className="py-1 border-b border-dashed border-gray-400 text-[8.5px] text-gray-600 space-y-0.5">
                  <div className="font-bold text-black">GRA STATUTORY TAXES:</div>
                  <div className="flex justify-between"><span>- NHIL (2.5%):</span><span>GH₵15.22</span></div>
                  <div className="flex justify-between"><span>- GETFund (2.5%):</span><span>GH₵15.22</span></div>
                  <div className="flex justify-between"><span>- COVID-19 (1.0%):</span><span>GH₵6.09</span></div>
                  <div className="flex justify-between"><span>- VAT (15.0%):</span><span>GH₵91.35</span></div>
                </div>
              ) : (
                <div className="py-1 border-b border-dashed border-gray-400 text-[8.5px] flex justify-between">
                  <span>Total Taxes Included:</span>
                  <span className="font-bold">GH₵127.88</span>
                </div>
              )}

              {/* QR Code */}
              {config.showGraQrCode && (
                <div className="py-1.5 text-center flex flex-col items-center border-b border-dashed border-gray-400">
                  <div className="w-16 h-16 border-2 border-black flex items-center justify-center bg-gray-50">
                    <QrCode className="w-12 h-12 text-black" />
                  </div>
                  <span className="text-[7.5px] mt-1 text-gray-600">GRA SDC FISCAL VERIFICATION CODE</span>
                </div>
              )}

              {/* Footer Policy */}
              <div className="text-center pt-1 text-[8px] text-gray-600 space-y-0.5">
                <p className="font-bold text-black">{config.footerMessage}</p>
                <p className="italic text-[7.5px]">{config.returnPolicyNotice}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between gap-3 shrink-0 ${
          isDark ? 'border-[#282B34] bg-[#101217]' : 'border-slate-300 bg-white'
        }`}>
          <button
            type="button"
            onClick={handleResetDefaults}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isDark ? 'border-[#282B34] text-stone-300 hover:text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                isDark ? 'border-[#282B34] text-stone-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#008285] hover:bg-[#007073] text-white font-bold text-xs shadow-md flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Config Saved!</span>
                </>
              ) : (
                <span>Save Receipt Configuration</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
