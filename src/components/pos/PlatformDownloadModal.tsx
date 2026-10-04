import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Monitor, 
  Laptop, 
  Tablet, 
  Smartphone, 
  Globe, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles, 
  Cpu, 
  Printer, 
  ShieldCheck, 
  Zap,
  Info
} from 'lucide-react';
import { detectPlatform, getPlatformDownloads, PlatformDownload, GITHUB_REPO_URL } from '../../utils/platform';

interface PlatformDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlatformDownloadModal: React.FC<PlatformDownloadModalProps> = ({ isOpen, onClose }) => {
  const [currentPlatform, setCurrentPlatform] = useState(() => detectPlatform());
  const [activeTab, setActiveTab] = useState<string>('all');
  const downloads = getPlatformDownloads();

  useEffect(() => {
    setCurrentPlatform(detectPlatform());
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredDownloads = activeTab === 'all' 
    ? downloads 
    : downloads.filter(d => {
        if (activeTab === 'desktop') return d.platform === 'windows' || d.platform === 'mac';
        if (activeTab === 'tablet') return d.platform === 'android' || d.platform === 'ios';
        if (activeTab === 'web') return d.platform === 'web';
        return true;
      });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'windows': return <Monitor className="w-6 h-6 text-cyan-400" />;
      case 'mac': return <Laptop className="w-6 h-6 text-purple-400" />;
      case 'android': return <Tablet className="w-6 h-6 text-emerald-400" />;
      case 'ios': return <Smartphone className="w-6 h-6 text-amber-400" />;
      case 'web': return <Globe className="w-6 h-6 text-blue-400" />;
      default: return <Sparkles className="w-6 h-6 text-orange-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="platform-modal-title" className="text-xl font-bold tracking-tight text-white">
                  Multi-Platform Download Center
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Unified POS v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Install Akwaaba POS native software on any hardware till, tablet, or workstation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Device Detection Banner */}
        <div className="mx-6 mt-4 p-3.5 bg-gradient-to-r from-orange-950/40 via-slate-800/60 to-cyan-950/40 border border-orange-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">Current Workstation Environment:</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                {currentPlatform.name}
                {currentPlatform.isNative && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded font-normal">
                    Native Hardware Direct
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`${GITHUB_REPO_URL}/releases`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 px-3 py-1.5 rounded-lg transition"
            >
              <span>GitHub Releases Hub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center px-6 pt-4 space-x-2 border-b border-slate-800 text-xs">
          {[
            { id: 'all', label: 'All Platforms (5)' },
            { id: 'desktop', label: 'Desktop (.exe / .dmg)' },
            { id: 'tablet', label: 'Tablets (Android / iPad)' },
            { id: 'web', label: 'Web & PWA' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 px-3 font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Platform Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDownloads.map((item) => {
              const isMatch = currentPlatform.type === item.platform;
              return (
                <div
                  key={item.platform}
                  className={`relative p-5 rounded-xl border transition-all flex flex-col justify-between ${
                    isMatch
                      ? 'bg-slate-800/80 border-orange-500/50 shadow-lg shadow-orange-500/5'
                      : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  {isMatch && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      Matches This Device
                    </div>
                  )}

                  <div>
                    <div className="flex items-start gap-3.5 mb-3">
                      <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl">
                        {getPlatformIcon(item.platform)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-400">{item.subtitle}</p>
                        <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded">
                          {item.badge}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 my-3.5 pt-2 border-t border-slate-700/40 text-xs">
                      {item.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-700/40 flex items-center justify-between gap-2 mt-2">
                    <span className="text-[11px] font-mono text-slate-400 truncate max-w-[180px]">
                      {item.filename}
                    </span>

                    <a
                      href={item.url}
                      target={item.platform === 'web' ? '_self' : '_blank'}
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-sm ${
                        isMatch
                          ? 'bg-orange-500 hover:bg-orange-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{item.platform === 'web' ? 'Open PWA' : 'Download'}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ghanaian Hardware & Dumsor Deployment Tips */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 text-orange-400 font-bold">
              <Zap className="w-4 h-4" />
              <span>Offline &amp; Dumsor Hardware Deployment Tips</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-400 pt-1">
              <div className="flex items-start gap-2">
                <Printer className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                <span>
                  <strong>Windows (.exe)</strong> supports direct raw ESC/POS thermal printing to USB/COM ports with no print dialog.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Tablet className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                <span>
                  <strong>Android Tablets</strong> support portable Bluetooth receipt printers and camera barcode scanning on shop counters.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                <span>
                  <strong>All platforms</strong> share the same cryptographic GRA fiscal audit engine and 100% offline Dexie database.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Built from a single unified repository. Instant updates across all devices.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
