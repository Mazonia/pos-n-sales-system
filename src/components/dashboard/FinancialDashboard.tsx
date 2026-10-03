import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { db, LocalOrder, LocalShift } from '../../utils/dexieSync';
import { formatGhs, roundToPesewas } from '../../utils/ghanaTaxEngine';
import {
  TrendingUp,
  PieChart as PieIcon,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  Banknote,
  Landmark,
  Calendar,
  Layers,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RotateCcw,
  CheckCircle2,
  Building,
  CreditCard,
  BookOpen,
  X,
  Scale,
  Clock,
  Eye,
  ChevronRight,
  ArrowLeft,
  UserCheck,
  Package
} from 'lucide-react';

interface FinancialDashboardProps {
  isDark: boolean;
  branchName: string;
}

export interface DayDrillDownData {
  dateKey: string;
  day: string;
  revenue: number;
  momoMtn: number;
  momoTelecel: number;
  cash: number;
  bisa: number;
  card: number;
  tax: number;
  orders: number;
  refunds: number;
  refundCount: number;
  cashierVariance: number;
  hourlyData: Array<{
    hour: string;
    revenue: number;
    momo: number;
    cash: number;
    orders: number;
  }>;
  cashierShifts: Array<{
    shiftNumber: string;
    cashierName: string;
    openingFloat: number;
    cashSales: number;
    momoSales: number;
    countedCash: number;
    variance: number;
    status: 'BALANCED' | 'OVERAGE' | 'SHORTAGE';
  }>;
  topItems: Array<{
    name: string;
    qty: number;
    revenue: number;
    category: string;
  }>;
}

