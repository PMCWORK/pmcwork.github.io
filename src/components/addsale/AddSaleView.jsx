import React, { useState, useEffect } from 'react';
import AddSaleStats from './AddSaleStats';
import MonthlyTrendChart from './MonthlyTrendChart';
import SaleForm from './SaleForm';
import MissingSalesBanner from '../dashboard/MissingSalesBanner';
import MissingSalesModal from '../dashboard/MissingSalesModal';
import { useData } from '../../context/DataContext';
import { getMissingSalesDays } from '../../utils/calculations';

export default function AddSaleView({ isDark, initialDate, onDateChange, showToast }) {
  const { sales } = useData();
  const [selectedFillDate, setSelectedFillDate] = useState(initialDate || null);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);
  const [offDays, setOffDays] = useState([]);

  useEffect(() => {
    if (initialDate) {
      setSelectedFillDate(initialDate);
      onDateChange?.(initialDate);
    }
  }, [initialDate, onDateChange]);

  const missingSalesDays = getMissingSalesDays(sales, offDays, 30);

  const handleMarkOffDay = (iso) => {
    setOffDays(prev => [...prev, iso]);
    showToast?.(`Marked ${iso} as Off-Day`);
  };

  const handleFillSale = (iso) => {
    setSelectedFillDate(iso);
    onDateChange?.(iso);
    setIsMissingModalOpen(false);
    showToast?.(`Selected date ${iso} for ledger entry`);
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* Missing Sales Alert Banner */}
      <MissingSalesBanner
        missingDays={missingSalesDays}
        onReview={() => setIsMissingModalOpen(true)}
      />

      {/* Top Monthly Summary Metric Cards with Sparklines */}
      <AddSaleStats sales={sales} />

      {/* Main 2-Column Ledger & Analytics Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* Left Column: Monthly Cumulative Trend Chart */}
        <div className="lg:col-span-7">
          <MonthlyTrendChart sales={sales} isDark={isDark} />
        </div>

        {/* Right Column: Sale Details Entry Form */}
        <div className="lg:col-span-5">
          <SaleForm
            initialDate={selectedFillDate}
            onDateChange={onDateChange}
            onSaveSuccess={(id) => {
              setSelectedFillDate(null);
              onDateChange?.(null);
            }}
            showToast={showToast}
          />
        </div>
      </div>

      {/* Missing Sales Review Modal */}
      <MissingSalesModal
        isOpen={isMissingModalOpen}
        onClose={() => setIsMissingModalOpen(false)}
        missingDays={missingSalesDays}
        onFillSale={handleFillSale}
        onMarkOffDay={handleMarkOffDay}
      />
    </div>
  );
}
