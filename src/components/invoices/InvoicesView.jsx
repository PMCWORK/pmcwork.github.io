import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Card,
  CardBody,
  Chip,
  Pagination,
  Tooltip
} from '@heroui/react';
import {
  FileText,
  Plus,
  Search,
  RotateCcw,
  Printer,
  Copy,
  Edit2,
  Trash2,
  Calendar,
  User,
  Phone,
  DollarSign,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../context/DialogContext';
import { formatMoney, formatDateLabel, toISODate, dhakaNow } from '../../utils/calculations';
import {
  filterAndSortInvoices,
  fetchRemoteBurnedCounters,
  SALESPERSONS
} from '../../utils/invoiceHelpers';
import InvoiceFormCard from './InvoiceFormCard';
import InvoicePreviewModal from './InvoicePreviewModal';

const ITEMS_PER_PAGE = 15;

export default function InvoicesView({ showToast }) {
  const { user } = useAuth();
  const { invoices = [], loadInvoices } = useData();
  const { appConfirm } = useDialog();

  const todayISO = toISODate(dhakaNow());
  const currentMonthISO = todayISO.slice(0, 7);
  const currentYearStr = String(new Date().getFullYear());

  // Remote counters for sequencing
  const [remoteCounters, setRemoteCounters] = useState({});

  useEffect(() => {
    fetchRemoteBurnedCounters().then(setRemoteCounters).catch(() => {});
  }, []);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoiceForForm, setSelectedInvoiceForForm] = useState(null);
  const [isCloneMode, setIsCloneMode] = useState(false);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  // Filter Toolbar State
  const [periodMode, setPeriodMode] = useState('any'); // 'any' | 'month' | 'year' | 'range'
  const [filterMonth, setFilterMonth] = useState(currentMonthISO);
  const [filterYear, setFilterYear] = useState(currentYearStr);
  const [filterFrom, setFilterFrom] = useState(todayISO);
  const [filterTo, setFilterTo] = useState(todayISO);
  const [soldByFilter, setSoldByFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set([currentYearStr]);
    invoices.forEach((i) => {
      if (i.date && i.date.length >= 4) years.add(i.date.slice(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [invoices, currentYearStr]);

  // Compute Active Range
  const dateRange = useMemo(() => {
    if (periodMode === 'any') return null;
    if (periodMode === 'month') {
      const ym = filterMonth || currentMonthISO;
      return { from: `${ym}-01`, to: `${ym}-31` };
    }
    if (periodMode === 'year') {
      const y = filterYear || currentYearStr;
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    if (periodMode === 'range') {
      return { from: filterFrom || '0000-01-01', to: filterTo || '9999-12-31' };
    }
    return null;
  }, [periodMode, filterMonth, filterYear, filterFrom, filterTo, currentMonthISO, currentYearStr]);

  // Filtered & Sorted Invoices
  const filteredInvoices = useMemo(() => {
    return filterAndSortInvoices(invoices, {
      range: dateRange,
      soldBy: soldByFilter,
      search: searchQuery,
      sortOrder
    });
  }, [invoices, dateRange, soldByFilter, searchQuery, sortOrder]);

  // Aggregate Metrics
  const totalInvoicesCount = invoices.length;
  const filteredRevenue = filteredInvoices.reduce((acc, i) => acc + (Number(i.grandTotal || i.totalAmount || 0)), 0);
  const averageBill = filteredInvoices.length > 0 ? Math.round(filteredRevenue / filteredInvoices.length) : 0;
  const foyezCount = filteredInvoices.filter(i => (i.soldBy || '').toUpperCase() === 'FOYEZ').length;
  const mehediCount = filteredInvoices.filter(i => (i.soldBy || '').toUpperCase() === 'MEHEDI').length;

  // Pagination Slice
  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [periodMode, filterMonth, filterYear, filterFrom, filterTo, soldByFilter, sortOrder, searchQuery]);

  // Reset Filters
  const handleResetFilters = () => {
    setPeriodMode('any');
    setFilterMonth(currentMonthISO);
    setFilterYear(currentYearStr);
    setFilterFrom(todayISO);
    setFilterTo(todayISO);
    setSoldByFilter('');
    setSortOrder('newest');
    setSearchQuery('');
  };

  // Actions
  const handleOpenCreate = () => {
    setSelectedInvoiceForForm(null);
    setIsCloneMode(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (inv) => {
    setSelectedInvoiceForForm(inv);
    setIsCloneMode(false);
    setIsFormOpen(true);
  };

  const handleOpenClone = (inv) => {
    setSelectedInvoiceForForm(inv);
    setIsCloneMode(true);
    setIsFormOpen(true);
  };

  const handleOpenPreview = (inv) => {
    setViewingInvoice(inv);
    setIsPreviewOpen(true);
  };

  const handleDeleteInvoice = async (inv) => {
    if (!inv) return;
    const confirmed = await appConfirm({
      title: 'Delete Invoice Record',
      message: `Are you sure you want to delete invoice #${inv.number || ''} for ${inv.buyerName || 'Customer'} (${formatMoney(inv.grandTotal || inv.totalAmount || 0)})?`,
      danger: true
    });
    if (!confirmed) return;

    try {
      if (firebaseReady && db) {
        await db.collection('invoices').doc(inv.id).delete();
        await logAudit('invoice', inv.id, 'delete', inv, null, user);
      }
      if (loadInvoices) await loadInvoices();
      if (showToast) showToast('Invoice deleted successfully');
    } catch (err) {
      console.error('Error deleting invoice:', err);
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200 pb-6">
      {/* Top Action Bar (Compact) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-default-600">
            Billing &amp; Customer Bills
          </span>
          <Chip size="sm" variant="flat" color="primary" className="text-[10px] font-bold h-5">
            {totalInvoicesCount} Records
          </Chip>
        </div>

        <Button
          size="sm"
          color="primary"
          className="font-bold text-xs h-8"
          startContent={<Plus className="w-3.5 h-3.5" />}
          onPress={handleOpenCreate}
        >
          Create invoice
        </Button>
      </div>

      {/* Metric Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Invoices */}
        <Card className="border-l-4 border-l-primary bg-content1 shadow-sm">
          <CardBody className="p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-default-500">
              Total Invoices Logged
            </div>
            <div className="text-xl font-black font-numeric text-foreground mt-1">
              {totalInvoicesCount}
            </div>
            <div className="text-[11px] text-default-400 mt-0.5">
              {filteredInvoices.length} matching current filter
            </div>
          </CardBody>
        </Card>

        {/* Card 2: Period Sales Revenue */}
        <Card className="border-l-4 border-l-success bg-content1 shadow-sm">
          <CardBody className="p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-success">
              Filtered Total Value
            </div>
            <div className="text-xl font-black font-numeric text-success mt-1">
              {formatMoney(filteredRevenue)}
            </div>
            <div className="text-[11px] text-default-400 mt-0.5">
              Net billed amount
            </div>
          </CardBody>
        </Card>

        {/* Card 3: Average Bill Value */}
        <Card className="border-l-4 border-l-secondary bg-content1 shadow-sm">
          <CardBody className="p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-secondary-600">
              Average Bill Value
            </div>
            <div className="text-xl font-black font-numeric text-foreground mt-1">
              {formatMoney(averageBill)}
            </div>
            <div className="text-[11px] text-default-400 mt-0.5">
              Per customer receipt
            </div>
          </CardBody>
        </Card>

        {/* Card 4: Salesperson Split */}
        <Card className="border-l-4 border-l-amber-500 bg-content1 shadow-sm">
          <CardBody className="p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              Salesperson Volume
            </div>
            <div className="text-sm font-bold font-numeric text-foreground mt-1.5 flex items-center justify-between">
              <span>FOYEZ: <b className="text-primary">{foyezCount}</b></span>
              <span>MEHEDI: <b className="text-pink-600">{mehediCount}</b></span>
            </div>
            <div className="text-[11px] text-default-400 mt-0.5">
              Invoices generated
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Invoice Form Builder Card */}
      <InvoiceFormCard
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialInvoice={selectedInvoiceForForm}
        isClone={isCloneMode}
        allInvoices={invoices}
        remoteCounters={remoteCounters}
        onSuccess={async (savedId) => {
          if (loadInvoices) await loadInvoices();
          const target = invoices.find(x => x.id === savedId);
          if (target) {
            handleOpenPreview(target);
          } else {
            // refresh and find
            setTimeout(() => {
              const fresh = invoices.find(x => x.id === savedId) || invoices[0];
              if (fresh) handleOpenPreview(fresh);
            }, 300);
          }
        }}
      />

      {/* Invoices Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-content1 rounded-xl border border-default-200">
        {/* Period Mode */}
        <Select
          size="sm"
          variant="bordered"
          selectedKeys={new Set([periodMode])}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0];
            if (k) setPeriodMode(String(k));
          }}
          className="w-32"
          aria-label="Filter period mode"
        >
          <SelectItem key="any" textValue="All time">All time</SelectItem>
          <SelectItem key="month" textValue="Month">Month</SelectItem>
          <SelectItem key="year" textValue="Year">Year</SelectItem>
          <SelectItem key="range" textValue="Date Range">Date Range</SelectItem>
        </Select>

        {/* Dynamic Period Inputs */}
        {periodMode === 'month' && (
          <Input
            type="month"
            size="sm"
            variant="bordered"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-36"
            aria-label="Filter month"
          />
        )}

        {periodMode === 'year' && (
          <Select
            size="sm"
            variant="bordered"
            selectedKeys={new Set([filterYear])}
            onSelectionChange={(keys) => {
              const k = Array.from(keys)[0];
              if (k) setFilterYear(String(k));
            }}
            className="w-28"
            aria-label="Filter year"
          >
            {availableYears.map((y) => (
              <SelectItem key={y} textValue={y}>{y}</SelectItem>
            ))}
          </Select>
        )}

        {periodMode === 'range' && (
          <>
            <Input
              type="date"
              size="sm"
              variant="bordered"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="w-36"
              aria-label="From date"
            />
            <Input
              type="date"
              size="sm"
              variant="bordered"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="w-36"
              aria-label="To date"
            />
          </>
        )}

        {/* Salesperson Filter */}
        <Select
          size="sm"
          variant="bordered"
          selectedKeys={new Set([soldByFilter || 'all'])}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0];
            setSoldByFilter(k === 'all' ? '' : String(k));
          }}
          className="w-36"
          aria-label="Filter salesperson"
        >
          <SelectItem key="all" textValue="All salespersons">All salespersons</SelectItem>
          <SelectItem key="FOYEZ" textValue="FOYEZ">FOYEZ</SelectItem>
          <SelectItem key="MEHEDI" textValue="MEHEDI">MEHEDI</SelectItem>
        </Select>

        {/* Sort Order */}
        <Select
          size="sm"
          variant="bordered"
          selectedKeys={new Set([sortOrder])}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0];
            if (k) setSortOrder(String(k));
          }}
          className="w-48"
          aria-label="Sort invoices"
        >
          <SelectItem key="newest" textValue="Newest first">Newest first</SelectItem>
          <SelectItem key="oldest" textValue="Oldest first">Oldest first</SelectItem>
          <SelectItem key="num-high" textValue="Invoice #: High → Low">Invoice #: High → Low</SelectItem>
          <SelectItem key="num-low" textValue="Invoice #: Low → High">Invoice #: Low → High</SelectItem>
          <SelectItem key="total-high" textValue="Total: High → Low">Total: High → Low</SelectItem>
          <SelectItem key="total-low" textValue="Total: Low → High">Total: Low → High</SelectItem>
          <SelectItem key="buyer" textValue="Buyer (A → Z)">Buyer (A → Z)</SelectItem>
        </Select>

        {/* Reset button */}
        <Button
          size="sm"
          variant="light"
          startContent={<RotateCcw className="w-3.5 h-3.5 text-default-400" />}
          onPress={handleResetFilters}
          className="text-default-500 font-semibold"
        >
          Reset filters
        </Button>

        {/* Search Input */}
        <div className="ml-auto w-full sm:w-64">
          <Input
            size="sm"
            variant="bordered"
            placeholder="Search #, Buyer, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Search className="w-3.5 h-3.5 text-default-400" />}
            isClearable
            onClear={() => setSearchQuery('')}
          />
        </div>
      </div>

      {/* Invoice List Items */}
      <div className="space-y-3 min-h-[360px]">
        {filteredInvoices.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-default-200 rounded-xl bg-content1">
            <Receipt className="w-10 h-10 text-default-400 mx-auto mb-2 opacity-50" />
            <h4 className="text-sm font-bold text-foreground">No invoices found</h4>
            <p className="text-xs text-default-500 mt-1 max-w-sm mx-auto">
              Click "Create invoice" above to generate your first customer bill or adjust your search filter.
            </p>
          </div>
        ) : (
          paginatedInvoices.map((inv) => {
            const itemSummary = (inv.items || [])
              .map((x) => x.desc)
              .filter(Boolean)
              .join(', ') || 'No line items';

            return (
              <div
                key={inv.id}
                className="p-4 rounded-xl border border-default-200 bg-content1 hover:border-primary-300 transition-colors shadow-2xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-4"
              >
                {/* Left Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-numeric font-black text-sm text-primary">
                      #{inv.number || '—'}
                    </span>
                    <span className="text-xs text-default-400">
                      {formatDateLabel(inv.date)}
                    </span>
                    <Chip size="sm" variant="flat" color="default" className="h-5 text-[10px] font-bold">
                      Sold by {inv.soldBy || 'FOYEZ'}
                    </Chip>
                  </div>

                  <div className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>{inv.buyerName || 'Valued Customer'}</span>
                    {inv.buyerPhone && (
                      <span className="text-xs font-normal text-default-500">
                        · {inv.buyerPhone}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-default-400 truncate max-w-xl">
                    {itemSummary}
                  </div>
                </div>

                {/* Right Amount & Actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-base font-black font-numeric text-success">
                    {formatMoney(inv.grandTotal || inv.totalAmount || 0)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="bordered"
                      color="primary"
                      className="h-7 text-xs font-bold"
                      startContent={<Printer className="w-3.5 h-3.5" />}
                      onPress={() => handleOpenPreview(inv)}
                    >
                      Print
                    </Button>

                    <Button
                      size="sm"
                      variant="flat"
                      className="h-7 text-xs font-semibold"
                      startContent={<Copy className="w-3.5 h-3.5" />}
                      onPress={() => handleOpenClone(inv)}
                    >
                      Clone
                    </Button>

                    <Tooltip content="Edit invoice">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="h-7 w-7 text-default-400 hover:text-foreground"
                        onPress={() => handleOpenEdit(inv)}
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
                        className="h-7 w-7 text-default-400 hover:text-danger"
                        onPress={() => handleDeleteInvoice(inv)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-3 border-t border-default-200">
          <span className="text-xs text-default-400">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)} of{' '}
            {filteredInvoices.length} invoices
          </span>

          <Pagination
            total={totalPages}
            page={currentPage}
            onChange={setCurrentPage}
            size="sm"
            color="primary"
            variant="flat"
          />
        </div>
      )}

      {/* Print Preview Modal */}
      <InvoicePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setViewingInvoice(null);
        }}
        invoice={viewingInvoice}
      />
    </div>
  );
}
