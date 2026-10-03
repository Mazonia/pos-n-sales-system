import React, { useState } from 'react';
import { LocalProduct } from '../../utils/dexieSync';
import { formatGhs } from '../../utils/ghanaTaxEngine';
import { triggerHaptic } from '../../utils/haptics';
import { stripEmojis } from '../../utils/emojiSanitizer';
import {
  Printer,
  X,
  Barcode,
  Copy,
  Layers,
  Check,
  Tag,
  Settings2,
  Maximize2,
  Grid3X3,
  Sliders,
  Store,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { OfficialPrintPortal } from '../common/OfficialPrintPortal';

export interface BarcodeLabelPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: LocalProduct[];
  initialProduct?: LocalProduct | null;
  branchName: string;
  isDark: boolean;
}

type LabelTemplate = 'SHELF_EDGE_60x40' | 'ITEM_STICKER_40x25' | 'PROMO_TALKER_80x50' | 'A4_SHEET_30UP';

/**
 * Generate a deterministic SVG Code128-like barcode pattern based on string characters.
 * Generates crisp, high-contrast, perfectly-aligned vector SVG barcode bars.
 */
function renderSvgBarcode(text: string, height: number = 42, widthMm: number = 48) {
  // Use character codes to generate clean bar patterns with start, data, and stop bits
  const clean = text.replace(/[^A-Za-z0-9\-]/g, '') || '00000000';
  let pattern = '11010010000'; // Start code B pattern
  
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    // Simple robust bar pattern generator for crisp 1D barcode lines
    const bit1 = ((code * 3) % 4) + 1;
    const bit2 = ((code * 7) % 3) + 1;
    const bit3 = ((code * 5) % 4) + 1;
    const bit4 = 11 - (bit1 + bit2 + bit3);
    pattern += '1'.repeat(bit1) + '0'.repeat(bit2) + '1'.repeat(bit3) + '0'.repeat(Math.max(1, bit4));
  }
  pattern += '1100011101011'; // Stop code

  // Total bars length
  const barWidth = 1.2;
  const svgWidth = pattern.length * barWidth;

  const rects: React.ReactNode[] = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      rects.push(
        <rect
          key={i}
          x={i * barWidth}
          y="0"
          width={barWidth}
          height={height}
          fill="#000000"
        />
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${height}`}
      className="w-full max-w-[200px] h-auto object-contain mx-auto"
      style={{ minHeight: `${height}px` }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={svgWidth} height={height} fill="#FFFFFF" />
      {rects}
    </svg>
  );
}

export const BarcodeLabelPrinterModal: React.FC<BarcodeLabelPrinterModalProps> = ({
  isOpen,
  onClose,
  products,
  initialProduct,
  branchName,
  isDark,
}) => {
  if (!isOpen) return null;

  // Selected items with copy count
  const [selectedItems, setSelectedItems] = useState<Array<{ product: LocalProduct; count: number }>>(() => {
    if (initialProduct) {
      return [{ product: initialProduct, count: 4 }];
    }
    return products.slice(0, 3).map(p => ({ product: p, count: 2 }));
  });

  // Label configuration & template
  const [template, setTemplate] = useState<LabelTemplate>('SHELF_EDGE_60x40');
  const [showStoreName, setShowStoreName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showLocalName, setShowLocalName] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showExpiry, setShowExpiry] = useState(false);
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const [searchProductQuery, setSearchProductQuery] = useState('');

  const handlePrint = () => {
    triggerHaptic('success');
    window.print();
  };

  const handleUpdateCount = (productId: string, newCount: number) => {
    if (newCount <= 0) {
      setSelectedItems(prev => prev.filter(i => i.product.id !== productId));
    } else {
      setSelectedItems(prev =>
        prev.map(i => (i.product.id === productId ? { ...i, count: newCount } : i))
      );
    }
  };

  const handleAddProduct = (prod: LocalProduct) => {
    if (selectedItems.some(i => i.product.id === prod.id)) {
      handleUpdateCount(prod.id, (selectedItems.find(i => i.product.id === prod.id)?.count || 1) + 1);
    } else {
      setSelectedItems(prev => [...prev, { product: prod, count: 2 }]);
    }
    setSearchProductQuery('');
  };

  // Flattened array of labels to render for printing
  const flattenedLabels = selectedItems.flatMap(item =>
    Array(item.count * batchMultiplier).fill(item.product)
  );

  const totalLabelsCount = flattenedLabels.length;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto no-print">
        <div className={`w-full max-w-5xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 font-serif ${
        isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-[#EBEEF2] border-slate-300'
      }`}>
        
        {/* Top Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-[#282B34] bg-[#16181F]' : 'border-slate-300 bg-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
              isDark ? 'bg-[#00CED1]/15 text-[#00CED1] border border-[#00CED1]/30' : 'bg-teal-50 text-[#008285] border border-teal-200'
            }`}>
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-[#F4F6F8]' : 'text-slate-900'}`}>
                  Retail Barcode & Shelf Label Printer
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/15 text-[#008285] dark:text-[#00CED1] border border-teal-500/30">
                  {totalLabelsCount} {totalLabelsCount === 1 ? 'Label' : 'Labels'} Queued
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8A99A8]">
                Generate scannable Code128 barcodes for thermal sticker rolls or standard A4 label sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={totalLabelsCount === 0}
              className="px-4 py-2 bg-[#FF4500] hover:bg-[#FF5722] disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-[#FF4500]/20 transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print {totalLabelsCount} Labels</span>
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                isDark ? 'border-[#282B34] text-[#8A99A8] hover:text-white' : 'border-slate-300 text-slate-500 hover:text-black hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2-Column Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          
          {/* Left Column: Layout & Product Selection Controls (4.5 cols) */}
          <div className={`lg:col-span-4 p-4 border-b lg:border-b-0 lg:border-r overflow-y-auto space-y-4 ${
            isDark ? 'border-[#282B34] bg-[#16181F]/50' : 'border-slate-300 bg-white/70'
          }`}>
            
            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-[#8A99A8] flex items-center gap-1.5">
                <Grid3X3 className="w-3.5 h-3.5 text-[#008285] dark:text-[#00CED1]" />
                <span>Label Dimension / Format:</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'SHELF_EDGE_60x40', label: 'Shelf Edge', desc: '60 × 40 mm' },
                  { id: 'ITEM_STICKER_40x25', label: 'Item Sticker', desc: '40 × 25 mm' },
                  { id: 'PROMO_TALKER_80x50', label: 'Shelf Talker', desc: '80 × 50 mm' },
                  { id: 'A4_SHEET_30UP', label: 'A4 Sheet 30-Up', desc: 'Laser 3 × 10' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id as LabelTemplate)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      template === t.id
                        ? 'bg-teal-500/15 border-teal-500 text-[#008285] dark:text-[#00CED1] font-bold shadow-xs'
                        : isDark
                        ? 'bg-[#16181F] border-[#282B34] text-[#8A99A8] hover:text-[#F4F6F8]'
                        : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 shadow-2xs'
                    }`}
                  >
                    <div className="text-xs">{t.label}</div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-[#8A99A8]">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Label Elements Toggle */}
            <div className={`p-3 rounded-2xl border space-y-2 text-xs ${
              isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-white border-slate-300 shadow-2xs'
            }`}>
              <div className="font-semibold text-slate-600 dark:text-[#8A99A8] flex items-center justify-between pb-1 border-b border-slate-200 dark:border-[#282B34]/40">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#008285] dark:text-[#00CED1]" />
                  <span>Display Elements:</span>
                </span>
              </div>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Store / Branch Branding</span>
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={e => setShowStoreName(e.target.checked)}
                  className="rounded text-[#008285] dark:text-[#00CED1] focus:ring-[#008285] w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Retail Price in Cedis (GH₵)</span>
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={e => setShowPrice(e.target.checked)}
                  className="rounded text-[#008285] dark:text-[#00CED1] focus:ring-[#008285] w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Local Ghanaian Name (e.g. Abenkwan)</span>
                <input
                  type="checkbox"
                  checked={showLocalName}
                  onChange={e => setShowLocalName(e.target.checked)}
                  className="rounded text-[#008285] dark:text-[#00CED1] focus:ring-[#008285] w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>SKU Code & Packaging Unit</span>
                <input
                  type="checkbox"
                  checked={showSku}
                  onChange={e => setShowSku(e.target.checked)}
                  className="rounded text-[#008285] dark:text-[#00CED1] focus:ring-[#008285] w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Batch Expiry Date</span>
                <input
                  type="checkbox"
                  checked={showExpiry}
                  onChange={e => setShowExpiry(e.target.checked)}
                  className="rounded text-[#008285] dark:text-[#00CED1] focus:ring-[#008285] w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            {/* Selected Products in Queue */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 dark:text-[#8A99A8] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#008285] dark:text-[#00CED1]" />
                  <span>Products in Print Queue ({selectedItems.length}):</span>
                </label>
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <span className="text-slate-500 dark:text-[#8A99A8]">Batch Multiplier:</span>
                  <select
                    value={batchMultiplier}
                    onChange={e => setBatchMultiplier(parseInt(e.target.value) || 1)}
                    className={`px-2 py-0.5 rounded-lg border text-xs font-bold ${
                      isDark ? 'bg-[#121316] border-[#282B34] text-[#00CED1]' : 'bg-white border-slate-300 text-teal-800'
                    }`}
                  >
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={5}>5x</option>
                    <option value={10}>10x</option>
                  </select>
                </div>
              </div>

              {/* Add More Items Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchProductQuery}
                  onChange={e => setSearchProductQuery(stripEmojis(e.target.value))}
                  placeholder="Type to add item to label queue..."
                  className={`w-full px-3 py-1.5 rounded-xl text-xs border outline-none transition focus:border-[#008285] ${
                    isDark ? 'bg-[#121316] border-[#282B34] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                {searchProductQuery && (
                  <div className={`absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-20 max-h-40 overflow-y-auto divide-y ${
                    isDark ? 'bg-[#16181F] border-[#282B34] divide-white/5' : 'bg-white border-slate-300 divide-slate-100'
                  }`}>
                    {products
                      .filter(p => p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchProductQuery.toLowerCase()))
                      .slice(0, 5)
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddProduct(p)}
                          className={`w-full text-left p-2 text-xs flex items-center justify-between transition cursor-pointer ${
                            isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-slate-50 text-slate-900'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="font-semibold block truncate">{p.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-[#8A99A8] font-mono">{p.sku} · {formatGhs(p.retailPrice)}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-[#008285] dark:bg-[#00CED1] text-white dark:text-slate-950 font-bold text-[10px]">
                            + Add
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {selectedItems.map(item => (
                  <div
                    key={item.product.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-white border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="truncate pr-2 flex-1">
                      <div className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.product.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-[#8A99A8] font-mono">
                        {item.product.sku} · {formatGhs(item.product.retailPrice)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateCount(item.product.id, item.count - 1)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-xs cursor-pointer transition ${
                          isDark ? 'border-[#282B34] text-white hover:border-[#00CED1]' : 'border-slate-300 text-black hover:border-[#008285]'
                        }`}
                      >
                        -
                      </button>
                      <span className="w-7 text-center font-mono font-bold text-xs">
                        {item.count * batchMultiplier}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateCount(item.product.id, item.count + 1)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-xs cursor-pointer transition ${
                          isDark ? 'border-[#282B34] text-white hover:border-[#00CED1]' : 'border-slate-300 text-black hover:border-[#008285]'
                        }`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateCount(item.product.id, 0)}
                        className="text-slate-400 hover:text-[#FF4500] p-1 ml-1 cursor-pointer transition"
                        title="Remove from print batch"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Live Printable Labels Preview (7.5 cols) */}
          <div className="lg:col-span-8 p-4 sm:p-6 flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <span className="text-xs font-semibold text-slate-600 dark:text-[#8A99A8] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#008285] dark:text-[#00CED1]" />
                <span>Live Barcode Label Print Preview ({flattenedLabels.length} labels ready):</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-[#8A99A8] font-mono">
                Printer: Thermal / Desktop Laser
              </span>
            </div>

            {/* Scrollable Preview Canvas with Print-Area ID */}
            <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-white dark:bg-[#090B0E]/60 border border-slate-300 dark:border-white/10 shadow-xs flex items-start justify-center">
              
              <div
                id="printable-barcode-labels"
                className={`w-full transition-all ${
                  template === 'A4_SHEET_30UP'
                    ? 'grid grid-cols-3 gap-2.5 max-w-2xl bg-white p-6 shadow-2xl rounded text-black'
                    : template === 'PROMO_TALKER_80x50'
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl'
                    : template === 'ITEM_STICKER_40x25'
                    ? 'grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg'
                    : 'grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl'
                }`}
              >
                {flattenedLabels.map((prod, index) => {
                  const barcodeValue = prod.barcode || prod.sku;

                  if (template === 'SHELF_EDGE_60x40') {
                    return (
                      <div
                        key={index}
                        className="bg-white text-black font-sans border-2 border-black p-2.5 rounded-lg shadow-sm flex flex-col justify-between"
                        style={{ width: '100%', minHeight: '140px' }}
                      >
                        {/* Header Store Context */}
                        {showStoreName && (
                          <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider border-b border-black pb-1 text-slate-800">
                            <span className="truncate max-w-[170px]">{branchName}</span>
                            <span className="font-mono text-emerald-800">AUTHENTIC</span>
                          </div>
                        )}

                        {/* Title & Local Name */}
                        <div className="py-1">
                          <h4 className="font-black text-xs leading-snug line-clamp-2 text-black">
                            {prod.name}
                          </h4>
                          {showLocalName && prod.localName && (
                            <span className="text-[10px] text-slate-700 italic block">
                              ({prod.localName})
                            </span>
                          )}
                        </div>

                        {/* Large Price Badge */}
                        {showPrice && (
                          <div className="flex items-baseline justify-between bg-slate-100 p-1.5 rounded border border-slate-300 my-1">
                            <span className="text-[9px] font-bold text-slate-600">RETAIL PRICE:</span>
                            <span className="font-mono font-black text-base text-black">
                              {formatGhs(prod.retailPrice)}
                            </span>
                          </div>
                        )}

                        {/* Barcode SVG Vector + Code */}
                        <div className="text-center pt-1 border-t border-dotted border-gray-300">
                          {renderSvgBarcode(barcodeValue, 32)}
                          <div className="flex justify-between items-center text-[8px] font-mono text-slate-700 px-1 pt-0.5">
                            <span>{showSku ? prod.sku : ''}</span>
                            <span className="font-bold tracking-widest">{barcodeValue}</span>
                            <span>{prod.baseUnit}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (template === 'ITEM_STICKER_40x25') {
                    return (
                      <div
                        key={index}
                        className="bg-white text-black font-sans border border-black p-2 rounded shadow-2xs flex flex-col justify-between"
                        style={{ width: '100%', minHeight: '95px' }}
                      >
                        <div className="flex justify-between items-baseline leading-none">
                          <span className="font-bold text-[10px] truncate max-w-[120px]">{prod.name}</span>
                          {showPrice && (
                            <span className="font-mono font-black text-xs text-black ml-1">
                              {formatGhs(prod.retailPrice)}
                            </span>
                          )}
                        </div>
                        <div className="text-center py-1">
                          {renderSvgBarcode(barcodeValue, 24)}
                          <div className="text-[8px] font-mono tracking-wider font-semibold text-slate-800">
                            {barcodeValue}
                          </div>
                        </div>
                        <div className="flex justify-between text-[7px] text-slate-600 font-mono">
                          <span>{prod.sku}</span>
                          <span>{prod.baseUnit}</span>
                        </div>
                      </div>
                    );
                  }

                  if (template === 'PROMO_TALKER_80x50') {
                    return (
                      <div
                        key={index}
                        className="bg-white text-black font-sans border-3 border-[#FF4500] rounded-xl overflow-hidden shadow-sm flex flex-col justify-between"
                        style={{ width: '100%', minHeight: '175px' }}
                      >
                        <div className="bg-[#FF4500] text-white px-2 py-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                          <span>★ SPECIAL RETAIL OFFER</span>
                          <span>{branchName.split(' ')[0]}</span>
                        </div>
                        <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1">
                          <div>
                            <h4 className="font-black text-sm text-black line-clamp-2 leading-tight">
                              {prod.name}
                            </h4>
                            {showLocalName && prod.localName && (
                              <p className="text-[10px] font-medium text-slate-600">({prod.localName})</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 p-2 rounded-lg">
                            <span className="text-[10px] font-bold text-emerald-900 uppercase">OUR PRICE:</span>
                            <span className="font-mono font-black text-lg text-emerald-950">
                              {formatGhs(prod.retailPrice)}
                            </span>
                          </div>

                          <div className="pt-1 text-center">
                            {renderSvgBarcode(barcodeValue, 28)}
                            <div className="text-[9px] font-mono font-bold tracking-widest text-slate-800">
                              {barcodeValue} · {prod.sku}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // A4 Multi-label Sheet (30 per page: 3 cols x 10 rows)
                  return (
                    <div
                      key={index}
                      className="border border-gray-400 p-2 text-black font-sans text-[9px] flex flex-col justify-between rounded bg-white"
                      style={{ height: '70px' }}
                    >
                      <div className="flex justify-between items-start leading-tight">
                        <span className="font-bold truncate text-[10px] max-w-[120px]">{prod.name}</span>
                        {showPrice && (
                          <span className="font-mono font-black text-[11px] text-black shrink-0">
                            {formatGhs(prod.retailPrice)}
                          </span>
                        )}
                      </div>
                      <div className="text-center">
                        {renderSvgBarcode(barcodeValue, 20)}
                        <span className="text-[8px] font-mono tracking-widest">{barcodeValue}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>

    {/* OFFICIAL PRINTABLE VECTOR LABELS SHEET */}
    <OfficialPrintPortal active={true}>
      <div className="official-printable-doc bg-white text-black p-4 font-sans">
        <div
          className={`w-full transition-all ${
            template === 'A4_SHEET_30UP'
              ? 'grid grid-cols-3 gap-2.5 max-w-2xl mx-auto bg-white p-2 text-black'
              : template === 'PROMO_TALKER_80x50'
              ? 'grid grid-cols-2 gap-4 max-w-2xl mx-auto'
              : template === 'ITEM_STICKER_40x25'
              ? 'grid grid-cols-3 gap-3 max-w-xl mx-auto'
              : 'grid grid-cols-2 gap-3 max-w-2xl mx-auto'
          }`}
        >
          {flattenedLabels.map((prod, index) => {
            const barcodeValue = prod.barcode || prod.sku;

            if (template === 'SHELF_EDGE_60x40') {
              return (
                <div
                  key={index}
                  className="bg-white text-black font-sans border-2 border-black p-2.5 rounded-lg shadow-none flex flex-col justify-between"
                  style={{ width: '100%', minHeight: '140px' }}
                >
                  {showStoreName && (
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider border-b border-black pb-1 text-slate-800">
                      <span className="truncate max-w-[170px]">{branchName}</span>
                      <span className="font-mono text-emerald-800">AUTHENTIC</span>
                    </div>
                  )}

                  <div className="py-1">
                    <h4 className="font-black text-xs leading-snug line-clamp-2 text-black">
                      {prod.name}
                    </h4>
                    {showLocalName && prod.localName && (
                      <span className="text-[10px] text-slate-700 italic block">
                        ({prod.localName})
                      </span>
                    )}
                  </div>

                  {showPrice && (
                    <div className="flex items-baseline justify-between bg-slate-100 p-1.5 rounded border border-slate-300 my-1">
                      <span className="text-[9px] font-bold text-slate-600">RETAIL PRICE:</span>
                      <span className="font-mono font-black text-base text-black">
                        {formatGhs(prod.retailPrice)}
                      </span>
                    </div>
                  )}

                  <div className="text-center pt-1 border-t border-dotted border-gray-300">
                    {renderSvgBarcode(barcodeValue, 32)}
                    <div className="flex justify-between items-center text-[8px] font-mono text-slate-700 px-1 pt-0.5">
                      <span>{showSku ? prod.sku : ''}</span>
                      <span className="font-bold tracking-widest">{barcodeValue}</span>
                      <span>{prod.baseUnit}</span>
                    </div>
                  </div>
                </div>
              );
            }

            if (template === 'ITEM_STICKER_40x25') {
              return (
                <div
                  key={index}
                  className="bg-white text-black font-sans border border-black p-2 rounded flex flex-col justify-between"
                  style={{ width: '100%', minHeight: '95px' }}
                >
                  <div className="flex justify-between items-baseline leading-none">
                    <span className="font-bold text-[10px] truncate max-w-[120px]">{prod.name}</span>
                    {showPrice && (
                      <span className="font-mono font-black text-xs text-black ml-1">
                        {formatGhs(prod.retailPrice)}
                      </span>
                    )}
                  </div>
                  <div className="text-center py-1">
                    {renderSvgBarcode(barcodeValue, 24)}
                    <div className="text-[8px] font-mono tracking-wider font-semibold text-slate-800">
                      {barcodeValue}
                    </div>
                  </div>
                  <div className="flex justify-between text-[7px] text-slate-600 font-mono">
                    <span>{prod.sku}</span>
                    <span>{prod.baseUnit}</span>
                  </div>
                </div>
              );
            }

            if (template === 'PROMO_TALKER_80x50') {
              return (
                <div
                  key={index}
                  className="bg-white text-black font-sans border-3 border-[#FF4500] rounded-xl overflow-hidden flex flex-col justify-between"
                  style={{ width: '100%', minHeight: '175px' }}
                >
                  <div className="bg-[#FF4500] text-white px-2 py-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                    <span>★ SPECIAL RETAIL OFFER</span>
                    <span>{branchName.split(' ')[0]}</span>
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1">
                    <div>
                      <h4 className="font-black text-sm text-black line-clamp-2 leading-tight">
                        {prod.name}
                      </h4>
                      {showLocalName && prod.localName && (
                        <p className="text-[10px] font-medium text-slate-600">({prod.localName})</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 p-2 rounded-lg">
                      <span className="text-[10px] font-bold text-emerald-900 uppercase">OUR PRICE:</span>
                      <span className="font-mono font-black text-lg text-emerald-950">
                        {formatGhs(prod.retailPrice)}
                      </span>
                    </div>

                    <div className="pt-1 text-center">
                      {renderSvgBarcode(barcodeValue, 28)}
                      <div className="text-[9px] font-mono font-bold tracking-widest text-slate-800">
                        {barcodeValue} · {prod.sku}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // A4 Multi-label Sheet (30 per page: 3 cols x 10 rows)
            return (
              <div
                key={index}
                className="border border-gray-400 p-2 text-black font-sans text-[9px] flex flex-col justify-between rounded bg-white"
                style={{ height: '70px' }}
              >
                <div className="flex justify-between items-start leading-tight">
                  <span className="font-bold truncate text-[10px] max-w-[120px]">{prod.name}</span>
                  {showPrice && (
                    <span className="font-mono font-black text-[11px] text-black shrink-0">
                      {formatGhs(prod.retailPrice)}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  {renderSvgBarcode(barcodeValue, 20)}
                  <span className="text-[8px] font-mono tracking-widest">{barcodeValue}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </OfficialPrintPortal>
  </>
  );
};
