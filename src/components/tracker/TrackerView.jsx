import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Select,
  SelectItem,
  Chip,
  Tooltip,
  Pagination,
  Tabs,
  Tab,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react';
import {
  Box,
  Search,
  RotateCcw,
  Plus,
  Edit2,
  Trash2,
  Check,
  RotateCw,
  FileText,
  Calendar,
  Layers,
  ArrowUpDown,
  ChevronDown,
  X
} from 'lucide-react';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../context/DialogContext';
import ProductModal from './ProductModal';
import {
  getUnifiedShopList,
  shopMatchesFilter,
  formatProductDateDisplay,
  productDateISO,
  dhakaNow,
  toISODate,
  pad
} from '../../utils/productHelpers';

export default function TrackerView({ showToast }) {
  const { user } = useAuth();
  const { products = [], shops = [], setProducts, loadProducts, syncAllData } = useData();
  const { appConfirm } = useDialog();

  const today = dhakaNow();
  const todayISO = toISODate(today);
  const currentYear = String(today.getFullYear());
  const currentMonth = todayISO.slice(0, 7);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'sold', 'returned', 'unmarked'
  const [periodMode, setPeriodMode] = useState('any'); // 'any', 'month', 'year', 'range'
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [shopFilter, setShopFilter] = useState('');
  const [sortKey, setSortKey] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const unifiedShops = useMemo(() => getUnifiedShopList(shops), [shops]);

  // Available years from product dataset
  const availableYears = useMemo(() => {
    const yearsSet = new Set([currentYear]);
    products.forEach(p => {
      const iso = productDateISO(p);
      if (iso && iso.length >= 4) {
        yearsSet.add(iso.slice(0, 4));
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [products, currentYear]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Status Filter
      const pStatus = p.status || 'unmarked';
      if (statusFilter !== 'all' && pStatus !== statusFilter) return false;

      // 2. Shop Filter
      if (shopFilter && !shopMatchesFilter(p.shop, shopFilter)) return false;

      // 3. Period Filter
      if (periodMode !== 'any') {
        const iso = productDateISO(p);
        if (!iso) return false;

        if (periodMode === 'month') {
          if (selectedMonth && !iso.startsWith(selectedMonth)) return false;
        } else if (periodMode === 'year') {
          if (selectedYear && !iso.startsWith(selectedYear)) return false;
        } else if (periodMode === 'range') {
          const from = dateFrom || '0000-01-01';
          const to = dateTo || '9999-12-31';
          if (iso < from || iso > to) return false;
        }
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numStr = p.trackNum ? `#${p.trackNum} ${p.trackNum}` : '';
        const hay = `${numStr} ${p.sn || ''} ${p.dateLabel || ''} ${p.desc || ''} ${p.shop || ''} ${p.note || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    products,
    statusFilter,
    shopFilter,
    periodMode,
    selectedMonth,
    selectedYear,
    dateFrom,
    dateTo,
    searchQuery
  ]);

  // Sort products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortKey === 'oldest') {
        const aIso = productDateISO(a) || '';
        const bIso = productDateISO(b) || '';
        if (aIso !== bIso) return aIso.localeCompare(bIso);
        const aTime = a.timeLabel || '';
        const bTime = b.timeLabel || '';
        return aTime.localeCompare(bTime);
      } else if (sortKey === 'num-high') {
        const aNum = Number(a.trackNum) || -1;
        const bNum = Number(b.trackNum) || -1;
        if (bNum !== aNum) return bNum - aNum;
        return (productDateISO(b) || '').localeCompare(productDateISO(a) || '');
      } else if (sortKey === 'num-low') {
        const aNum = Number(a.trackNum) || 9999999;
        const bNum = Number(b.trackNum) || 9999999;
        if (aNum !== bNum) return aNum - bNum;
        return (productDateISO(a) || '').localeCompare(productDateISO(b) || '');
      } else if (sortKey === 'shop') {
        const aShop = (a.shop || '').toLowerCase();
        const bShop = (b.shop || '').toLowerCase();
        if (aShop !== bShop) return aShop.localeCompare(bShop);
        return (productDateISO(b) || '').localeCompare(productDateISO(a) || '');
      } else if (sortKey === 'desc') {
        const aDesc = (a.desc || '').toLowerCase();
        const bDesc = (b.desc || '').toLowerCase();
        if (aDesc !== bDesc) return aDesc.localeCompare(bDesc);
        return (productDateISO(b) || '').localeCompare(productDateISO(a) || '');
      } else {
        // Default: newest first
        const aIso = productDateISO(a) || '';
        const bIso = productDateISO(b) || '';
        if (aIso !== bIso) return bIso.localeCompare(aIso);
        const aTime = a.timeLabel || '';
        const bTime = b.timeLabel || '';
        return bTime.localeCompare(aTime);
      }
    });
  }, [filteredProducts, sortKey]);

  // Counts summary
  const counts = useMemo(() => {
    let unmarked = 0;
    let sold = 0;
    let returned = 0;
    products.forEach(p => {
      const st = p.status || 'unmarked';
      if (st === 'sold') sold++;
      else if (st === 'returned') returned++;
      else unmarked++;
    });
    return {
      total: products.length,
      unmarked,
      sold,
      returned
    };
  }, [products]);

  // Paginated items
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sortedProducts.slice(start, start + rowsPerPage);
  }, [sortedProducts, page, rowsPerPage]);

  const totalPages = Math.ceil(sortedProducts.length / rowsPerPage) || 1;

  // Reset filters
  const handleResetFilters = () => {
    setStatusFilter('all');
    setPeriodMode('any');
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
    setDateFrom('');
    setDateTo('');
    setShopFilter('');
    setSortKey('newest');
    setSearchQuery('');
    setIsSearchOpen(false);
    setPage(1);
    showToast?.('Tracker filters reset');
  };

  // Change product status with 0ms optimistic UI update
  const handleSetStatus = async (product, newStatus) => {
    if (!firebaseReady || !db) {
      showToast?.('Firebase offline / unconfigured');
      return;
    }

    if (newStatus === (product.status || 'unmarked')) return;

    if (newStatus === 'unmarked' && product.status === 'sold') {
      const confirmed = await appConfirm({
        title: 'Reset Status',
        message: 'This item is currently marked as SOLD. Are you sure you want to reset it to unmarked?',
        confirmText: 'Reset Status',
        danger: false
      });
      if (!confirmed) return;
    }

    const prevStatus = product.status || 'unmarked';
    const updates = {
      status: newStatus,
      soldAtMillis: newStatus === 'sold' ? Date.now() : null
    };

    // ⚡ Optimistic instant update: 0ms visual feedback
    setProducts?.(prev =>
      prev.map(p => (p.id === product.id ? { ...p, ...updates } : p))
    );
    showToast?.(`Status: ${newStatus.toUpperCase()}`);

    try {
      await db.collection('product_tracker').doc(product.id).update(updates);
      logAudit(
        'product',
        product.id,
        'status_change',
        { status: prevStatus, desc: product.desc, sn: product.sn, shop: product.shop, trackNum: product.trackNum },
        { status: newStatus, desc: product.desc, sn: product.sn, shop: product.shop, trackNum: product.trackNum },
        user
      ).catch(err => console.warn('Audit error:', err));
    } catch (e) {
      console.error('Failed to update status on server:', e);
      // Rollback on failure
      setProducts?.(prev =>
        prev.map(p => (p.id === product.id ? { ...p, status: prevStatus } : p))
      );
      showToast?.('Failed to update status on server');
    }
  };

  // Delete product with optimistic UI removal
  const handleDeleteProduct = async (product) => {
    if (!firebaseReady || !db) {
      showToast?.('Firebase offline / unconfigured');
      return;
    }

    const confirmed = await appConfirm({
      title: 'Delete Product',
      message: `Delete entry #${product.trackNum || ''} (${product.desc})? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true
    });

    if (!confirmed) return;

    // ⚡ Optimistic delete
    setProducts?.(prev => prev.filter(p => p.id !== product.id));
    showToast?.('Product entry deleted');

    try {
      await db.collection('product_tracker').doc(product.id).delete();
      logAudit('product', product.id, 'delete', product, null, user).catch(console.warn);
    } catch (e) {
      console.error(e);
      showToast?.('Failed to delete product on server');
      loadProducts?.();
    }
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* Top Header Card with Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardBody className="p-3 sm:p-3.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-default-400">
              Total tracked
            </span>
            <div className="text-lg sm:text-xl font-bold font-numeric text-primary mt-0.5">
              {counts.total}
            </div>
          </CardBody>
        </Card>

        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardBody className="p-3 sm:p-3.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-default-500">
              Unmarked items
            </span>
            <div className="text-lg sm:text-xl font-bold font-numeric text-default-700 dark:text-default-300 mt-0.5">
              {counts.unmarked}
            </div>
          </CardBody>
        </Card>

        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardBody className="p-3 sm:p-3.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-success-600">
              Sold items
            </span>
            <div className="text-lg sm:text-xl font-bold font-numeric text-success-600 mt-0.5">
              {counts.sold}
            </div>
          </CardBody>
        </Card>

        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardBody className="p-3 sm:p-3.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-warning-500">
              Returned items
            </span>
            <div className="text-lg sm:text-xl font-bold font-numeric text-warning-500 mt-0.5">
              {counts.returned}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Tracker Container */}
      <Card className="border border-default-200/70 bg-content1 shadow-sm">
        <CardHeader className="px-4 sm:px-5 py-2.5 border-b border-default-200/60 block">
          <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
            {/* Left & Center: Title + Filters + Reset right beside the title */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Icon & Title */}
              <div className="flex items-center gap-2 shrink-0 mr-0.5 sm:mr-1">
                <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary">
                  <Box className="w-4 h-4" />
                </div>
                <h1 className="text-base sm:text-lg font-bold font-display text-foreground m-0 whitespace-nowrap">
                  Product tracker
                </h1>
              </div>

              {/* 1. Status Segmented Tabs (Matches Image 1 with fluid animated pill cursor) */}
              <Tabs
                size="sm"
                radius="full"
                selectedKey={statusFilter}
                onSelectionChange={(keys) => {
                  setStatusFilter(String(keys));
                  setPage(1);
                }}
                classNames={{
                  base: "shrink-0",
                  tabList: "bg-default-200/60 dark:bg-default-50/15 p-1 rounded-full gap-0 border-0 h-8",
                  cursor: "w-full bg-white dark:bg-default-100 shadow-sm rounded-full",
                  tab: "px-3.5 h-6 text-xs font-medium text-default-600 data-[selected=true]:text-foreground data-[selected=true]:font-bold transition-all duration-200",
                  tabContent: "text-default-500 group-data-[selected=true]:text-foreground group-data-[selected=true]:font-bold"
                }}
                aria-label="Filter items by status"
              >
                <Tab key="all" title="All" />
                <Tab key="unmarked" title="Unmarked" />
                <Tab key="sold" title="Sold" />
                <Tab key="returned" title="Returned" />
              </Tabs>

              {/* 2. Shop Filter (Radius Small & Extra Small per Image 2) */}
              <Select
                size="sm"
                radius="sm"
                disableAnimation
                aria-label="Filter by Shop"
                variant="bordered"
                selectedKeys={new Set([shopFilter || 'all_shops'])}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0];
                  setShopFilter(val === 'all_shops' ? '' : String(val));
                  setPage(1);
                }}
                className="w-36 sm:w-44"
                classNames={{
                  trigger: "h-8 min-h-8 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs"
                }}
                popoverProps={{
                  disableAnimation: true,
                  classNames: {
                    content: "p-1 rounded-xl shadow-lg border border-default-200/70 dark:border-default-100/20 bg-content1"
                  }
                }}
                listboxProps={{
                  itemClasses: {
                    base: "rounded-xs px-2.5 py-1.5 text-xs text-foreground data-[hover=true]:bg-default-100 dark:data-[hover=true]:bg-default-50/15"
                  }
                }}
              >
                <SelectItem key="all_shops" textValue="All shops">All shops</SelectItem>
                {unifiedShops.map(s => (
                  <SelectItem key={s} textValue={s}>{s}</SelectItem>
                ))}
              </Select>

              {/* 3. Period Filter (Extended width to prevent text truncation per user instruction) */}
              <Select
                size="sm"
                radius="sm"
                disableAnimation
                aria-label="Filter by Period"
                variant="bordered"
                selectedKeys={new Set([periodMode])}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0];
                  if (val) {
                    setPeriodMode(String(val));
                    setPage(1);
                  }
                }}
                className="w-36 sm:w-40"
                classNames={{
                  trigger: "h-8 min-h-8 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs"
                }}
                popoverProps={{
                  disableAnimation: true,
                  classNames: {
                    content: "p-1 rounded-xl shadow-lg border border-default-200/70 dark:border-default-100/20 bg-content1"
                  }
                }}
                listboxProps={{
                  itemClasses: {
                    base: "rounded-xs px-2.5 py-1.5 text-xs text-foreground data-[hover=true]:bg-default-100 dark:data-[hover=true]:bg-default-50/15"
                  }
                }}
              >
                <SelectItem key="any" textValue="Any time">Any time</SelectItem>
                <SelectItem key="month" textValue="Month">Month</SelectItem>
                <SelectItem key="year" textValue="Year">Year</SelectItem>
                <SelectItem key="range" textValue="Range">Range</SelectItem>
              </Select>

              {/* Dynamic Period Inputs */}
              {periodMode === 'month' && (
                <Input
                  type="month"
                  size="sm"
                  radius="sm"
                  aria-label="Select Month"
                  variant="bordered"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setPage(1);
                  }}
                  className="w-32"
                  classNames={{ inputWrapper: "h-8 min-h-8 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
                />
              )}

              {periodMode === 'year' && (
                <Select
                  size="sm"
                  radius="sm"
                  disableAnimation
                  aria-label="Select Year"
                  variant="bordered"
                  selectedKeys={new Set([selectedYear])}
                  onSelectionChange={(keys) => {
                    const val = Array.from(keys)[0];
                    if (val) {
                      setSelectedYear(String(val));
                      setPage(1);
                    }
                  }}
                  className="w-24 sm:w-28"
                  classNames={{
                    trigger: "h-8 min-h-8 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs"
                  }}
                  popoverProps={{
                    disableAnimation: true,
                    classNames: {
                      content: "p-1 rounded-xl shadow-lg border border-default-200/70 dark:border-default-100/20 bg-content1"
                    }
                  }}
                  listboxProps={{
                    itemClasses: {
                      base: "rounded-xs px-2.5 py-1.5 text-xs text-foreground data-[hover=true]:bg-default-100 dark:data-[hover=true]:bg-default-50/15"
                    }
                  }}
                >
                  {availableYears.map(y => (
                    <SelectItem key={y} textValue={y}>{y}</SelectItem>
                  ))}
                </Select>
              )}

              {periodMode === 'range' && (
                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    size="sm"
                    radius="sm"
                    aria-label="From Date"
                    variant="bordered"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                    className="w-28"
                    classNames={{ inputWrapper: "h-8 min-h-8 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
                  />
                  <span className="text-xs text-default-400">-</span>
                  <Input
                    type="date"
                    size="sm"
                    radius="sm"
                    aria-label="To Date"
                    variant="bordered"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                    className="w-28"
                    classNames={{ inputWrapper: "h-8 min-h-8 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
                  />
                </div>
              )}

              {/* 4. Reset Filters Button */}
              <Tooltip content="Reset all filters" size="sm">
                <Button
                  isIconOnly
                  variant="flat"
                  size="sm"
                  radius="sm"
                  onPress={handleResetFilters}
                  className="w-8 h-8 min-w-8 rounded-sm border border-default-200/80 dark:border-default-100/20 bg-default-100/60 dark:bg-default-50/10 text-default-600 dark:text-default-300"
                  aria-label="Reset filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </Tooltip>
            </div>

            {/* Far Right: Search Icon + Add Entry Button */}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              {/* Expandable Search Icon */}
              {isSearchOpen || searchQuery ? (
                <div className="relative flex items-center transition-all duration-200">
                  <Input
                    size="sm"
                    radius="sm"
                    autoFocus
                    placeholder="Search SN, name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    startContent={<Search className="w-3.5 h-3.5 text-default-400 shrink-0" />}
                    endContent={
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchOpen(false);
                          setPage(1);
                        }}
                        className="text-default-400 hover:text-foreground p-0.5 rounded-full hover:bg-default-200/50"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    }
                    className="w-40 sm:w-52"
                    classNames={{
                      inputWrapper: "h-8 min-h-8 border-default-300 dark:border-default-100/30 px-2 rounded-sm text-xs"
                    }}
                  />
                </div>
              ) : (
                <Tooltip content="Search products" size="sm">
                  <Button
                    isIconOnly
                    size="sm"
                    radius="sm"
                    variant="flat"
                    onPress={() => setIsSearchOpen(true)}
                    className="w-8 h-8 min-w-8 rounded-sm border border-default-200/80 dark:border-default-100/20 bg-default-100/60 dark:bg-default-50/10 text-default-600 dark:text-default-300"
                    aria-label="Search"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </Button>
                </Tooltip>
              )}

              {/* + Add Entry Button */}
              <Button
                color="primary"
                size="sm"
                radius="sm"
                onPress={() => {
                  setEditingProduct(null);
                  setIsModalOpen(true);
                }}
                startContent={<Plus className="w-3.5 h-3.5" />}
                className="h-8 px-3 rounded-sm font-bold text-xs shadow-sm shrink-0"
              >
                Add entry
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Product Cards List */}
        <CardBody className="px-4 sm:px-6 py-3.5 space-y-2">
          {/* Header Row */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2 bg-default-100/70 rounded-lg text-xs font-bold uppercase tracking-wider text-default-500 select-none">
            <div className="col-span-2"># / Date / Time</div>
            <div className="col-span-2">Shop</div>
            <div className="col-span-4">Product Description</div>
            <div className="col-span-2">Serial Number</div>
            <div className="col-span-2 text-right">Status &amp; Actions</div>
          </div>

          {paginatedProducts.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-default-200 rounded-2xl">
              <Box className="w-8 h-8 text-default-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-foreground">No items found</h3>
              <p className="text-xs text-default-400 mt-1 max-w-sm mx-auto">
                No products match your current filters or search query.
              </p>
            </div>
          ) : (
            paginatedProducts.map(p => {
              const serials = (p.sn || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

              const pStatus = p.status || 'unmarked';

              return (
                <div
                  key={p.id}
                  className={`grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 px-4 py-2.5 rounded-lg border transition-all duration-150 items-center ${
                    pStatus === 'sold'
                      ? 'border-emerald-300/90 dark:border-emerald-600/60 bg-emerald-50/80 dark:bg-emerald-950/35 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/55 shadow-xs'
                      : pStatus === 'returned'
                      ? 'border-rose-300/90 dark:border-rose-600/60 bg-rose-50/80 dark:bg-rose-950/35 hover:bg-rose-100/70 dark:hover:bg-rose-950/55 shadow-xs'
                      : 'border-default-200 dark:border-default-100/30 bg-default-50/60 dark:bg-default-50/5 hover:bg-default-100/60 dark:hover:bg-default-100/10 shadow-xs'
                  }`}
                >
                  {/* Col 1: Status Pip / # / Date / Time */}
                  <div className="lg:col-span-2 flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        pStatus === 'sold'
                          ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                          : pStatus === 'returned'
                          ? 'bg-rose-500 dark:bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.7)]'
                          : 'bg-default-300 dark:bg-default-600'
                      }`}
                    />
                    {p.trackNum && (
                      <span className="font-numeric font-extrabold text-xs text-primary bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 px-2 py-0.5 rounded-md shrink-0">
                        #{p.trackNum}
                      </span>
                    )}
                    <div className="min-w-0 leading-tight">
                      <span className="text-xs sm:text-sm font-bold text-foreground truncate block">
                        {formatProductDateDisplay(p)}
                      </span>
                      {p.timeLabel && (
                        <span className="text-xs font-numeric font-semibold text-default-500 dark:text-default-400 block mt-0.5">
                          {p.timeLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Col 2: Shop */}
                  <div className="lg:col-span-2 flex items-center">
                    <Chip
                      size="sm"
                      radius="sm"
                      variant="flat"
                      color="primary"
                      className="w-24 min-w-[96px] max-w-[96px] h-6 text-xs font-bold justify-center text-center shadow-2xs border border-primary-200/50 dark:border-primary-500/20"
                      classNames={{
                        base: "w-24 min-w-[96px] max-w-[96px] justify-center px-1.5",
                        content: "w-full text-center truncate font-bold text-xs px-0"
                      }}
                    >
                      {p.shop || 'Unassigned'}
                    </Chip>
                  </div>

                  {/* Col 3: Product Description & Note */}
                  <div className="lg:col-span-4 min-w-0 leading-tight">
                    <div className="text-sm font-bold text-foreground truncate">
                      {p.desc || 'Unnamed item'}
                    </div>
                    {p.note && (
                      <div className="flex items-center gap-1.5 text-xs text-default-400 truncate mt-0.5">
                        <FileText className="w-3.5 h-3.5 text-default-400 shrink-0" />
                        <span className="truncate">{p.note}</span>
                      </div>
                    )}
                  </div>

                  {/* Col 4: Serial Number(s) */}
                  <div className="lg:col-span-2 flex flex-wrap gap-1.5 items-center">
                    {serials.length > 0 ? (
                      serials.map((s, idx) => (
                        <span
                          key={idx}
                          className="font-numeric font-bold text-xs tracking-wide bg-default-100 dark:bg-default-50/15 text-foreground px-2 py-0.5 rounded border border-default-200/80 dark:border-default-100/20 leading-none"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-default-400">—</span>
                    )}
                  </div>

                  {/* Col 5: Status Dropdown & Actions */}
                  <div className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-1.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-default-200/60">
                    <Dropdown placement="bottom-end">
                      <DropdownTrigger>
                        <Button
                          size="sm"
                          variant="flat"
                          className={`h-8 w-28 min-w-28 px-2.5 rounded-lg text-xs font-bold justify-between border transition-all active:scale-95 ${
                            pStatus === 'sold'
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                              : pStatus === 'returned'
                              ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-600 dark:text-rose-400'
                              : 'bg-default-100 dark:bg-default-50/10 hover:bg-default-200/60 dark:hover:bg-default-50/20 border-default-200 dark:border-default-100/20 text-default-700 dark:text-default-300'
                          }`}
                          endContent={<ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />}
                        >
                          <span className="truncate">
                            {pStatus === 'sold' ? 'Sold' : pStatus === 'returned' ? 'Returned' : 'Unmarked'}
                          </span>
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label="Change status"
                        onAction={(key) => handleSetStatus(p, key)}
                        selectedKeys={new Set([pStatus])}
                        selectionMode="single"
                      >
                        <DropdownItem
                          key="unmarked"
                          startContent={<span className="w-2 h-2 rounded-full bg-default-400 shrink-0" />}
                          className="text-xs font-semibold"
                        >
                          Unmarked
                        </DropdownItem>
                        <DropdownItem
                          key="sold"
                          startContent={<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                          className="text-xs font-semibold text-success-600 dark:text-success-400"
                        >
                          Sold
                        </DropdownItem>
                        <DropdownItem
                          key="returned"
                          startContent={<span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                          className="text-xs font-semibold text-danger-600 dark:text-danger-400"
                        >
                          Returned
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>

                    <Tooltip content="Edit entry" size="sm">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        onPress={() => {
                          setEditingProduct(p);
                          setIsModalOpen(true);
                        }}
                        className="w-8 h-8 min-w-8 rounded-lg border border-default-200/80 dark:border-default-100/20 bg-default-100/60 dark:bg-default-50/10 hover:bg-default-200/80 text-default-600 dark:text-default-300"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </Tooltip>

                    <Tooltip content="Delete entry" color="danger" size="sm">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        color="danger"
                        onPress={() => handleDeleteProduct(p)}
                        className="w-8 h-8 min-w-8 rounded-lg border border-default-200/80 dark:border-default-100/20 bg-default-100/60 dark:bg-default-50/10 hover:bg-danger-500/20 hover:border-danger-500/30 text-default-600 dark:text-default-300 hover:text-danger-500"
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
              Showing <b>{paginatedProducts.length}</b> of <b>{sortedProducts.length}</b> records
              {sortedProducts.length !== products.length && ` (filtered from ${products.length} total)`}
            </div>

            {totalPages > 1 && (
              <Pagination
                page={page}
                total={totalPages}
                onChange={setPage}
                size="sm"
                showControls
                color="primary"
                variant="flat"
              />
            )}
          </div>
        </CardBody>
      </Card>

      {/* Add / Edit Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSaveSuccess={() => syncAllData?.()}
        showToast={showToast}
      />
    </div>
  );
}
