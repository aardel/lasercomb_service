import React, { useState } from 'react';

/**
 * CustomerForm Component
 * Displays a single customer input form with address autocomplete, work hours, and machine info
 */
const CustomerForm = ({
  customer,
  index,
  searchQuery,
  suggestions,
  showSuggestions,
  customerNearestAirport,
  loadingCustomerAirport,
  canRemove,
  isDragging,
  onSearch,
  onSelectCustomer,
  onTimeChange,
  onRemove,
  onDeleteSavedCustomer,
  onDragStart,
  onDragOver,
  onDrop,
  // Machine info (customer-related)
  machineInfo,
  onMachineInfoChange
}) => {
  const isActive = customer.name || customer.address;
  const displayValue = searchQuery !== undefined ? searchQuery : (customer.name || customer.address || '');
  const [showMachineInfo, setShowMachineInfo] = useState(false);

  return (
    <div 
      className={`customer-row ${isDragging ? 'dragging' : ''}`}
      draggable={isActive && canRemove}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
    >
      {canRemove && (
        <div className="drag-handle" title="Drag to reorder">
          ⋮⋮
        </div>
      )}
      {!canRemove && (
        <div className="drag-handle-placeholder"></div>
      )}
      <div className="customer-input-group">
        <div className="customer-address-input">
          <label>Customer {index + 1}</label>
          <div className="autocomplete-wrapper">
            <input
              type="text"
              value={displayValue}
              onChange={(e) => onSearch(customer.id, e.target.value)}
              onBlur={(e) => {
                // Delay hiding suggestions to allow click to register
                // Check if the blur is caused by clicking on a suggestion
                const relatedTarget = e.relatedTarget || document.activeElement;
                if (relatedTarget && relatedTarget.closest('.suggestions-list')) {
                  // Don't hide if clicking on a suggestion
                  return;
                }
                // Delay to allow mousedown/click to fire first
                setTimeout(() => {
                  // Parent component will handle hiding
                }, 150);
              }}
              placeholder="Search company/address..."
              className="form-input"
            />
            {showSuggestions && suggestions && (
              <ul className="suggestions-list">
                {suggestions.map((suggestion, idx) => (
                  <li
                    key={idx}
                    className={`suggestion-item ${suggestion.isSaved ? 'saved-customer' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                      e.stopPropagation();
                      onSelectCustomer(customer.id, suggestion);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Fallback in case mousedown didn't fire
                      onSelectCustomer(customer.id, suggestion);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {suggestion.isSaved && <span className="saved-badge">💾 Saved</span>}
                    <div 
                      className="suggestion-content"
                      style={{ flex: 1, cursor: 'pointer' }}
                    >
                      <div className="suggestion-main">
                        {suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0]}
                      </div>
                      {suggestion.structured_formatting?.secondary_text && (
                        <div className="suggestion-secondary">
                          {suggestion.structured_formatting.secondary_text}
                        </div>
                      )}
                      {!suggestion.structured_formatting?.secondary_text && suggestion.description && (
                        <div className="suggestion-secondary">
                          {suggestion.description}
                        </div>
                      )}
                    </div>
                    {suggestion.isSaved && suggestion.savedCustomer && (
                      <button
                        className="btn-delete-suggestion"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteSavedCustomer(suggestion.savedCustomer.id);
                        }}
                        title="Delete saved customer"
                        style={{
                          marginLeft: '8px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          background: '#ff4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Display nearest airport */}
          {customer.coordinates && (
            <div className="customer-airport-info">
              {loadingCustomerAirport ? (
                <span className="airport-loading">Loading airport...</span>
              ) : customerNearestAirport ? (
                <span className="airport-name">
                  ✈️ {customerNearestAirport.name} ({customerNearestAirport.code})
                </span>
              ) : null}
            </div>
          )}
        </div>
        <div className="work-hours-input">
          <label>Hours</label>
          <input
            type="number"
            value={customer.time_hours}
            onChange={(e) => onTimeChange(customer.id, e.target.value)}
            placeholder="0"
            min="0"
            step="0.5"
            className="form-input"
          />
        </div>
        {canRemove && (
          <button
            onClick={() => onRemove(customer.id)}
            className="btn-remove-customer"
            title="Remove customer"
          >
            ×
          </button>
        )}
      </div>
      
      {/* Machine Info Section (Customer-related) */}
      {isActive && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
          <button
            type="button"
            onClick={() => setShowMachineInfo(!showMachineInfo)}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '13px',
              padding: '4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {showMachineInfo ? '▼' : '▶'} Machine Information
          </button>
          
          {showMachineInfo && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                    Machine Type (Masch.typ)
                  </label>
                  <input
                    type="text"
                    value={machineInfo?.masch_typ || ''}
                    onChange={(e) => onMachineInfoChange(customer.id, 'masch_typ', e.target.value)}
                    placeholder="Enter machine type"
                    className="form-input"
                    style={{ padding: '8px', fontSize: '13px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                    Serial Number (Seriennr.)
                  </label>
                  <input
                    type="text"
                    value={machineInfo?.seriennr || ''}
                    onChange={(e) => onMachineInfoChange(customer.id, 'seriennr', e.target.value)}
                    placeholder="Enter serial number"
                    className="form-input"
                    style={{ padding: '8px', fontSize: '13px' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                  Job Task (Machine-related)
                </label>
                <textarea
                  value={machineInfo?.job_task || ''}
                  onChange={(e) => onMachineInfoChange(customer.id, 'job_task', e.target.value)}
                  placeholder="Enter job task description"
                  className="form-input"
                  rows="2"
                  style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerForm;




