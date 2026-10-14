import React, { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Tabs,
  Tab,
  Input,
  Button,
  Chip
} from '@heroui/react';
import { Tag, Layers, Plus, Edit2, Trash2, X } from 'lucide-react';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../context/DialogContext';
import { DEFAULT_CATALOG_BRANDS, DEFAULT_CATALOG_TYPES } from '../../utils/priceListHelpers';

export default function ManageBrandsModal({
  isOpen,
  onClose,
  showToast
}) {
  const { user } = useAuth();
  const { priceList = [], priceBrands = [], priceTypes = [], syncAllData } = useData();
  const { appConfirm, appPrompt } = useDialog();

  const [activeTab, setActiveTab] = useState('brands');
  const [newBrandName, setNewBrandName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');

  const activeBrands = (priceBrands && priceBrands.length) ? priceBrands : DEFAULT_CATALOG_BRANDS;
  const activeTypes = (priceTypes && priceTypes.length) ? priceTypes : DEFAULT_CATALOG_TYPES;

  // Add Brand
  const handleAddBrand = async (e) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;

    const trimmed = newBrandName.trim();
    if (activeBrands.some(b => b.toLowerCase() === trimmed.toLowerCase())) {
      showToast?.(`Brand "${trimmed}" already exists.`);
      return;
    }

    const updated = [...activeBrands, trimmed].sort((a, b) => a.localeCompare(b));
    if (firebaseReady && db) {
      try {
        await db.collection('settings').doc('price_list_brands').set({
          brands: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        await logAudit('price_list', 'settings', 'create', null, { brand: trimmed }, user);
        await syncAllData?.();
        setNewBrandName('');
        showToast?.(`Brand "${trimmed}" added`);
      } catch (err) {
        console.error(err);
        showToast?.('Failed to add brand');
      }
    }
  };

  // Edit Brand
  const handleEditBrand = async (oldName) => {
    const newName = await appPrompt({
      title: 'Rename Brand',
      message: `Enter new name for brand "${oldName}":`,
      defaultValue: oldName,
      confirmText: 'Rename'
    });

    if (newName && newName.trim() && newName.trim() !== oldName) {
      const trimmed = newName.trim();
      const updated = activeBrands.map(b => (b === oldName ? trimmed : b)).sort((a, b) => a.localeCompare(b));

      if (firebaseReady && db) {
        try {
          await db.collection('settings').doc('price_list_brands').set({
            brands: updated,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          // Update existing products with old brand name
          const itemsToUpdate = priceList.filter(it => (it.brand || '').toLowerCase() === oldName.toLowerCase());
          const updatePromises = itemsToUpdate.map(it =>
            db.collection('price_list').doc(it.id).update({ brand: trimmed })
          );
          await Promise.all(updatePromises);

          await syncAllData?.();
          showToast?.(`Brand renamed to "${trimmed}"`);
        } catch (err) {
          console.error(err);
          showToast?.('Failed to rename brand');
        }
      }
    }
  };

  // Delete Brand
  const handleDeleteBrand = async (brandToDelete) => {
    const countInUse = priceList.filter(it => (it.brand || '').toLowerCase() === brandToDelete.toLowerCase()).length;
    const confirmed = await appConfirm({
      title: 'Remove Brand',
      message: `Remove brand "${brandToDelete}"?${countInUse > 0 ? ` It is currently used on ${countInUse} products.` : ''}`,
      confirmText: 'Remove Brand',
      danger: true
    });

    if (!confirmed) return;

    const updated = activeBrands.filter(b => b !== brandToDelete);
    if (firebaseReady && db) {
      try {
        await db.collection('settings').doc('price_list_brands').set({
          brands: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        await syncAllData?.();
        showToast?.(`Brand "${brandToDelete}" removed`);
      } catch (err) {
        console.error(err);
        showToast?.('Failed to remove brand');
      }
    }
  };

  // Add Product Type
  const handleAddType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    const trimmed = newTypeName.trim();
    if (activeTypes.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      showToast?.(`Product type "${trimmed}" already exists.`);
      return;
    }

    const updated = [...activeTypes, trimmed].sort((a, b) => a.localeCompare(b));
    if (firebaseReady && db) {
      try {
        await db.collection('settings').doc('price_list_types').set({
          types: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        await logAudit('price_list', 'settings', 'create', null, { type: trimmed }, user);
        await syncAllData?.();
        setNewTypeName('');
        showToast?.(`Product type "${trimmed}" added`);
      } catch (err) {
        console.error(err);
        showToast?.('Failed to add product type');
      }
    }
  };

  // Edit Product Type
  const handleEditType = async (oldName) => {
    const newName = await appPrompt({
      title: 'Rename Product Type',
      message: `Enter new name for product type "${oldName}":`,
      defaultValue: oldName,
      confirmText: 'Rename'
    });

    if (newName && newName.trim() && newName.trim() !== oldName) {
      const trimmed = newName.trim();
      const updated = activeTypes.map(t => (t === oldName ? trimmed : t)).sort((a, b) => a.localeCompare(b));

      if (firebaseReady && db) {
        try {
          await db.collection('settings').doc('price_list_types').set({
            types: updated,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          // Update existing products with old type name
          const itemsToUpdate = priceList.filter(it => (it.type || '').toLowerCase() === oldName.toLowerCase());
          const updatePromises = itemsToUpdate.map(it =>
            db.collection('price_list').doc(it.id).update({ type: trimmed })
          );
          await Promise.all(updatePromises);

          await syncAllData?.();
          showToast?.(`Product type renamed to "${trimmed}"`);
        } catch (err) {
          console.error(err);
          showToast?.('Failed to rename product type');
        }
      }
    }
  };

  // Delete Product Type
  const handleDeleteType = async (typeToDelete) => {
    const countInUse = priceList.filter(it => (it.type || '').toLowerCase() === typeToDelete.toLowerCase()).length;
    const confirmed = await appConfirm({
      title: 'Remove Product Type',
      message: `Remove product type "${typeToDelete}"?${countInUse > 0 ? ` It is currently used on ${countInUse} products.` : ''}`,
      confirmText: 'Remove Type',
      danger: true
    });

    if (!confirmed) return;

    const updated = activeTypes.filter(t => t !== typeToDelete);
    if (firebaseReady && db) {
      try {
        await db.collection('settings').doc('price_list_types').set({
          types: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        await syncAllData?.();
        showToast?.(`Product type "${typeToDelete}" removed`);
      } catch (err) {
        console.error(err);
        showToast?.('Failed to remove product type');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      placement="center"
      classNames={{
        base: "border border-default-200 bg-content1 shadow-2xl rounded-2xl max-h-[85vh] flex flex-col",
        header: "border-b border-default-100 py-4 px-6",
        body: "p-0 flex-1 overflow-hidden flex flex-col",
        footer: "border-t border-default-100 py-3.5 px-6"
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Catalog Taxonomy Manager
              </span>
              <h2 className="text-lg font-bold font-display text-foreground">
                Manage Brands & Types
              </h2>
            </ModalHeader>

            <ModalBody>
              {/* Tabs Switcher */}
              <div className="px-6 pt-3 border-b border-default-100">
                <Tabs
                  selectedKey={activeTab}
                  onSelectionChange={setActiveTab}
                  size="sm"
                  color="primary"
                  variant="underlined"
                  classNames={{
                    tabList: "gap-6 p-0",
                    cursor: "w-full bg-primary"
                  }}
                >
                  <Tab
                    key="brands"
                    title={
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Brands</span>
                        <Chip size="sm" variant="flat" className="h-5 px-1.5 text-[10px]">
                          {activeBrands.length}
                        </Chip>
                      </div>
                    }
                  />
                  <Tab
                    key="types"
                    title={
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Product Types</span>
                        <Chip size="sm" variant="flat" className="h-5 px-1.5 text-[10px]">
                          {activeTypes.length}
                        </Chip>
                      </div>
                    }
                  />
                </Tabs>
              </div>

              {/* Tab 1: Brands Pane */}
              {activeTab === 'brands' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <form onSubmit={handleAddBrand} className="p-4 bg-default-50/60 border-b border-default-100 flex gap-2">
                    <Input
                      size="sm"
                      variant="bordered"
                      placeholder="Add brand name (e.g. Gigabyte, MSI)..."
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      classNames={{ inputWrapper: "h-9 border-default-300" }}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      color="primary"
                      className="font-bold shrink-0 h-9"
                      startContent={<Plus className="w-3.5 h-3.5" />}
                    >
                      Add Brand
                    </Button>
                  </form>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {activeBrands.map(b => {
                      const count = priceList.filter(it => (it.brand || '').toLowerCase() === b.toLowerCase()).length;
                      return (
                        <div
                          key={b}
                          className="flex items-center justify-between p-2.5 px-3 rounded-xl border border-default-200/70 bg-content1 hover:border-default-300 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-sm text-foreground truncate">{b}</span>
                            <span className="text-[11px] text-default-400 font-mono bg-default-100 px-2 py-0.5 rounded-full shrink-0">
                              {count} {count === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => handleEditBrand(b)}
                              className="w-7 h-7 min-w-7 text-default-500 hover:text-primary"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              onPress={() => handleDeleteBrand(b)}
                              className="w-7 h-7 min-w-7 text-danger-500 hover:text-danger-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 2: Product Types Pane */}
              {activeTab === 'types' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <form onSubmit={handleAddType} className="p-4 bg-default-50/60 border-b border-default-100 flex gap-2">
                    <Input
                      size="sm"
                      variant="bordered"
                      placeholder="Add product type (e.g. Graphics Card, Monitor)..."
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      classNames={{ inputWrapper: "h-9 border-default-300" }}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      color="primary"
                      className="font-bold shrink-0 h-9"
                      startContent={<Plus className="w-3.5 h-3.5" />}
                    >
                      Add Type
                    </Button>
                  </form>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {activeTypes.map(t => {
                      const count = priceList.filter(it => (it.type || '').toLowerCase() === t.toLowerCase()).length;
                      return (
                        <div
                          key={t}
                          className="flex items-center justify-between p-2.5 px-3 rounded-xl border border-default-200/70 bg-content1 hover:border-default-300 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-sm text-foreground truncate">{t}</span>
                            <span className="text-[11px] text-default-400 font-mono bg-default-100 px-2 py-0.5 rounded-full shrink-0">
                              {count} {count === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => handleEditType(t)}
                              className="w-7 h-7 min-w-7 text-default-500 hover:text-primary"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              onPress={() => handleDeleteType(t)}
                              className="w-7 h-7 min-w-7 text-danger-500 hover:text-danger-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </ModalBody>

            <ModalFooter className="flex justify-end">
              <Button
                variant="flat"
                color="primary"
                size="sm"
                onPress={onClose}
                className="font-bold"
              >
                Done
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
