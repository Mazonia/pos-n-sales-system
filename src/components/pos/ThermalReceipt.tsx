import React from 'react';
import { LocalOrder } from '../../utils/dexieSync';
import { formatGhs } from '../../utils/ghanaTaxEngine';
import { Printer, Share2 } from 'lucide-react';
import { getReceiptConfig } from '../../utils/receiptConfig';

interface ThermalReceiptProps {
  order: LocalOrder;
  onClose?: () => void;
  widthMm?: 58 | 80;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  order,
  onClose,
  widthMm = 80,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [smsSent, setSmsSent] = React.useState(false);
  const config = React.useMemo(() => getReceiptConfig(), []);

  const handlePrint = () => {
    window.print();
  };

  const handleSendSms = () => {
    setSmsSent(true);
    setTimeout(() => setSmsSent(false), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText?.(order.graQrPayload || window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Action Bar */}
      <div className="no-print flex items-center justify-between w-full max-w-sm mb-4 gap-2 bg-[#11151A] p-2.5 rounded-2xl border border-[#242D37] shadow-xl">
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-[#090B0E] font-black py-2 px-3 rounded-xl text-xs transition active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>Print (ESC/POS)</span>
        </button>
        <button
          onClick={handleSendSms}
          className="flex items-center justify-center gap-1.5 bg-[#1A2027] hover:bg-[#242D37] text-[#F4F6F8] border border-[#242D37] font-semibold py-2 px-3 rounded-xl text-xs transition active:scale-95"
          title="Send digital receipt via Arkesel SMS"
        >
          <Share2 className="w-4 h-4 text-emerald-400" />
          <span>{smsSent ? 'SMS Sent!' : 'SMS Receipt'}</span>
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[#8A99A8] hover:text-white px-2 py-1 text-xs font-semibold"
          >
            Close
          </button>
        )}
      </div>

      {/* The Printable Thermal Receipt Body */}
      <div
        id="thermal-receipt-print-area"
        className={`bg-white text-black font-mono p-4 rounded shadow-2xl border border-slate-300 text-xs leading-tight ${
          widthMm === 58 ? 'w-[58mm] text-[10px]' : 'w-[80mm] max-w-[340px]'
        }`}
        style={{ color: '#000000', backgroundColor: '#ffffff' }}
      >
        {/* Store Header */}
        <div className="text-center pb-2 border-b border-dashed border-gray-400">
          <div className="font-bold text-sm tracking-wide uppercase">{config.storeName}</div>
          {config.tagline && <div className="text-[9.5px] text-gray-600 italic">{config.tagline}</div>}
          <div className="text-[10px] font-semibold">{order.branchName}</div>
          <div className="text-[10px] text-gray-700">Digital Address: {config.digitalAddress}</div>
          <div className="text-[10px] text-gray-700">Tel: {config.phone}</div>
          <div className="text-[10px] text-gray-700">TIN: {config.tinNumber} | VAT REG: YES</div>
        </div>

        {/* Receipt Meta */}
        <div className="py-2 border-b border-dashed border-gray-400 text-[10px] space-y-0.5">
          <div className="flex justify-between font-bold">
            <span>RCPT #:</span>
            <span>{order.receiptNumber}</span>
          </div>
          {config.showOrderTypeBadge && (
            <div className="flex justify-between font-bold text-emerald-800">
              <span>SALE TYPE:</span>
              <span>{order.orderType === 'WHOLESALE' ? 'WHOLESALE / BULK' : 'RETAIL SALE'}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{new Date(order.createdAt).toLocaleString('en-GH')}</span>
          </div>
          {config.showCashierName && (
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{order.cashierName}</span>
            </div>
          )}
          {order.discountAppliedByUserName && (
            <div className="flex justify-between text-[9px] text-gray-700">
              <span>Discount Authorized:</span>
              <span>{order.discountAppliedByUserName}</span>
            </div>
          )}
          {config.showCustomerInfo && order.customerName && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="font-bold">{order.customerName}</span>
            </div>
          )}
        </div>

        {/* Itemized Lines */}
        <div className="py-2 border-b border-dashed border-gray-400">
          <div className="flex justify-between font-bold pb-1 text-[10px] border-b border-gray-200">
            <span>ITEM</span>
            <span className="text-right">QTY x PRICE = TOTAL</span>
          </div>
          <div className="space-y-1.5 pt-1">
            {order.items.map((item, idx) => (
              <div key={idx}>
                <div className="font-semibold text-[11px] truncate">{item.name}</div>
                <div className="flex justify-between text-[10px] text-gray-700">
                  <span>
                    {item.quantity} {item.unitName} @ {item.unitPrice.toFixed(2)}
                    {item.discountAmount > 0 && ` (-GH₵${item.discountAmount.toFixed(2)})`}
                  </span>
                  <span className="font-bold text-black">{item.lineTotal.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Subtotals */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span>Gross Subtotal:</span>
            <span>{order.subtotal.toFixed(2)}</span>
          </div>
          {order.discountTotal > 0 && (
            <div className="flex justify-between text-red-700">
              <span>Discounts Applied:</span>
              <span>-{order.discountTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium">
            <span>Taxable Net Base:</span>
            <span>{order.taxableBase.toFixed(2)}</span>
          </div>
        </div>

        {/* GRA Statutory Fiscal Levies Breakdown */}
        {config.showItemizedTaxes ? (
          <div className="py-1.5 border-b border-dashed border-gray-400 space-y-0.5 text-[9px] text-gray-800">
            <div className="font-bold text-[9px] text-black">GRA FISCAL LEVIES BREAKDOWN:</div>
            {order.taxScheme === 'STANDARD_VAT' ? (
              <>
                <div className="flex justify-between">
                  <span>- NHIL (2.5%):</span>
                  <span>{order.nhil.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>- GETFund Levy (2.5%):</span>
                  <span>{order.getfund.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>- COVID-19 Levy (1.0%):</span>
                  <span>{order.covid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>- Standard VAT (15.0% on Base+Levies):</span>
                  <span>{order.vat.toFixed(2)}</span>
                </div>
              </>
            ) : order.taxScheme === 'FLAT_RATE_VFRS' ? (
              <>
                <div className="flex justify-between">
                  <span>- COVID-19 Levy (1.0%):</span>
                  <span>{order.covid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>- Flat Rate VAT (3.0%):</span>
                  <span>{order.vat.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="italic text-gray-600">Zero-rated / Presumptive SME Exempt</div>
            )}
            <div className="flex justify-between font-bold text-black border-t border-dotted border-gray-300 pt-0.5">
              <span>Total Taxes & Levies:</span>
              <span>{order.totalTax.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="py-1 border-b border-dashed border-gray-400 text-[9px] flex justify-between font-bold text-black">
            <span>Statutory Taxes (Included):</span>
            <span>{order.totalTax.toFixed(2)}</span>
          </div>
        )}

        {/* Grand Total */}
        <div className="py-2 border-b-2 border-black flex justify-between items-baseline font-bold text-sm">
          <span>GRAND TOTAL:</span>
          <span>{formatGhs(order.grandTotal)}</span>
        </div>

        {/* Payment Tendered & Breakdown */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[10px]">
          <div className="font-semibold text-gray-800">PAYMENT TENDERED:</div>
          {order.payments.map((p, i) => (
            <div key={i} className="flex justify-between">
              <span>
                {p.type === 'CASH' && 'Cash'}
                {p.type === 'MOMO_MTN' && 'MTN Mobile Money'}
                {p.type === 'MOMO_TELECEL' && 'Telecel Cash'}
                {p.type === 'MOMO_AT' && 'AT Money'}
                {p.type === 'CARD' && 'Bank Card'}
                {p.type === 'CUSTOMER_DEBT_BISA' && 'Bisa / Store Credit'}
                {p.type === 'LOYALTY_POINTS' && `Akwaaba Loyalty (${p.loyaltyPointsRedeemed || Math.round(p.amount * 10)} pts)`}
                {p.momoTxId ? ` (Ref: ${p.momoTxId})` : ''}
              </span>
              <span className="font-bold">{p.amount.toFixed(2)}</span>
            </div>
          ))}

          {/* Cash Received and Change Returned */}
          {(() => {
            const cashPayment = order.payments.find(p => p.type === 'CASH');
            if (!cashPayment) return null;
            const changeGiven = cashPayment.changeGiven || 0;
            const cashReceived = cashPayment.tenderedCash || (changeGiven > 0 ? cashPayment.amount + changeGiven : cashPayment.amount);

            if (changeGiven > 0 || (cashPayment.tenderedCash && cashPayment.tenderedCash > cashPayment.amount)) {
              return (
                <div className="pt-1 border-t border-dotted border-gray-300 space-y-0.5 font-bold">
                  <div className="flex justify-between text-gray-900">
                    <span>Cash Received:</span>
                    <span>GH₵ {cashReceived.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>Change Returned:</span>
                    <span>GH₵ {changeGiven.toFixed(2)}</span>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Akwaaba Club Loyalty Rewards Breakdown */}
        {config.showLoyaltyPoints && (order.loyaltyPointsEarned !== undefined || (order.loyaltyPointsRedeemed !== undefined && order.loyaltyPointsRedeemed > 0) || order.customerLoyaltyBalanceAfter !== undefined) && (
          <div className="py-1.5 border-b border-dashed border-gray-400 text-[10px] space-y-0.5">
            <div className="font-bold text-gray-800">AKWAABA CLUB LOYALTY REWARDS:</div>
            {order.loyaltyPointsEarned !== undefined && (
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>Points Earned Today:</span>
                <span>+{order.loyaltyPointsEarned} pts</span>
              </div>
            )}
            {order.loyaltyPointsRedeemed !== undefined && order.loyaltyPointsRedeemed > 0 && (
              <div className="flex justify-between text-amber-800">
                <span>Points Redeemed (Saved):</span>
                <span>-{order.loyaltyPointsRedeemed} pts</span>
              </div>
            )}
            {order.customerLoyaltyBalanceAfter !== undefined && (
              <div className="flex justify-between font-bold text-black border-t border-dotted border-gray-300 pt-0.5">
                <span>Current Points Balance:</span>
                <span>{order.customerLoyaltyBalanceAfter} pts</span>
              </div>
            )}
          </div>
        )}

        {/* Footer Greetings & Return Policy */}
        <div className="pt-2 text-center text-[10px] space-y-1 text-gray-700">
          <div className="font-bold">{config.footerMessage || 'Medaase Paa! Thank you for your patronage.'}</div>
          {config.returnPolicyNotice && (
            <div className="text-[9px] font-semibold text-black border border-dashed border-gray-400 p-1.5 rounded my-1 leading-normal">
              {config.returnPolicyNotice}
            </div>
          )}
          <div className="text-[8px] text-gray-500 pt-0.5">
            Powered by Akwaaba POS & Retail OS (Offline-Ready)
          </div>
        </div>
      </div>
    </div>
  );
};
