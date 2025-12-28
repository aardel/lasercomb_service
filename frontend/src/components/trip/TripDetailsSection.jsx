import React from 'react';

/**
 * TripDetailsSection Component
 * Displays and manages trip details: technician, trip date, starting address, and quote form fields
 */
const TripDetailsSection = ({
  selectedTechnician,
  allTechnicians,
  tripDate,
  startingAddress,
  onTechnicianChange,
  onTripDateChange,
  onStartingAddressChange,
  // New quote form fields
  einsatzart,
  auftrag,
  reisekostenpauschale,
  useFlatRate,
  partsText,
  onEinsatzartChange,
  onAuftragChange,
  onReisekostenpauschaleChange,
  onUseFlatRateChange,
  onPartsTextChange,
  // Cost splitting for multiple customers
  customers = [],
  onCostPercentageChange
}) => {
  // Get active customers (those with name or address)
  const activeCustomers = customers.filter(c => c.name || c.address);
  const showCostSplitting = activeCustomers.length > 1;

  // Handle cost percentage change with auto-calculation
  const handlePercentageChange = (customerId, value) => {
    const percentage = parseFloat(value) || 0;

    // Don't allow negative or > 100
    if (percentage < 0 || percentage > 100) return;

    // Calculate remaining percentage for other customers
    const otherCustomers = activeCustomers.filter(c => c.id !== customerId);
    const remainingPercentage = 100 - percentage;

    // Distribute remaining percentage equally among other customers
    const perCustomerShare = otherCustomers.length > 0
      ? remainingPercentage / otherCustomers.length
      : 0;

    // Create updated percentages object
    const updatedPercentages = {};
    activeCustomers.forEach(c => {
      if (c.id === customerId) {
        updatedPercentages[c.id] = percentage;
      } else {
        updatedPercentages[c.id] = parseFloat(perCustomerShare.toFixed(2));
      }
    });

    onCostPercentageChange(updatedPercentages);
  };
  return (
    <section className="config-section glass-card">
      <h2>1. Trip Details</h2>
      {/* Row 1: Technician and Trip Date side by side */}
      <div className="form-row" style={{ marginBottom: '12px' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Technician</label>
          <select
            value={selectedTechnician?.id || 'standard'}
            onChange={(e) => onTechnicianChange(e.target.value)}
            className="form-input"
            style={{ padding: '10px', fontSize: '14px' }}
          >
            {allTechnicians.map(tech => (
              <option key={tech.id} value={tech.id}>
                {tech.name} {tech.transportToAirport === 'taxi' ? '🚕' : '🚗'}
              </option>
            ))}
          </select>
        </div>
        <div className="wizard-field" style={{ flex: 1 }}>
          <label>Trip Date</label>
          <input
            type="date"
            value={tripDate}
            onChange={(e) => onTripDateChange(e.target.value)}
          />
        </div>
      </div>
      {/* Row 2: Starting From (full width) */}
      <div className="form-group" style={{ width: '100%', marginBottom: '12px' }}>
        <label>Starting From <span style={{ color: '#6b7280', fontSize: '11px' }}>(from technician)</span></label>
        <input
          type="text"
          value={startingAddress}
          onChange={(e) => onStartingAddressChange(e.target.value)}
          className="form-input"
          placeholder="Enter starting address"
          style={{ width: '100%' }}
        />
      </div>
      
      {/* Quote Form Fields */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#374151' }}>Quote Information</h3>
        
        {/* Row 3: Deployment Type and Order Number */}
        <div className="form-row" style={{ marginBottom: '12px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Deployment Type (Einsatzart)</label>
            <select
              value={einsatzart}
              onChange={(e) => onEinsatzartChange(e.target.value)}
              className="form-input"
              style={{ padding: '10px', fontSize: '14px' }}
            >
              <option value="">Select type</option>
              <option value="Installation">Installation</option>
              <option value="Service">Service</option>
              <option value="Repair">Repair</option>
              <option value="Training">Training</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inspection">Inspection</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Order Number (Auftrag)</label>
            <input
              type="text"
              value={auftrag}
              onChange={(e) => onAuftragChange(e.target.value)}
              className="form-input"
              placeholder="Enter order number"
              style={{ padding: '10px', fontSize: '14px' }}
            />
          </div>
        </div>

        {/* Row 4: Travel Cost Flat Rate */}
        <div className="form-row" style={{ marginBottom: '12px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Travel Cost Flat Rate (Reisekostenpauschale) - Optional</label>
            <input
              type="number"
              value={reisekostenpauschale || ''}
              onChange={(e) => onReisekostenpauschaleChange(e.target.value ? parseFloat(e.target.value) : null)}
              className="form-input"
              placeholder="0.00"
              step="0.01"
              min="0"
              style={{ padding: '10px', fontSize: '14px' }}
            />
          </div>
          <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useFlatRate}
                onChange={(e) => onUseFlatRateChange(e.target.checked)}
                style={{ marginRight: '2px', display: 'flex' }}
              />
              Use flat rate instead of calculated costs
            </label>
          </div>
        </div>

        {/* Row 5: Parts Text */}
        <div className="form-group" style={{ width: '100%', marginBottom: '12px' }}>
          <label>Parts (Teile) - Paste from another system</label>
          <textarea
            value={partsText}
            onChange={(e) => onPartsTextChange(e.target.value)}
            className="form-input"
            placeholder="Paste parts list here..."
            rows="3"
            style={{ width: '100%', padding: '10px', fontSize: '14px', fontFamily: 'monospace' }}
          />
        </div>
      </div>

      {/* Cost Splitting Section - Only show for multiple customers */}
      {showCostSplitting && (
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#374151' }}>
            Cost Splitting
            <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: 'normal', marginLeft: '8px' }}>
              (Adjust percentages to split costs between customers)
            </span>
          </h3>

          <div style={{ display: 'grid', gap: '12px' }}>
            {activeCustomers.map((customer, index) => {
              const percentage = customer.cost_percentage || (100 / activeCustomers.length);
              const totalPercentage = activeCustomers.reduce((sum, c) => sum + (c.cost_percentage || 0), 0);

              return (
                <div key={customer.id} className="form-row" style={{ alignItems: 'center', marginBottom: '0' }}>
                  <div style={{ flex: 2, display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      minWidth: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      textAlign: 'center',
                      lineHeight: '24px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      marginRight: '12px'
                    }}>
                      {index + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>
                        {customer.name || 'Customer ' + (index + 1)}
                      </div>
                      {customer.city && (
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {customer.city}{customer.country && `, ${customer.country}`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      value={percentage}
                      onChange={(e) => handlePercentageChange(customer.id, e.target.value)}
                      className="form-input"
                      min="0"
                      max="100"
                      step="0.01"
                      style={{
                        padding: '8px 12px',
                        fontSize: '14px',
                        textAlign: 'right',
                        width: '100px'
                      }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: '500', minWidth: '20px' }}>%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total percentage validation */}
          {(() => {
            const total = activeCustomers.reduce((sum, c) => sum + (c.cost_percentage || (100 / activeCustomers.length)), 0);
            const isValid = Math.abs(total - 100) < 0.01; // Allow for floating point rounding

            return (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                borderRadius: '6px',
                backgroundColor: isValid ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${isValid ? '#6ee7b7' : '#fecaca'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: isValid ? '#047857' : '#dc2626',
                  fontWeight: '500'
                }}>
                  {isValid ? '✓ Total:' : '⚠ Total must equal 100%:'}
                </span>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: isValid ? '#047857' : '#dc2626'
                }}>
                  {total.toFixed(2)}%
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </section>
  );
};

export default TripDetailsSection;




