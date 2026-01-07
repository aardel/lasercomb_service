import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { expensesAPI } from '../services/api';
import { getAllTechnicians, getActiveTechnician, getSettings } from '../services/settingsStorage';
import { logger } from '../utils/logger';
import TripDurationTab from '../components/expense/TripDurationTab';
import JobDetailsTab from '../components/expense/JobDetailsTab';
import ReceiptsTab from '../components/expense/ReceiptsTab';
import CarUsageTab from '../components/expense/CarUsageTab';
import OthersTab from '../components/expense/OthersTab';
import TripOverviewTab from '../components/expense/TripOverviewTab';
import DailyRatesTab from '../components/expense/DailyRatesTab';
import EmailNotesTab from '../components/expense/EmailNotesTab';
import SettingsTab from '../components/expense/SettingsTab';
import ExpenseListModal from '../components/expense/ExpenseListModal';
import './ExpenseSubmissionPage.css';

const ExpenseSubmissionPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tripDuration');
  
  // Header fields
  const [tripName, setTripName] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [ratesDatabaseInfo, setRatesDatabaseInfo] = useState(null);
  
  // Technicians list
  const [technicians, setTechnicians] = useState([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);
  
  // Expense data
  const [expenseId, setExpenseId] = useState(null);
  const [expenseData, setExpenseData] = useState({
    segments: [],
    customers: [],
    receipts: [],
    car_usage: null,
    others: null,
    email_notes: null
  });
  
  // Loading states
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showExpenseList, setShowExpenseList] = useState(false);
  
  // Settings state (shared between SettingsTab and EmailNotesTab)
  const [expenseSettings, setExpenseSettings] = useState({
    smtp: {
      to: '',
      cc: '',
      from: ''
    }
  });

  // Load technicians on mount
  useEffect(() => {
    loadTechnicians();
    loadRatesInfo();
    loadExpenseSettings();
  }, []);

  const loadExpenseSettings = () => {
    try {
      // Load from localStorage or default settings
      const settings = getSettings();
      if (settings?.expense?.smtp) {
        setExpenseSettings({
          smtp: settings.expense.smtp
        });
      }
    } catch (error) {
      logger.error('ExpenseSubmission', 'Error loading expense settings:', error);
    }
  };

  // Load active technician on mount
  useEffect(() => {
    loadActiveTechnician();
  }, []);

  // Update technician name when technicians list is loaded and we have a technicianId
  useEffect(() => {
    if (technicianId && technicians.length > 0 && !technicianName) {
      const tech = technicians.find(t => t.id === technicianId);
      if (tech) {
        setTechnicianName(tech.name || tech.id);
        logger.info('ExpenseSubmission', 'Updated technician name from list:', { id: tech.id, name: tech.name });
      }
    }
  }, [technicians, technicianId, technicianName]);

  const loadTechnicians = async () => {
    try {
      setLoadingTechnicians(true);
      const techs = await getAllTechnicians();
      // Backend already filters by is_active = true, so show all returned technicians
      // Only filter out null/undefined technicians
      const validTechs = techs.filter(t => t && t.id);
      logger.info('ExpenseSubmission', 'Loaded technicians:', validTechs.map(t => ({ id: t.id, name: t.name })));
      setTechnicians(validTechs);
    } catch (error) {
      logger.error('ExpenseSubmission', 'Error loading technicians:', error);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  const loadActiveTechnician = async () => {
    try {
      const activeTech = await getActiveTechnician();
      if (activeTech && activeTech.id) {
        // Technicians use VARCHAR(100) IDs, not UUIDs, so accept any non-empty string
        const techId = activeTech.id;
        if (techId && !techId.startsWith('tech-')) {
          setTechnicianId(techId);
          setTechnicianName(activeTech.name);
        } else {
          logger.warn('ExpenseSubmission', 'Active technician has temporary ID format:', techId);
        }
      }
    } catch (error) {
      logger.error('ExpenseSubmission', 'Error loading active technician:', error);
    }
  };

  const loadRatesInfo = async () => {
    try {
      const response = await expensesAPI.getRatesInfo();
      if (response.data && response.data.success) {
        setRatesDatabaseInfo(response.data.data);
      }
    } catch (error) {
      // Silently handle - rates info is optional
      if (error.response?.status !== 404) {
        logger.error('ExpenseSubmission', 'Error loading rates info:', error);
      }
    }
  };

  const handleTechnicianChange = (techId) => {
    logger.info('ExpenseSubmission', 'handleTechnicianChange called with:', techId);
    logger.info('ExpenseSubmission', 'Available technicians:', technicians);
    
    if (!techId || techId === '' || techId === 'Select technician') {
      setTechnicianId('');
      setTechnicianName('');
      return;
    }
    
    // Find the technician by ID or name
    const tech = technicians.find(t => {
      const matchById = t.id === techId;
      const matchByName = t.name === techId;
      logger.info('ExpenseSubmission', 'Checking technician:', { id: t.id, name: t.name, matchById, matchByName });
      return matchById || matchByName;
    });
    
    if (tech) {
      // Use the technician's ID (which is VARCHAR(100), can be any string including tech-*)
      const validId = String(tech.id || tech.name || techId);
      
      logger.info('ExpenseSubmission', 'Found technician:', { tech, validId });
      
      if (validId && validId !== '' && validId !== 'Select technician') {
        setTechnicianId(validId);
        setTechnicianName(tech.name || validId);
        // Auto-generate invoice number when technician changes
        if (tech.name) {
          generateInvoiceNumber(tech.name);
        }
        logger.info('ExpenseSubmission', 'Technician set successfully:', { id: validId, name: tech.name });
      } else {
        logger.error('ExpenseSubmission', 'Invalid technician ID:', validId);
        alert('Invalid technician selected. Please select a valid technician.');
      }
    } else {
      // If not found in list, but it's a valid string, accept it
      const validId = String(techId);
      if (validId && validId !== '' && validId !== 'Select technician') {
        setTechnicianId(validId);
        setTechnicianName(validId);
        logger.warn('ExpenseSubmission', 'Technician not in list, using ID as name:', validId);
      } else {
        logger.error('ExpenseSubmission', 'Technician not found for ID:', techId);
        logger.error('ExpenseSubmission', 'Available technicians:', technicians.map(t => ({ id: t.id, name: t.name })));
        alert('Technician not found. Please select from the list.');
      }
    }
  };

  const generateInvoiceNumber = (name) => {
    if (!name) return;
    const parts = name.trim().split(/\s+/);
    let initials = '';
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else {
      initials = name.substring(0, 2).toUpperCase();
    }
    // For now, just set initials - actual number will be generated on save
    setInvoiceNumber(initials + '0001');
  };

  const validateSegments = (segments) => {
    // Check for overlapping date ranges
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment.start_date_time || !segment.end_date_time) continue;
      
      const start = new Date(segment.start_date_time);
      const end = new Date(segment.end_date_time);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return `Segment ${segment.segment_number || i + 1} has invalid dates`;
      }
      
      if (end <= start) {
        return `Segment ${segment.segment_number || i + 1}: End date must be after start date`;
      }
      
      // Check for overlaps with other segments
      for (let j = i + 1; j < segments.length; j++) {
        const otherSegment = segments[j];
        if (!otherSegment.start_date_time || !otherSegment.end_date_time) continue;
        
        const otherStart = new Date(otherSegment.start_date_time);
        const otherEnd = new Date(otherSegment.end_date_time);
        
        if (isNaN(otherStart.getTime()) || isNaN(otherEnd.getTime())) continue;
        
        // Check if dates overlap
        if (start < otherEnd && end > otherStart) {
          return `Segment ${segment.segment_number || i + 1} overlaps with Segment ${otherSegment.segment_number || j + 1}`;
        }
      }
    }
    
    return null;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate technician_id exists
      if (!technicianId || technicianId === '' || technicianId === 'Select technician') {
        alert('Please select a valid technician.');
        setSaving(false);
        return;
      }

      // Validate segments (no overlaps, valid dates)
      if (expenseData.segments && expenseData.segments.length > 0) {
        const segmentError = validateSegments(expenseData.segments);
        if (segmentError) {
          alert(segmentError);
          setSaving(false);
          return;
        }
      }
      
      const expensePayload = {
        trip_name: tripName,
        technician_id: technicianId,
        technician_name: technicianName,
        invoice_number: invoiceNumber,
        segments: expenseData.segments,
        customers: expenseData.customers,
        receipts: expenseData.receipts,
        car_usage: expenseData.car_usage,
        others: expenseData.others,
        email_notes: expenseData.email_notes
      };

      let result;
      if (expenseId) {
        // Update existing
        result = await expensesAPI.update(expenseId, expensePayload);
      } else {
        // Create new
        result = await expensesAPI.create(expensePayload);
        if (result.data.success) {
          setExpenseId(result.data.data.id);
          setInvoiceNumber(result.data.data.invoice_number);
        }
      }

      logger.info('ExpenseSubmission', 'Expense saved successfully');
      alert('Expense saved successfully!');
    } catch (error) {
      logger.error('ExpenseSubmission', 'Error saving expense:', error);
      alert('Error saving expense: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleLoadExpense = async (expenseId) => {
    try {
      setLoading(true);
      const result = await expensesAPI.getById(expenseId);
      
      if (result.data.success && result.data.data) {
        const expense = result.data.data;
        setExpenseId(expense.id);
        setTripName(expense.trip_name);
        setInvoiceNumber(expense.invoice_number);
        setRatesDatabaseInfo({
          database_name: expense.rates_database_used,
          year: expense.rates_year
        });
        
        // Set technician - find in list to get name
        if (expense.technician_id) {
          const tech = technicians.find(t => t.id === expense.technician_id);
          if (tech) {
            setTechnicianId(tech.id);
            setTechnicianName(tech.name || tech.id);
          } else {
            // Technician not in list, but use the saved ID
            setTechnicianId(expense.technician_id);
            setTechnicianName(expense.technician_id);
            logger.warn('ExpenseSubmission', 'Technician not found in list, using saved ID:', expense.technician_id);
          }
        }
        
        // Load expense data
        setExpenseData({
          segments: expense.segments || [],
          customers: expense.customers || [],
          receipts: expense.receipts || [],
          car_usage: expense.car_usage || null,
          others: expense.others || null,
          email_notes: expense.email_notes || null
        });
        
        logger.info('ExpenseSubmission', 'Expense loaded successfully');
      } else {
        alert('Expense not found');
      }
    } catch (error) {
      logger.error('ExpenseSubmission', 'Error loading expense:', error);
      alert('Error loading expense: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'tripDuration', label: 'Trip Duration', icon: '📅' },
    { id: 'jobDetails', label: 'Job Details', icon: '👥' },
    { id: 'receipts', label: 'Receipts', icon: '🧾' },
    { id: 'carUsage', label: 'Car Usage', icon: '🚗' },
    { id: 'others', label: 'Others', icon: '📝' },
    { id: 'tripOverview', label: 'Trip Overview', icon: '📊' },
    { id: 'dailyRates', label: 'Daily Rates', icon: '💰' },
    { id: 'emailNotes', label: 'Email Notes', icon: '📧' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="expense-submission-page">
      <header className="expense-header">
        <button className="back-button" onClick={() => navigate('/')}>← Back</button>
        <h1>💰 Expense Submission</h1>
        <div className="header-actions">
          <button className="load-button" onClick={() => setShowExpenseList(true)} disabled={loading}>
            Browse Expenses
          </button>
          <button className="save-button" onClick={handleSave} disabled={saving || !tripName || !technicianId}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <div className="expense-header-fields">
        <div className="field-group">
          <label>Trip Name</label>
          <input
            type="text"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="Enter trip name"
          />
        </div>
        <div className="field-group">
          <label>Tech. Name</label>
          <select
            value={technicianId}
            onChange={(e) => {
              const selectedId = e.target.value;
              handleTechnicianChange(selectedId);
            }}
            disabled={loadingTechnicians}
          >
            <option value="">Select technician</option>
            {technicians.map(tech => (
              <option key={tech.id || tech.name} value={tech.id || tech.name}>
                {tech.name || tech.id}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label>Invoice No:</label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Auto-generated"
          />
        </div>
        {ratesDatabaseInfo && (
          <div className="field-group rates-info">
            <label>Rates Database:</label>
            <span>{ratesDatabaseInfo.database_name} ({ratesDatabaseInfo.year})</span>
          </div>
        )}
      </div>

      <div className="expense-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="expense-content">
        {activeTab === 'tripDuration' && (
          <TripDurationTab
            segments={expenseData.segments}
            onSegmentsChange={(segments) => setExpenseData({ ...expenseData, segments })}
            ratesDatabaseInfo={ratesDatabaseInfo}
          />
        )}
        {activeTab === 'jobDetails' && (
          <JobDetailsTab
            customers={expenseData.customers}
            onCustomersChange={(customers) => setExpenseData({ ...expenseData, customers })}
          />
        )}
        {activeTab === 'receipts' && (
          <ReceiptsTab
            receipts={expenseData.receipts}
            onReceiptsChange={(receipts) => setExpenseData({ ...expenseData, receipts })}
            expenseId={expenseId}
          />
        )}
        {activeTab === 'carUsage' && (
          <CarUsageTab
            carUsage={expenseData.car_usage}
            onCarUsageChange={(carUsage) => setExpenseData({ ...expenseData, car_usage: carUsage })}
          />
        )}
        {activeTab === 'others' && (
          <OthersTab
            others={expenseData.others}
            onOthersChange={(others) => setExpenseData({ ...expenseData, others })}
          />
        )}
        {activeTab === 'tripOverview' && (
          <TripOverviewTab expenseData={expenseData} />
        )}
        {activeTab === 'dailyRates' && (
          <DailyRatesTab />
        )}
        {activeTab === 'emailNotes' && (
          <EmailNotesTab
            emailNotes={expenseData.email_notes}
            onEmailNotesChange={(emailNotes) => setExpenseData({ ...expenseData, email_notes: emailNotes })}
            expenseId={expenseId}
            defaultEmails={expenseSettings.smtp}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            onSettingsChange={(settings) => setExpenseSettings(settings)}
          />
        )}
      </div>

      <ExpenseListModal
        isOpen={showExpenseList}
        onClose={() => setShowExpenseList(false)}
        onSelectExpense={handleLoadExpense}
        technicians={technicians}
      />
    </div>
  );
};

export default ExpenseSubmissionPage;
