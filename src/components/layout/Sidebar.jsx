import React from 'react';
import { Card, Listbox, ListboxItem, User, Switch, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import {
  Sun,
  Moon,
  LogOut,
  UserCheck,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../constants/navigation';

export default function Sidebar({ activeView, setActiveView, isDark, setIsDark, onOpenSettings }) {
  const { user, logout } = useAuth();

  const userName = user?.displayName || (user?.email ? user.email.split('@')[0] : (user?.isGuest ? 'Guest PIN' : 'PM Computers'));
  const userDesc = user?.email || (user?.isGuest ? 'Quick PIN Session' : 'Authorized Access');
  const userInitial = userName ? userName[0].toUpperCase() : 'P';

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col border-r border-default-200 bg-content1 px-3 py-4 select-none shrink-0 z-20">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-3 py-2 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 via-primary-500 to-primary-300 flex items-center justify-center font-display font-bold text-white shadow-md shadow-primary/30 shrink-0">
          PMC
        </div>
        <div className="leading-tight">
          <div className="font-display font-semibold text-sm tracking-tight text-foreground">
            PM Computers
          </div>
          <div className="text-[10px] uppercase tracking-wider text-default-400 font-medium">
            Management System
          </div>
        </div>
      </div>

      {/* Theme Switcher using HeroUI Switch */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Toggle Night Mode"
        onClick={() => setIsDark(!isDark)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsDark(!isDark);
          }
        }}
        className="px-3 py-2 mb-3 flex items-center justify-between rounded-xl bg-default-50/50 hover:bg-default-100 border border-default-100/60 hover:border-default-200 cursor-pointer transition-all select-none group"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-default-100 dark:bg-default-50/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            {isDark ? (
              <Moon className="w-3.5 h-3.5 text-primary-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-warning-500" />
            )}
          </div>
          <span className="text-xs text-default-600 font-medium">
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>

        <Switch
          size="sm"
          color="primary"
          isSelected={isDark}
          onValueChange={setIsDark}
          aria-label="Toggle dark mode"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Navigation section */}
      <div className="text-[10px] uppercase font-bold tracking-wider text-default-400 px-3 py-1">
        Workspace
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        <Listbox
          aria-label="Workspace Navigation"
          variant="flat"
          color="primary"
          className="p-0 gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.key;
            return (
              <ListboxItem
                key={item.key}
                href={item.href}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-semibold'
                    : 'text-default-600 hover:bg-default-100 hover:text-foreground'
                }`}
                startContent={
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-primary' : 'text-default-400'
                    }`}
                  />
                }
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(item.key);
                  window.location.hash = item.href;
                }}
              >
                {item.label}
              </ListboxItem>
            );
          })}
        </Listbox>
      </div>

      {/* Profile Footer with Dropdown using HeroUI User & Dropdown */}
      <div className="pt-2 border-t border-default-100 mt-auto">
        <Dropdown placement="top-start">
          <DropdownTrigger>
            <Card
              isPressable
              className="w-full bg-default-50/50 hover:bg-default-100 border-none shadow-none px-2 py-1.5 transition-colors"
            >
              <div className="flex items-center justify-between w-full">
                <User
                  name={userName}
                  description={userDesc}
                  avatarProps={{
                    size: 'sm',
                    src: user?.photoURL || undefined,
                    name: userInitial,
                    className: 'bg-primary-500 text-white font-semibold text-xs',
                  }}
                  classNames={{
                    name: 'text-xs font-semibold text-foreground truncate max-w-[120px]',
                    description: 'text-[10px] text-default-400 truncate max-w-[120px]',
                  }}
                />
                <UserCheck className="w-3.5 h-3.5 text-success-500 shrink-0 mr-1" />
              </div>
            </Card>
          </DropdownTrigger>
          <DropdownMenu aria-label="Account Actions" variant="flat">
            <DropdownItem
              key="profile"
              textValue={userName}
              isReadOnly
              className="opacity-100 cursor-default select-none border-b border-default-100 dark:border-default-100/30 pb-2 mb-1"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-default-400">Signed in as</span>
                <span className="text-xs font-bold text-foreground truncate">{userDesc}</span>
              </div>
            </DropdownItem>
            <DropdownItem
              key="settings"
              startContent={<Settings className="w-4 h-4 text-primary" />}
              onPress={() => onOpenSettings?.('notifications')}
              className="py-2 text-xs font-semibold"
            >
              Shop Settings &amp; Preferences
            </DropdownItem>
            <DropdownItem
              key="logout"
              color="danger"
              className="text-danger py-2 text-xs font-semibold"
              startContent={<LogOut className="w-4 h-4" />}
              onPress={logout}
            >
              Sign Out
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </aside>
  );
}