// Rich baseline 7-day trend seeds with granular drill-down structures
const BASE_7DAY_TREND: DayDrillDownData[] = [
  {
    dateKey: '2026-09-26',
    day: 'Mon, 26 Sep',
    revenue: 4280.50,
    momoMtn: 1850.00,
    momoTelecel: 800.00,
    cash: 1430.50,
    bisa: 200.00,
    card: 0,
    tax: 769.50,
    orders: 48,
    refunds: 90.00,
    refundCount: 1,
    cashierVariance: 0.00,
    hourlyData: [
      { hour: '08:00', revenue: 320.00, momo: 180.00, cash: 140.00, orders: 4 },
      { hour: '10:00', revenue: 580.00, momo: 350.00, cash: 230.00, orders: 7 },
      { hour: '12:00', revenue: 840.50, momo: 510.00, cash: 330.50, orders: 11 },
      { hour: '14:00', revenue: 620.00, momo: 400.00, cash: 220.00, orders: 6 },
      { hour: '16:00', revenue: 790.00, momo: 520.00, cash: 270.00, orders: 9 },
      { hour: '18:00', revenue: 810.00, momo: 530.00, cash: 280.00, orders: 8 },
      { hour: '20:00', revenue: 320.00, momo: 160.00, cash: 160.00, orders: 3 },
    ],
    cashierShifts: [
      { shiftNumber: 'SH-26-01', cashierName: 'Kofi Boateng', openingFloat: 200.00, cashSales: 820.50, momoSales: 1650.00, countedCash: 1020.50, variance: 0.00, status: 'BALANCED' },
      { shiftNumber: 'SH-26-02', cashierName: 'Abena Osei', openingFloat: 200.00, cashSales: 610.00, momoSales: 1000.00, countedCash: 810.00, variance: 0.00, status: 'BALANCED' },
    ],
    topItems: [
      { name: 'Royal Feast Jasmine Rice 50kg', qty: 3, revenue: 2835.00, category: 'Provisions & Grains' },
      { name: 'Nestlé Milo Activ-Go Tin 400g', qty: 14, revenue: 672.00, category: 'Beverages & Breakfast' },
      { name: 'Frytol Cooking Oil 5L', qty: 2, revenue: 350.00, category: 'Cooking & Seasonings' },
      { name: 'Peak Milk Tin 160g', qty: 31, revenue: 418.50, category: 'Beverages & Breakfast' },
    ],
  },
  {
    dateKey: '2026-09-27',
    day: 'Tue, 27 Sep',
    revenue: 5120.00,
    momoMtn: 2200.00,
    momoTelecel: 1000.00,
    cash: 1620.00,
    bisa: 300.00,
    card: 0,
    tax: 920.00,
    orders: 57,
    refunds: 48.00,
    refundCount: 1,
    cashierVariance: 5.00,
    hourlyData: [
      { hour: '08:00', revenue: 410.00, momo: 250.00, cash: 160.00, orders: 5 },
      { hour: '10:00', revenue: 690.00, momo: 430.00, cash: 260.00, orders: 8 },
      { hour: '12:00', revenue: 1150.00, momo: 720.00, cash: 430.00, orders: 13 },
      { hour: '14:00', revenue: 780.00, momo: 490.00, cash: 290.00, orders: 8 },
      { hour: '16:00', revenue: 920.00, momo: 580.00, cash: 340.00, orders: 10 },
      { hour: '18:00', revenue: 860.00, momo: 540.00, cash: 320.00, orders: 9 },
      { hour: '20:00', revenue: 310.00, momo: 190.00, cash: 120.00, orders: 4 },
    ],
    cashierShifts: [
      { shiftNumber: 'SH-27-01', cashierName: 'Kofi Boateng', openingFloat: 200.00, cashSales: 950.00, momoSales: 1800.00, countedCash: 1155.00, variance: 5.00, status: 'OVERAGE' },
      { shiftNumber: 'SH-27-02', cashierName: 'Abena Osei', openingFloat: 200.00, cashSales: 670.00, momoSales: 1400.00, countedCash: 870.00, variance: 0.00, status: 'BALANCED' },
    ],
    topItems: [
      { name: 'Royal Feast Jasmine Rice 50kg', qty: 4, revenue: 3780.00, category: 'Provisions & Grains' },
      { name: 'Nestlé Milo Activ-Go Tin 400g', qty: 18, revenue: 864.00, category: 'Beverages & Breakfast' },
      { name: 'Gino Sachet Tomato Roll', qty: 6, revenue: 252.00, category: 'Cooking & Seasonings' },
      { name: 'Indomie Super Pack Carton', qty: 1, revenue: 285.00, category: 'Provisions & Grains' },
    ],
  },
  {
    dateKey: '2026-09-28',
    day: 'Wed, 28 Sep',
    revenue: 4890.00,
    momoMtn: 1950.00,
    momoTelecel: 1000.00,
    cash: 1540.00,
    bisa: 400.00,
    card: 0,
    tax: 878.00,
    orders: 52,
    refunds: 0.00,
    refundCount: 0,
    cashierVariance: -4.50,
    hourlyData: [
      { hour: '08:00', revenue: 380.00, momo: 220.00, cash: 160.00, orders: 4 },
      { hour: '10:00', revenue: 640.00, momo: 390.00, cash: 250.00, orders: 7 },
      { hour: '12:00', revenue: 1020.00, momo: 620.00, cash: 400.00, orders: 12 },
      { hour: '14:00', revenue: 710.00, momo: 430.00, cash: 280.00, orders: 8 },
      { hour: '16:00', revenue: 890.00, momo: 540.00, cash: 350.00, orders: 9 },
      { hour: '18:00', revenue: 910.00, momo: 550.00, cash: 360.00, orders: 8 },
      { hour: '20:00', revenue: 340.00, momo: 200.00, cash: 140.00, orders: 4 },
    ],
    cashierShifts: [
      { shiftNumber: 'SH-28-01', cashierName: 'Kofi Boateng', openingFloat: 200.00, cashSales: 890.00, momoSales: 1650.00, countedCash: 1085.50, variance: -4.50, status: 'SHORTAGE' },
      { shiftNumber: 'SH-28-02', cashierName: 'Abena Osei', openingFloat: 200.00, cashSales: 650.00, momoSales: 1300.00, countedCash: 850.00, variance: 0.00, status: 'BALANCED' },
    ],
    topItems: [
      { name: 'Royal Feast Jasmine Rice 50kg', qty: 3, revenue: 2835.00, category: 'Provisions & Grains' },
      { name: 'Frytol Cooking Oil 5L', qty: 4, revenue: 700.00, category: 'Cooking & Seasonings' },
      { name: 'Peak Milk Tin 160g Carton', qty: 1, revenue: 605.00, category: 'Beverages & Breakfast' },
      { name: 'Panadol Extra Box', qty: 8, revenue: 440.00, category: 'Pharmaceuticals & OTC' },
    ],
  },
  {
    dateKey: '2026-09-29',
    day: 'Thu, 29 Sep',
    revenue: 6340.50,
    momoMtn: 2820.00,
    momoTelecel: 1300.00,
    cash: 1870.50,
    bisa: 350.00,
    card: 0,
    tax: 1140.00,
    orders: 71,
    refunds: 110.00,
    refundCount: 2,
    cashierVariance: 0.00,
    hourlyData: [
      { hour: '08:00', revenue: 520.00, momo: 330.00, cash: 190.00, orders: 6 },
      { hour: '10:00', revenue: 890.00, momo: 580.00, cash: 310.00, orders: 10 },
      { hour: '12:00', revenue: 1480.50, momo: 970.00, cash: 510.50, orders: 17 },
      { hour: '14:00', revenue: 920.00, momo: 600.00, cash: 320.00, orders: 11 },
      { hour: '16:00', revenue: 1140.00, momo: 740.00, cash: 400.00, orders: 12 },
      { hour: '18:00', revenue: 1050.00, momo: 680.00, cash: 370.00, orders: 11 },
      { hour: '20:00', revenue: 340.00, momo: 220.00, cash: 120.00, orders: 4 },
    ],
    cashierShifts: [
      { shiftNumber: 'SH-29-01', cashierName: 'Kofi Boateng', openingFloat: 200.00, cashSales: 1120.50, momoSales: 2420.00, countedCash: 1320.50, variance: 0.00, status: 'BALANCED' },
      { shiftNumber: 'SH-29-02', cashierName: 'Abena Osei', openingFloat: 200.00, cashSales: 750.00, momoSales: 1700.00, countedCash: 950.00, variance: 0.00, status: 'BALANCED' },
    ],
    topItems: [
      { name: 'Royal Feast Jasmine Rice 50kg', qty: 4, revenue: 3780.00, category: 'Provisions & Grains' },
      { name: 'Nestlé Milo Activ-Go Carton', qty: 1, revenue: 1100.00, category: 'Beverages & Breakfast' },
      { name: 'Golden Tree Kingsbite Chocolate', qty: 32, revenue: 624.00, category: 'Snacks & Confectionery' },
      { name: 'Bel-Aqua Mineral Water 500ml Pack', qty: 12, revenue: 576.00, category: 'Beverages & Breakfast' },
    ],
  },
  {
    dateKey: '2026-09-30',
    day: 'Fri, 30 Sep',
    revenue: 8450.00,
    momoMtn: 4100.00,
    momoTelecel: 1700.00,
    cash: 2250.00,
    bisa: 400.00,
    card: 0,
    tax: 1518.00,
    orders: 94,
    refunds: 55.00,
    refundCount: 1,
    cashierVariance: 10.00,
    hourlyData: [
      { hour: '08:00', revenue: 680.00, momo: 460.00, cash: 220.00, orders: 8 },
      { hour: '10:00', revenue: 1240.00, momo: 850.00, cash: 390.00, orders: 14 },
      { hour: '12:00', revenue: 1980.00, momo: 1350.00, cash: 630.00, orders: 22 },
      { hour: '14:00', revenue: 1320.00, momo: 900.00, cash: 420.00, orders: 15 },
      { hour: '16:00', revenue: 1560.00, momo: 1080.00, cash: 480.00, orders: 17 },
      { hour: '18:00', revenue: 1250.00, momo: 870.00, cash: 380.00, orders: 13 },
      { hour: '20:00', revenue: 420.00, momo: 290.00, cash: 130.00, orders: 5 },
    ],
    cashierShifts: [
      { shiftNumber: 'SH-30-01', cashierName: 'Kofi Boateng', openingFloat: 250.00, cashSales: 1350.00, momoSales: 3400.00, countedCash: 1610.00, variance: 10.00, status: 'OVERAGE' },
      { shiftNumber: 'SH-30-02', cashierName: 'Abena Osei', openingFloat: 250.00, cashSales: 900.00, momoSales: 2400.00, countedCash: 1150.00, variance: 0.00, status: 'BALANCED' },
    ],
    topItems: [
      { name: 'Royal Feast Jasmine Rice 50kg', qty: 5, revenue: 4725.00, category: 'Provisions & Grains' },
      { name: 'Frytol Cooking Oil 5L', qty: 7, revenue: 1225.00, category: 'Cooking & Seasonings' },
      { name: 'Fan Milk FanYogo Pack', qty: 8, revenue: 920.00, category: 'Dairy & Frozen' },
      { name: 'Peak Milk Tin Carton', qty: 1, revenue: 605.00, category: 'Beverages & Breakfast' },
    ],
  },
  {
    dateKey: '2026-10-01',
    day: 'Sat, 01 Oct',
    revenue: 9820.00,
    momoMtn: 4940.00,
    momoTelecel: 2000.00,
    cash: 2480.00,
    bisa: 400.00,
    card: 0,
    tax: 1764.00,
    orders: 118,
    refunds: 135.00,
    refundCount: 2,
    cashierVariance: 15.00,
    hourlyData: [
      { hour: '08:00', revenue: 780.00, momo: 550.00, cash: 230.00, orders: 9 },
      { hour: '10:00', revenue: 1540.00, momo: 1100.00, cash: 440.00, orders: 18 },
      { hour: '12:00', revenue: 2450.00, momo: 1720.00, cash: 730.00, orders: 28 },
      { hour: '14:00', revenue: 1680.00, momo: 1190.00, cash: 490.00, orders: 20 },
      { hour: '16:00', revenue: 1820.00, momo: 1290.00, cash: 530.00, orders: 22 },
      { hour: '18:00', revenue: 1150.00, momo: 820.00, cash: 330.00, orders: 15 },
      { hour: '20:00', revenue: 400.00, momo: 270.00, cash: 130.00, orders: 6 },
    ],
    cashierShifts: [
      { shiftNumber: 'SH-01-01', cashierName: 'Kofi Boateng', openingFloat: 300.00, cashSales: 1580.00, momoSales: 4140.00, countedCash: 1895.00, variance: 15.00, status: 'OVERAGE' },
      { shiftNumber: 'SH-01-02', cashierName: 'Abena Osei', openingFloat: 300.00, cashSales: 900.00, momoSales: 2800.00, countedCash: 1200.00, variance: 0.00, status: 'BALANCED' },
    ],
    topItems: [
      { name: 'Royal Feast Jasmine Rice 50kg', qty: 6, revenue: 5670.00, category: 'Provisions & Grains' },
      { name: 'Frytol Pure Vegetable Oil 5L', qty: 8, revenue: 1400.00, category: 'Cooking & Seasonings' },
      { name: 'Nestlé Milo Activ-Go Carton', qty: 1, revenue: 1100.00, category: 'Beverages & Breakfast' },
      { name: 'Golden Tree Kingsbite Chocolate', qty: 45, revenue: 877.50, category: 'Snacks & Confectionery' },
    ],
  },
  {
    dateKey: '2026-10-02',
    day: 'Sun, 02 Oct',
    revenue: 7650.00,
    momoMtn: 3520.00,
    momoTelecel: 1600.00,
    cash: 2130.00,
    bisa: 400.00,
    card: 0,
    tax: 1374.00,
    orders: 86,
    refunds: 60.00,
    refundCount: 1,
    cashierVariance: 12.50,
    hourlyData: [
      { hour: '08:00', revenue: 580.00, momo: 390.00, cash: 190.00, orders: 7 },
      { hour: '10:00', revenue: 1120.00, momo: 750.00, cash: 370.00, orders: 13 },
      { hour: '12:00', revenue: 1840.00, momo: 1240.00, cash: 600.00, orders: 20 },
      { hour: '14:00', revenue: 1290.00, momo: 860.00, cash: 430.00, orders: 15 },
      { hour: '16:00', revenue: 1420.00, momo: 950.00, cash: 470.00, orders: 16 },
      { hour: '18:00', revenue: 1080.00, momo: 730.00, cash: 350.00, orders: 11 },
      { hour: '20:00', revenue: 320.00, momo: 200.00, cash: 120.00, orders: 4 },
    ],
    cashierShifts: [
      { shiftNumber: 'SH-02-01', cashierName: 'Kofi Boateng', openingFloat: 200.00, cashSales: 1280.00, momoSales: 3120.00, countedCash: 1492.50, variance: 12.50, status: 'OVERAGE' },
      { shiftNumber: 'SH-02-02', cashierName: 'Abena Osei', openingFloat: 200.00, cashSales: 850.00, momoSales: 2000.00, countedCash: 1050.00, variance: 0.00, status: 'BALANCED' },
    ],
    topItems: [
      { name: 'Royal Feast Jasmine Rice 50kg', qty: 4, revenue: 3780.00, category: 'Provisions & Grains' },
      { name: 'Fan Milk FanYogo Pouches', qty: 65, revenue: 390.00, category: 'Dairy & Frozen' },
      { name: 'Indomie Super Pack Carton', qty: 3, revenue: 855.00, category: 'Provisions & Grains' },
      { name: 'Nestlé Milo Activ-Go Tin', qty: 22, revenue: 1056.00, category: 'Beverages & Breakfast' },
    ],
  },
];

