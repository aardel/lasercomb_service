import React, { useState, useEffect } from 'react';
import { expensesAPI } from '../../services/api';
import { logger } from '../../utils/logger';
import './ExpenseListModal.css';

const ExpenseListModal = ({ isOpen, onClose, onSelectExpense, technicians = [] }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    tripName: '',
    invoiceNumber: '',
    technicianId: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadExpenses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only reload when modal opens, not when filters change

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.technicianId) {
        params.technician_id = filters.technicianId;
      }
      if (filters.tripName) {
        params.trip_name = filters.tripName;
      }
      if (filters.invoiceNumber) {
        params.invoice_number = filters.invoiceNumber;
      }
      
      const response = await expensesAPI.getAll({ ...params, limit: 100 });
      if (response.data.success) {
        let filteredExpenses = response.data.data || [];
        
        // Client-side filtering for trip name and invoice number (if backend doesn't support)
        if (filters.tripName) {
          filteredExpenses = filteredExpenses.filter(e => 
            e.trip_name?.toLowerCase().includes(filters.tripName.toLowerCase())
          );
        }
        if (filters.invoiceNumber) {
          filteredExpenses = filteredExpenses.filter(e => 
            e.invoice_number?.toLowerCase().includes(filters.invoiceNumber.toLowerCase())
          );
        }
        
        // Date range filtering
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          filteredExpenses = filteredExpenses.filter(e => {
            const expenseDate = new Date(e.created_at);
            return expenseDate >= fromDate;
          });
        }
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59, 999); // End of day
          filteredExpenses = filteredExpenses.filter(e => {
            const expenseDate = new Date(e.created_at);
            return expenseDate <= toDate;
          });
        }
        
        setExpenses(filteredExpenses);
        logger.info('ExpenseListModal', 'Loaded expenses:', filteredExpenses.length);
      }
    } catch (error) {
      logger.error('ExpenseListModal', 'Error loading expenses:', error);
      alert('Error loading expenses: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    loadExpenses();
  };

  const handleClearFilters = () => {
    setFilters({
      tripName: '',
      invoiceNumber: '',
      technicianId: '',
      dateFrom: '',
      dateTo: ''
    });
    setTimeout(() => loadExpenses(), 100);
  };

  const handleSelectExpense = (expense) => {
    onSelectExpense(expense.id);
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '€0.00';
    return `€${parseFloat(amount).toFixed(2)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="expense-list-modal-overlay" onClick={onClose}>
      <div className="expense-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="expense-list-modal-header">
          <h2>Browse Expenses</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="expense-list-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>Trip Name</label>
              <input
                type="text"
                value={filters.tripName}
                onChange={(e) => handleFilterChange('tripName', e.target.value)}
                placeholder="Search trip name..."
              />
            </div>
            <div className="filter-group">
              <label>Invoice Number</label>
              <input
                type="text"
                value={filters.invoiceNumber}
                onChange={(e) => handleFilterChange('invoiceNumber', e.target.value)}
                placeholder="Search invoice..."
              />
            </div>
            <div className="filter-group">
              <label>Technician</label>
              <select
                value={filters.technicianId}
                onChange={(e) => handleFilterChange('technicianId', e.target.value)}
              >
                <option value="">All Technicians</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name || tech.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label>Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
            <div className="filter-actions">
              <button className="apply-filters-btn" onClick={handleApplyFilters}>
                Apply Filters
              </button>
              <button className="clear-filters-btn" onClick={handleClearFilters}>
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="expense-list-content">
          {loading ? (
            <div className="loading-message">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="empty-message">No expenses found</div>
          ) : (
            <table className="expense-list-table">
              <thead>
                <tr>
                  <th>Trip Name</th>
                  <th>Invoice</th>
                  <th>Technician</th>
                  <th>Total</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id}>
                    <td>{expense.trip_name || '-'}</td>
                    <td>{expense.invoice_number || '-'}</td>
                    <td>
                      {technicians.find(t => t.id === expense.technician_id)?.name || expense.technician_id || '-'}
                    </td>
                    <td>{formatCurrency(expense.grand_total)}</td>
                    <td>{formatDate(expense.created_at)}</td>
                    <td>
                      <button 
                        className="select-expense-btn"
                        onClick={() => handleSelectExpense(expense)}
                      >
                        Load
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseListModal;
