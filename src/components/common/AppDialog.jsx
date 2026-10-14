import React, { useEffect, useRef } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input
} from '@heroui/react';
import { AlertCircle, HelpCircle, CheckCircle } from 'lucide-react';

export default function AppDialog({
  isOpen,
  onClose,
  title = "Confirmation",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
  isPrompt = false,
  promptValue = "",
  setPromptValue,
  promptPlaceholder = "Enter value...",
  onConfirm
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && isPrompt) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, isPrompt]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm?.();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      backdrop="blur"
      placement="center"
      classNames={{
        base: "border border-default-200 bg-content1 shadow-2xl rounded-2xl overflow-hidden",
        backdrop: "bg-background/60 backdrop-blur-sm"
      }}
    >
      <ModalContent>
        {() => (
          <div onKeyDown={handleKeyDown}>
            <ModalHeader className="flex items-center gap-2.5 pb-2 pt-5 px-5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isDanger
                    ? 'bg-danger-100 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400'
                    : isPrompt
                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                }`}
              >
                {isDanger ? (
                  <AlertCircle className="w-5 h-5" />
                ) : isPrompt ? (
                  <HelpCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </div>
              <span className="text-base font-bold text-foreground font-display">
                {title}
              </span>
            </ModalHeader>

            <ModalBody className="py-2 px-5">
              <p className="text-xs text-default-600 leading-relaxed">{message}</p>
              {isPrompt && (
                <div className="mt-3">
                  <Input
                    ref={inputRef}
                    size="sm"
                    variant="bordered"
                    placeholder={promptPlaceholder}
                    value={promptValue}
                    onValueChange={(val) => setPromptValue?.(val)}
                    classNames={{
                      input: "text-xs",
                      inputWrapper: "border-default-300 focus-within:border-primary"
                    }}
                  />
                </div>
              )}
            </ModalBody>

            <ModalFooter className="pt-3 pb-5 px-5 flex items-center justify-end gap-2">
              <Button
                variant="light"
                size="sm"
                onPress={onClose}
                className="text-xs font-medium text-default-600"
              >
                {cancelText}
              </Button>
              <Button
                size="sm"
                color={isDanger ? "danger" : "primary"}
                variant="solid"
                onPress={onConfirm}
                className="text-xs font-semibold shadow-sm"
              >
                {confirmText}
              </Button>
            </ModalFooter>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
