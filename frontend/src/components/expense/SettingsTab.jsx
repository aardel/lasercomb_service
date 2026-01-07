import React, { useState, useEffect } from 'react';
import { getSettings, getActiveTechnician } from '../../services/settingsStorage';
import { expensesAPI, ratesAPI } from '../../services/api';
import { logger } from '../../utils/logger';
import './SettingsTab.css';

const SettingsTab = ({ onSettingsChange }) => {
  const [technician, setTechnician] = useState(null);
  const [personalNumber, setPersonalNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceInitials, setInvoiceInitials] = useState('');
  const [fuelRate, setFuelRate] = useState(0.35);
  const [ratesDatabase, setRatesDatabase] = useState('');
  const [smtpConfig, setSmtpConfig] = useState({
    server: '',
    port: 25,
    authenticate: false,
    username: '',
    password: '',
    to: '',
    cc: '',
    from: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load technician
      const activeTech = await getActiveTechnician();
      if (activeTech) {
        setTechnician(activeTech);
        setInvoiceInitials(extractInitials(activeTech.name));
      }

      // Load billing settings for fuel rate
      const settings = getSettings();
      if (settings?.billing?.kmRateOwnCar) {
        setFuelRate(settings.billing.kmRateOwnCar);
      }

      // Load rates database info
      const ratesResponse = await expensesAPI.getRatesInfo();
      if (ratesResponse.data.success) {
        setRatesDatabase(ratesResponse.data.data.database_name || '');
      }

      // TODO: Load expense-specific settings from database
      // For now, use defaults
    } catch (error) {
      logger.error('SettingsTab', 'Error loading settings:', error);
    }
  };

  const extractInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Save to database
      const technicianId = technician?.id || null;
      const settingsData = {
        technician_id: technicianId,
        personal_number: personalNumber,
        department: department,
        smtp_config: {
          server: smtpConfig.server,
          port: smtpConfig.port,
          authenticate: smtpConfig.authenticate,
          username: smtpConfig.username,
          password: smtpConfig.password
        },
        default_emails: {
          to: smtpConfig.to,
          cc: smtpConfig.cc,
          from: smtpConfig.from
        }
      };
      
      const response = await expensesAPI.saveSettings(settingsData);
      if (response.data.success) {
        // Also update parent component for immediate use
        if (onSettingsChange) {
          onSettingsChange({
            smtp: {
              to: smtpConfig.to,
              cc: smtpConfig.cc,
              from: smtpConfig.from
            }
          });
        }
        alert('Settings saved successfully!');
      }
    } catch (error) {
      logger.error('SettingsTab', 'Error saving settings:', error);
      alert('Error saving settings: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleReloadRates = async () => {
    try {
      // TODO: Implement rates database reload
      alert('Rates database reload feature coming soon!');
    } catch (error) {
      logger.error('SettingsTab', 'Error reloading rates:', error);
    }
  };

  return (
    <div className="expense-settings-tab">
      <div className="tab-header">
        <h2>Settings</h2>
        <button className="save-settings-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="settings-sections">
        {/* Personal Details Section */}
        <div className="settings-section">
          <h3>Personal Details</h3>
          <div className="settings-grid">
            <div className="field-group">
              <label>Tech. Name</label>
              <input
                type="text"
                value={technician?.name || ''}
                disabled
                placeholder="Selected from technicians"
              />
            </div>
            <div className="field-group">
              <label>Personal Number</label>
              <input
                type="text"
                value={personalNumber}
                onChange={(e) => setPersonalNumber(e.target.value)}
                placeholder="0000"
              />
            </div>
            <div className="field-group">
              <label>Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Service"
              />
            </div>
          </div>
        </div>

        {/* General Section */}
        <div className="settings-section">
          <h3>General</h3>
          <div className="settings-grid">
            <div className="field-group">
              <label>Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Auto-generated"
              />
            </div>
            <div className="field-group">
              <label>Invoice Initials</label>
              <input
                type="text"
                value={invoiceInitials}
                onChange={(e) => setInvoiceInitials(e.target.value)}
                placeholder="AD"
              />
            </div>
            <div className="field-group">
              <label>Fuel Rate</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  step="0.01"
                  value={fuelRate}
                  onChange={(e) => setFuelRate(parseFloat(e.target.value) || 0.35)}
                  placeholder="0.35"
                />
                <span>€/km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rates Database Section */}
        <div className="settings-section">
          <h3>Rates Database</h3>
          <div className="settings-grid">
            <div className="field-group">
              <label>Rates Database</label>
              <div className="input-with-button">
                <input
                  type="text"
                  value={ratesDatabase}
                  disabled
                  placeholder="Current rates database"
                />
                <button className="reload-btn" onClick={handleReloadRates}>
                  Reload
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SMTP Section */}
        <div className="settings-section">
          <h3>SMTP</h3>
          <div className="settings-grid">
            <div className="field-group">
              <label>Server</label>
              <input
                type="text"
                value={smtpConfig.server}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, server: e.target.value })}
                placeholder="mail.example.com"
              />
            </div>
            <div className="field-group">
              <label>Port</label>
              <input
                type="number"
                value={smtpConfig.port}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) || 25 })}
                placeholder="25"
              />
            </div>
            <div className="field-group checkbox-field">
              <label>
                <input
                  type="checkbox"
                  checked={smtpConfig.authenticate}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, authenticate: e.target.checked })}
                />
                <span>Authenticate</span>
              </label>
            </div>
            <div className="field-group">
              <label>Username</label>
              <input
                type="text"
                value={smtpConfig.username}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                placeholder="smtp@example.com"
                disabled={!smtpConfig.authenticate}
              />
            </div>
            <div className="field-group">
              <label>Password</label>
              <input
                type="password"
                value={smtpConfig.password}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                placeholder="••••••••"
                disabled={!smtpConfig.authenticate}
              />
            </div>
            <div className="field-group">
              <label>To</label>
              <input
                type="email"
                value={smtpConfig.to}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, to: e.target.value })}
                placeholder="support@lasercomb.com"
              />
            </div>
            <div className="field-group">
              <label>cc</label>
              <input
                type="email"
                value={smtpConfig.cc}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, cc: e.target.value })}
                placeholder="delia@lasercomb.com"
              />
            </div>
            <div className="field-group">
              <label>From</label>
              <input
                type="email"
                value={smtpConfig.from}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, from: e.target.value })}
                placeholder="delia@lasercomb.com"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
