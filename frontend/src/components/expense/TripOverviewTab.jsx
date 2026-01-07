import React, { useMemo } from 'react';
import './TripOverviewTab.css';

const TripOverviewTab = ({ expenseData }) => {
  const totals = useMemo(() => {
    // Calculate Total Daily Rate from segments
    const totalDailyRate = (expenseData.segments || []).reduce(
      (sum, seg) => sum + (parseFloat(seg.total_segment) || 0),
      0
    );

    // Calculate Total Expenses from receipts
    const totalExpenses = (expenseData.receipts || []).reduce(
      (sum, rec) => sum + (parseFloat(rec.amount_eur) || 0),
      0
    );

    // Get Personal Car Expenses
    const personalCarExpenses = parseFloat(expenseData.car_usage?.personal_car_total) || 0;

    // Get Advanced Money
    const advancedMoney = parseFloat(expenseData.others?.advanced_money_amount) || 0;

    // Calculate grand total
    const grandTotal = totalDailyRate + totalExpenses + personalCarExpenses + advancedMoney;

    return {
      totalDailyRate,
      totalExpenses,
      personalCarExpenses,
      advancedMoney,
      grandTotal
    };
  }, [expenseData]);

  return (
    <div className="trip-overview-tab">
      <div className="tab-header">
        <h2>Trip Overview</h2>
      </div>

      <div className="overview-section">
        <div className="overview-item">
          <label>Total Daily Rate</label>
          <div className="amount-value">€{totals.totalDailyRate.toFixed(2)}</div>
        </div>
        <div className="overview-item">
          <label>Total Expenses</label>
          <div className="amount-value">€{totals.totalExpenses.toFixed(2)}</div>
        </div>
        <div className="overview-item">
          <label>Personal Car Expenses</label>
          <div className="amount-value">€{totals.personalCarExpenses.toFixed(2)}</div>
        </div>
        <div className="overview-item">
          <label>Advanced Money</label>
          <div className="amount-value">€{totals.advancedMoney.toFixed(2)}</div>
        </div>
        <div className="overview-item total">
          <label>Total</label>
          <div className="amount-value total-amount">€{totals.grandTotal.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default TripOverviewTab;
