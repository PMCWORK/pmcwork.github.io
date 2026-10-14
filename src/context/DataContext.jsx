import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, firebaseReady } from '../services/firebase';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  const [sales, setSales] = useState([]);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [priceList, setPriceList] = useState([]);
  const [priceBrands, setPriceBrands] = useState([]);
  const [priceTypes, setPriceTypes] = useState([]);
  const [pmBrings, setPmBrings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [supplierShops, setSupplierShops] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [purchasePayments, setPurchasePayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const loadSales = async () => {
    if (!firebaseReady || !db) return [];
    try {
      const snap = await db.collection('sales').orderBy('date', 'desc').get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSales(list);
      return list;
    } catch (e) {
      console.warn('loadSales error:', e);
      return [];
    }
  };

  const loadShops = async () => {
    if (!firebaseReady || !db) return [];
    try {
      const snap = await db.collection('shops').get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setShops(list);
      return list;
    } catch (e) {
      console.warn('loadShops error:', e);
      return [];
    }
  };

  const loadProducts = async () => {
    if (!firebaseReady || !db) return [];
    try {
      const snap = await db.collection('product_tracker').get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(list);
      return list;
    } catch (e) {
      console.warn('loadProducts error:', e);
      return [];
    }
  };

  const loadPriceList = async () => {
    if (!firebaseReady || !db) return [];
    try {
      const snap = await db.collection('price_list').get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPriceList(list);
      return list;
    } catch (e) {
      console.warn('loadPriceList error:', e);
      return [];
    }
  };

  const loadPriceBrandsAndTypes = async () => {
    if (!firebaseReady || !db) return;
    try {
      const brandDoc = await db.collection('settings').doc('price_list_brands').get();
      if (brandDoc.exists && Array.isArray(brandDoc.data().brands)) {
        setPriceBrands(brandDoc.data().brands);
      }
      const typeDoc = await db.collection('settings').doc('price_list_types').get();
      if (typeDoc.exists && Array.isArray(typeDoc.data().types)) {
        setPriceTypes(typeDoc.data().types);
      }
    } catch (e) {
      console.warn('loadPriceBrandsAndTypes error:', e);
    }
  };

  const loadPmBrings = async () => {
    if (!firebaseReady || !db) return [];
    try {
      const snap = await db.collection('pm_brings').get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPmBrings(list);
      return list;
    } catch (e) {
      console.warn('loadPmBrings error:', e);
      return [];
    }
  };

  const loadInvoices = async () => {
    if (!firebaseReady || !db) return [];
    try {
      const snap = await db.collection('invoices').orderBy('date', 'desc').get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInvoices(list);
      return list;
    } catch (e) {
      console.warn('loadInvoices error:', e);
      return [];
    }
  };

  const loadPurchasesAndSuppliers = async () => {
    if (!firebaseReady || !db) return;
    try {
      const [shopSnap, purchSnap, paySnap] = await Promise.all([
        db.collection('supplier_shops').get(),
        db.collection('purchases').get(),
        db.collection('purchase_payments').get()
      ]);
      setSupplierShops(shopSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPurchases(purchSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPurchasePayments(paySnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn('loadPurchasesAndSuppliers error:', e);
    }
  };

  const loadExpenses = async () => {
    if (!firebaseReady || !db) return [];
    try {
      const snap = await db.collection('expenses').get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setExpenses(list);
      return list;
    } catch (e) {
      console.warn('loadExpenses error:', e);
      return [];
    }
  };

  const loadAuditLog = async () => {
    if (!firebaseReady || !db) return [];
    try {
      const snap = await db.collection('audit_log').orderBy('timestampMillis', 'desc').limit(200).get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAuditLog(list);
      return list;
    } catch (e) {
      console.warn('loadAuditLog error:', e);
      return [];
    }
  };

  const loadSettlements = async () => {
    if (!firebaseReady || !db) return [];
    try {
      const snap = await db.collection('monthly_settlements').get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.month || '').localeCompare(a.month || ''));
      setSettlements(list);
      return list;
    } catch (e) {
      console.warn('loadSettlements error:', e);
      return [];
    }
  };

  const syncAllData = useCallback(async () => {
    if (!firebaseReady || !db) return;
    setIsLoading(true);
    try {
      await Promise.all([
        loadSales(),
        loadShops(),
        loadProducts(),
        loadPriceList(),
        loadPriceBrandsAndTypes(),
        loadPmBrings(),
        loadInvoices(),
        loadPurchasesAndSuppliers(),
        loadExpenses(),
        loadSettlements(),
        loadAuditLog()
      ]);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('syncAllData error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Synchronize when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      syncAllData();
    }
  }, [isAuthenticated, syncAllData]);

  return (
    <DataContext.Provider
      value={{
        sales,
        setSales,
        shops,
        setShops,
        products,
        setProducts,
        priceList,
        setPriceList,
        priceBrands,
        priceTypes,
        pmBrings,
        setPmBrings,
        invoices,
        setInvoices,
        supplierShops,
        purchases,
        purchasePayments,
        expenses,
        setExpenses,
        auditLog,
        settlements,
        loadExpenses,
        loadSettlements,
        loadInvoices,
        loadProducts,
        loadPmBrings,
        isLoading,
        lastSyncTime,
        syncAllData
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
