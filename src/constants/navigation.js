import {
  LayoutDashboard,
  PlusCircle,
  History,
  Box,
  Tag,
  Truck,
  ShoppingCart,
  Receipt,
  FileText,
  Download,
  ShieldCheck
} from 'lucide-react';

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '#dashboard' },
  { key: 'addsale', label: 'Add sale', icon: PlusCircle, href: '#add-sale' },
  { key: 'history', label: 'History', icon: History, href: '#history' },
  { key: 'tracker', label: 'Product tracker', icon: Box, href: '#tracker' },
  { key: 'pricelist', label: 'Price list', icon: Tag, href: '#price-list' },
  { key: 'pmbrings', label: 'PM Brings', icon: Truck, href: '#pm-brings' },
  { key: 'purchases', label: 'Purchases', icon: ShoppingCart, href: '#purchases' },
  { key: 'expenses', label: 'Expenses', icon: Receipt, href: '#expenses' },
  { key: 'invoice', label: 'Invoice', icon: FileText, href: '#invoices' },
  { key: 'export', label: 'Export', icon: Download, href: '#export' },
  { key: 'audit', label: 'Audit log', icon: ShieldCheck, href: '#audit-log' },
];
