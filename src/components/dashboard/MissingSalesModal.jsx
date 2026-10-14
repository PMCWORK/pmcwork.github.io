import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip
} from '@heroui/react';
import { AlertTriangle, Calendar, PlusCircle, Check } from 'lucide-react';

export default function MissingSalesModal({
  isOpen,
  onClose,
  missingDays = [],
  onFillSale,
  onMarkOffDay
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="2xl"
      backdrop="blur"
      placement="center"
      scrollBehavior="inside"
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center gap-3 pb-2 border-b border-default-200">
              <div className="w-9 h-9 rounded-xl bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-foreground">
                  Missing Sales Days Detected
                </h3>
                <p className="text-xs text-default-500 font-normal">
                  Found {missingDays.length} operating days without sales records in the last 30 days.
                </p>
              </div>
            </ModalHeader>

            <ModalBody className="py-4">
              <Table
                aria-label="Missing sales days table"
                isStriped
                classNames={{
                  th: "bg-default-100 text-default-600 font-bold text-xs",
                  td: "text-xs py-2.5"
                }}
              >
                <TableHeader>
                  <TableColumn>DATE</TableColumn>
                  <TableColumn>DAY OF WEEK</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn align="end">ACTIONS</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No missing sales entries found!">
                  {missingDays.map((d) => (
                    <TableRow key={d.iso}>
                      <TableCell className="font-semibold text-foreground">
                        {d.formattedLabel}
                      </TableCell>
                      <TableCell>
                        <span className="text-default-600">{d.dayNameEn}</span>
                        {d.dayNameBn && (
                          <span className="text-[11px] text-default-400 ml-1.5">
                            ({d.dayNameBn})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color="warning" className="text-[11px] font-semibold">
                          Missing Entry
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="light"
                            className="text-xs text-default-600 hover:text-foreground"
                            startContent={<Check className="w-3.5 h-3.5 text-success-500" />}
                            onPress={() => onMarkOffDay?.(d.iso)}
                          >
                            Mark Off-Day
                          </Button>
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            className="text-xs font-semibold"
                            startContent={<PlusCircle className="w-3.5 h-3.5" />}
                            onPress={() => onFillSale?.(d.iso)}
                          >
                            Fill Sale
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ModalBody>

            <ModalFooter className="border-t border-default-200">
              <Button size="sm" variant="light" onPress={onClose}>
                Remind Me Later
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
