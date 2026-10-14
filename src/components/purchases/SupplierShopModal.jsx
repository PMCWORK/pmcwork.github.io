import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  Button
} from '@heroui/react';
import { Building2, Save, X } from 'lucide-react';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

export default function SupplierShopModal({
  isOpen,
  onClose,
  shop,
  onSaveSuccess,
  showToast
}) {
  const { user } = useAuth();
  const { syncAllData } = useData();

  const isEditing = Boolean(shop?.id);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (shop) {
        setName(shop.name || '');
        setPhone(shop.phone || '');
        setAddress(shop.address || '');
        setContactPerson(shop.contactPerson || '');
        setNotes(shop.notes || '');
      } else {
        setName('');
        setPhone('');
        setAddress('');
        setContactPerson('');
        setNotes('');
      }
    }
  }, [isOpen, shop]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast?.('Please enter a shop name.');
      return;
    }

    if (!firebaseReady || !db) {
      showToast?.('Firebase offline / unconfigured');
      return;
    }

    setIsSaving(true);
    try {
      const nowISO = new Date().toISOString();
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        contactPerson: contactPerson.trim(),
        notes: notes.trim(),
        updatedAt: nowISO
      };

      if (isEditing) {
        const before = { ...shop };
        await db.collection('supplier_shops').doc(shop.id).update(payload);
        await logAudit('supplier_shop', shop.id, 'update', before, payload, user);
        showToast?.(`Supplier shop "${name.trim()}" updated`);
      } else {
        payload.createdAt = nowISO;
        const ref = await db.collection('supplier_shops').add(payload);
        await logAudit('supplier_shop', ref.id, 'create', null, payload, user);
        showToast?.(`Supplier shop "${name.trim()}" added`);
      }

      syncAllData?.();
      onSaveSuccess?.();
      onClose();
    } catch (err) {
      console.error('Save supplier shop error:', err);
      showToast?.('Failed to save supplier shop');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      placement="center"
      classNames={{
        base: "border border-default-200 bg-content1 shadow-2xl rounded-2xl",
        header: "border-b border-default-100 py-4 px-6",
        body: "py-6 px-6",
        footer: "border-t border-default-100 py-4 px-6"
      }}
    >
      <ModalContent>
        {() => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Supplier Profile
              </span>
              <h2 className="text-lg font-bold font-display text-foreground">
                {isEditing ? 'Edit Supplier Shop' : 'Add Supplier Shop'}
              </h2>
            </ModalHeader>

            <ModalBody className="space-y-3.5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Shop / Company Name <span className="text-danger">*</span>
                </label>
                <Input
                  size="sm"
                  variant="bordered"
                  placeholder="e.g. Unique Business Systems"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  classNames={{ inputWrapper: "h-10 border-default-300 font-bold" }}
                  required
                />
              </div>

              {/* Phone & Contact Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-default-600 mb-1.5">
                    Contact Phone Number(s)
                  </label>
                  <Input
                    size="sm"
                    variant="bordered"
                    placeholder="017xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    classNames={{ inputWrapper: "h-10 border-default-300" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-default-600 mb-1.5">
                    Contact Person / Manager
                  </label>
                  <Input
                    size="sm"
                    variant="bordered"
                    placeholder="Manager name"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    classNames={{ inputWrapper: "h-10 border-default-300" }}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Shop Address / Location
                </label>
                <Input
                  size="sm"
                  variant="bordered"
                  placeholder="e.g. Multiplan Center, Level 4"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  classNames={{ inputWrapper: "h-10 border-default-300" }}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Notes & Banking Details
                </label>
                <Textarea
                  size="sm"
                  variant="bordered"
                  placeholder="Bank name, A/C #, bKash number or payment notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  minRows={2}
                  classNames={{ inputWrapper: "border-default-300" }}
                />
              </div>
            </ModalBody>

            <ModalFooter className="flex justify-end gap-2">
              <Button
                variant="flat"
                color="default"
                size="sm"
                onPress={onClose}
                startContent={<X className="w-4 h-4" />}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                color="primary"
                size="sm"
                isLoading={isSaving}
                className="font-bold shadow-sm"
                startContent={!isSaving && <Save className="w-4 h-4" />}
              >
                {isEditing ? 'Save Changes' : 'Save Shop'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
