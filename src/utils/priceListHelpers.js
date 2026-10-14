import { formatMoney, downloadCSV } from './calculations';

export const DEFAULT_CATALOG_BRANDS = [
  'Apple', 'Samsung', 'Xiaomi', 'Realme', 'Vivo', 'Oppo', 'OnePlus', 'Google Pixel',
  'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Anker', 'Baseus', 'Havit', 'A4Tech',
  'Logitech', 'TP-Link', 'SanDisk', 'Transcend', 'Gigabyte', 'MSI', 'Corsair'
];

export const DEFAULT_CATALOG_TYPES = [
  'Keyboard', 'Mouse', 'Monitor', 'Headphone', 'Speaker',
  'RAM', 'SSD', 'Hard Drive', 'Motherboard', 'Processor',
  'Graphics Card', 'Power Supply', 'Casing', 'UPS', 'Router',
  'Printer', 'Webcam', 'Cables & Adapters', 'Accessories'
];

export function buildPriceListCSV(items = []) {
  const header = 'Brand,Type,Model / Product Name,Price (Tk),Notes,Updated At\n';
  const rows = items.map(it => {
    const brand = `"${(it.brand || '').replace(/"/g, '""')}"`;
    const type = `"${(it.type || '').replace(/"/g, '""')}"`;
    const model = `"${(it.model || '').replace(/"/g, '""')}"`;
    const price = it.price !== undefined ? it.price : 0;
    const notes = `"${(it.notes || '').replace(/"/g, '""')}"`;
    const updated = `"${(it.updatedAt || '').replace(/"/g, '""')}"`;
    return [brand, type, model, price, notes, updated].join(',');
  }).join('\n');
  return header + rows;
}
