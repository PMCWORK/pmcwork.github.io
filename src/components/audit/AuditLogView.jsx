import React, { useState, useMemo } from 'react';
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Pagination
} from '@heroui/react';
import {
  ShieldCheck,
  Search,
  RotateCcw,
  RefreshCw,
  Clock,
  User,
  Activity,
  Tag,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import {
  AUDIT_ENTITIES,
  AUDIT_ACTIONS,
  parseAuditItem,
  filterAndSortAuditLog
} from '../../utils/auditHelpers';

const ITEMS_PER_PAGE = 25;

export default function AuditLogView({ showToast }) {
  const { auditLog = [], isLoading, syncAllData } = useData();

  // Filters State
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtered & Sorted Audit Entries
  const filteredEntries = useMemo(() => {
    return filterAndSortAuditLog(auditLog, {
      entityFilter,
      actionFilter,
      search: searchQuery,
      sortOrder
    });
  }, [auditLog, entityFilter, actionFilter, searchQuery, sortOrder]);

  // Reset to page 1 on filter change
  const handleEntityChange = (key) => {
    setEntityFilter(key);
    setCurrentPage(1);
  };

  const handleActionChange = (key) => {
    setActionFilter(key);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setEntityFilter('all');
    setActionFilter('all');
    setSortOrder('newest');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Pagination Slice
  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEntries.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEntries, currentPage]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Topbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase font-extrabold text-default-400 tracking-wider font-display">
            Security &amp; Accountability
          </div>
          <h1 className="text-2xl font-black font-display text-foreground tracking-tight">
            Audit log
          </h1>
        </div>

        <Button
          size="sm"
          variant="flat"
          className="font-bold text-xs"
          startContent={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          onPress={() => syncAllData && syncAllData()}
        >
          Refresh log
        </Button>
      </div>

      {/* Main Container Card */}
      <Card className="border border-default-200 bg-content1 shadow-sm">
        <CardBody className="p-4 sm:p-6 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-default-50 rounded-xl border border-default-200">
            {/* Entity / Category Filter */}
            <Select
              size="sm"
              variant="bordered"
              selectedKeys={new Set([entityFilter])}
              onSelectionChange={(keys) => {
                const k = Array.from(keys)[0];
                if (k) handleEntityChange(String(k));
              }}
              className="w-48"
              aria-label="Filter category"
            >
              {AUDIT_ENTITIES.map((ent) => (
                <SelectItem key={ent.value} textValue={ent.label}>
                  {ent.label}
                </SelectItem>
              ))}
            </Select>

            {/* Action Filter */}
            <Select
              size="sm"
              variant="bordered"
              selectedKeys={new Set([actionFilter])}
              onSelectionChange={(keys) => {
                const k = Array.from(keys)[0];
                if (k) handleActionChange(String(k));
              }}
              className="w-44"
              aria-label="Filter action"
            >
              {AUDIT_ACTIONS.map((act) => (
                <SelectItem key={act.value} textValue={act.label}>
                  {act.label}
                </SelectItem>
              ))}
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
              className="w-44"
              aria-label="Sort audit logs"
            >
              <SelectItem key="newest" textValue="Newest first">Newest first</SelectItem>
              <SelectItem key="oldest" textValue="Oldest first">Oldest first</SelectItem>
              <SelectItem key="entity" textValue="Category (A → Z)">Category (A → Z)</SelectItem>
              <SelectItem key="action" textValue="Action (A → Z)">Action (A → Z)</SelectItem>
            </Select>

            {/* Reset Button */}
            <Button
              size="sm"
              variant="light"
              startContent={<RotateCcw className="w-3.5 h-3.5 text-default-400" />}
              onPress={handleResetFilters}
              className="text-default-500 font-semibold"
            >
              Reset
            </Button>

            {/* Search Input on Right */}
            <div className="ml-auto w-full sm:w-64">
              <Input
                size="sm"
                variant="bordered"
                placeholder="Search logs by item or text..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                startContent={<Search className="w-3.5 h-3.5 text-default-400" />}
                isClearable
                onClear={() => setSearchQuery('')}
              />
            </div>
          </div>

          {/* Activity Count Indicator */}
          <div className="flex items-center justify-between text-xs text-default-400 px-1">
            <span>
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredEntries.length)} of{' '}
              {filteredEntries.length} logged actions
            </span>
            {auditLog.length >= 200 && (
              <span className="text-[11px] text-default-400">
                (Limited to latest 200 security events)
              </span>
            )}
          </div>

          {/* Audit List Stream */}
          <div className="space-y-2 min-h-[320px]">
            {filteredEntries.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-default-200 rounded-xl bg-default-50/50">
                <ShieldCheck className="w-10 h-10 text-default-400 mx-auto mb-2 opacity-50" />
                <h4 className="text-sm font-bold text-foreground">No activity logs found</h4>
                <p className="text-xs text-default-500 mt-1 max-w-sm mx-auto">
                  No logged operations match your current filter criteria.
                </p>
              </div>
            ) : (
              paginatedEntries.map((rawEntry) => {
                const parsed = parseAuditItem(rawEntry);

                // Pick icon per entity type
                const entityIcon = {
                  auth: <ShieldCheck className="w-4 h-4" />,
                  invoice: <Tag className="w-4 h-4" />,
                  sale: <Activity className="w-4 h-4" />,
                  product: <Tag className="w-4 h-4" />,
                  expense: <AlertCircle className="w-4 h-4" />,
                  settlement: <Calendar className="w-4 h-4" />,
                  purchase: <Tag className="w-4 h-4" />,
                  price_list: <Tag className="w-4 h-4" />,
                }[parsed.type] || <Activity className="w-4 h-4" />;

                // Icon background per badge color
                const iconBg = {
                  success: 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400',
                  primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
                  danger:  'bg-danger-100  dark:bg-danger-900/30  text-danger-600  dark:text-danger-400',
                  warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400',
                  default: 'bg-default-100 text-default-500',
                }[parsed.badgeColor] || 'bg-default-100 text-default-500';

                return (
                  <div
                    key={parsed.id || `${parsed.type}_${rawEntry.timestampMillis}`}
                    className="p-3.5 rounded-xl border border-default-200 bg-content2/30 hover:bg-content2/60 transition-colors flex items-start gap-3 shadow-2xs"
                  >
                    {/* Entity Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
                      {entityIcon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">

                      {/* Row 1: Title + Badge + Timestamp */}
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate">
                            {parsed.titleText}
                          </span>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={parsed.badgeColor}
                            className="h-5 text-[10px] font-bold shrink-0"
                          >
                            {parsed.badgeText}
                          </Chip>
                        </div>

                        <div className="text-[11px] text-default-400 flex items-center gap-1 font-mono shrink-0">
                          <Clock className="w-3 h-3" />
                          <span>{parsed.time.dateStr} · {parsed.time.timeStr}</span>
                          {parsed.time.relText && (
                            <span className="text-default-400">({parsed.time.relText})</span>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Author + Category */}
                      <div className="flex items-center gap-2 text-[11px] text-default-400">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="font-medium text-default-500">{parsed.author}</span>
                        <span className="text-default-300">·</span>
                        <span className="capitalize">{parsed.type.replace('_', ' ')}</span>
                      </div>

                      {/* Row 3: Details (create/delete info) */}
                      {parsed.details.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-default-600">
                          {parsed.details.map((d, idx) => (
                            <span key={idx} className="flex items-center gap-1">
                              {idx > 0 && <span className="text-default-300">·</span>}
                              {d}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Row 4: Diffs (update pills) */}
                      {parsed.diffs.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {parsed.diffs.map((diffStr, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-default-100 dark:bg-default-100/80 border border-default-200 text-[11px] font-semibold text-foreground"
                            >
                              {diffStr}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-3 border-t border-default-200">
              <span className="text-xs text-default-400">
                Page {currentPage} of {totalPages}
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
        </CardBody>
      </Card>
    </div>
  );
}
