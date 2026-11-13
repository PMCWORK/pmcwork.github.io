import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Chip
} from '@heroui/react';
import {
  Printer,
  Calendar,
  Clock,
  RotateCcw,
  X
} from 'lucide-react';
import { formatMoney, toISODate, dhakaNow, pad } from '../../utils/calculations';
import {
  formatInvDateSlash,
  formatDhakaPrintTime,
  formatCustomPrintTime
} from '../../utils/invoiceHelpers';

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice = null
}) {
  const todayISO = toISODate(dhakaNow());

  // Custom date override state
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [customDate, setCustomDate] = useState(todayISO);
  const [customTime, setCustomTime] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const now = dhakaNow();
    const timeFormatted = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    setCustomDate(todayISO);
    setCustomTime(timeFormatted);
    setIsOverrideOpen(false);
  }, [isOpen, todayISO]);

  if (!invoice) return null;

  const invDateFormatted = formatInvDateSlash(invoice.date || todayISO);
  const printDateFormatted = isOverrideOpen && customDate ? formatInvDateSlash(customDate) : formatInvDateSlash(todayISO);
  const printTimeFormatted = isOverrideOpen && customTime ? formatCustomPrintTime(customTime) : formatDhakaPrintTime();

  const items = invoice.items || [];
  const totalAmount = Number(invoice.totalAmount || 0);
  const discount = Number(invoice.discount || 0);
  const grandTotal = Number(invoice.grandTotal || (totalAmount - discount));

  const handlePrint = () => {
    const origTitle = document.title;
    document.title = invoice.number || 'PMC-Invoice';
    window.onafterprint = () => {
      document.title = origTitle;
      window.onafterprint = null;
    };
    window.print();
  };

  const handleResetToNow = () => {
    const now = dhakaNow();
    setCustomDate(todayISO);
    setCustomTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="5xl"
      backdrop="blur"
      placement="center"
      scrollBehavior="inside"
      hideCloseButton={true}
      classNames={{
        base: "max-h-[94vh] print:!max-h-none print:!m-0 print:!p-0 print:!w-full print:!bg-white print:!shadow-none print:!border-0",
        backdrop: "print:!hidden print:!opacity-0 print:!bg-transparent",
        wrapper: "print:!static print:!p-0 print:!m-0 print:!w-full print:!h-auto print:!bg-white print:!shadow-none",
        body: "print:!p-0 print:!m-0 print:!bg-white print:!shadow-none"
      }}
    >
      <ModalContent>
        {() => (
          <>
            {/* Modal Top Bar */}
            <ModalHeader className="no-print flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-default-200">
              <div className="flex items-center gap-2">
                <Chip size="sm" variant="flat" color="primary" className="font-numeric font-bold">
                  #{invoice.number || 'INVOICE'}
                </Chip>
                <span className="text-sm font-bold font-display text-foreground">
                  Official Bill Preview (A4)
                </span>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Override Date Toggle */}
                <Button
                  size="sm"
                  variant={isOverrideOpen ? 'flat' : 'bordered'}
                  color={isOverrideOpen ? 'primary' : 'default'}
                  className="text-xs font-semibold"
                  startContent={<Calendar className="w-3.5 h-3.5" />}
                  onPress={() => setIsOverrideOpen(!isOverrideOpen)}
                >
                  <span>Override Date</span>
                  {isOverrideOpen && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block ml-0.5"></span>
                  )}
                </Button>

                {/* Print Button */}
                <Button
                  size="sm"
                  color="primary"
                  className="font-bold text-xs"
                  startContent={<Printer className="w-4 h-4" />}
                  onPress={handlePrint}
                >
                  Print / Save PDF
                </Button>

                {/* Dedicated Close Button (Cleanly spaced, non-overlapping) */}
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  radius="full"
                  className="text-default-500 hover:text-default-900 dark:hover:text-default-100 ml-1"
                  aria-label="Close bill preview"
                  onPress={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </ModalHeader>

            {/* Custom Timestamp Override Bar */}
            {isOverrideOpen && (
              <div className="no-print p-3 bg-default-50 border-b border-default-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-default-600">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Custom Timestamp Override:</span>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    size="sm"
                    variant="bordered"
                    className="w-36 h-7"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    step="1"
                    size="sm"
                    variant="bordered"
                    className="w-32 h-7"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="flat"
                    className="h-7 text-xs"
                    startContent={<RotateCcw className="w-3 h-3" />}
                    onPress={handleResetToNow}
                  >
                    Reset to Now
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="h-7 w-7 text-default-400"
                    onPress={() => setIsOverrideOpen(false)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Modal Body / Paper Container */}
            <ModalBody className="p-4 sm:p-8 bg-default-100/60 dark:bg-default-50/20 print:!bg-white print:!p-0 print:!m-0 flex items-center justify-center overflow-y-auto print:!overflow-visible">
              {/* PRINTABLE AREA */}
              <div id="printableInvoiceArea" className="w-full flex justify-center">
                {/* OFFICIAL A4 INVOICE */}
                <div
                  id="invoicePaper"
                  className="pmc-invoice-paper bg-white text-black shadow-lg print:shadow-none print:!bg-white mx-auto"
                  style={{
                    width: '100%',
                    maxWidth: '800px',
                    fontFamily: "'Times New Roman', Times, serif",
                    fontSize: '13.5px',
                    lineHeight: 1.35,
                    padding: '32px 36px 28px',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Header */}
                  <div className="pmc-inv-header text-center mb-3">
                    <div className="pmc-inv-title text-2xl sm:text-3xl font-bold tracking-wide mb-1">
                      PM COMPUTERS
                    </div>
                    <div className="pmc-inv-addr text-sm sm:text-base my-0.5 text-black">
                      Address : Shop 19, Level 4, Capital Tower, Mirpur-1, Dhaka-1216
                    </div>
                    <div className="pmc-inv-contact text-xs sm:text-sm my-0.5 text-black">
                      Phone : 01683880269, 01799700299 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; E-mail : pmcomputers.bd@gmail.com
                    </div>
                    <div className="pmc-inv-banner bg-gray-200 border-y border-black font-bold text-sm sm:text-base py-1 my-2.5 text-center text-black">
                      Invoice/ Bill
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <table className="pmc-inv-meta-table w-full mb-2.5 border-collapse text-sm sm:text-base text-black">
                    <tbody>
                      <tr>
                        <td className="label font-bold w-28 whitespace-nowrap p-1 align-top">Invoice No.</td>
                        <td className="w-2/5 p-1 align-top font-bold">{invoice.number || ''}</td>
                        <td className="label font-bold w-28 whitespace-nowrap p-1 align-top">Date</td>
                        <td className="p-1 align-top">{invDateFormatted}</td>
                      </tr>
                      <tr>
                        <td className="label font-bold w-28 whitespace-nowrap p-1 align-top">Buyer Name</td>
                        <td className="p-1 align-top font-bold">{invoice.buyerName || 'Valued Customer'}</td>
                        <td className="label font-bold w-28 whitespace-nowrap p-1 align-top">Sold By</td>
                        <td className="p-1 align-top font-bold">{invoice.soldBy || 'FOYEZ'}</td>
                      </tr>
                      <tr>
                        <td className="label font-bold w-28 whitespace-nowrap p-1 align-top">Address</td>
                        <td className="p-1 align-top">{invoice.buyerAddress || '—'}</td>
                        <td className="label font-bold w-28 whitespace-nowrap p-1 align-top">Phone No.</td>
                        <td className="p-1 align-top">{invoice.buyerPhone || '—'}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Product Table */}
                  <table className="pmc-inv-items-table w-full border border-black border-collapse text-xs sm:text-sm text-black">
                    <colgroup>
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '50%' }} />
                      <col style={{ width: '13.5%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '14.5%' }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-black font-bold text-center bg-white text-black">
                        <th className="border border-black p-1.5 text-center">SL</th>
                        <th className="border border-black p-1.5 text-center">PRODUCT DESCRIPTION</th>
                        <th className="border border-black p-1.5 text-center">QUANTITY</th>
                        <th className="border border-black p-1.5 text-center">UNIT PRICE</th>
                        <th className="border border-black p-1.5 text-center">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const desc = (item.desc || '').toUpperCase();
                        let warrantyStr = item.warrantyDays || '';
                        if (warrantyStr) {
                          const rawNote = (item.warrantyNote || '').trim();
                          if (rawNote) {
                            const formattedNote = rawNote.startsWith('(') && rawNote.endsWith(')') ? rawNote : `(${rawNote})`;
                            warrantyStr = `${warrantyStr} ${formattedNote}`;
                          }
                        }

                        return (
                          <tr key={idx} className="border-x border-black">
                            <td className="border-x border-black p-1.5 text-center align-top">{idx + 1}</td>
                            <td className="border-x border-black p-1.5 text-left align-top">
                              <div className="font-bold text-sm leading-tight text-black">{desc}</div>
                              {warrantyStr && (
                                <div className="text-xs text-black mt-0.5">
                                  Warrenty : {warrantyStr}
                                </div>
                              )}
                            </td>
                            <td className="border-x border-black p-1.5 text-center align-top whitespace-nowrap">
                              {item.qty || 1} pc
                            </td>
                            <td className="border-x border-black p-1.5 text-center align-top whitespace-nowrap">
                              {Math.round(Number(item.price || 0)).toLocaleString('en-US')}
                            </td>
                            <td className="border-x border-black p-1.5 text-center align-top whitespace-nowrap">
                              {Math.round(Number(item.total || (item.qty * item.price) || 0)).toLocaleString('en-US')}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Blank Spacer Row - balanced height so invoice always fits cleanly on 1 A4 page */}
                      <tr className="row-blank border-x border-black">
                        <td
                          className="border-x border-black"
                          style={{
                            height: items.length <= 2 ? '110px' : (items.length <= 4 ? '65px' : (items.length <= 6 ? '35px' : '10px'))
                          }}
                        ></td>
                        <td className="border-x border-black"></td>
                        <td className="border-x border-black"></td>
                        <td className="border-x border-black"></td>
                        <td className="border-x border-black"></td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Calculations Table */}
                  <table className="pmc-inv-calc-table w-full border-collapse mt-0.5 text-xs sm:text-sm text-black">
                    <colgroup>
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '50%' }} />
                      <col style={{ width: '13.5%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '14.5%' }} />
                    </colgroup>
                    <tbody>
                      <tr>
                        <td colSpan={4} className="text-right font-bold p-1">Total Amount</td>
                        <td className="text-center font-bold p-1 whitespace-nowrap">
                          {Math.round(totalAmount).toLocaleString('en-US')}
                        </td>
                      </tr>
                      {discount > 0 && (
                        <tr>
                          <td colSpan={4} className="text-right font-bold p-1">Discount</td>
                          <td className="text-center font-bold p-1 whitespace-nowrap">
                            {Math.round(discount).toLocaleString('en-US')}
                          </td>
                        </tr>
                      )}
                      <tr className="grand-row border-y border-black font-bold">
                        <td colSpan={4} className="text-right font-bold p-1.5 text-sm sm:text-base">Grand Total</td>
                        <td className="text-center font-bold p-1.5 text-sm sm:text-base whitespace-nowrap">
                          {Math.round(grandTotal).toLocaleString('en-US')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Signatures */}
                  <div className="pmc-inv-signatures flex justify-between mt-8 sm:mt-10 px-3">
                    <div className="pmc-inv-sig-box text-center w-48">
                      <div className="border-t border-black pt-1 font-bold text-xs sm:text-sm">
                        Receiver's Signature
                      </div>
                    </div>
                    <div className="pmc-inv-sig-box text-center w-48">
                      <div className="border-t border-black pt-1 font-bold text-xs sm:text-sm">
                        Manager Signature
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="pmc-inv-terms mt-4 font-bold text-xs leading-normal text-black">
                    The warranty is not applicable to keyboard, mouse, speaker, power Supply, Sticker-removed items, Burned &amp; physically damage items.
                  </div>

                  {/* Timestamp Footer */}
                  <div className="pmc-inv-footer-time flex justify-between mt-3 text-xs text-black">
                    <div>Printing Date : {printDateFormatted}</div>
                    <div>Print Time : {printTimeFormatted}</div>
                  </div>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="no-print border-t border-default-200 justify-between items-center">
              <span className="text-xs text-default-400">
                Official A4 Format · Press Ctrl+P or click Print Invoice
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="flat" onPress={onClose}>
                  Close
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  className="font-bold text-xs"
                  startContent={<Printer className="w-4 h-4" />}
                  onPress={handlePrint}
                >
                  Print Invoice
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
