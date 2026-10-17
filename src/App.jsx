import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import { NAV_ITEMS } from './constants/navigation';
import Topbar from './components/layout/Topbar';
import ConfigBanner from './components/layout/ConfigBanner';
import DashboardView from './components/dashboard/DashboardView';
import AddSaleView from './components/addsale/AddSaleView';
import HistoryView from './components/history/HistoryView';
import TrackerView from './components/tracker/TrackerView';
import PriceListView from './components/pricelist/PriceListView';
import PmBringsView from './components/pmbrings/PmBringsView';
import PurchasesView from './components/purchases/PurchasesView';
import ExpensesView from './components/expenses/ExpensesView';
import InvoicesView from './components/invoices/InvoicesView';
import ExportView from './components/export/ExportView';
import AuditLogView from './components/audit/AuditLogView';
import AuthGate from './components/auth/AuthGate';
import ShopSettingsModal from './components/settings/ShopSettingsModal';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { useDialog } from './context/DialogContext';
import { Card, CardBody, Button, Chip, Tabs, Tab } from '@heroui/react';
import { Sparkles, ArrowRight, RefreshCw, Database } from 'lucide-react';
import { initDropdownTypeahead } from './utils/dropdownTypeahead';

export default function App() {
  const { user, isAuthenticated } = useAuth();
  const {
    sales,
    products,
    purchases,
    expenses,
    isLoading: isSyncingData,
    lastSyncTime,
    syncAllData
  } = useData();
  const { appConfirm } = useDialog();

  // Theme state with localStorage persistence
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('pmc-theme');
      if (saved) return saved === 'dark';
    } catch (e) {}
    return document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Active view state
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedDateForAddSale, setSelectedDateForAddSale] = useState(null);

  // Settings Modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsModalInitialView, setSettingsModalInitialView] = useState('notifications');

  const handleOpenSettings = (view = 'notifications') => {
    setSettingsModalInitialView(view);
    setIsSettingsModalOpen(true);
  };

  // Simple toast state
  const [toastMessage, setToastMessage] = useState(null);

  // Initialize keyboard dropdown typeahead cycling sitewide
  useEffect(() => {
    initDropdownTypeahead();
  }, []);

  // Sync theme changes with DOM and localStorage
  useEffect(() => {
    const themeName = isDark ? 'dark' : 'light';
    try {
      localStorage.setItem('pmc-theme', themeName);
    } catch (e) {}

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
    }
  }, [isDark]);

  // Sync hash routing on window load
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const match = NAV_ITEMS.find(item => item.href === `#${hash}` || item.key === hash);
      if (match) {
        setActiveView(match.key);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleBannerConfirmTest = async () => {
    const result = await appConfirm({
      title: "Global Dialog Test",
      message: "Testing promise-based appConfirm dialog triggered from the top banner. Did this render properly?",
      confirmText: "Yes, Looks Great",
      cancelText: "Cancel",
      danger: false
    });
    showToast(result ? "Confirmed (true)" : "Cancelled (false)");
  };

  const currentNav = NAV_ITEMS.find(n => n.key === activeView) || NAV_ITEMS[0];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-200">
      {/* AUTH GATE MODAL OVERLAY */}
      <AuthGate />

      {/* 1. HEROUI SIDEBAR */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isDark={isDark}
        setIsDark={setIsDark}
        onOpenSettings={handleOpenSettings}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 px-3 py-2.5 sm:px-6 sm:py-3.5 overflow-y-auto h-screen overscroll-contain scroll-smooth">
        {/* 2. TOPBAR */}
        <Topbar
          title={currentNav.label}
          eyebrow={activeView === 'dashboard' ? 'PM Computers · Management System' : null}
          date={activeView === 'addsale' && selectedDateForAddSale ? selectedDateForAddSale : null}
          isDark={isDark}
          onToggleTheme={() => setIsDark(prev => !prev)}
          onOpenNotifications={() => handleOpenSettings('notifications')}
        />

        {/* 3. STEP STATUS BANNER - Only show when authentication is needed */}
        {!isAuthenticated && (
          <ConfigBanner
            title="Authentication Required"
            message="Please sign in with Google or 4-digit PIN (1234 or 6666) to record sales."
            type="warning"
            actionText={isSyncingData ? "Syncing..." : "Sync Firestore"}
            onAction={() => syncAllData()}
          />
        )}

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <Card className="bg-primary-900/90 text-white shadow-xl border border-primary-500/30 px-4 py-2.5 flex flex-row items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-success-400 shrink-0"></span>
              <span className="text-xs font-semibold">{toastMessage}</span>
            </Card>
          </div>
        )}

        {/* VIEW BODY */}
        {activeView === 'dashboard' ? (
          <DashboardView
            isDark={isDark}
            onNavigateToAddSale={(iso) => {
              setSelectedDateForAddSale(iso);
              setActiveView('addsale');
              window.location.hash = '#add-sale';
            }}
          />
        ) : activeView === 'addsale' ? (
          <AddSaleView
            isDark={isDark}
            initialDate={selectedDateForAddSale}
            onDateChange={(d) => setSelectedDateForAddSale(d)}
            showToast={showToast}
          />
        ) : activeView === 'history' ? (
          <HistoryView showToast={showToast} />
        ) : activeView === 'tracker' ? (
          <TrackerView showToast={showToast} />
        ) : activeView === 'pricelist' ? (
          <PriceListView showToast={showToast} />
        ) : activeView === 'pmbrings' ? (
          <PmBringsView showToast={showToast} />
        ) : activeView === 'purchases' ? (
          <PurchasesView showToast={showToast} />
        ) : activeView === 'expenses' ? (
          <ExpensesView
            onNavigateToAddSale={(iso) => {
              setSelectedDateForAddSale(iso);
              setActiveView('addsale');
              window.location.hash = '#add-sale';
            }}
          />
        ) : activeView === 'invoice' ? (
          <InvoicesView showToast={showToast} />
        ) : activeView === 'export' ? (
          <ExportView showToast={showToast} />
        ) : activeView === 'audit' ? (
          <AuditLogView showToast={showToast} />
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto py-8 text-center">
            <Card className="border border-default-200 bg-content1 shadow-sm p-8">
              <CardBody className="flex flex-col items-center justify-center space-y-4">
                <Chip color="primary" variant="flat" size="md">
                  {currentNav.label} View
                </Chip>
                <h3 className="text-xl font-bold font-display text-foreground">
                  Module Completed
                </h3>
                <p className="text-xs text-default-500 max-w-md">
                  All 11 modules of the PMC Management System have now been successfully migrated to HeroUI.
                </p>
                <Button
                  color="primary"
                  variant="flat"
                  size="sm"
                  endContent={<ArrowRight className="w-4 h-4" />}
                  onPress={() => setActiveView('dashboard')}
                >
                  Return to Dashboard
                </Button>
              </CardBody>
            </Card>
          </div>
        )}
      </main>

      {/* SHOP SETTINGS & ADMIN PREFERENCES MODAL */}
      <ShopSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialView={settingsModalInitialView}
        showToast={showToast}
      />
    </div>
  );
}
