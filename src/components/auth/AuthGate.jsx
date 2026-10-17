import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Chip,
  Spinner,
  Divider
} from '@heroui/react';
import { ShieldAlert, LogIn, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PinInput from '../common/PinInput';
import PmcBrandLogo from '../common/PmcBrandLogo';

export default function AuthGate() {
  const {
    user,
    loading,
    authError,
    unauthorizedEmail,
    loginGoogle,
    loginPin,
    logout,
    isAuthenticated
  } = useAuth();

  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  useEffect(() => {
    let timer;
    if (lockoutTime > 0) {
      timer = setInterval(() => {
        setLockoutTime((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTime]);

  const handlePinSubmit = async (pinStr) => {
    if (lockoutTime > 0) {
      setPinError(`Too many failed attempts. Locked for ${lockoutTime}s.`);
      return;
    }

    if (!pinStr || pinStr.length < 4) {
      setPinError('Please enter all 4 digits.');
      return;
    }

    setIsSubmittingPin(true);
    setPinError(null);

    try {
      await loginPin(pinStr);
      setFailedAttempts(0);
    } catch (err) {
      const nextFail = failedAttempts + 1;
      setFailedAttempts(nextFail);
      setPinDigits(['', '', '', '']);

      if (nextFail >= 5) {
        setLockoutTime(300); // 5 min lockout
        setPinError('Too many failed attempts. PIN entry locked for 5 minutes.');
      } else {
        setPinError(`Incorrect PIN (${5 - nextFail} attempt${5 - nextFail > 1 ? 's' : ''} left)`);
      }
    } finally {
      setIsSubmittingPin(false);
    }
  };

  // If already authenticated and not unauthorized, no overlay needed
  if (isAuthenticated && !unauthorizedEmail) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-md border border-default-200/80 shadow-2xl bg-content1 overflow-hidden">
        {/* Brand Header */}
        <CardHeader className="flex flex-col items-center pt-8 pb-4 px-6 text-center">
          <PmcBrandLogo
            variant="icon"
            size={56}
            className="mb-3 shadow-md rounded-2xl"
          />
          <h2 className="text-xl font-bold font-display tracking-tight text-foreground uppercase">
            PM COMPUTERS
          </h2>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold font-display mt-0.5">
            Data Management System
          </p>
        </CardHeader>

        <CardBody className="px-8 pb-8 pt-2 space-y-6">
          {/* Loading State */}
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <Spinner size="lg" color="primary" />
              <p className="text-xs font-medium text-default-500">
                Authenticating secure session...
              </p>
            </div>
          ) : unauthorizedEmail ? (
            /* Unauthorized Screen */
            <div className="space-y-4 text-center py-2">
              <div className="flex justify-center">
                <Chip
                  color="danger"
                  variant="flat"
                  size="md"
                  startContent={<ShieldAlert className="w-4 h-4 text-danger-500" />}
                  className="font-bold text-xs px-3"
                >
                  Access Denied
                </Chip>
              </div>

              <div className="p-3.5 rounded-xl bg-danger-50/50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800/40 text-xs text-danger-700 dark:text-danger-300 space-y-1">
                <div className="font-semibold">Unauthorized Account:</div>
                <div className="font-mono text-[11px] opacity-90">{unauthorizedEmail}</div>
                <p className="text-[11px] opacity-80 pt-1">
                  Access to the inventory and accounting ledger is strictly restricted to authorized staff accounts.
                </p>
              </div>

              <Button
                variant="bordered"
                size="sm"
                fullWidth
                onPress={logout}
                className="text-xs font-semibold"
              >
                Sign Out & Switch Account
              </Button>
            </div>
          ) : (
            /* Normal Login Prompt */
            <div className="space-y-6">
              {/* Google Sign In */}
              <div className="space-y-2">
                <Button
                  size="lg"
                  color="primary"
                  variant="shadow"
                  fullWidth
                  onPress={loginGoogle}
                  className="font-semibold text-xs h-11 flex items-center justify-center gap-2"
                  startContent={
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  }
                >
                  Sign in with Google Account
                </Button>
                <p className="text-[11px] text-center text-default-400">
                  Authorized accounts: meeeheeediii, pmcomputers.bd, pfoyez2015
                </p>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <Divider className="w-full" />
                <span className="absolute bg-content1 px-3 text-[11px] uppercase font-bold tracking-wider text-default-400">
                  or Quick PIN
                </span>
              </div>

              {/* 4-Digit PIN Access */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-default-600 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    Enter 4-Digit Staff PIN:
                  </span>
                  {lockoutTime > 0 && (
                    <Chip size="sm" color="danger" variant="flat" className="text-[10px]">
                      Locked ({lockoutTime}s)
                    </Chip>
                  )}
                </div>

                <PinInput
                  value={pinDigits}
                  onChange={setPinDigits}
                  onComplete={handlePinSubmit}
                />

                {pinError && (
                  <p className="text-[11px] text-danger-500 font-medium text-center animate-shake">
                    {pinError}
                  </p>
                )}
                {authError && !pinError && (
                  <p className="text-[11px] text-danger-500 font-medium text-center">
                    {authError}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