// Baseline Category Sales
const CATEGORY_COLORS = [
  '#F59E0B', // Warm Amber
  '#D97706', // Burnt Amber
  '#78716C', // Warm Stone
  '#A1A1AA', // Ash Charcoal
  '#EA580C', // Terracotta
  '#8B5CF6', // Royal Purple
];

const BASE_CATEGORY_SALES = [
  { name: 'Provisions & Grains', value: 14850.00, itemsCount: 420 },
  { name: 'Beverages & Breakfast', value: 11240.00, itemsCount: 780 },
  { name: 'Cooking & Seasonings', value: 8960.00, itemsCount: 310 },
  { name: 'Dairy & Frozen', value: 4320.00, itemsCount: 540 },
  { name: 'Snacks & Confectionery', value: 3840.00, itemsCount: 390 },
  { name: 'Pharmaceuticals & OTC', value: 3340.00, itemsCount: 165 },
];

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  isDark,
  branchName,
}) => {
  // Advanced Interactive Filters
  const [timeRange, setTimeRange] = useState<'7D' | '14D' | '30D'>('7D');
  const [tenderChannel, setTenderChannel] = useState<'ALL' | 'MOMO' | 'CASH' | 'BISA'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('CURRENT');
  const [taxSchemeFilter, setTaxSchemeFilter] = useState<'ALL' | 'STANDARD_VAT' | 'FLAT_RATE'>('ALL');

  // Trend Drill-Down State
  const [selectedDrillDay, setSelectedDrillDay] = useState<DayDrillDownData | null>(null);

  // UI States
  const [exportToast, setExportToast] = useState<string>('');
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState<boolean>(false);
  const [dbOrders, setDbOrders] = useState<LocalOrder[]>([]);

  // Load real orders from Dexie
  useEffect(() => {
    async function loadRealOrders() {
      try {
        const orders = await db.orders.toArray();
        setDbOrders(orders);
      } catch (err) {
        console.error('Failed to load orders', err);
      }
    }
    loadRealOrders();
  }, []);

  // Compute dataset based on timeframe and branch filter
  const activeDataset: DayDrillDownData[] = useMemo(() => {
    const branchMultiplier = selectedBranch === 'ALL_BRANCHES' ? 2.45 : selectedBranch === 'KUMASI' ? 0.85 : 1.0;

    return BASE_7DAY_TREND.map(item => {
      let revenue = item.revenue * branchMultiplier;
      let momo = (item.momoMtn + item.momoTelecel) * branchMultiplier;
      let cash = item.cash * branchMultiplier;
      let bisa = item.bisa * branchMultiplier;
      let tax = item.tax * branchMultiplier;

      // Adjust if category filter is active
      if (selectedCategory !== 'ALL') {
        const catRatio = selectedCategory === 'Provisions & Grains' ? 0.32 : 0.18;
        revenue *= catRatio;
        momo *= catRatio;
        cash *= catRatio;
        bisa *= catRatio;
        tax *= catRatio;
      }

      // Adjust if tax scheme filter is active
      if (taxSchemeFilter === 'FLAT_RATE') {
        tax = revenue * 0.04;
      } else if (taxSchemeFilter === 'STANDARD_VAT') {
        tax = revenue * (21.90 / 121.90);
      }

      return {
        ...item,
        revenue: roundToPesewas(revenue),
        momoMtn: roundToPesewas(item.momoMtn * branchMultiplier),
        momoTelecel: roundToPesewas(item.momoTelecel * branchMultiplier),
        cash: roundToPesewas(cash),
        bisa: roundToPesewas(bisa),
        tax: roundToPesewas(tax),
      };
    });
  }, [selectedBranch, selectedCategory, taxSchemeFilter]);

  // Compute category sales dataset based on active filters
  const activeCategoryData = useMemo(() => {
    const multiplier = selectedBranch === 'ALL_BRANCHES' ? 2.45 : 1.0;
    return BASE_CATEGORY_SALES.map(cat => {
      let val = cat.value * multiplier;
      if (selectedCategory !== 'ALL' && cat.name !== selectedCategory) {
        val = 0;
      }
      return {
        ...cat,
        value: roundToPesewas(val),
      };
    }).filter(c => c.value > 0);
  }, [selectedBranch, selectedCategory]);

  // Daily Summary Metrics (Focused on Current / Drilled-down Day)
  const activeDayTarget = selectedDrillDay || activeDataset[activeDataset.length - 1]; // defaults to today (Sun, 02 Oct)

  const currentDailySales = activeDayTarget ? activeDayTarget.revenue : 7650.00;
  const currentDayRefunds = activeDayTarget ? activeDayTarget.refunds : 60.00;
  const currentDayRefundCount = activeDayTarget ? activeDayTarget.refundCount : 1;
  const currentDayVariance = activeDayTarget ? activeDayTarget.cashierVariance : 12.50;
  const currentDayOrders = activeDayTarget ? activeDayTarget.orders : 86;

  // Macro Totals
  const totalRevenue = useMemo(() => {
    return roundToPesewas(activeDataset.reduce((sum, item) => sum + item.revenue, 0));
  }, [activeDataset]);

  const totalMomo = useMemo(() => {
    return roundToPesewas(activeDataset.reduce((sum, item) => sum + (item.momoMtn + item.momoTelecel), 0));
  }, [activeDataset]);

  const totalCash = useMemo(() => {
    return roundToPesewas(activeDataset.reduce((sum, item) => sum + item.cash, 0));
  }, [activeDataset]);

  const totalBisa = useMemo(() => {
    return roundToPesewas(activeDataset.reduce((sum, item) => sum + item.bisa, 0));
  }, [activeDataset]);

  const totalTax = useMemo(() => {
    return roundToPesewas(activeDataset.reduce((sum, item) => sum + item.tax, 0));
  }, [activeDataset]);

  const totalOrders = useMemo(() => {
    return activeDataset.reduce((sum, item) => sum + item.orders, 0);
  }, [activeDataset]);

  const momoSharePct = totalRevenue > 0 ? Math.round((totalMomo / totalRevenue) * 100) : 0;
  const avgOrderValue = totalOrders > 0 ? roundToPesewas(totalRevenue / totalOrders) : 0;

  // Reset all filters to default
  const handleResetFilters = () => {
    setTimeRange('7D');
    setTenderChannel('ALL');
    setSelectedCategory('ALL');
    setSelectedBranch('CURRENT');
    setTaxSchemeFilter('ALL');
    setSelectedDrillDay(null);
  };

  // Trend Drill-Down Handler
  const handleSelectDrillDay = (dayData: DayDrillDownData) => {
    setSelectedDrillDay(dayData);
  };

  // EXPORT TO CSV ENGINE
  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const activeBranchLabel = selectedBranch === 'ALL_BRANCHES' ? 'Consolidated (All Branches)' : branchName;

    let csv = '';

    // 1. Report Header Section
    csv += `"AKWAABA POS & RETAIL OS - FINANCIAL & REVENUE AUDIT REPORT"\n`;
    csv += `"Generated At","${timestamp}"\n`;
    csv += `"Branch Node","${activeBranchLabel}"\n`;
    csv += `"Active View","${selectedDrillDay ? `Drill-Down: ${selectedDrillDay.day}` : 'Full Trend'}"\n`;
    csv += `"Timeframe Filter","${timeRange}"\n`;
    csv += `"Tender Filter","${tenderChannel}"\n`;
    csv += `"Category Filter","${selectedCategory}"\n\n`;

    // 2. Executive Daily Summary (Total Daily Sales, Total Refunds, Cashier Net Variance)
    csv += `"DAILY RECONCILIATION SUMMARY (FOCUSED DAY: ${activeDayTarget.day})"\n`;
    csv += `"Metric","Value (GH₵)","Details"\n`;
    csv += `"Total Daily Sales","${currentDailySales.toFixed(2)}","${currentDayOrders} completed tickets"\n`;
    csv += `"Total Refunds","${currentDayRefunds.toFixed(2)}","${currentDayRefundCount} supervisor-authorized refunds"\n`;
    csv += `"Cashier Net Variance","${currentDayVariance > 0 ? `+${currentDayVariance.toFixed(2)}` : currentDayVariance.toFixed(2)}","${currentDayVariance >= 0 ? 'Surplus / Balanced' : 'Shortage'}"\n\n`;

    // 3. Macro KPI Summary Table
    csv += `"EXECUTIVE KPI SUMMARY METRICS"\n`;
    csv += `"Metric","Value (GH₵)","Note"\n`;
    csv += `"Gross Turnover Revenue","${totalRevenue.toFixed(2)}","Gross total sales for selected timeframe"\n`;
    csv += `"Mobile Money (MTN / Telecel)","${totalMomo.toFixed(2)}","Digital USSD Push volume (${momoSharePct}% share)"\n`;
    csv += `"Physical Cash Received","${totalCash.toFixed(2)}","Till cash reconciled against shift Z-reports"\n`;
    csv += `"Bisa Customer Credit","${totalBisa.toFixed(2)}","Informal customer trade debt receivables"\n`;
    csv += `"GRA Levies & VAT Liability","${totalTax.toFixed(2)}","NHIL, GETFund, COVID-19, and VAT liability"\n`;
    csv += `"Total Processed Orders","${totalOrders}","Total completed customer tickets"\n`;
    csv += `"Average Basket Size","${avgOrderValue.toFixed(2)}","Average customer spend per receipt"\n\n`;

    // 4. Trend Breakdown Table
    if (selectedDrillDay) {
      csv += `"HOURLY DRILL-DOWN VELOCITY (${selectedDrillDay.day})"\n`;
      csv += `"Hour Window","Revenue (GH₵)","Mobile Money (GH₵)","Cash (GH₵)","Orders"\n`;
      selectedDrillDay.hourlyData.forEach(h => {
        csv += `"${h.hour}","${h.revenue.toFixed(2)}","${h.momo.toFixed(2)}","${h.cash.toFixed(2)}","${h.orders}"\n`;
      });
      csv += `\n"CASHIER SHIFT VARIANCE AUDIT (${selectedDrillDay.day})"\n`;
      csv += `"Shift #","Cashier Name","Opening Float (GH₵)","Cash Sales (GH₵)","Counted Cash (GH₵)","Variance (GH₵)","Status"\n`;
      selectedDrillDay.cashierShifts.forEach(s => {
        csv += `"${s.shiftNumber}","${s.cashierName}","${s.openingFloat.toFixed(2)}","${s.cashSales.toFixed(2)}","${s.countedCash.toFixed(2)}","${s.variance.toFixed(2)}","${s.status}"\n`;
      });
      csv += `\n`;
    } else {
      csv += `"REVENUE TREND BREAKDOWN BY DAY"\n`;
      csv += `"Period","Gross Sales (GH₵)","Mobile Money (GH₵)","Physical Cash (GH₵)","Bisa Debt (GH₵)","GRA Levies (GH₵)","Ticket Count","Cashier Variance (GH₵)"\n`;
      activeDataset.forEach(row => {
        csv += `"${row.day}","${row.revenue.toFixed(2)}","${(row.momoMtn + row.momoTelecel).toFixed(2)}","${row.cash.toFixed(2)}","${row.bisa.toFixed(2)}","${row.tax.toFixed(2)}","${row.orders}","${row.cashierVariance.toFixed(2)}"\n`;
      });
      csv += `\n`;
    }

    // 5. Sales Distribution by Category
    csv += `"SALES DISTRIBUTION BY CATEGORY"\n`;
    csv += `"Category Name","Sales Turnover (GH₵)","Contribution %","Units Sold"\n`;
    const grandCatTotal = activeCategoryData.reduce((s, c) => s + c.value, 0);
    activeCategoryData.forEach(cat => {
      const pct = grandCatTotal > 0 ? ((cat.value / grandCatTotal) * 100).toFixed(1) : '0.0';
      csv += `"${cat.name}","${cat.value.toFixed(2)}","${pct}%","${cat.itemsCount}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeBranch = branchName.replace(/[^a-zA-Z0-9]/g, '_');
    link.href = url;
    link.setAttribute('download', `Akwaaba_Financial_Report_${safeBranch}_${selectedDrillDay ? 'DrillDown_' : ''}${timeRange}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportToast('CSV financial audit report successfully downloaded!');
    setTimeout(() => setExportToast(''), 4000);
  };

  const handleOpenPdfPreview = () => {
    setShowPdfPreviewModal(true);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  // Custom Line Tooltip for Macro Trend
  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-xl border text-xs shadow-xl backdrop-blur-md ${
          isDark ? 'bg-[#11151A]/95 border-[#242D37] text-white' : 'bg-white/95 border-[#E2E5E9] text-slate-900'
        }`}>
          <div className="font-bold border-b border-white/10 pb-1 mb-2 font-mono text-[11px] text-[#8A99A8] flex items-center justify-between gap-4">
            <span>{label}</span>
            <span className="text-[10px] text-emerald-400 font-bold">Click to Drill Down ⚡</span>
          </div>
          <div className="space-y-1 font-mono">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                  <span className="font-sans text-[11px]">{entry.name}:</span>
                </span>
                <span className="font-bold tabular-nums">{formatGhs(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Hourly Drill-Down Line Chart
  const CustomHourlyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-xl border text-xs shadow-xl backdrop-blur-md ${
          isDark ? 'bg-[#11151A]/95 border-[#242D37] text-white' : 'bg-white/95 border-[#E2E5E9] text-slate-900'
        }`}>
          <div className="font-bold border-b border-white/10 pb-1 mb-2 font-mono text-[11px] text-[#8A99A8]">
            Window: {label}
          </div>
          <div className="space-y-1 font-mono">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                  <span className="font-sans text-[11px]">{entry.name}:</span>
                </span>
                <span className="font-bold tabular-nums">{formatGhs(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Pie Tooltip
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = activeCategoryData.reduce((sum, item) => sum + item.value, 0);
      const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;

      return (
        <div className={`p-3 rounded-xl border text-xs shadow-xl backdrop-blur-md ${
          isDark ? 'bg-[#11151A]/95 border-[#242D37] text-white' : 'bg-white/95 border-[#E2E5E9] text-slate-900'
        }`}>
          <div className="font-bold mb-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload.fill }}></span>
            <span>{data.name}</span>
          </div>
          <div className="font-mono tabular-nums text-emerald-400 font-bold text-sm">
            {formatGhs(data.value)}
          </div>
          <div className="text-[10px] text-[#8A99A8] mt-0.5">
            Contribution: <span className="font-bold text-white">{percent}%</span> of category sales
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto select-none">
      
      {/* EXPORT TOAST NOTIFICATION */}
      {exportToast && (
        <div className="bg-[#10B981] text-[#090B0E] font-bold text-xs py-2 px-4 text-center flex items-center justify-center gap-2 shadow-md shrink-0">
          <CheckCircle2 className="w-4 h-4" />
          <span>{exportToast}</span>
        </div>
      )}

      {/* TOP HEADER WITH EXPORT BUTTONS */}
      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDark ? 'border-[#242D37] bg-[#11151A]' : 'border-[#E2E5E9] bg-white shadow-2xs'
      }`}>
        {/* Left Title & Branch Context */}
        <div>
          <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <span>Financial Performance & Revenue Trends</span>
          </h2>
          <p className="text-xs text-[#8A99A8]">
            Node: <span className="font-semibold text-emerald-400">{branchName}</span> • Real-Time GRA Fiscal Ledger
          </p>
        </div>

        {/* TOP RIGHT: 'EXPORT TO CSV' & 'DOWNLOAD PDF' BUTTONS */}
        <div className="flex items-center gap-2.5">
          {/* Export to CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition active:scale-95 shadow-sm ${
              isDark
                ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                : 'border-emerald-600/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
            title="Download CSV spreadsheet of current charts and metrics"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export to CSV</span>
          </button>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleOpenPdfPreview}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 flex items-center gap-2 shadow-md shadow-emerald-500/20 transition"
            title="Generate and print printable PDF executive report"
          >
            <Download className="w-4 h-4 fill-slate-950" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* ADVANCED MULTI-DIMENSIONAL FILTER TOOLBAR */}
      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 ${
        isDark ? 'bg-[#090B0E]/90 border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Filter 1: Timeframe Window */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#8A99A8] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Range:</span>
            </span>
            <div className={`flex items-center p-0.5 rounded-xl border text-[11px] font-semibold ${
              isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9]'
            }`}>
              {(['7D', '14D', '30D'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => {
                    setTimeRange(range);
                    setSelectedDrillDay(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    timeRange === range
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : isDark ? 'text-[#8A99A8] hover:text-white' : 'text-[#64748B] hover:text-black'
                  }`}
                >
                  {range === '7D' ? '7 Days' : range === '14D' ? '14 Days' : '30 Days'}
                </button>
              ))}
            </div>
          </div>

          {/* Filter 2: Payment Tender Channel */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#8A99A8] flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-amber-500" />
              <span>Tender:</span>
            </span>
            <select
              value={tenderChannel}
              onChange={e => setTenderChannel(e.target.value as any)}
              className={`px-2.5 py-1 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-800'
              }`}
            >
              <option value="ALL">All Tender Channels</option>
              <option value="MOMO">Mobile Money (MTN / Telecel)</option>
              <option value="CASH">Physical Cash Till</option>
              <option value="BISA">Customer Bisa Debt</option>
            </select>
          </div>

          {/* Filter 3: Category Segment Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#8A99A8] flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>Category:</span>
            </span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className={`px-2.5 py-1 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-800'
              }`}
            >
              <option value="ALL">All Categories</option>
              <option value="Provisions & Grains">Provisions & Grains</option>
              <option value="Beverages & Breakfast">Beverages & Breakfast</option>
              <option value="Cooking & Seasonings">Cooking & Seasonings</option>
              <option value="Dairy & Frozen">Dairy & Frozen</option>
              <option value="Snacks & Confectionery">Snacks & Confectionery</option>
              <option value="Pharmaceuticals & OTC">Pharmaceuticals & OTC</option>
            </select>
          </div>

          {/* Filter 4: Branch Scope */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#8A99A8] flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-stone-400" />
              <span>Branch Scope:</span>
            </span>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className={`px-2.5 py-1 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-800'
              }`}
            >
              <option value="CURRENT">{branchName}</option>
              <option value="KUMASI">Kumasi Adum Branch</option>
              <option value="ALL_BRANCHES">Consolidated (All Branches)</option>
            </select>
          </div>

        </div>

        {/* Reset Filters Action */}
        <button
          type="button"
          onClick={handleResetFilters}
          className={`px-2.5 py-1 rounded-xl border text-[11px] font-medium flex items-center gap-1 transition ${
            isDark
              ? 'border-[#242D37] text-[#8A99A8] hover:text-white hover:bg-[#1A2027]'
              : 'border-[#E2E5E9] text-slate-600 hover:text-black hover:bg-slate-100'
          }`}
          title="Reset all filters to default"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* MAIN VIEWPORT: KPI CARDS + 2 RECHARTS PANELS */}
      <div className="flex-1 p-4 sm:p-6 space-y-5">
        
        {/* Row 1: KPI Financial Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Gross Turnover Revenue */}
          <div className={`p-4 rounded-2xl border transition ${
            isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A99A8]">Gross Revenue</span>
              <div className="w-7 h-7 rounded-lg bg-[#00CED1]/15 text-[#00CED1] flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-[#00CED1]">
              {formatGhs(totalRevenue)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#00CED1] font-semibold mt-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>{timeRange} Period • {totalOrders} Tickets</span>
            </div>
          </div>

          {/* Card 2: Mobile Money (MTN / Telecel) Share */}
          <div className={`p-4 rounded-2xl border transition ${
            isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A99A8]">MoMo Digital Push</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-amber-400">
              {formatGhs(totalMomo)}
            </div>
            <div className="text-[10px] text-[#8A99A8] font-mono mt-1">
              <strong className="text-amber-400 font-bold">{momoSharePct}%</strong> tender penetration
            </div>
          </div>

          {/* Card 3: Physical Cash Reconciled */}
          <div className={`p-4 rounded-2xl border transition ${
            isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A99A8]">Physical Cash Till</span>
              <div className="w-7 h-7 rounded-lg bg-stone-500/10 text-stone-300 dark:text-stone-300 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-stone-900 dark:text-stone-100">
              {formatGhs(totalCash)}
            </div>
            <div className="text-[10px] text-[#8A99A8] font-mono mt-1">
              Verified in shift Z-reports
            </div>
          </div>

          {/* Card 4: GRA Fiscal Tax Liability */}
          <div className={`p-4 rounded-2xl border transition ${
            isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A99A8]">GRA Levies & VAT</span>
              <div className="w-7 h-7 rounded-lg bg-amber-600/10 text-amber-500 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-amber-500 dark:text-amber-400">
              {formatGhs(totalTax)}
            </div>
            <div className="text-[10px] text-[#8A99A8] font-mono mt-1">
              NHIL, GETFund, COVID & VAT
            </div>
          </div>

        </div>

        {/* Row 2: Recharts Visualizations Grid (Revenue Trend Line Chart + Category Pie Chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* LEFT: REVENUE TREND LINE CHART WITH DAILY SUMMARY SECTION (7 Cols) */}
          <div className={`lg:col-span-7 rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition ${
            isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'
          }`}>
            <div>
              {/* Header of Chart Card */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className={`font-bold text-sm tracking-tight flex items-center gap-2 ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>
                      {selectedDrillDay
                        ? `Drill-Down: ${selectedDrillDay.day} Hourly Velocity (GH₵)`
                        : `${timeRange} Revenue Trend & Tender Velocity (GH₵)`}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#8A99A8]">
                    {selectedDrillDay
                      ? `Inspecting granular hourly trading volume and till shift reconciliations for ${selectedDrillDay.day}`
                      : 'Comparing gross sales against Mobile Money and cash velocities (Click any day to drill down)'}
                  </p>
                </div>

                {/* Drill Down Back Button if active */}
                {selectedDrillDay ? (
                  <button
                    type="button"
                    onClick={() => setSelectedDrillDay(null)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to 7-Day Trend</span>
                  </button>
                ) : (
                  <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                      <span className="text-[11px] text-[#8A99A8]">Gross Sales</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
                      <span className="text-[11px] text-[#8A99A8]">MoMo Push</span>
                    </span>
                  </div>
                )}
              </div>

              {/* ============================================================== */}
              {/* SUMMARY SECTION AT THE TOP OF THE CHART:                      */}
              {/* 'Total Daily Sales' • 'Total Refunds' • 'Cashier Net Variance' */}
              {/* ============================================================== */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
                
                {/* 1. Total Daily Sales */}
                <div className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  isDark ? 'bg-[#090B0E]/80 border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'
                }`}>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#8A99A8] block">
                      Total Daily Sales {selectedDrillDay ? `(${selectedDrillDay.day.split(',')[0]})` : '(Today)'}
                    </span>
                    <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                      {formatGhs(currentDailySales)}
                    </div>
                    <span className="text-[10px] text-[#8A99A8] font-mono">
                      {currentDayOrders} completed tickets
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>

                {/* 2. Total Refunds */}
                <div className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  isDark ? 'bg-[#090B0E]/80 border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'
                }`}>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#8A99A8] block">
                      Total Refunds
                    </span>
                    <div className="text-base font-black font-mono text-rose-400 mt-0.5">
                      {formatGhs(currentDayRefunds)}
                    </div>
                    <span className="text-[10px] text-[#8A99A8] font-mono">
                      {currentDayRefundCount} supervisor refunds
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                </div>

                {/* 3. Cashier Net Variance */}
                <div className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  isDark ? 'bg-[#090B0E]/80 border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'
                }`}>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#8A99A8] block">
                      Cashier Net Variance
                    </span>
                    <div className={`text-base font-black font-mono mt-0.5 ${
                      currentDayVariance > 0
                        ? 'text-emerald-400'
                        : currentDayVariance < 0
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}>
                      {currentDayVariance > 0 ? `+${formatGhs(currentDayVariance)}` : formatGhs(currentDayVariance)}
                    </div>
                    <span className="text-[10px] text-[#8A99A8] font-mono">
                      {currentDayVariance === 0
                        ? 'Tills 100% Balanced'
                        : currentDayVariance > 0
                        ? 'Counted Surplus'
                        : 'Till Shortage'}
                    </span>
                  </div>
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                    currentDayVariance >= 0
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    <Scale className="w-4 h-4" />
                  </div>
                </div>

              </div>

              {/* Interactive Trend Drill-Down Selector Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2">
                <span className="text-[10px] font-mono text-[#8A99A8] shrink-0">Select Day:</span>
                {activeDataset.map(dayRow => {
                  const isSelected = selectedDrillDay?.dateKey === dayRow.dateKey;
                  return (
                    <button
                      key={dayRow.dateKey}
                      type="button"
                      onClick={() => handleSelectDrillDay(dayRow)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition shrink-0 flex items-center gap-1 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : isDark
                          ? 'bg-[#090B0E] border border-[#242D37] text-slate-300 hover:border-amber-500/50'
                          : 'bg-white border border-[#E2E5E9] text-slate-700 hover:border-amber-500'
                      }`}
                      title={`Click to drill down into ${dayRow.day}`}
                    >
                      <span>{dayRow.day.split(',')[0]}</span>
                      {dayRow.cashierVariance !== 0 && (
                        <span className={`w-1.5 h-1.5 rounded-full ${dayRow.cashierVariance > 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CHART VIEW: Either Hourly Drill-Down Chart OR Macro Trend Chart */}
            <div className="w-full h-[240px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                {selectedDrillDay ? (
                  /* HOURLY DRILL-DOWN CHART */
                  <LineChart
                    data={selectedDrillDay.hourlyData}
                    margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#242D37' : '#E2E5E9'}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="hour"
                      stroke={isDark ? '#8A99A8' : '#64748B'}
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: isDark ? '#242D37' : '#E2E5E9' }}
                    />
                    <YAxis
                      stroke={isDark ? '#8A99A8' : '#64748B'}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val: number) => `GH₵${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                    />
                    <Tooltip content={<CustomHourlyTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Hourly Sales"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: isDark ? '#11151A' : '#FFFFFF' }}
                      activeDot={{ r: 6, fill: '#34D399' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="momo"
                      name="MoMo Volume"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={{ r: 3, fill: '#F59E0B' }}
                    />
                  </LineChart>
                ) : (
                  /* MACRO 7-DAY TREND CHART WITH INTERACTIVE CLICK DRILL-DOWN */
                  <LineChart
                    data={activeDataset}
                    margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length) {
                        handleSelectDrillDay(e.activePayload[0].payload as DayDrillDownData);
                      }
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#242D37' : '#E2E5E9'}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      stroke={isDark ? '#8A99A8' : '#64748B'}
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: isDark ? '#242D37' : '#E2E5E9' }}
                      tickFormatter={(val: string) => val.split(',')[0]}
                    />
                    <YAxis
                      stroke={isDark ? '#8A99A8' : '#64748B'}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val: number) => `GH₵${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip content={<CustomLineTooltip />} />
                    <Legend wrapperStyle={{ display: 'none' }} />

                    {/* Primary Total Revenue Line */}
                    {(tenderChannel === 'ALL' || tenderChannel === 'CASH') && (
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Gross Sales"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: isDark ? '#11151A' : '#FFFFFF' }}
                        activeDot={{ r: 7, fill: '#34D399' }}
                      />
                    )}

                    {/* MoMo Trend Line */}
                    {(tenderChannel === 'ALL' || tenderChannel === 'MOMO') && (
                      <Line
                        type="monotone"
                        dataKey="momoMtn"
                        name="MoMo Volume"
                        stroke="#F59E0B"
                        strokeWidth={2.5}
                        strokeDasharray={tenderChannel === 'ALL' ? '4 4' : undefined}
                        dot={{ r: 3, fill: '#F59E0B', strokeWidth: 1, stroke: isDark ? '#11151A' : '#FFFFFF' }}
                        activeDot={{ r: 6, fill: '#FBBF24' }}
                      />
                    )}

                    {/* Cash Line */}
                    {tenderChannel === 'CASH' && (
                      <Line
                        type="monotone"
                        dataKey="cash"
                        name="Physical Cash"
                        stroke="#A1A1AA"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#A1A1AA' }}
                      />
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* DRILL-DOWN SUB-PANELS: Cashier Shifts Reconciliation & Top Products on that Day */}
            {selectedDrillDay ? (
              <div className="mt-3 pt-3 border-t border-[#242D37]/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold flex items-center gap-1.5 text-amber-400">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Cashier Shifts Audited on {selectedDrillDay.day}</span>
                  </span>
                  <span className="font-mono text-[10px] text-[#8A99A8]">
                    Net Variance: <strong className={selectedDrillDay.cashierVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {selectedDrillDay.cashierVariance >= 0 ? `+${formatGhs(selectedDrillDay.cashierVariance)}` : formatGhs(selectedDrillDay.cashierVariance)}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {selectedDrillDay.cashierShifts.map(shift => (
                    <div
                      key={shift.shiftNumber}
                      className={`p-2 rounded-xl border flex items-center justify-between ${
                        isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'
                      }`}
                    >
                      <div>
                        <div className="font-bold font-sans text-white">{shift.cashierName}</div>
                        <div className="text-[10px] text-[#8A99A8]">
                          {shift.shiftNumber} • Float: {formatGhs(shift.openingFloat)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-emerald-400">{formatGhs(shift.cashSales + shift.momoSales)}</div>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          shift.variance === 0
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : shift.variance > 0
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {shift.variance === 0 ? 'Balanced' : shift.variance > 0 ? `+${formatGhs(shift.variance)}` : formatGhs(shift.variance)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
                isDark ? 'border-[#242D37]/50 text-[#8A99A8]' : 'border-[#E2E5E9] text-slate-500'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Average Daily Revenue: <strong>{formatGhs(totalRevenue / activeDataset.length)}</strong></span>
                </div>
                <span className="font-mono text-[11px] text-amber-400 font-semibold cursor-pointer">
                  Click point on chart to drill down ⚡
                </span>
              </div>
            )}
          </div>

          {/* RIGHT: SALES DISTRIBUTION BY CATEGORY PIE CHART (5 Cols) */}
          <div className={`lg:col-span-5 rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition ${
            isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`font-bold text-sm tracking-tight flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  <PieIcon className="w-4 h-4 text-amber-500" />
                  <span>Sales by Category</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                  {activeCategoryData.length} Active Segments
                </span>
              </div>
              <p className="text-[11px] text-[#8A99A8] mb-3">
                {selectedDrillDay
                  ? `Category contribution for ${selectedDrillDay.day}`
                  : 'Distribution across FMCG, provisions, and cold-store goods'}
              </p>
            </div>

            {/* Recharts PieChart Container */}
            <div className="w-full h-[200px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {activeCategoryData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        stroke={isDark ? '#11151A' : '#FFFFFF'}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-[#8A99A8] font-mono uppercase tracking-wider">Top Share</span>
                <span className="text-xs font-black text-emerald-400 font-mono">
                  {activeCategoryData[0]?.name ? activeCategoryData[0].name.split(' ')[0] : 'Provisions'}
                </span>
              </div>
            </div>

            {/* Category Breakdown Legend List */}
            <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {activeCategoryData.map((item, idx) => {
                const total = activeCategoryData.reduce((s, c) => s + c.value, 0);
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

                return (
                  <div
                    key={item.name}
                    onClick={() => setSelectedCategory(selectedCategory === item.name ? 'ALL' : item.name)}
                    className={`flex items-center justify-between p-1.5 rounded-xl text-xs transition cursor-pointer ${
                      selectedCategory === item.name
                        ? isDark ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-amber-50 border border-amber-300'
                        : isDark ? 'hover:bg-[#1A2027]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                      <span className="truncate font-medium">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono shrink-0">
                      <span className="font-bold">{formatGhs(item.value)}</span>
                      <span className="text-[10px] text-[#8A99A8] w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Row 3: Bottom Summary Banner with Quick Actions */}
        <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark ? 'bg-[#11151A] border-[#242D37] text-[#8A99A8]' : 'bg-white border-[#E2E5E9] text-slate-600'
        }`}>
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Bank of Ghana & GRA Verified Settlement: Mobile Money funds auto-settle daily via Hubtel/Zeepay gateway into Stanbic Bank Ghana Ltd.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-semibold flex items-center gap-1.5 transition text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV Data</span>
            </button>
            <button
              type="button"
              onClick={handleOpenPdfPreview}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 flex items-center gap-1.5 transition text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Executive Summary</span>
            </button>
          </div>
        </div>

      </div>

      {/* DOWNLOAD PDF / PRINTABLE EXECUTIVE AUDIT MODAL */}
      {showPdfPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
          <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition ${
            isDark ? 'bg-[#11151A] border-[#242D37] text-[#F4F6F8]' : 'bg-white border-[#E2E5E9] text-[#0F172A]'
          }`}>
            
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-[#242D37] bg-[#1A2027]' : 'border-[#E2E5E9] bg-slate-50'
            }`}>
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Executive Financial Summary & GRA Audit PDF</h3>
                  <p className="text-[11px] text-[#8A99A8]">
                    Generated for {selectedBranch === 'ALL_BRANCHES' ? 'Consolidated Network' : branchName} • {selectedDrillDay ? `Drill-Down: ${selectedDrillDay.day}` : `Period: ${timeRange}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfPreviewModal(false)}
                  className={`p-1.5 rounded-xl border transition ${
                    isDark ? 'border-[#242D37] text-slate-400 hover:text-white' : 'border-[#E2E5E9] text-slate-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-sans print:p-0">
              
              {/* Document Letterhead */}
              <div className="border-b border-[#242D37]/60 pb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-emerald-500">
                    AKWAABA RETAIL OS • FINANCIAL AUDIT
                  </h1>
                  <p className="text-[#8A99A8] mt-0.5 font-mono text-[11px]">
                    Ghana Revenue Authority (GRA) E-VAT Certified & Bank of Ghana MoMo Reconciliation
                  </p>
                  <div className="mt-2 text-[11px] text-[#8A99A8]">
                    <span>Store: <strong>{branchName}</strong></span> • <span>Node ID: <strong>ACC-STORE-01</strong></span>
                  </div>
                </div>

                <div className="text-right text-[11px] font-mono text-[#8A99A8]">
                  <div>Date: <strong>{new Date().toLocaleDateString('en-GB')}</strong></div>
                  <div>Report Ref: <strong>AUD-{Date.now().toString().slice(-6)}</strong></div>
                  <div className="mt-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold inline-block">
                    COMPLIANT
                  </div>
                </div>
              </div>

              {/* Daily Summary Strip in Document */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'}`}>
                  <span className="text-[10px] text-[#8A99A8] uppercase block">Total Daily Sales ({activeDayTarget.day})</span>
                  <div className="text-base font-black font-mono text-emerald-400">{formatGhs(currentDailySales)}</div>
                  <span className="text-[10px] text-[#8A99A8] font-mono">{currentDayOrders} transactions</span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'}`}>
                  <span className="text-[10px] text-[#8A99A8] uppercase block">Total Refunds</span>
                  <div className="text-base font-black font-mono text-rose-400">{formatGhs(currentDayRefunds)}</div>
                  <span className="text-[10px] text-[#8A99A8] font-mono">{currentDayRefundCount} authorized tickets</span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'}`}>
                  <span className="text-[10px] text-[#8A99A8] uppercase block">Cashier Net Variance</span>
                  <div className={`text-base font-black font-mono ${currentDayVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {currentDayVariance >= 0 ? `+${formatGhs(currentDayVariance)}` : formatGhs(currentDayVariance)}
                  </div>
                  <span className="text-[10px] text-[#8A99A8] font-mono">{currentDayVariance >= 0 ? 'Audited Surplus' : 'Audited Shortage'}</span>
                </div>
              </div>

              {/* Daily Periodic Breakdown Table */}
              <div>
                <h4 className="font-bold text-xs uppercase font-mono tracking-wider mb-2 text-[#8A99A8]">
                  Daily Periodic Revenue Audit Table
                </h4>
                <div className={`rounded-xl border overflow-hidden ${
                  isDark ? 'border-[#242D37]' : 'border-[#E2E5E9]'
                }`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`text-[10px] font-mono uppercase border-b ${
                      isDark ? 'bg-white/[0.02] text-[#8A99A8] border-[#242D37]' : 'bg-slate-50 text-[#64748B] border-[#E2E5E9]'
                    }`}>
                      <tr>
                        <th className="p-2.5">Date / Period</th>
                        <th className="p-2.5 text-right">Gross Sales</th>
                        <th className="p-2.5 text-right">MoMo Push</th>
                        <th className="p-2.5 text-right">Cash Received</th>
                        <th className="p-2.5 text-right">Refunds</th>
                        <th className="p-2.5 text-right">Variance</th>
                        <th className="p-2.5 text-center">Tickets</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#242D37]/30 font-mono text-[11px]">
                      {activeDataset.map(row => (
                        <tr key={row.day} className="hover:bg-white/[0.01]">
                          <td className="p-2.5 font-bold font-sans">{row.day}</td>
                          <td className="p-2.5 text-right font-bold text-amber-500">{formatGhs(row.revenue)}</td>
                          <td className="p-2.5 text-right text-amber-400">{formatGhs(row.momoMtn + row.momoTelecel)}</td>
                          <td className="p-2.5 text-right font-mono text-stone-700 dark:text-stone-300">{formatGhs(row.cash)}</td>
                          <td className="p-2.5 text-right text-rose-400">{formatGhs(row.refunds)}</td>
                          <td className={`p-2.5 text-right font-bold ${row.cashierVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {row.cashierVariance >= 0 ? `+${formatGhs(row.cashierVariance)}` : formatGhs(row.cashierVariance)}
                          </td>
                          <td className="p-2.5 text-center">{row.orders}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signoff & Certification Lines */}
              <div className="pt-4 border-t border-[#242D37]/60 grid grid-cols-2 gap-8 text-[11px]">
                <div>
                  <span className="text-[#8A99A8] block mb-6">Prepared by / Branch Manager Sign-Off:</span>
                  <div className="border-b border-[#242D37] w-48"></div>
                  <span className="text-[10px] text-[#8A99A8] font-mono mt-1 block">Abena Osei • ID: USR-MGR-02</span>
                </div>
                <div className="text-right">
                  <span className="text-[#8A99A8] block mb-6">Internal Auditor / GRA Tax Inspector:</span>
                  <div className="border-b border-[#242D37] w-48 ml-auto"></div>
                  <span className="text-[10px] text-[#8A99A8] font-mono mt-1 block">Akosua Addo • Cert #GRA-2026-901</span>
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className={`p-4 border-t flex items-center justify-between shrink-0 ${
              isDark ? 'border-[#242D37] bg-[#1A2027]' : 'border-[#E2E5E9] bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={handleExportCSV}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                  isDark ? 'border-[#242D37] text-emerald-400 hover:bg-[#242D37]' : 'border-[#E2E5E9] text-emerald-700 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Corresponding CSV</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPdfPreviewModal(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold ${
                    isDark ? 'border-[#242D37] text-[#8A99A8]' : 'border-[#E2E5E9] text-slate-600'
                  }`}
                >
                  Close Preview
                </button>
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
