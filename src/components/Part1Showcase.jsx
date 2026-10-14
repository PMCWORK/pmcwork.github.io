import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  ButtonGroup,
  Input,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
  Textarea,
  RadioGroup,
  Radio,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tooltip,
  Divider,
  Chip
} from '@heroui/react';
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  MoreVertical,
  Printer,
  Eye,
  Check,
  Sparkles,
  Layers,
  Sliders,
  Database,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Store,
  Tag
} from 'lucide-react';
import MetricCard from './common/MetricCard';
import StatusChip from './common/StatusChip';
import PinInput from './common/PinInput';
import { useDialog } from '../context/DialogContext';

const INITIAL_SAMPLE_PRODUCTS = [
  { id: '1', name: 'Corsair Vengeance LPX 16GB DDR4 3200MHz', brand: 'Corsair', price: '৳ 4,200', cost: 3800, stock: 12 },
  { id: '2', name: 'Samsung 980 Pro 1TB NVMe M.2 SSD', brand: 'Samsung', price: '৳ 11,500', cost: 10200, stock: 5 },
  { id: '3', name: 'AMD Ryzen 5 5600 6-Core 12-Thread Processor', brand: 'AMD', price: '৳ 13,800', cost: 11900, stock: 8 },
  { id: '4', name: 'Gigabyte B550M DS3H AC Ultra Durable', brand: 'Gigabyte', price: '৳ 11,200', cost: 9800, stock: 3 },
  { id: '5', name: 'Antec Atom V550 550W Power Supply', brand: 'Antec', price: '৳ 3,400', cost: 2900, stock: 15 },
  { id: '6', name: 'Logitech G102 Lightsync Gaming Mouse', brand: 'Logitech', price: '৳ 2,100', cost: 1750, stock: 20 },
  { id: '7', name: 'DeepCool AK400 High-Performance Cooler', brand: 'DeepCool', price: '৳ 3,100', cost: 2650, stock: 9 },
];

const INITIAL_SAMPLE_SALES = [
  { id: 'INV-1092', date: '2026-10-11', customer: 'Tanvir Ahmed', item: 'Samsung 980 Pro 1TB', totalNum: 11500, total: '৳ 11,500', profitNum: 1200, profit: '৳ 1,200', margin: 11.6, status: 'Sold', staff: 'Mahadi' },
  { id: 'INV-1093', date: '2026-10-11', customer: 'Rafiqul Islam', item: 'AMD Ryzen 5 5600', totalNum: 13800, total: '৳ 13,800', profitNum: 2100, profit: '৳ 2,100', margin: 17.9, status: 'Sold', staff: 'Foyez' },
  { id: 'INV-1094', date: '2026-10-10', customer: 'PMC Walk-in', item: 'Corsair 16GB DDR4', totalNum: 4200, total: '৳ 4,200', profitNum: 350, profit: '৳ 350', margin: 9.1, status: 'Returned', staff: 'Mahadi' },
  { id: 'INV-1095', date: '2026-10-10', customer: 'Dhaka Lab Systems', item: 'Antec Atom V550 (x3)', totalNum: 10200, total: '৳ 10,200', profitNum: 1400, profit: '৳ 1,400', margin: 15.9, status: 'Paid', staff: 'Store' },
  { id: 'INV-1096', date: '2026-10-09', customer: 'Shakil Hasan', item: 'Gigabyte B550M DS3H', totalNum: 11200, total: '৳ 11,200', profitNum: 1400, profit: '৳ 1,400', margin: 14.3, status: 'Sold', staff: 'Foyez' },
  { id: 'INV-1097', date: '2026-10-08', customer: 'Computer Planet', item: 'Logitech G102 (x4)', totalNum: 8400, total: '৳ 8,400', profitNum: 1400, profit: '৳ 1,400', margin: 20.0, status: 'Paid', staff: 'Store' },
  { id: 'INV-1098', date: '2026-10-08', customer: 'Nayeem Chowdhury', item: 'DeepCool AK400', totalNum: 3100, total: '৳ 3,100', profitNum: 450, profit: '৳ 450', margin: 16.9, status: 'Sold', staff: 'Mahadi' },
];

