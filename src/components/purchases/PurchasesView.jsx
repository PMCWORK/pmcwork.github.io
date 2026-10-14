import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Chip,
  Tooltip,
  Pagination
} from '@heroui/react';
import {
  ShoppingCart,
  Building2,
  Plus,
  CreditCard,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  Eye,
  FileText,
  DollarSign,
  Phone,
  MapPin
} from 'lucide-react';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../context/DialogContext';
import PurchaseModal from './PurchaseModal';
import PurchaseInvoiceViewModal from './PurchaseInvoiceViewModal';
import SupplierShopModal from './SupplierShopModal';
import ShopLedgerModal from './ShopLedgerModal';
import PurchasePaymentModal from './PurchasePaymentModal';
import { computeShopBalances } from '../../utils/purchaseHelpers';
import { formatMoney, formatDateLabel, dhakaNow, toISODate } from '../../utils/calculations';

export default function PurchasesView({ showToast }) {
  const { user } = useAuth();
  const { purchases = [], supplierShops = [], purchasePayments = [], syncAllData } = useData();
  const { appConfirm } = useDialog();

  const today = dhakaNow();
  const todayISO = toISODate(today);
  const currentYear = String(today.getFullYear());
  const currentMonth = todayISO.slice(0, 7);

  // Active sub-tab
  const [subTab, setSubTab] = useState('purchases'); // 'purchases' or 'shops'

  // Purchases list filters
  const [purPeriodMode, setPurPeriodMode] = useState('any');
  const [purFilterMonth, setPurFilterMonth] = useState(currentMonth);
  const [purFilterYear, setPurFilterYear] = useState(currentYear);
  const [purFilterFrom, setPurFilterFrom] = useState('');
  const [purFilterTo, setPurFilterTo] = useState('');
  const [purFilterShop, setPurFilterShop] = useState('');
  const [purFilterStatus, setPurFilterStatus] = useState('all'); // 'all', 'paid', 'partial', 'due'
  const [purSortOrder, setPurSortOrder] = useState('newest');
  const [purSearchQuery, setPurSearchQuery] = useState('');

  // Supplier shops filters
  const [shopSortOrder, setShopSortOrder] = useState('due-high');
  const [shopSearchQuery, setShopSearchQuery] = useState('');

  // Pagination state
  const [purPage, setPurPage] = useState(1);
  const rowsPerPage = 15;

  // Modals state
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState(null);

  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState(null);

  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerShop, setLedgerShop] = useState(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentShopName, setPaymentShopName] = useState('');

  // Top summary calculations
  const summary = useMemo(() => {
    const totalPurchasesSum = purchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const totalPaidPurchases = purchases.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
    const totalPaidVouchers = purchasePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalPaidSum = totalPaidPurchases + totalPaidVouchers;
    const totalDueSum = Math.max(0, totalPurchasesSum - totalPaidSum);

    // Count suppliers with due
    let suppliersWithDueCount = 0;
    supplierShops.forEach(s => {
      const b = computeShopBalances(purchases, purchasePayments, s.name);
      if (b.due > 0) suppliersWithDueCount++;
    });

    return {
      totalPurchasesSum,
      purchasesCount: purchases.length,
      totalPaidSum,
      totalDueSum,
      suppliersWithDueCount,
      shopsCount: supplierShops.length
    };
  }, [purchases, purchasePayments, supplierShops]);

  // Available years from purchases
  const availableYears = useMemo(() => {
    const yearsSet = new Set([currentYear]);
    purchases.forEach(p => {
      if (p.date && p.date.length >= 4) {
        yearsSet.add(p.date.slice(0, 4));
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [purchases, currentYear]);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      // 1. Shop Filter
      if (purFilterShop && (p.shop || '').toLowerCase() !== purFilterShop.toLowerCase()) {
        return false;
      }

      // 2. Status Filter
      const bill = Number(p.totalAmount) || 0;
      const paid = Number(p.paidAmount) || 0;
      const due = Math.max(0, bill - paid);

      if (purFilterStatus === 'paid' && due > 0) return false;
      if (purFilterStatus === 'partial' && (paid === 0 || due === 0)) return false;
      if (purFilterStatus === 'due' && due === 0) return false;

      // 3. Period Filter
      if (purPeriodMode !== 'any') {
        const iso = p.date || '';
        if (!iso) return false;

        if (purPeriodMode === 'month') {
          if (purFilterMonth && !iso.startsWith(purFilterMonth)) return false;
        } else if (purPeriodMode === 'year') {
          if (purFilterYear && !iso.startsWith(purFilterYear)) return false;
        } else if (purPeriodMode === 'range') {
          const from = purFilterFrom || '0000-01-01';
          const to = purFilterTo || '9999-12-31';
          if (iso < from || iso > to) return false;
        }
      }

      // 4. Search Query
      if (purSearchQuery.trim()) {
        const q = purSearchQuery.toLowerCase();
        const invStr = (p.invoiceNum || p.number || '').toLowerCase();
        const shopStr = (p.shop || '').toLowerCase();
        const notesStr = (p.notes || '').toLowerCase();
        const itemsStr = (p.items || []).map(it => it.desc || '').join(' ').toLowerCase();
        if (!invStr.includes(q) && !shopStr.includes(q) && !notesStr.includes(q) && !itemsStr.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [
    purchases,
    purFilterShop,
    purFilterStatus,
    purPeriodMode,
    purFilterMonth,
    purFilterYear,
    purFilterFrom,
    purFilterTo,
    purSearchQuery
  ]);

  // Sorted purchases
  const sortedPurchases = useMemo(() => {
    return [...filteredPurchases].sort((a, b) => {
      if (purSortOrder === 'oldest') {
        return (a.date || '').localeCompare(b.date || '');
      } else if (purSortOrder === 'bill-high') {
        return (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0);
      } else if (purSortOrder === 'bill-low') {
        return (Number(a.totalAmount) || 0) - (Number(b.totalAmount) || 0);
      } else if (purSortOrder === 'due-high') {
        const aDue = (Number(a.totalAmount) || 0) - (Number(a.paidAmount) || 0);
        const bDue = (Number(b.totalAmount) || 0) - (Number(b.paidAmount) || 0);
        return bDue - aDue;
      } else if (purSortOrder === 'paid-high') {
        return (Number(b.paidAmount) || 0) - (Number(a.paidAmount) || 0);
      } else if (purSortOrder === 'shop') {
        return (a.shop || '').localeCompare(b.shop || '');
      } else {
        // Default newest first
        return (b.date || '').localeCompare(a.date || '');
      }
    });
  }, [filteredPurchases, purSortOrder]);

  // Paginated purchases
  const paginatedPurchases = useMemo(() => {
    const start = (purPage - 1) * rowsPerPage;
    return sortedPurchases.slice(start, start + rowsPerPage);
  }, [sortedPurchases, purPage, rowsPerPage]);

  const totalPurPages = Math.ceil(sortedPurchases.length / rowsPerPage) || 1;

  // Filtered & sorted supplier shops
  const filteredShops = useMemo(() => {
    let list = supplierShops.map(s => {
      const balance = computeShopBalances(purchases, purchasePayments, s.name);
      return {
        ...s,
        ...balance
      };
    });

    if (shopSearchQuery.trim()) {
      const q = shopSearchQuery.toLowerCase();
      list = list.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q) ||
        (s.contactPerson || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (shopSortOrder === 'due-low') {
        return a.due - b.due;
      } else if (shopSortOrder === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (shopSortOrder === 'bought-high') {
        return b.totalBought - a.totalBought;
      } else {
        // Default due-high
        return b.due - a.due;
      }
    });

    return list;
  }, [supplierShops, purchases, purchasePayments, shopSearchQuery, shopSortOrder]);

  // Reset filters
  const handleResetPurFilters = () => {
    setPurPeriodMode('any');
    setPurFilterMonth(currentMonth);
    setPurFilterYear(currentYear);
    setPurFilterFrom('');
    setPurFilterTo('');
    setPurFilterShop('');
    setPurFilterStatus('all');
    setPurSortOrder('newest');
    setPurSearchQuery('');
    setPurPage(1);
    showToast?.('Purchases filters reset');
  };

  // Delete purchase invoice
  const handleDeletePurchase = async (p) => {
    if (!firebaseReady || !db) {
      showToast?.('Firebase offline / unconfigured');
      return;
    }

    const confirmed = await appConfirm({
      title: 'Delete Purchase Invoice',
      message: `Delete purchase bill from ${p.shop} (${formatMoney(p.totalAmount)})? This action cannot be undone.`,
      confirmText: 'Delete',
      danger: true
    });

    if (!confirmed) return;

    try {
      await db.collection('purchases').doc(p.id).delete();
      await logAudit('purchase', p.id, 'delete', p, null, user);
      syncAllData?.();
      showToast?.('Purchase invoice deleted');
    } catch (err) {
      console.error(err);
      showToast?.('Failed to delete purchase invoice');
    }
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* Top Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardBody className="p-3 sm:p-3.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-default-400">
              Total purchases
            </span>
            <div className="text-lg sm:text-xl font-bold font-numeric text-foreground mt-0.5">
              {formatMoney(summary.totalPurchasesSum)}
            </div>
            <span className="text-[11px] text-default-400 mt-0.5">
              {summary.purchasesCount} bills recorded
            </span>
          </CardBody>
        </Card>

        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardBody className="p-3 sm:p-3.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Total paid
            </span>
            <div className="text-lg sm:text-xl font-bold font-numeric text-teal-600 dark:text-teal-400 mt-0.5">
              {formatMoney(summary.totalPaidSum)}
            </div>
            <span className="text-[11px] text-default-400 mt-0.5">
              Purchases + payment vouchers
            </span>
          </CardBody>
        </Card>

        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardBody className="p-3 sm:p-3.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-danger-500">
              Outstanding due
            </span>
            <div className="text-lg sm:text-xl font-bold font-numeric text-danger-500 mt-0.5">
              {formatMoney(summary.totalDueSum)}
            </div>
            <span className="text-[11px] text-danger-500/80 font-medium mt-0.5">
              {summary.suppliersWithDueCount} suppliers with balance
            </span>
          </CardBody>
        </Card>

        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardBody className="p-3 sm:p-3.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary">
              Registered shops
            </span>
            <div className="text-lg sm:text-xl font-bold font-numeric text-primary mt-0.5">
              {summary.shopsCount}
            </div>
            <span className="text-[11px] text-default-400 mt-0.5">
              Active supplier network
            </span>
          </CardBody>
        </Card>
      </div>

      {/* Main Container */}
      <Card className="border border-default-200/70 bg-content1 shadow-sm">
        <CardHeader className="flex flex-col gap-3 px-5 pt-3.5 pb-2">
          {/* Top Title & Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-display text-foreground m-0">
                  Purchases & Ledgers
                </h1>
                <p className="text-xs text-default-400 m-0">
                  Supplier purchase orders, running due ledgers, and payment vouchers.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <Button
                variant="bordered"
                size="sm"
                onPress={() => {
                  setEditingShop(null);
                  setIsShopModalOpen(true);
                }}
                startContent={<Building2 className="w-3.5 h-3.5" />}
                className="text-xs font-semibold"
              >
                + Supplier Shop
              </Button>

              <Button
                variant="flat"
                color="success"
                size="sm"
                onPress={() => {
                  setPaymentShopName('');
                  setIsPaymentModalOpen(true);
                }}
                startContent={<CreditCard className="w-3.5 h-3.5 text-success-600" />}
                className="text-xs font-semibold text-success-600"
              >
                Pay Due
              </Button>

              <Button
                color="primary"
                size="sm"
                onPress={() => {
                  setEditingPurchase(null);
                  setIsPurchaseModalOpen(true);
                }}
                startContent={<Plus className="w-4 h-4" />}
                className="font-bold text-xs shadow-sm"
              >
                Record Purchase
              </Button>
            </div>
          </div>

          {/* Sub-Tabs Switcher */}
          <div className="w-full pt-1 border-b border-default-100">
            <Tabs
              selectedKey={subTab}
              onSelectionChange={setSubTab}
              size="sm"
              color="primary"
              variant="underlined"
              classNames={{
                tabList: "gap-6 p-0",
                cursor: "w-full bg-primary"
              }}
            >
              <Tab
                key="purchases"
                title={
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>All Purchases</span>
                    <Chip size="sm" variant="flat" className="h-5 px-1.5 text-[10px]">
                      {purchases.length}
                    </Chip>
                  </div>
                }
              />
              <Tab
                key="shops"
                title={
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Supplier Shops & Ledgers</span>
                    <Chip size="sm" variant="flat" className="h-5 px-1.5 text-[10px]">
                      {supplierShops.length}
                    </Chip>
                  </div>
                }
              />
            </Tabs>
          </div>
        </CardHeader>

        <CardBody className="px-6 py-4">
          {/* TAB 1: ALL PURCHASES LIST */}
          {subTab === 'purchases' && (
            <div className="space-y-4">
              {/* Filter Toolbar Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 w-full items-end">
                {/* 1. Status Filter */}
                <div className="col-span-1">
                  <Select
                    size="sm"
                    radius="sm"
                    disableAnimation
                    label="Status"
                    labelPlacement="outside"
                    variant="bordered"
                    selectedKeys={new Set([purFilterStatus])}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      if (val) {
                        setPurFilterStatus(String(val));
                        setPurPage(1);
                      }
                    }}
                    classNames={{ trigger: "h-9 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
                    popoverProps={{
                      disableAnimation: true,
                      classNames: {
                        content: "p-1 rounded-xl shadow-lg border border-default-200/70 dark:border-default-100/20 bg-content1"
                      }
                    }}
                  >
                    <SelectItem key="all" textValue="All status">All status</SelectItem>
                    <SelectItem key="paid" textValue="Fully Paid">Fully Paid</SelectItem>
                    <SelectItem key="partial" textValue="Partial Due">Partial Due</SelectItem>
                    <SelectItem key="due" textValue="Unpaid Due">Unpaid Due</SelectItem>
                  </Select>
                </div>

                {/* 2. Shop Filter */}
                <div className="col-span-1">
                  <Select
                    size="sm"
                    radius="sm"
                    disableAnimation
                    label="Shop"
                    labelPlacement="outside"
                    variant="bordered"
                    selectedKeys={new Set([purFilterShop || 'all_shops'])}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      setPurFilterShop(val === 'all_shops' ? '' : String(val));
                      setPurPage(1);
                    }}
                    classNames={{ trigger: "h-9 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
                    popoverProps={{
                      disableAnimation: true,
                      classNames: {
                        content: "p-1 rounded-xl shadow-lg border border-default-200/70 dark:border-default-100/20 bg-content1"
                      }
                    }}
                  >
                    <SelectItem key="all_shops" textValue="All shops">All shops</SelectItem>
                    {supplierShops.map(s => (
                      <SelectItem key={s.name} textValue={s.name}>{s.name}</SelectItem>
                    ))}
                  </Select>
                </div>

                {/* 3. Period Mode */}
                <div className="col-span-1">
                  <Select
                    size="sm"
                    radius="sm"
                    disableAnimation
                    label="Period"
                    labelPlacement="outside"
                    variant="bordered"
                    selectedKeys={new Set([purPeriodMode])}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      if (val) {
                        setPurPeriodMode(String(val));
                        setPurPage(1);
                      }
                    }}
                    classNames={{ trigger: "h-9 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
                    popoverProps={{
                      disableAnimation: true,
                      classNames: {
                        content: "p-1 rounded-xl shadow-lg border border-default-200/70 dark:border-default-100/20 bg-content1"
                      }
                    }}
                  >
                    <SelectItem key="any" textValue="All time">All time</SelectItem>
                    <SelectItem key="month" textValue="Month">Month</SelectItem>
                    <SelectItem key="year" textValue="Year">Year</SelectItem>
                    <SelectItem key="range" textValue="Date Range">Date Range</SelectItem>
                  </Select>
                </div>

                {/* Dynamic Period Inputs */}
                {purPeriodMode === 'month' && (
                  <div className="col-span-1">
                    <Input
                      type="month"
                      size="sm"
                      label="Select Month"
                      labelPlacement="outside"
                      variant="bordered"
                      value={purFilterMonth}
                      onChange={(e) => {
                        setPurFilterMonth(e.target.value);
                        setPurPage(1);
                      }}
                      classNames={{ inputWrapper: "h-10 border-default-300" }}
                    />
                  </div>
                )}

                {purPeriodMode === 'year' && (
                  <div className="col-span-1">
                    <Select
                      size="sm"
                      label="Select Year"
                      labelPlacement="outside"
                      variant="bordered"
                      selectedKeys={new Set([purFilterYear])}
                      onSelectionChange={(keys) => {
                        const val = Array.from(keys)[0];
                        if (val) {
                          setPurFilterYear(String(val));
                          setPurPage(1);
                        }
                      }}
                      classNames={{ trigger: "h-10 border-default-300" }}
                    >
                      {availableYears.map(y => (
                        <SelectItem key={y} textValue={y}>{y}</SelectItem>
                      ))}
                    </Select>
                  </div>
                )}

                {purPeriodMode === 'range' && (
                  <>
                    <div className="col-span-1">
                      <Input
                        type="date"
                        size="sm"
                        label="From"
                        labelPlacement="outside"
                        variant="bordered"
                        value={purFilterFrom}
                        onChange={(e) => {
                          setPurFilterFrom(e.target.value);
                          setPurPage(1);
                        }}
                        classNames={{ inputWrapper: "h-10 border-default-300" }}
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="date"
                        size="sm"
                        label="To"
                        labelPlacement="outside"
                        variant="bordered"
                        value={purFilterTo}
                        onChange={(e) => {
                          setPurFilterTo(e.target.value);
                          setPurPage(1);
                        }}
                        classNames={{ inputWrapper: "h-10 border-default-300" }}
                      />
                    </div>
                  </>
                )}

                {/* 4. Sort Order */}
                <div className="col-span-1 sm:col-span-2">
                  <Select
                    size="sm"
                    radius="sm"
                    disableAnimation
                    label="Sort Order"
                    labelPlacement="outside"
                    variant="bordered"
                    selectedKeys={new Set([purSortOrder])}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      if (val) setPurSortOrder(String(val));
                    }}
                    classNames={{ trigger: "h-9 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
                    popoverProps={{
                      disableAnimation: true,
                      classNames: {
                        content: "p-1 rounded-xl shadow-lg border border-default-200/70 dark:border-default-100/20 bg-content1"
                      }
                    }}
                  >
                    <SelectItem key="newest" textValue="Newest first">Newest first</SelectItem>
                    <SelectItem key="oldest" textValue="Oldest first">Oldest first</SelectItem>
                    <SelectItem key="bill-high" textValue="Bill: High → Low">Bill: High → Low</SelectItem>
                    <SelectItem key="bill-low" textValue="Bill: Low → High">Bill: Low → High</SelectItem>
                    <SelectItem key="due-high" textValue="Due: High → Low">Due: High → Low</SelectItem>
                    <SelectItem key="paid-high" textValue="Paid: High → Low">Paid: High → Low</SelectItem>
                    <SelectItem key="shop" textValue="Shop (A → Z)">Shop (A → Z)</SelectItem>
                  </Select>
                </div>

                {/* 5. Live Search */}
                <div className="col-span-1 sm:col-span-2">
                  <Input
                    size="sm"
                    label="Search Purchases"
                    labelPlacement="outside"
                    placeholder="Search by Invoice #, item, shop, notes..."
                    variant="bordered"
                    value={purSearchQuery}
                    onChange={(e) => {
                      setPurSearchQuery(e.target.value);
                      setPurPage(1);
                    }}
                    startContent={<Search className="w-4 h-4 text-default-400" />}
                    classNames={{ inputWrapper: "h-10 border-default-300" }}
                  />
                </div>

                {/* Reset button */}
                <div className="col-span-1 flex items-center">
                  <Button
                    variant="flat"
                    size="sm"
                    onPress={handleResetPurFilters}
                    startContent={<RotateCcw className="w-3.5 h-3.5" />}
                    className="text-xs font-semibold h-10 w-full"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {/* Purchases List Table */}
              <div className="space-y-3 pt-2">
                {/* Header bar */}
                <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2.5 bg-default-100 rounded-xl text-xs font-bold uppercase tracking-wider text-default-600">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Shop</div>
                  <div className="col-span-3">Invoice # & Items</div>
                  <div className="col-span-2 text-right">Total Bill</div>
                  <div className="col-span-2 text-right">Paid / Due</div>
                  <div className="col-span-1 text-center">Actions</div>
                </div>

                {paginatedPurchases.length === 0 ? (
                  <div className="text-center py-12 px-4 border border-dashed border-default-200 rounded-2xl">
                    <ShoppingCart className="w-8 h-8 text-default-300 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-foreground">No purchase bills found</h3>
                    <p className="text-xs text-default-400 mt-1 max-w-sm mx-auto">
                      No purchase entries match your current filter criteria.
                    </p>
                  </div>
                ) : (
                  paginatedPurchases.map(p => {
                    const bill = Number(p.totalAmount) || 0;
                    const paid = Number(p.paidAmount) || 0;
                    const due = Math.max(0, bill - paid);
                    const items = Array.isArray(p.items) ? p.items : [];

                    return (
                      <div
                        key={p.id}
                        className={`grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 p-4 rounded-xl border transition-all duration-150 items-center ${
                          due === 0
                            ? 'border-success-500/30 bg-success-50/10 dark:bg-success-950/10'
                            : paid > 0
                            ? 'border-warning-500/30 bg-warning-50/10 dark:bg-warning-950/10'
                            : 'border-danger-500/30 bg-danger-50/10 dark:bg-danger-950/10'
                        }`}
                      >
                        {/* Col 1: Date */}
                        <div className="lg:col-span-2">
                          <div className="text-xs font-bold text-foreground">
                            {formatDateLabel(p.date)}
                          </div>
                          <div className="text-[11px] font-mono text-default-400">
                            {p.date}
                          </div>
                        </div>

                        {/* Col 2: Shop */}
                        <div className="lg:col-span-2">
                          <Chip size="sm" variant="flat" color="primary" className="text-xs font-semibold">
                            {p.shop || 'Unassigned'}
                          </Chip>
                        </div>

                        {/* Col 3: Invoice & Items */}
                        <div className="lg:col-span-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-primary">
                              #{p.invoiceNum || p.number || 'PUR-BILL'}
                            </span>
                            {items.length > 0 && (
                              <span className="text-[11px] text-default-400 font-medium">
                                ({items.length} items)
                              </span>
                            )}
                          </div>
                          {p.notes && (
                            <div className="text-xs text-default-400 truncate mt-0.5" title={p.notes}>
                              {p.notes}
                            </div>
                          )}
                        </div>

                        {/* Col 4: Total Bill */}
                        <div className="lg:col-span-2 lg:text-right font-numeric font-bold text-base text-foreground">
                          {formatMoney(bill)}
                        </div>

                        {/* Col 5: Paid / Due */}
                        <div className="lg:col-span-2 lg:text-right">
                          <div className="text-xs font-numeric font-bold text-teal-600 dark:text-teal-400">
                            Paid: {formatMoney(paid)}
                          </div>
                          {due > 0 ? (
                            <div className="text-xs font-numeric font-bold text-danger-500 mt-0.5">
                              Due: {formatMoney(due)}
                            </div>
                          ) : (
                            <Chip size="sm" variant="flat" color="success" className="text-[10px] h-5 mt-0.5 font-bold">
                              Settled
                            </Chip>
                          )}
                        </div>

                        {/* Col 6: Actions */}
                        <div className="lg:col-span-1 flex items-center justify-end lg:justify-center gap-1 border-t lg:border-t-0 border-default-100 pt-2 lg:pt-0">
                          <Tooltip content="View invoice">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => {
                                setViewingPurchase(p);
                                setIsViewModalOpen(true);
                              }}
                              className="w-7 h-7 min-w-7 text-default-500 hover:text-primary"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </Tooltip>

                          <Tooltip content="Edit invoice">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => {
                                setEditingPurchase(p);
                                setIsPurchaseModalOpen(true);
                              }}
                              className="w-7 h-7 min-w-7 text-default-500 hover:text-primary"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </Tooltip>

                          <Tooltip content="Delete invoice" color="danger">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              onPress={() => handleDeletePurchase(p)}
                              className="w-7 h-7 min-w-7 text-danger-500 hover:text-danger-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Footer Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-3 border-t border-default-100">
                  <div className="text-xs text-default-500">
                    Showing <b>{paginatedPurchases.length}</b> of <b>{sortedPurchases.length}</b> records
                    {sortedPurchases.length !== purchases.length && ` (filtered from ${purchases.length} total)`}
                  </div>

                  {totalPurPages > 1 && (
                    <Pagination
                      page={purPage}
                      total={totalPurPages}
                      onChange={setPurPage}
                      size="sm"
                      showControls
                      color="primary"
                      variant="flat"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUPPLIER SHOPS & LEDGERS */}
          {subTab === 'shops' && (
            <div className="space-y-4">
              {/* Shops Toolbar */}
              <div className="flex flex-col sm:flex-row items-end justify-between gap-3">
                <div className="w-full sm:w-56">
                  <Select
                    size="sm"
                    radius="sm"
                    disableAnimation
                    label="Sort Order"
                    labelPlacement="outside"
                    variant="bordered"
                    selectedKeys={new Set([shopSortOrder])}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      if (val) setShopSortOrder(String(val));
                    }}
                    classNames={{ trigger: "h-9 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
                    popoverProps={{
                      disableAnimation: true,
                      classNames: {
                        content: "p-1 rounded-xl shadow-lg border border-default-200/70 dark:border-default-100/20 bg-content1"
                      }
                    }}
                  >
                    <SelectItem key="due-high" textValue="Due: High → Low">Due: High → Low</SelectItem>
                    <SelectItem key="due-low" textValue="Due: Low → High">Due: Low → High</SelectItem>
                    <SelectItem key="name" textValue="Shop Name (A → Z)">Shop Name (A → Z)</SelectItem>
                    <SelectItem key="bought-high" textValue="Total Bought: High → Low">Total Bought: High → Low</SelectItem>
                  </Select>
                </div>

                <div className="w-full sm:w-80">
                  <Input
                    size="sm"
                    label="Search Supplier Shops"
                    labelPlacement="outside"
                    placeholder="Search supplier shops by name, phone, address..."
                    variant="bordered"
                    value={shopSearchQuery}
                    onChange={(e) => setShopSearchQuery(e.target.value)}
                    startContent={<Search className="w-4 h-4 text-default-400" />}
                    classNames={{ inputWrapper: "h-10 border-default-300" }}
                  />
                </div>
              </div>

              {/* Supplier Shops Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {filteredShops.map(s => (
                  <Card
                    key={s.id || s.name}
                    className={`border transition-all duration-150 ${
                      s.due > 0
                        ? 'border-danger-500/30 bg-content1 hover:border-danger-500/50'
                        : 'border-default-200/70 bg-content1 hover:border-default-300'
                    }`}
                  >
                    <CardHeader className="flex items-start justify-between pb-2 px-5 pt-5">
                      <div>
                        <h3 className="text-base font-bold font-display text-foreground m-0">
                          {s.name}
                        </h3>
                        {s.contactPerson && (
                          <div className="text-xs text-default-400 mt-0.5">
                            Manager: {s.contactPerson}
                          </div>
                        )}
                      </div>

                      <Tooltip content="Edit shop profile">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => {
                            setEditingShop(s);
                            setIsShopModalOpen(true);
                          }}
                          className="w-7 h-7 min-w-7 text-default-400 hover:text-primary"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </Tooltip>
                    </CardHeader>

                    <CardBody className="px-5 pb-5 pt-1 space-y-3">
                      {/* Contact details */}
                      <div className="space-y-1 text-xs text-default-500">
                        {s.phone && (
                          <div className="flex items-center gap-1.5 font-mono">
                            <Phone className="w-3 h-3 text-default-400 shrink-0" />
                            <span>{s.phone}</span>
                          </div>
                        )}
                        {s.address && (
                          <div className="flex items-center gap-1.5 truncate" title={s.address}>
                            <MapPin className="w-3 h-3 text-default-400 shrink-0" />
                            <span className="truncate">{s.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Financial KPI stats */}
                      <div className="p-3 rounded-xl bg-default-100 border border-default-200/80 space-y-1 text-xs">
                        <div className="flex justify-between text-default-500">
                          <span>Total Bought:</span>
                          <span className="font-numeric font-bold text-foreground">
                            {formatMoney(s.totalBought)}
                          </span>
                        </div>
                        <div className="flex justify-between text-teal-600 dark:text-teal-400">
                          <span>Total Paid:</span>
                          <span className="font-numeric font-bold">
                            {formatMoney(s.totalPaid)}
                          </span>
                        </div>
                        <div className="flex justify-between text-danger-500 font-bold text-sm pt-1 border-t border-default-200">
                          <span>Due Balance:</span>
                          <span className="font-numeric">
                            {formatMoney(s.due)}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          onPress={() => {
                            setLedgerShop(s);
                            setIsLedgerModalOpen(true);
                          }}
                          startContent={<FileText className="w-3.5 h-3.5" />}
                          className="flex-1 font-bold text-xs"
                        >
                          View Ledger
                        </Button>

                        <Button
                          size="sm"
                          variant="flat"
                          color="success"
                          onPress={() => {
                            setPaymentShopName(s.name);
                            setIsPaymentModalOpen(true);
                          }}
                          startContent={<CreditCard className="w-3.5 h-3.5" />}
                          className="font-bold text-xs text-success-600"
                        >
                          Pay Due
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* MODALS */}
      {/* 1. Add / Edit Purchase Modal */}
      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setEditingPurchase(null);
        }}
        purchase={editingPurchase}
        onOpenNewShop={() => {
          setEditingShop(null);
          setIsShopModalOpen(true);
        }}
        onSaveSuccess={() => syncAllData?.()}
        showToast={showToast}
      />

      {/* 2. Purchase Invoice View Modal */}
      <PurchaseInvoiceViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingPurchase(null);
        }}
        purchase={viewingPurchase}
        onEdit={(p) => {
          setEditingPurchase(p);
          setIsPurchaseModalOpen(true);
        }}
      />

      {/* 3. Supplier Shop Profile Modal */}
      <SupplierShopModal
        isOpen={isShopModalOpen}
        onClose={() => {
          setIsShopModalOpen(false);
          setEditingShop(null);
        }}
        shop={editingShop}
        onSaveSuccess={() => syncAllData?.()}
        showToast={showToast}
      />

      {/* 4. Shop Ledger Statement Modal */}
      <ShopLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => {
          setIsLedgerModalOpen(false);
          setLedgerShop(null);
        }}
        shop={ledgerShop}
        onPayDue={(shopName) => {
          setIsLedgerModalOpen(false);
          setPaymentShopName(shopName);
          setIsPaymentModalOpen(true);
        }}
      />

      {/* 5. Purchase Payment Voucher Modal */}
      <PurchasePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentShopName('');
        }}
        preselectedShop={paymentShopName}
        onSaveSuccess={() => syncAllData?.()}
        showToast={showToast}
      />
    </div>
  );
}
