import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Select,
  SelectItem,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Chip,
  Tooltip
} from '@heroui/react';
import {
  Tag,
  Search,
  RotateCcw,
  Download,
  Plus,
  Edit2,
  Trash2,
  SlidersHorizontal,
  DollarSign,
  FileText
} from 'lucide-react';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../context/DialogContext';
import PriceListEntryModal from './PriceListEntryModal';
import QuickPriceModal from './QuickPriceModal';
import ManageBrandsModal from './ManageBrandsModal';
import { formatMoney, downloadCSV } from '../../utils/calculations';
import {
  DEFAULT_CATALOG_BRANDS,
  DEFAULT_CATALOG_TYPES,
  buildPriceListCSV
} from '../../utils/priceListHelpers';

export default function PriceListView({ showToast }) {
  const { user } = useAuth();
  const { priceList = [], priceBrands = [], priceTypes = [], syncAllData } = useData();
  const { appConfirm } = useDialog();

  const brandsList = (priceBrands && priceBrands.length) ? priceBrands : DEFAULT_CATALOG_BRANDS;
  const typesList = (priceTypes && priceTypes.length) ? priceTypes : DEFAULT_CATALOG_TYPES;

  // Filter state
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isQuickPriceOpen, setIsQuickPriceOpen] = useState(false);
  const [quickPriceItem, setQuickPriceItem] = useState(null);

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // Filter products
  const filteredItems = useMemo(() => {
    return priceList.filter(it => {
      // Brand filter
      if (selectedBrand) {
        if (selectedBrand === '__generic__') {
          if (it.brand && it.brand.trim()) return false;
        } else {
          if ((it.brand || '').toLowerCase() !== selectedBrand.toLowerCase()) return false;
        }
      }

      // Type filter
      if (selectedType) {
        if (selectedType === '__uncategorized__') {
          if (it.type && it.type.trim()) return false;
        } else {
          if ((it.type || '').toLowerCase() !== selectedType.toLowerCase()) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const modelMatch = (it.model || '').toLowerCase().includes(q);
        const brandMatch = (it.brand || '').toLowerCase().includes(q);
        const typeMatch = (it.type || '').toLowerCase().includes(q);
        const noteMatch = (it.notes || '').toLowerCase().includes(q);
        const priceMatch = String(it.price || '').includes(q);
        if (!modelMatch && !brandMatch && !typeMatch && !noteMatch && !priceMatch) return false;
      }

      return true;
    });
  }, [priceList, selectedBrand, selectedType, searchQuery]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / rowsPerPage) || 1;

  // Reset filters
  const handleResetFilters = () => {
    setSelectedBrand('');
    setSelectedType('');
    setSearchQuery('');
    setPage(1);
    showToast?.('Price list filters reset');
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredItems.length) {
      showToast?.('No price list items to export.');
      return;
    }
    const csvContent = buildPriceListCSV(filteredItems);
    const fileName = `pmc-price-list-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(csvContent, fileName);
    showToast?.(`Price List CSV downloaded (${filteredItems.length} products)`);
  };

  // Delete item
  const handleDeleteItem = async (it) => {
    if (!firebaseReady || !db) {
      showToast?.('Firebase offline / unconfigured');
      return;
    }

    const brandStr = it.brand ? `[${it.brand}] ` : '';
    const confirmed = await appConfirm({
      title: 'Delete from Price List?',
      message: `Permanently delete "${brandStr}${it.model}" (${formatMoney(it.price)}) from catalog?`,
      confirmText: 'Delete Item',
      danger: true
    });

    if (!confirmed) return;

    try {
      await db.collection('price_list').doc(it.id).delete();
      await logAudit(
        'price_list',
        it.id,
        'delete',
        it,
        null,
        user
      );

      syncAllData?.();
      showToast?.(`Item "${it.model}" deleted`);
    } catch (err) {
      console.error(err);
      showToast?.('Failed to delete item');
    }
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* Main Catalog Card */}
      <Card className="border border-default-200/70 bg-content1 shadow-sm">
        <CardHeader className="flex flex-col gap-3 px-5 pt-3.5 pb-2">
          {/* Top Title & Primary Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-display text-foreground m-0">
                  Price List
                </h1>
                <p className="text-xs text-default-400 m-0">
                  Product catalog, brand taxonomy, and dynamic price manager.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <Button
                variant="flat"
                size="sm"
                onPress={() => setIsManageModalOpen(true)}
                startContent={<SlidersHorizontal className="w-3.5 h-3.5" />}
                className="text-xs font-semibold"
              >
                Manage Brands & Types
              </Button>

              <Button
                variant="bordered"
                size="sm"
                onPress={handleExportCSV}
                startContent={<Download className="w-3.5 h-3.5" />}
                className="text-xs font-semibold"
              >
                Export CSV
              </Button>

              <Button
                color="primary"
                size="sm"
                onPress={() => {
                  setEditingItem(null);
                  setIsEntryModalOpen(true);
                }}
                startContent={<Plus className="w-4 h-4" />}
                className="font-bold text-xs shadow-sm"
              >
                Add Product Price
              </Button>
            </div>
          </div>

          {/* Filter Toolbar Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 w-full pt-1 items-end">
            {/* 1. Brand Filter */}
            <div className="col-span-1 flex flex-col">
              <label className="text-xs font-semibold text-default-600 dark:text-default-300 mb-1">
                Brand
              </label>
              <Select
                size="sm"
                radius="sm"
                disableAnimation
                aria-label="Filter by Brand"
                variant="bordered"
                selectedKeys={new Set([selectedBrand || 'all_brands'])}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0];
                  setSelectedBrand(val === 'all_brands' ? '' : String(val));
                  setPage(1);
                }}
                className="w-full"
                classNames={{
                  trigger: "h-9 min-h-9 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs"
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
                <SelectItem key="all_brands" textValue="All Brands">All Brands</SelectItem>
                <SelectItem key="__generic__" textValue="Generic / No Brand">Generic / No Brand</SelectItem>
                {brandsList.map(b => (
                  <SelectItem key={b} textValue={b}>{b}</SelectItem>
                ))}
              </Select>
            </div>

            {/* 2. Type Filter */}
            <div className="col-span-1 flex flex-col">
              <label className="text-xs font-semibold text-default-600 dark:text-default-300 mb-1">
                Product Type
              </label>
              <Select
                size="sm"
                radius="sm"
                disableAnimation
                aria-label="Filter by Product Type"
                variant="bordered"
                selectedKeys={new Set([selectedType || 'all_types'])}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0];
                  setSelectedType(val === 'all_types' ? '' : String(val));
                  setPage(1);
                }}
                className="w-full"
                classNames={{
                  trigger: "h-9 min-h-9 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs"
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
                <SelectItem key="all_types" textValue="All Types">All Types</SelectItem>
                <SelectItem key="__uncategorized__" textValue="Uncategorized">Uncategorized</SelectItem>
                {typesList.map(t => (
                  <SelectItem key={t} textValue={t}>{t}</SelectItem>
                ))}
              </Select>
            </div>

            {/* 3. Search Query */}
            <div className="col-span-1 sm:col-span-3 flex flex-col">
              <label className="text-xs font-semibold text-default-600 dark:text-default-300 mb-1">
                Search Products
              </label>
              <Input
                size="sm"
                radius="sm"
                aria-label="Search Products"
                placeholder="Search products, brand, model, specs..."
                variant="bordered"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                startContent={<Search className="w-4 h-4 text-default-400" />}
                className="w-full"
                classNames={{ inputWrapper: "h-9 min-h-9 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
              />
            </div>

            {/* 4. Reset Button & Count Chip */}
            <div className="col-span-1 flex items-center gap-2">
              <Button
                variant="flat"
                size="sm"
                onPress={handleResetFilters}
                startContent={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-xs font-semibold h-10 w-full"
              >
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Table Content */}
        <CardBody className="px-6 py-4">
          <div className="overflow-x-auto">
            <Table
              aria-label="Price List Catalog Table"
              classNames={{
                wrapper: "shadow-none p-0 border border-default-200/60 rounded-xl overflow-hidden",
                th: "bg-default-100 text-default-700 text-xs font-bold uppercase tracking-wider py-3",
                td: "py-3 text-sm font-medium border-b border-default-100"
              }}
            >
              <TableHeader>
                <TableColumn key="brand" align="center">BRAND</TableColumn>
                <TableColumn key="type" align="center">TYPE</TableColumn>
                <TableColumn key="model">MODEL / PRODUCT NAME</TableColumn>
                <TableColumn key="price" align="center">PRICE (TK)</TableColumn>
                <TableColumn key="actions" align="center">ACTIONS</TableColumn>
              </TableHeader>

              <TableBody emptyContent="No products found in catalog matching your filter.">
                {paginatedItems.map((it) => (
                  <TableRow key={it.id}>
                    {/* Brand */}
                    <TableCell>
                      <div className="flex justify-center">
                        <Chip
                          size="sm"
                          variant="flat"
                          color={it.brand ? "primary" : "default"}
                          className="text-xs font-semibold w-28 min-w-[112px] max-w-[112px] justify-center"
                          classNames={{ content: "truncate text-center block" }}
                        >
                          {it.brand || "Generic"}
                        </Chip>
                      </div>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <div className="flex justify-center">
                        <Chip
                          size="sm"
                          variant="flat"
                          className={`text-xs font-semibold w-28 min-w-[112px] max-w-[112px] justify-center ${
                            it.type
                              ? "bg-default-100 text-default-700"
                              : "bg-default-100/60 text-default-400"
                          }`}
                          classNames={{ content: "truncate text-center block" }}
                        >
                          {it.type || "—"}
                        </Chip>
                      </div>
                    </TableCell>

                    {/* Model & Notes */}
                    <TableCell>
                      <div>
                        <span className="font-bold text-foreground">
                          {it.model}
                        </span>
                        {it.notes && (
                          <div className="flex items-center gap-1.5 text-xs text-default-400 mt-0.5">
                            <FileText className="w-3 h-3 text-default-400 shrink-0" />
                            <span>{it.notes}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Price with Quick Edit trigger */}
                    <TableCell className="text-center">
                      <Tooltip content="Click to quick-update price">
                        <button
                          type="button"
                          onClick={() => {
                            setQuickPriceItem(it);
                            setIsQuickPriceOpen(true);
                          }}
                          className="font-numeric font-bold text-base text-primary hover:underline hover:opacity-85 transition-opacity"
                        >
                          {formatMoney(it.price || 0)}
                        </button>
                      </Tooltip>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip content="Quick Price Edit">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => {
                              setQuickPriceItem(it);
                              setIsQuickPriceOpen(true);
                            }}
                            className="text-primary hover:bg-primary-50 min-w-8 w-8 h-8"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        </Tooltip>

                        <Tooltip content="Edit Details">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => {
                              setEditingItem(it);
                              setIsEntryModalOpen(true);
                            }}
                            className="text-default-500 hover:text-primary min-w-8 w-8 h-8"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </Tooltip>

                        <Tooltip content="Delete Item" color="danger">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={() => handleDeleteItem(it)}
                            className="text-danger-500 hover:text-danger-600 min-w-8 w-8 h-8"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer with Summary & Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-2">
            <div className="text-xs text-default-500">
              Showing <b>{paginatedItems.length}</b> of <b>{filteredItems.length}</b> catalog items
              {filteredItems.length !== priceList.length && ` (filtered from ${priceList.length} total)`}
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

      {/* Add / Edit Product Price Modal */}
      <PriceListEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => {
          setIsEntryModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        onSaveSuccess={() => syncAllData?.()}
        showToast={showToast}
      />

      {/* Quick Price Update Modal */}
      <QuickPriceModal
        isOpen={isQuickPriceOpen}
        onClose={() => {
          setIsQuickPriceOpen(false);
          setQuickPriceItem(null);
        }}
        item={quickPriceItem}
        onSaveSuccess={() => syncAllData?.()}
        showToast={showToast}
      />

      {/* Manage Brands & Types Modal */}
      <ManageBrandsModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        showToast={showToast}
      />
    </div>
  );
}