export default function Part1Showcase({ showToast }) {
  const { appConfirm, appPrompt } = useDialog();

  // State management
  const [salesList, setSalesList] = useState(INITIAL_SAMPLE_SALES);
  const [searchTerm, setSearchTerm] = useState('');
  const [historyRange, setHistoryRange] = useState('month');
  const [pin, setPin] = useState(['', '', '', '']);
  const [pinCompletedVal, setPinCompletedVal] = useState(null);
  const [selectedShop, setSelectedShop] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isLoadingBtn, setIsLoadingBtn] = useState(false);

  // Table sorting & pagination
  const [tablePage, setTablePage] = useState(1);
  const rowsPerPage = 3;
  const [sortDescriptor, setSortDescriptor] = useState({ column: 'date', direction: 'descending' });

  // Dialog result telemetry
  const [lastDialogResult, setLastDialogResult] = useState(null);

  // Filter & sort table items
  const filteredSales = useMemo(() => {
    let result = [...salesList];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        s =>
          s.id.toLowerCase().includes(q) ||
          s.customer.toLowerCase().includes(q) ||
          s.item.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let first = a[sortDescriptor.column] || a.totalNum || '';
      let second = b[sortDescriptor.column] || b.totalNum || '';

      if (sortDescriptor.column === 'total') {
        first = a.totalNum;
        second = b.totalNum;
      } else if (sortDescriptor.column === 'profit') {
        first = a.profitNum;
        second = b.profitNum;
      }

      let cmp = (parseInt(first) || first) < (parseInt(second) || second) ? -1 : 1;
      if (sortDescriptor.direction === 'descending') {
        cmp *= -1;
      }
      return cmp;
    });

    return result;
  }, [salesList, searchTerm, sortDescriptor]);

  const totalPages = Math.ceil(filteredSales.length / rowsPerPage) || 1;
  const paginatedSales = useMemo(() => {
    const start = (tablePage - 1) * rowsPerPage;
    return filteredSales.slice(start, start + rowsPerPage);
  }, [filteredSales, tablePage]);

  // Dialog test actions
  const testConfirmDialog = async (isDanger = false) => {
    const result = await appConfirm({
      title: isDanger ? 'Dangerous Action Confirmation' : 'System Update Confirmation',
      message: isDanger
        ? 'Are you sure you want to permanently delete this record? This action cannot be undone.'
        : 'Do you want to apply these inventory ledger changes?',
      confirmText: isDanger ? 'Delete Record' : 'Confirm',
      cancelText: 'Cancel',
      danger: isDanger
    });

    setLastDialogResult({
      type: isDanger ? 'appConfirm (Danger)' : 'appConfirm',
      value: result ? 'true (Confirmed)' : 'false (Cancelled)',
      isSuccess: Boolean(result)
    });

    showToast?.(result ? 'Dialog confirmed (true)' : 'Dialog cancelled (false)');
  };

  const testPromptDialog = async () => {
    const result = await appPrompt({
      title: 'Correction Reason Required',
      message: 'Please specify the ledger adjustment reason before saving:',
      placeholder: 'e.g. Return credit adjustment',
      defaultValue: 'Return credit adjustment',
      confirmText: 'Save Reason'
    });

    setLastDialogResult({
      type: 'appPrompt',
      value: result !== null ? `"${result}"` : 'null (Cancelled)',
      isSuccess: result !== null
    });

    showToast?.(result !== null ? `Prompt submitted: "${result}"` : 'Prompt cancelled (null)');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Introduction Card */}
      <Card className="border border-primary-200/50 bg-gradient-to-r from-primary-50/50 via-background to-content1 dark:from-primary-950/20 shadow-sm">
        <CardBody className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Chip size="sm" color="primary" variant="flat" startContent={<Sparkles className="w-3.5 h-3.5" />}>
                  Component Suite Live Sandbox
                </Chip>
                <span className="text-xs text-default-400 font-medium">HeroUI Element Library</span>
              </div>
              <h2 className="text-xl font-bold font-display text-foreground">
                HeroUI Elements Verification Suite
              </h2>
              <p className="text-xs text-default-500 mt-1 max-w-2xl leading-relaxed">
                Every component on this page is interactive. Test buttons, range toggles, input filters, select dropdowns, 4-digit PIN auto-focus, real table pagination/sorting, and promise dialogs below.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                color="primary"
                variant="shadow"
                size="sm"
                onPress={() => testConfirmDialog(false)}
              >
                Test Dialog Modal
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 1. CARDS, STATS & METRICS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-default-700">
              1. KPI Stat Cards & Margin Badges
            </h3>
          </div>
          <span className="text-xs text-default-400">HeroUI Card & Chip</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Yesterday's Sales"
            value="৳ 38,450"
            subLabel="Gross Profit"
            subValue="৳ 5,820 (17.8%)"
            comparisonText="+12.4%"
            comparisonType="up"
          />
          <MetricCard
            label="This Month"
            value="৳ 4,12,800"
            subLabel="Gross Profit"
            subValue="৳ 58,400 (16.4%)"
            comparisonText="+8.2% vs last month"
            comparisonType="up"
            forecastText="Projected month end: ৳ 7,85,000"
          />
          <MetricCard
            label="This Year (2026)"
            value="৳ 42,90,500"
            subLabel="Gross Profit"
            subValue="৳ 6,15,000 (16.7%)"
            comparisonText="-2.1% vs last year"
            comparisonType="down"
            forecastText="Projected year end: ৳ 52,00,000"
          />
        </div>
      </section>

      {/* 2. BUTTONS & INTERACTIVE CONTROLS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-default-700">
              2. Button Styles & Interactive States
            </h3>
          </div>
          <span className="text-xs text-default-400">HeroUI Button & ButtonGroup</span>
        </div>
        <Card className="border border-default-200/70 shadow-sm bg-content1">
          <CardBody className="p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                color="primary"
                variant="solid"
                size="sm"
                startContent={<Plus className="w-4 h-4" />}
                onPress={() => showToast?.("Primary Solid button clicked")}
              >
                Primary Solid
              </Button>

              <Button
                color="primary"
                variant="shadow"
                size="sm"
                onPress={() => showToast?.("Primary Shadow button clicked")}
              >
                Primary Shadow
              </Button>

              <Button
                variant="bordered"
                size="sm"
                onPress={() => showToast?.("Ghost / Bordered button clicked")}
              >
                Ghost / Bordered
              </Button>

              <Button
                color="danger"
                variant="flat"
                size="sm"
                startContent={<Trash2 className="w-4 h-4" />}
                onPress={() => testConfirmDialog(true)}
              >
                Danger Flat
              </Button>

              <Button
                color="secondary"
                size="sm"
                isLoading={isLoadingBtn}
                onPress={() => {
                  setIsLoadingBtn(true);
                  setTimeout(() => {
                    setIsLoadingBtn(false);
                    showToast?.("Async action completed!");
                  }, 1200);
                }}
              >
                {isLoadingBtn ? "Processing..." : "Click For Loading State"}
              </Button>

              <Tooltip content="Print invoice (A4)">
                <Button
                  isIconOnly
                  variant="flat"
                  size="sm"
                  aria-label="Print"
                  onPress={() => showToast?.("Opening A4 official invoice print preview...")}
                >
                  <Printer className="w-4 h-4 text-default-600" />
                </Button>
              </Tooltip>
            </div>

            <Divider className="my-2" />

            {/* Interactive Range Switcher */}
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs text-default-500 font-medium">History Range Switcher:</span>
              <ButtonGroup size="sm" variant="flat" color="primary">
                {['day', 'month', 'year', 'custom'].map((mode) => (
                  <Button
                    key={mode}
                    className={
                      historyRange === mode
                        ? 'bg-primary text-white font-bold shadow-sm'
                        : 'text-default-600'
                    }
                    onPress={() => {
                      setHistoryRange(mode);
                      showToast?.(`Switched history period to: ${mode.toUpperCase()}`);
                    }}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </ButtonGroup>
              <Chip size="sm" variant="flat" color="primary" className="text-[11px] font-mono">
                Active: {historyRange}
              </Chip>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* 3. INPUTS & FORM ELEMENTS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-default-700">
              3. Form Inputs, Selectors & 4-Digit PIN
            </h3>
          </div>
          <span className="text-xs text-default-400">HeroUI Input, Select, Autocomplete</span>
        </div>
        <Card className="border border-default-200/70 shadow-sm bg-content1">
          <CardBody className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Live Search Input that filters the table */}
              <Input
                size="sm"
                variant="bordered"
                label="Search Products / Invoices"
                placeholder="Type customer, item, or ID..."
                value={searchTerm}
                onValueChange={(val) => {
                  setSearchTerm(val);
                  setTablePage(1); // reset to page 1 on filter
                }}
                isClearable
                onClear={() => setSearchTerm('')}
                startContent={<Search className="w-4 h-4 text-default-400" />}
                description={searchTerm ? `Filtering table: "${searchTerm}"` : "Live filters table below"}
              />

              {/* Working HeroUI Select */}
              <div className="space-y-1">
                <Select
                  size="sm"
                  variant="bordered"
                  label="Supplier Shop"
                  placeholder="Select a supplier"
                  selectedKeys={selectedShop ? new Set([selectedShop]) : new Set([])}
                  onSelectionChange={(keys) => {
                    const chosen = Array.from(keys)[0] || '';
                    setSelectedShop(chosen);
                    showToast?.(`Selected shop: ${chosen || 'None'}`);
                  }}
                  startContent={<Store className="w-4 h-4 text-default-400" />}
                >
                  <SelectItem key="liton" textValue="Liton Enterprise">Liton Enterprise</SelectItem>
                  <SelectItem key="rb" textValue="RB Computer Supply">RB Computer Supply</SelectItem>
                  <SelectItem key="arif" textValue="Arif Technology">Arif Technology</SelectItem>
                  <SelectItem key="rv" textValue="RV Components">RV Components</SelectItem>
                  <SelectItem key="sm" textValue="SM Accessories">SM Accessories</SelectItem>
                </Select>
                {selectedShop && (
                  <span className="text-[11px] text-primary font-medium block">
                    Active supplier: <b>{selectedShop}</b>
                  </span>
                )}
              </div>

              {/* Working HeroUI Autocomplete */}
              <div className="space-y-1">
                <Autocomplete
                  size="sm"
                  variant="bordered"
                  label="Product Quick Search"
                  placeholder="Search and select product..."
                  startContent={<Tag className="w-4 h-4 text-default-400" />}
                  onSelectionChange={(key) => {
                    const match = INITIAL_SAMPLE_PRODUCTS.find(p => p.id === key);
                    setSelectedProduct(match || null);
                    if (match) {
                      showToast?.(`Selected: ${match.name} (${match.price})`);
                    }
                  }}
                >
                  {INITIAL_SAMPLE_PRODUCTS.map((prod) => (
                    <AutocompleteItem key={prod.id} textValue={prod.name}>
                      <div className="flex justify-between items-center text-xs">
                        <span className="truncate max-w-[180px]">{prod.name}</span>
                        <span className="font-semibold text-primary">{prod.price}</span>
                      </div>
                    </AutocompleteItem>
                  ))}
                </Autocomplete>
                {selectedProduct && (
                  <span className="text-[11px] text-success-600 font-medium block truncate">
                    Picked: <b>{selectedProduct.name}</b> ({selectedProduct.price})
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <Textarea
                  size="sm"
                  variant="bordered"
                  label="Customer Address / Warranty Notes"
                  placeholder="Enter serial notes or delivery details..."
                  minRows={2}
                  value={notes}
                  onValueChange={setNotes}
                />
                <div className="text-[11px] text-default-400 text-right mt-1">
                  {notes.length} characters entered
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-default-600 block">Payment Method Selector:</span>
                <RadioGroup
                  orientation="horizontal"
                  size="sm"
                  value={paymentMethod}
                  onValueChange={(val) => {
                    setPaymentMethod(val);
                    showToast?.(`Payment method set to: ${val.toUpperCase()}`);
                  }}
                  className="gap-4"
                >
                  <Radio value="cash">Cash</Radio>
                  <Radio value="bkash">bKash</Radio>
                  <Radio value="nagad">Nagad</Radio>
                  <Radio value="bank">Bank</Radio>
                  <Radio value="due">Credit / Due</Radio>
                </RadioGroup>

                {/* Working 4-Digit PIN with instant feedback */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-default-600 block">
                      4-Digit Quick PIN Input:
                    </span>
                    {pinCompletedVal && (
                      <Chip size="sm" color="success" variant="flat" className="text-[10px] font-mono font-bold">
                        PIN: {pinCompletedVal}
                      </Chip>
                    )}
                  </div>
                  <div className="inline-block">
                    <PinInput
                      value={pin}
                      onChange={setPin}
                      onComplete={(val) => {
                        setPinCompletedVal(val);
                        showToast?.(`PIN Entered: ${val}`);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* 4. DATA TABLE & OVERLAYS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-default-700">
              4. Data Table, Sorting & Row Actions
            </h3>
          </div>
          <span className="text-xs text-default-400">
            {filteredSales.length} items (Page {tablePage} of {totalPages})
          </span>
        </div>
        <Card className="border border-default-200/70 shadow-sm bg-content1 overflow-hidden">
          <Table
            aria-label="Sales Records Table"
            isStriped
            isHeaderSticky
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
            classNames={{
              th: "bg-default-100 text-default-600 font-bold text-xs cursor-pointer select-none",
              td: "text-xs py-3"
            }}
          >
            <TableHeader>
              <TableColumn key="id" allowsSorting>INVOICE #</TableColumn>
              <TableColumn key="date" allowsSorting>DATE</TableColumn>
              <TableColumn key="customer" allowsSorting>CUSTOMER</TableColumn>
              <TableColumn key="item">ITEM</TableColumn>
              <TableColumn key="total" allowsSorting>TOTAL</TableColumn>
              <TableColumn key="profit" allowsSorting>PROFIT</TableColumn>
              <TableColumn key="margin">MARGIN</TableColumn>
              <TableColumn key="status">STATUS</TableColumn>
              <TableColumn key="actions" align="center">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No records matching search query.">
              {paginatedSales.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-semibold text-primary">{row.id}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell className="font-medium">{row.customer}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{row.item}</TableCell>
                  <TableCell className="font-semibold">{row.total}</TableCell>
                  <TableCell className="text-success-600 font-medium">{row.profit}</TableCell>
                  <TableCell>
                    <StatusChip type="profit" value={row.margin} />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={row.status} />
                  </TableCell>
                  <TableCell>
                    <Dropdown placement="bottom-end">
                      <DropdownTrigger>
                        <Button isIconOnly size="sm" variant="light" aria-label="Actions">
                          <MoreVertical className="w-4 h-4 text-default-500" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Row Actions">
                        <DropdownItem
                          key="view"
                          startContent={<Eye className="w-4 h-4 text-primary" />}
                          onPress={() => showToast?.(`Viewing Invoice: ${row.id} (${row.customer})`)}
                        >
                          View Invoice
                        </DropdownItem>
                        <DropdownItem
                          key="print"
                          startContent={<Printer className="w-4 h-4 text-default-600" />}
                          onPress={() => showToast?.(`Printing official A4 invoice for ${row.id}`)}
                        >
                          Print Invoice (A4)
                        </DropdownItem>
                        <DropdownItem
                          key="edit"
                          startContent={<Edit3 className="w-4 h-4 text-warning-500" />}
                          onPress={async () => {
                            const newCust = await appPrompt({
                              title: `Edit Customer: ${row.id}`,
                              message: 'Update customer name for this record:',
                              defaultValue: row.customer
                            });
                            if (newCust) {
                              setSalesList(prev =>
                                prev.map(s => s.id === row.id ? { ...s, customer: newCust } : s)
                              );
                              showToast?.(`Updated customer to: "${newCust}"`);
                            }
                          }}
                        >
                          Edit Record
                        </DropdownItem>
                        <DropdownItem
                          key="delete"
                          className="text-danger"
                          color="danger"
                          startContent={<Trash2 className="w-4 h-4" />}
                          onPress={async () => {
                            const confirmed = await appConfirm({
                              title: `Delete Record ${row.id}?`,
                              message: `Are you sure you want to permanently delete sale record for ${row.customer} (${row.total})?`,
                              danger: true,
                              confirmText: 'Delete Record'
                            });
                            if (confirmed) {
                              setSalesList(prev => prev.filter(s => s.id !== row.id));
                              showToast?.(`Deleted ${row.id} from ledger.`);
                            }
                          }}
                        >
                          Delete Record
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Real Pagination Controls */}
          <div className="p-3 border-t border-default-100 flex items-center justify-between">
            <span className="text-xs text-default-400">
              Showing {paginatedSales.length} of {filteredSales.length} records
            </span>
            <Pagination
              size="sm"
              color="primary"
              page={tablePage}
              total={totalPages}
              onChange={setTablePage}
            />
          </div>
        </Card>
      </section>

      {/* 5. DIALOG TRIGGER CONTROLS WITH LIVE ASYNC FEEDBACK */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-default-700">
              5. Custom Modal Dialogs (appConfirm & appPrompt Replacements)
            </h3>
          </div>
          <span className="text-xs text-default-400">Promise-based HeroUI Modal</span>
        </div>
        <Card className="border border-default-200/70 shadow-sm bg-content1">
          <CardBody className="p-5 space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
              <Button
                color="danger"
                variant="flat"
                size="sm"
                onPress={() => testConfirmDialog(true)}
              >
                Test Dangerous Confirm Dialog
              </Button>
              <Button
                color="primary"
                variant="flat"
                size="sm"
                onPress={testPromptDialog}
              >
                Test appPrompt Input Dialog
              </Button>
              <Button
                variant="bordered"
                size="sm"
                onPress={() => showToast?.("Test system notification toast executed successfully!")}
              >
                Test Notification Toast
              </Button>
            </div>

            {/* Live async dialog return value display */}
            <div className="p-3.5 rounded-xl bg-default-50 border border-default-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">Last Dialog Execution Result:</span>
              </div>
              {lastDialogResult ? (
                <div className="flex items-center gap-2">
                  <span className="text-default-500 font-mono text-[11px]">{lastDialogResult.type}:</span>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={lastDialogResult.isSuccess ? "success" : "default"}
                    startContent={
                      lastDialogResult.isSuccess ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-success-500" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-default-400" />
                      )
                    }
                    className="font-mono text-xs font-bold"
                  >
                    {lastDialogResult.value}
                  </Chip>
                </div>
              ) : (
                <span className="text-default-400 italic">No dialog invoked yet. Click a test button above.</span>
              )}
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
