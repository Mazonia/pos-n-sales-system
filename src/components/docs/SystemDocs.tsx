import React, { useState } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  Send,
  ShieldCheck,
  Database
} from 'lucide-react';

interface SystemDocsProps {
  isDark?: boolean;
}

export const SystemDocs: React.FC<SystemDocsProps> = ({ isDark = true }) => {
  const [copiedPrisma, setCopiedPrisma] = useState(false);
  const [activeTab, setActiveTab] = useState<'PRISMA' | 'APIS' | 'GRA_SPECS' | 'OFFLINE_SPECS'>('PRISMA');

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPrisma(true);
    setTimeout(() => setCopiedPrisma(false), 2000);
  };

  const prismaSchemaCode = `// Akwaaba POS & Retail OS - Enterprise Prisma Schema
// PostgreSQL with Prisma ORM (Hosted on Supabase or Neon)
// Tailored for Ghana Commercial Ecosystem

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  SUPER_ADMIN       // Multi-store owner & enterprise administrator
  GENERAL_MANAGER   // General enterprise operations manager, multi-branch oversight & staff enrollment
  BRANCH_MANAGER    // Store manager with PIN override authorization (PIN: 1234)
  CASHIER           // POS operator with restricted void / discount limits
  INVENTORY_OFFICER // Goods receipt, batch/expiry audit, stock transfers
  AUDITOR           // Read-only tax returns and audit logs
}

model Branch {
  id              String           @id @default(uuid())
  code            String           @unique // e.g. "ACC-01"
  name            String           // e.g. "Accra Central Mall Store"
  ghanaPostGps    String           // e.g. "GA-183-9022"
  taxScheme       TaxScheme        @default(STANDARD_VAT)
  graTinNumber    String?          // GRA Taxpayer ID
  ...
}

model Order {
  id                  String           @id @default(uuid())
  orderNumber         String           @unique
  receiptNumber       String           @unique
  taxScheme           TaxScheme        @default(STANDARD_VAT)
  taxableBaseAmount   Decimal          @db.Decimal(12, 2)
  nhilAmount          Decimal          @default(0.0) @db.Decimal(12, 2) // 2.5%
  getfundAmount       Decimal          @default(0.0) @db.Decimal(12, 2) // 2.5%
  covidAmount         Decimal          @default(0.0) @db.Decimal(12, 2) // 1.0%
  vatAmount           Decimal          @default(0.0) @db.Decimal(12, 2) // 15% on compound base
  totalTaxAmount      Decimal          @db.Decimal(12, 2)
  grandTotal          Decimal          @db.Decimal(12, 2)
  graFiscalCode       String?          // SDC signature
  graQrCodePayload    String?
  clientOfflineUuid   String?          @unique
  ...
}`;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      
      {/* Header */}
      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'border-white/[0.08] bg-black/20' : 'border-black/[0.06] bg-white/70'
      }`}>
        <div>
          <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Database className="w-5 h-5 text-amber-500" />
            <span>Developer Docs & Integration APIs</span>
          </h2>
          <p className="text-xs text-slate-400">
            Specifications for Ghana commercial integration (GRA E-VAT, Hubtel MoMo, Arkesel SMS)
          </p>
        </div>

        <div className="flex gap-1 p-1 rounded-2xl border border-white/10 bg-black/20 text-xs font-semibold">
          {[
            { id: 'PRISMA', label: 'Prisma Schema' },
            { id: 'APIS', label: 'MoMo & SMS APIs' },
            { id: 'GRA_SPECS', label: 'GRA Fiscal Math' },
            { id: 'OFFLINE_SPECS', label: 'Offline Engine' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        
        {/* PRISMA */}
        {activeTab === 'PRISMA' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Location: /prisma/schema.prisma</span>
              <button
                onClick={() => copyToClipboard(prismaSchemaCode)}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {copiedPrisma ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedPrisma ? 'Copied to Clipboard' : 'Copy Schema'}</span>
              </button>
            </div>

            <pre className={`p-4 rounded-3xl font-mono text-xs overflow-x-auto leading-relaxed border ${
              isDark ? 'glass-panel-dark text-amber-200/90' : 'glass-panel-light text-slate-800'
            }`}>
              {prismaSchemaCode}
            </pre>
          </div>
        )}

        {/* APIS */}
        {activeTab === 'APIS' && (
          <div className="space-y-4 max-w-4xl text-xs">
            <div className={`p-5 rounded-3xl border space-y-3 ${isDark ? 'glass-panel-dark' : 'glass-panel-light'}`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Smartphone className="w-4 h-4 text-amber-500" />
                <span className={isDark ? 'text-white' : 'text-slate-900'}>
                  1. Hubtel / MTN / Telecel Mobile Money Direct USSD Push
                </span>
              </div>
              <p className="text-slate-400">
                Pushes a payment prompt directly to customer mobile handsets across Ghana (MTN *170#, Telecel *110#, AT *110#).
              </p>

              <div className="p-3.5 bg-black/40 rounded-2xl font-mono text-[11px] text-emerald-400 space-y-1 overflow-x-auto border border-white/5">
                <div>POST https://api.hubtel.com/v2/pos/onlinecheckout/items/initiate</div>
                <div>Authorization: Basic [HUBTEL_API_KEYS]</div>
                <br />
                <div className="text-slate-300">{`{
  "totalAmount": 150.00,
  "description": "Payment for Receipt #RCP-ACC-2026-00459 at Accra Central Mall",
  "clientReference": "AKW-ORD-90214",
  "customerMsisdn": "233244123456",
  "channel": "mtn-gh",
  "primaryCallbackUrl": "https://akwaaba-pos.com/api/v1/payments/momo-webhook"
}`}</div>
              </div>
            </div>

            <div className={`p-5 rounded-3xl border space-y-3 ${isDark ? 'glass-panel-dark' : 'glass-panel-light'}`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Send className="w-4 h-4 text-emerald-500" />
                <span className={isDark ? 'text-white' : 'text-slate-900'}>
                  2. Arkesel Ghana SMS Gateway Integration (Bisa Debt Alerts)
                </span>
              </div>
              <p className="text-slate-400">
                Transactional receipts and Bisa credit reminders via registered Ghana Sender ID.
              </p>

              <div className="p-3.5 bg-black/40 rounded-2xl font-mono text-[11px] text-emerald-400 space-y-1 overflow-x-auto border border-white/5">
                <div>POST https://sms.arkesel.com/api/v2/sms/send</div>
                <div>api-key: [ARKESEL_GHANA_KEY]</div>
                <br />
                <div className="text-slate-300">{`{
  "sender": "AkwaabaPOS",
  "message": "Medaase Mama Adjoa! Friendly reminder that your store debt is GH₵ 450.00 at Accra Central Mall.",
  "recipients": ["233244198234"]
}`}</div>
              </div>
            </div>
          </div>
        )}

        {/* GRA SPECS */}
        {activeTab === 'GRA_SPECS' && (
          <div className="space-y-4 max-w-4xl text-xs">
            <div className={`p-5 rounded-3xl border space-y-3 ${isDark ? 'glass-panel-dark' : 'glass-panel-light'}`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className={isDark ? 'text-white' : 'text-slate-900'}>
                  Ghana Revenue Authority Compound Levy Math
                </span>
              </div>
              <div className="text-slate-300 space-y-2 leading-relaxed">
                <p>Value Added Tax Act, 2013 (Act 870) compound formulation:</p>
                <ol className="list-decimal pl-5 space-y-1.5 font-mono text-slate-300">
                  <li>Taxable Base Amount = <span className="text-amber-500 font-bold">$P$</span></li>
                  <li>NHIL = $2.5\% \times P$</li>
                  <li>GETFund = $2.5\% \times P$</li>
                  <li>COVID-19 Health Recovery Levy = $1.0\% \times P$</li>
                  <li>Compound VAT Base = $P \times 1.06$</li>
                  <li>Standard VAT = $15\% \times (1.06 \times P) = 15.9\% \times P$</li>
                  <li>Total Effective Tax Rate = $21.90\%$</li>
                  <li>Final Tagged Shelf Price = $1.219 \times P$</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* OFFLINE SPECS */}
        {activeTab === 'OFFLINE_SPECS' && (
          <div className="space-y-4 max-w-4xl text-xs">
            <div className={`p-5 rounded-3xl border space-y-3 ${isDark ? 'glass-panel-dark' : 'glass-panel-light'}`}>
              <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Offline-First IndexedDB (Dexie.js) Architecture
              </div>
              <p className="text-slate-300 leading-relaxed">
                Zero checkout interruptions during broadband disruption or Dumsor outages:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-400">
                <li>Local Ticket Storage: Every transaction commits locally to Dexie before network attempt.</li>
                <li>Thermal Receipt Printing: ESC/POS generation runs 100% client side without server roundtrips.</li>
                <li>Auto Sync Queue: Processes automatically when online event fires.</li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
