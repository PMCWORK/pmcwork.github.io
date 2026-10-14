import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Chip,
  Input,
  Switch,
  Tabs,
  Tab,
  Tooltip
} from '@heroui/react';
import {
  Bell,
  Database,
  CalendarCheck,
  Settings,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Send,
  Download,
  Upload,
  RefreshCw,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../context/DialogContext';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import {
  loadNotificationSettings,
  saveNotificationRecipients,
  sendRealTestEmail,
  sendDailySummaryEmail
} from '../../services/emailNotifications';
import {
  downloadJsonBackup,
  executeDatabaseRestore
} from '../../utils/backupHelpers';

export default function ShopSettingsModal({
  isOpen,
  onClose,
  initialView = 'notifications',
  showToast
}) {
  const { user } = useAuth();
  const contextData = useData();
  const {
    sales = [],
    products = [],
    invoices = [],
    expenses = [],
    syncAllData,
    lastSyncTime
  } = contextData || {};
  const { appConfirm } = useDialog();

  // Active Tab: 'notifications' | 'backups' | 'fixed_rates'
  const [selectedTab, setSelectedTab] = useState(
    initialView === 'hub' ? 'notifications' : (initialView || 'notifications')
  );

  // Sub-view in notifications: 'list' | 'editor'
  const [notifySubView, setNotifySubView] = useState('list');
  const [recipients, setRecipients] = useState([]);
  const [editingRecipient, setEditingRecipient] = useState(null);
  const [isEmailMasked, setIsEmailMasked] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Recipient form state
  const [rName, setRName] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rAlertDaily, setRAlertDaily] = useState(true);
  const [rDailyTiming, setRDailyTiming] = useState('23:00');
  const [rIncSales, setRIncSales] = useState(true);
  const [rIncInvoices, setRIncInvoices] = useState(true);
  const [rIncProducts, setRIncProducts] = useState(true);
  const [rIncBrings, setRIncBrings] = useState(true);
  const [rAlertMonthly, setRAlertMonthly] = useState(true);
  const [rAlertYearly, setRAlertYearly] = useState(true);

  // Fixed rates state
  const [shopRent, setShopRent] = useState('5000');
  const [houseRent, setHouseRent] = useState('7000');
  const [piasDailyRate, setPiasDailyRate] = useState('100');
  const [piasRatio, setPiasRatio] = useState('55');
  const [mehediRatio, setMehediRatio] = useState('45');
  const [isSavingRates, setIsSavingRates] = useState(false);

  // Backup restore state
  const [uploadedBackup, setUploadedBackup] = useState(null);
  const [restoreMode, setRestoreMode] = useState('merge');
  const [isRestoring, setIsRestoring] = useState(false);

  // Sync initial view when prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const target = initialView === 'hub' ? 'notifications' : (initialView || 'notifications');
      setSelectedTab(target);
      setNotifySubView('list');
      loadSettings();
    }
  }, [isOpen, initialView]);

  const loadSettings = async () => {
    if (db) {
      // Load Notification Recipients
      const recips = await loadNotificationSettings(db);
      setRecipients(recips);

      // Load Fixed Rates
      try {
        const snap = await db.collection('settings').doc('fixed_rates').get();
        if (snap.exists) {
          const d = snap.data();
          if (d.shopRent !== undefined) setShopRent(String(d.shopRent));
          if (d.houseRent !== undefined) setHouseRent(String(d.houseRent));
          if (d.piasDailyRate !== undefined) setPiasDailyRate(String(d.piasDailyRate));
          if (d.piasRatio !== undefined) setPiasRatio(String(d.piasRatio));
          if (d.mehediRatio !== undefined) setMehediRatio(String(d.mehediRatio));
        }
      } catch (e) {
        console.warn('Failed to load fixed rates:', e);
      }
    }
  };

  // Handle Recipient Form Save
  const handleSaveRecipient = async (e) => {
    e.preventDefault();
    if (!rName.trim() || !rEmail.trim()) {
      showToast?.('Please provide recipient name and email.');
      return;
    }

    const payload = {
      id: editingRecipient?.id || ('recip_' + Date.now()),
      name: rName.trim(),
      email: rEmail.trim(),
      alertDaily: rAlertDaily,
      dailyTiming: rDailyTiming,
      dailyIncSales: rIncSales,
      dailyIncInvoices: rIncInvoices,
      dailyIncProducts: rIncProducts,
      dailyIncBrings: rIncBrings,
      alertMonthly: rAlertMonthly,
      alertYearly: rAlertYearly,
      updatedAt: Date.now()
    };

    let updated = [];
    if (editingRecipient?.id) {
      updated = recipients.map(r => r.id === editingRecipient.id ? payload : r);
    } else {
      updated = [...recipients, payload];
    }

    setRecipients(updated);
    await saveNotificationRecipients(updated, db, user);
    showToast?.(`Recipient "${payload.name}" saved.`);
    setNotifySubView('list');
    setEditingRecipient(null);
  };

  const handleEditRecipient = (r) => {
    setEditingRecipient(r);
    setRName(r.name || '');
    setREmail(r.email || '');
    setRAlertDaily(r.alertDaily !== false);
    setRDailyTiming(r.dailyTiming || '23:00');
    setRIncSales(r.dailyIncSales !== false);
    setRIncInvoices(r.dailyIncInvoices !== false);
    setRIncProducts(r.dailyIncProducts !== false);
    setRIncBrings(r.dailyIncBrings !== false);
    setRAlertMonthly(r.alertMonthly !== false);
    setRAlertYearly(r.alertYearly !== false);
    setNotifySubView('editor');
  };

  const handleDeleteRecipient = async (rId) => {
    const target = recipients.find(x => x.id === rId);
    const confirmed = await appConfirm?.({
      title: 'Remove Email Recipient',
      message: `Are you sure you want to remove ${target?.name || 'this recipient'} (${target?.email}) from receiving notifications?`,
      danger: true
    });

    if (!confirmed) return;

    const updated = recipients.filter(x => x.id !== rId);
    setRecipients(updated);
    await saveNotificationRecipients(updated, db, user);
    showToast?.('Recipient removed.');
  };

  const handleSendTestEmail = async () => {
    if (!rEmail.trim()) {
      showToast?.('Enter an email address first.');
      return;
    }
    setIsSendingTest(true);
    try {
      await sendRealTestEmail(rEmail.trim(), rName.trim() || 'Admin');
      showToast?.(`✓ Live test email sent to ${rEmail}!`);
    } catch (err) {
      console.error(err);
      showToast?.('Failed to send test email: ' + err.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendDailyClosingNow = async (r) => {
    try {
      showToast?.(`Sending daily digest to ${r.email}...`);
      await sendDailySummaryEmail(r, contextData);
      showToast?.(`✓ Daily summary delivered to ${r.email}!`);
    } catch (err) {
      console.error(err);
      showToast?.('Delivery failed: ' + err.message);
    }
  };

  // Fixed Rates Save
  const handleSaveFixedRates = async (e) => {
    e.preventDefault();
    setIsSavingRates(true);
    try {
      const payload = {
        shopRent: parseFloat(shopRent) || 5000,
        houseRent: parseFloat(houseRent) || 7000,
        piasDailyRate: parseFloat(piasDailyRate) || 100,
        piasRatio: parseFloat(piasRatio) || 55,
        mehediRatio: parseFloat(mehediRatio) || 45,
        updatedAt: new Date().toISOString()
      };

      if (firebaseReady && db) {
        await db.collection('settings').doc('fixed_rates').set(payload, { merge: true });
        await logAudit('settings', 'fixed_rates', 'update', null, payload, user);
      }
      try {
        localStorage.setItem('pmc_fixed_rates', JSON.stringify(payload));
      } catch (e) {}

      showToast?.('Fixed rates and partner ratios updated successfully.');
    } catch (err) {
      console.error(err);
      showToast?.('Failed to save fixed rates.');
    } finally {
      setIsSavingRates(false);
    }
  };

  // Backup file upload
  const handleBackupFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result);
        if (parsed?.data && parsed?.meta) {
          setUploadedBackup(parsed);
          showToast?.(`Loaded backup file from ${parsed.meta.exportedDateDisplay || 'export'}`);
        } else {
          showToast?.('Invalid PMC backup JSON format.');
        }
      } catch (err) {
        showToast?.('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!uploadedBackup) return;

    const confirmed = await appConfirm?.({
      title: restoreMode === 'replace' ? 'Confirm Full Database Overwrite' : 'Confirm Safe Database Merge',
      message: restoreMode === 'replace'
        ? 'WARNING: This will replace matching records in active collections with records from the backup file. Proceed?'
        : 'This will safely merge records from the uploaded snapshot into your database. Proceed?',
      danger: restoreMode === 'replace',
      confirmText: restoreMode === 'replace' ? 'Overwrite & Restore' : 'Merge & Restore'
    });

    if (!confirmed) return;

    setIsRestoring(true);
    try {
      await executeDatabaseRestore({
        payload: uploadedBackup,
        mode: restoreMode,
        db,
        user,
        syncAllData,
        logAudit
      });

      showToast?.('Database restored successfully.');
      setUploadedBackup(null);
    } catch (err) {
      console.error(err);
      showToast?.('Restore failed: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      placement="center"
      backdrop="blur"
      hideCloseButton={true}
      classNames={{
        base: "border border-default-200/80 bg-content1 shadow-2xl rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden",
        header: "border-b border-default-100/80 py-3.5 px-5 sm:px-6",
        body: "p-0 flex-1 overflow-y-auto flex flex-col"
      }}
    >
      <ModalContent>
        {() => (
          <>
            {/* STREAMLINED UNIFIED HEADER */}
            <ModalHeader className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  <Settings className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-bold font-display text-foreground m-0 leading-tight">
                    Shop Settings &amp; Preferences
                  </h2>
                  <p className="text-[11px] text-default-400 m-0 mt-0.5">
                    Configure notifications, database snapshots &amp; partner overhead rates
                  </p>
                </div>
              </div>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                radius="sm"
                onPress={onClose}
                className="text-default-400 hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </ModalHeader>

            {/* TABBED NAVIGATION - REPLACES CONFUSING DRILLDOWN HUB */}
            <div className="px-5 sm:px-6 pt-2 border-b border-default-100 bg-default-50/40">
              <Tabs
                selectedKey={selectedTab}
                onSelectionChange={(k) => {
                  setSelectedTab(String(k));
                  setNotifySubView('list');
                }}
                variant="underlined"
                color="primary"
                size="sm"
                classNames={{
                  tabList: "gap-6 w-full relative rounded-none p-0 border-none",
                  cursor: "w-full bg-primary",
                  tab: "max-w-fit px-0 h-10",
                  tabContent: "group-data-[selected=true]:text-primary font-bold text-xs"
                }}
              >
                <Tab
                  key="notifications"
                  title={
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5" />
                      <span>Email Notifications</span>
                      <Chip size="sm" variant="flat" color="primary" className="h-4 text-[9px] px-1 font-bold">
                        {recipients.length}
                      </Chip>
                    </div>
                  }
                />
                <Tab
                  key="backups"
                  title={
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5" />
                      <span>Database &amp; Backups</span>
                    </div>
                  }
                />
                <Tab
                  key="fixed_rates"
                  title={
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span>Fixed Rates &amp; Overhead</span>
                    </div>
                  }
                />
              </Tabs>
            </div>

            {/* TAB CONTENT PANELS */}
            <ModalBody className="p-5 sm:p-6 space-y-4">
              {/* TAB 1: EMAIL NOTIFICATIONS */}
              {selectedTab === 'notifications' && (
                <div className="space-y-4">
                  {notifySubView === 'list' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-default-500 font-medium">
                          Active Recipients ({recipients.length})
                        </span>
                        <Button
                          size="sm"
                          color="primary"
                          radius="sm"
                          className="font-bold text-xs h-7.5"
                          startContent={<Plus className="w-3.5 h-3.5" />}
                          onPress={() => {
                            setEditingRecipient(null);
                            setRName('');
                            setREmail('');
                            setRAlertDaily(true);
                            setRDailyTiming('23:00');
                            setRIncSales(true);
                            setRIncInvoices(true);
                            setRIncProducts(true);
                            setRIncBrings(true);
                            setRAlertMonthly(true);
                            setRAlertYearly(true);
                            setNotifySubView('editor');
                          }}
                        >
                          Add Recipient
                        </Button>
                      </div>

                      {recipients.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-default-200 rounded-xl text-default-400 text-xs">
                          No recipients configured. Click Add Recipient to receive automated summaries.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                          {recipients.map((r) => (
                            <div
                              key={r.id}
                              className="p-3.5 rounded-xl border border-default-200/80 bg-content1 flex items-center justify-between gap-3 shadow-2xs hover:border-default-300 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-foreground truncate">
                                    {r.name}
                                  </span>
                                  {r.alertDaily && (
                                    <Chip size="sm" variant="flat" color="primary" className="h-4.5 text-[9px] font-bold">
                                      Daily {r.dailyTiming || '23:00'}
                                    </Chip>
                                  )}
                                  {r.alertMonthly && (
                                    <Chip size="sm" variant="flat" color="secondary" className="h-4.5 text-[9px] font-bold">
                                      Monthly
                                    </Chip>
                                  )}
                                  {r.alertYearly && (
                                    <Chip size="sm" variant="flat" color="warning" className="h-4.5 text-[9px] font-bold">
                                      Yearly
                                    </Chip>
                                  )}
                                </div>
                                <div className="text-[11px] text-default-400 font-mono mt-0.5 truncate">
                                  {r.email}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Tooltip content="Send Today's Closing Summary Now">
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    radius="sm"
                                    className="text-primary hover:bg-primary-50 dark:hover:bg-primary-950/40 w-7.5 h-7.5 min-w-7.5"
                                    onPress={() => handleSendDailyClosingNow(r)}
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </Button>
                                </Tooltip>
                                <Tooltip content="Edit Recipient">
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    radius="sm"
                                    className="text-default-500 hover:text-foreground w-7.5 h-7.5 min-w-7.5"
                                    onPress={() => handleEditRecipient(r)}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                </Tooltip>
                                <Tooltip content="Remove Recipient" color="danger">
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    color="danger"
                                    radius="sm"
                                    className="text-danger-500 hover:text-danger-600 w-7.5 h-7.5 min-w-7.5"
                                    onPress={() => handleDeleteRecipient(r.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </Tooltip>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* RECIPIENT EDITOR FORM */
                    <form onSubmit={handleSaveRecipient} className="space-y-4">
                      <div className="flex items-center gap-2 pb-1 border-b border-default-100">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          radius="sm"
                          onPress={() => setNotifySubView('list')}
                          className="w-7 h-7 min-w-7"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </Button>
                        <span className="text-xs font-bold text-foreground">
                          {editingRecipient ? `Edit Recipient: ${editingRecipient.name}` : 'Add New Recipient'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-default-600 mb-1.5">
                          Recipient Name / Role <span className="text-danger">*</span>
                        </label>
                        <Input
                          size="sm"
                          variant="bordered"
                          radius="sm"
                          placeholder="e.g. Pias (Partner)"
                          value={rName}
                          onChange={(e) => setRName(e.target.value)}
                          isRequired
                        />
                        <div className="flex gap-1.5 pt-1.5">
                          {['Pias (Partner)', 'Mehedi (Partner)', 'Admin'].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setRName(tag)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold border border-default-200 bg-default-50 hover:bg-default-100 text-default-600 transition-colors cursor-pointer"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-default-600 mb-1.5">
                          Email Address <span className="text-danger">*</span>
                        </label>
                        <Input
                          size="sm"
                          variant="bordered"
                          radius="sm"
                          type={isEmailMasked ? 'password' : 'email'}
                          placeholder="partner@gmail.com"
                          value={rEmail}
                          onChange={(e) => setREmail(e.target.value)}
                          endContent={
                            <button
                              type="button"
                              onClick={() => setIsEmailMasked(p => !p)}
                              className="text-default-400 hover:text-foreground focus:outline-none cursor-pointer"
                            >
                              {isEmailMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          }
                          isRequired
                        />
                      </div>

                      {/* Daily Summary Card */}
                      <div className="p-3.5 rounded-xl border border-default-200 bg-default-50/50 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold text-foreground">
                            Daily Activity Closing Summary
                          </div>
                          <Switch
                            size="sm"
                            isSelected={rAlertDaily}
                            onValueChange={setRAlertDaily}
                          />
                        </div>
                        <p className="text-[11px] text-default-400 leading-snug">
                          Automated closing digest with daily sales profit, operating costs, and line item counts.
                        </p>

                        {rAlertDaily && (
                          <div className="space-y-2.5 pt-2 border-t border-default-200/60">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-default-600 font-medium">Delivery Time:</span>
                              <Input
                                type="time"
                                size="sm"
                                variant="bordered"
                                radius="sm"
                                value={rDailyTiming}
                                onChange={(e) => setRDailyTiming(e.target.value)}
                                className="w-32"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <label className="flex items-center gap-1.5 text-default-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={rIncSales}
                                  onChange={(e) => setRIncSales(e.target.checked)}
                                  className="rounded"
                                />
                                Sales &amp; Margin
                              </label>
                              <label className="flex items-center gap-1.5 text-default-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={rIncInvoices}
                                  onChange={(e) => setRIncInvoices(e.target.checked)}
                                  className="rounded"
                                />
                                Invoices
                              </label>
                              <label className="flex items-center gap-1.5 text-default-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={rIncProducts}
                                  onChange={(e) => setRIncProducts(e.target.checked)}
                                  className="rounded"
                                />
                                Inventory / Serials
                              </label>
                              <label className="flex items-center gap-1.5 text-default-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={rIncBrings}
                                  onChange={(e) => setRIncBrings(e.target.checked)}
                                  className="rounded"
                                />
                                PM Brings
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Monthly & Yearly Toggles */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl border border-default-200 bg-default-50/50 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-foreground">Month-End</div>
                            <div className="text-[10px] text-default-400">Monthly statement</div>
                          </div>
                          <Switch
                            size="sm"
                            isSelected={rAlertMonthly}
                            onValueChange={setRAlertMonthly}
                          />
                        </div>

                        <div className="p-3 rounded-xl border border-default-200 bg-default-50/50 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-foreground">Yearly Digest</div>
                            <div className="text-[10px] text-default-400">Annual overview</div>
                          </div>
                          <Switch
                            size="sm"
                            isSelected={rAlertYearly}
                            onValueChange={setRAlertYearly}
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-default-200">
                        <Button
                          type="button"
                          variant="flat"
                          size="sm"
                          radius="sm"
                          isLoading={isSendingTest}
                          onPress={handleSendTestEmail}
                          startContent={!isSendingTest && <Send className="w-3.5 h-3.5" />}
                          className="text-xs font-semibold"
                        >
                          Send Test Email
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="light"
                            size="sm"
                            radius="sm"
                            onPress={() => setNotifySubView('list')}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            color="primary"
                            size="sm"
                            radius="sm"
                            className="font-bold text-xs"
                          >
                            Save Recipient
                          </Button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 2: DATABASE & BACKUPS */}
              {selectedTab === 'backups' && (
                <div className="space-y-4">
                  {/* Health Banner */}
                  <div className="p-3.5 rounded-xl border border-default-200 bg-default-50/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-primary" />
                        Firestore Live Storage Status
                      </span>
                      <Chip size="sm" variant="flat" color="success" className="h-5 text-[10px] font-bold">
                        ● Firestore Live
                      </Chip>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-content1 border border-default-200/80">
                        <div className="text-[10px] font-bold uppercase text-default-400">Sales</div>
                        <div className="font-numeric font-black text-sm text-foreground mt-0.5">{sales.length}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-content1 border border-default-200/80">
                        <div className="text-[10px] font-bold uppercase text-default-400">Inventory</div>
                        <div className="font-numeric font-black text-sm text-foreground mt-0.5">{products.length}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-content1 border border-default-200/80">
                        <div className="text-[10px] font-bold uppercase text-default-400">Invoices</div>
                        <div className="font-numeric font-black text-sm text-foreground mt-0.5">{invoices.length}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-content1 border border-default-200/80">
                        <div className="text-[10px] font-bold uppercase text-default-400">Expenses</div>
                        <div className="font-numeric font-black text-sm text-foreground mt-0.5">{expenses.length}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-default-400">
                      <span>Last cloud sync: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Active'}</span>
                      <Button
                        size="sm"
                        variant="light"
                        radius="sm"
                        className="h-6 text-[11px] font-bold text-primary"
                        startContent={<RefreshCw className="w-3 h-3" />}
                        onPress={() => syncAllData?.()}
                      >
                        Force Re-Sync
                      </Button>
                    </div>
                  </div>

                  {/* 1-Click Backup Export */}
                  <div className="p-3.5 rounded-xl border border-default-200 bg-content1 space-y-2.5">
                    <div className="text-xs font-bold text-foreground">
                      1-Click Full System Backup
                    </div>
                    <p className="text-[11px] text-default-400 leading-snug">
                      Export all records across all 9 collections into a secure, timestamped JSON snapshot.
                    </p>
                    <div className="pt-1">
                      <Button
                        size="sm"
                        color="primary"
                        radius="sm"
                        className="font-bold text-xs"
                        startContent={<Download className="w-3.5 h-3.5" />}
                        onPress={() => {
                          const fn = downloadJsonBackup(contextData);
                          showToast?.(`Downloaded full backup snapshot: ${fn}`);
                        }}
                      >
                        Download Full Backup (.json)
                      </Button>
                    </div>
                  </div>

                  {/* Restore from JSON */}
                  <div className="p-3.5 rounded-xl border border-default-200 bg-content1 space-y-2.5">
                    <div className="text-xs font-bold text-foreground">
                      Restore Database from Snapshot
                    </div>
                    <p className="text-[11px] text-default-400 leading-snug">
                      Upload a previously exported .json snapshot file to safely merge or restore records.
                    </p>

                    <label className="border-2 border-dashed border-default-300 hover:border-primary rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center block">
                      <Upload className="w-6 h-6 text-default-400 mb-1" />
                      <span className="text-xs font-bold text-foreground">
                        {uploadedBackup ? `Loaded: ${uploadedBackup.meta?.recordCounts?.sales || 0} sales ready` : 'Click or drop .json backup file here'}
                      </span>
                      <span className="text-[10px] text-default-400 mt-0.5">
                        Accepts official PMC .json snapshot exports
                      </span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleBackupFileUpload}
                        className="hidden"
                      />
                    </label>

                    {uploadedBackup && (
                      <div className="p-3 rounded-lg bg-default-100 border border-default-200 text-xs space-y-2 animate-in fade-in duration-150">
                        <div className="font-bold text-foreground flex items-center justify-between">
                          <span>Snapshot Summary</span>
                          <span className="text-primary font-mono text-[11px]">
                            {uploadedBackup.meta?.exportedDateDisplay || 'Verified'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[11px] text-default-500">
                          <div>Sales: <b>{uploadedBackup.data?.sales?.length || 0}</b></div>
                          <div>Invoices: <b>{uploadedBackup.data?.invoices?.length || 0}</b></div>
                          <div>Products: <b>{uploadedBackup.data?.products?.length || 0}</b></div>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-default-200/60">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-default-600 cursor-pointer">
                              <input
                                type="radio"
                                name="rstMode"
                                value="merge"
                                checked={restoreMode === 'merge'}
                                onChange={() => setRestoreMode('merge')}
                              />
                              Merge (Safe)
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-danger-500 cursor-pointer">
                              <input
                                type="radio"
                                name="rstMode"
                                value="replace"
                                checked={restoreMode === 'replace'}
                                onChange={() => setRestoreMode('replace')}
                              />
                              Overwrite
                            </label>
                          </div>

                          <Button
                            size="sm"
                            radius="sm"
                            color={restoreMode === 'replace' ? 'danger' : 'primary'}
                            className="font-bold text-xs"
                            isLoading={isRestoring}
                            onPress={handleExecuteRestore}
                          >
                            Confirm Restore
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: FIXED RATES & OVERHEAD */}
              {selectedTab === 'fixed_rates' && (
                <form onSubmit={handleSaveFixedRates} className="space-y-4">
                  <div className="text-xs text-default-500 pb-1 border-b border-default-100">
                    Default operating overheads &amp; partner profit distribution ratios
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-default-600 mb-1.5">
                      Default Shop Rent (৳ / month) <span className="text-danger">*</span>
                    </label>
                    <Input
                      type="number"
                      size="sm"
                      variant="bordered"
                      radius="sm"
                      value={shopRent}
                      onChange={(e) => setShopRent(e.target.value)}
                      classNames={{ input: "font-numeric font-bold" }}
                      isRequired
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-default-600 mb-1.5">
                      Default Pias House Rent (৳ / month) <span className="text-danger">*</span>
                    </label>
                    <Input
                      type="number"
                      size="sm"
                      variant="bordered"
                      radius="sm"
                      value={houseRent}
                      onChange={(e) => setHouseRent(e.target.value)}
                      classNames={{ input: "font-numeric font-bold" }}
                      isRequired
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-default-600 mb-1.5">
                      Pias Daily Rate (৳ / operating day) <span className="text-danger">*</span>
                    </label>
                    <Input
                      type="number"
                      size="sm"
                      variant="bordered"
                      radius="sm"
                      value={piasDailyRate}
                      onChange={(e) => setPiasDailyRate(e.target.value)}
                      classNames={{ input: "font-numeric font-bold" }}
                      isRequired
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-default-600 mb-1.5">
                        Pias Equity Ratio (%) <span className="text-danger">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        size="sm"
                        variant="bordered"
                        radius="sm"
                        value={piasRatio}
                        onChange={(e) => setPiasRatio(e.target.value)}
                        classNames={{ input: "font-numeric font-bold" }}
                        isRequired
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-default-600 mb-1.5">
                        Mehedi Equity Ratio (%) <span className="text-danger">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        size="sm"
                        variant="bordered"
                        radius="sm"
                        value={mehediRatio}
                        onChange={(e) => setMehediRatio(e.target.value)}
                        classNames={{ input: "font-numeric font-bold" }}
                        isRequired
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-default-200">
                    <Button
                      type="submit"
                      color="primary"
                      size="sm"
                      radius="sm"
                      className="font-bold text-xs"
                      isLoading={isSavingRates}
                    >
                      Save Fixed Rates
                    </Button>
                  </div>
                </form>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
