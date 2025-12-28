import React from 'react';
import SelectedFlightDisplay from './SelectedFlightDisplay';
import BaseCard from './BaseCard';
import AirportSelector from './AirportSelector';
import CustomerForm from './CustomerForm';
import TravelModeCard from './TravelModeCard';

/**
 * RoutePlanningSection Component
 * Complete route planning interface with customers, airports, and flight selection
 */
const RoutePlanningSection = ({
  // Customers
  customers,
  searchQueries,
  suggestions,
  showSuggestions,
  customerNearestAirports,
  loadingCustomerAirports,
  draggedIndex,
  travelModes,
  transferInfo,
  
  // Technicians & Airports
  selectedTechnician,
  selectedDepartureAirport,
  selectedReturnAirport,
  
  // Flights
  selectedFlight,
  segmentFlights,
  loadingSegmentFlights,
  
  // Machine Info (customer-related)
  customerMachineInfo,
  onMachineInfoChange,
  
  // Handlers
  onViewFlights,
  onGenerateAIPrompt,
  onCustomerSearch,
  onSelectCustomer,
  onCustomerTimeChange,
  onRemoveCustomer,
  onDeleteSavedCustomer,
  onDragStart,
  onDragOver,
  onDrop,
  onTravelModeChange,
  onDepartureAirportSelect,
  onReturnAirportSelect,
  onTransportChange,
  onTechnicianUpdate,
  onClearFlight,
  onClearSegment,
  onSegmentClick,
  onAddCustomer,
  getActiveCustomers,
  generateTripSegments,
  getTotalSegmentFlightsCost
}) => {
  const activeCustomers = getActiveCustomers();
  const isMultiCustomer = activeCustomers.length > 1;
  const segments = isMultiCustomer ? generateTripSegments() : [];

  return (
    <section className="config-section glass-card">
      <div className="section-header">
        <h2>2. Route Planning</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={onViewFlights}
            className="btn-secondary btn-sm"
            disabled={activeCustomers.length === 0}
            title="View and select flights for the first customer"
          >
            ✈️ View Flights
          </button>
          <button 
            onClick={onGenerateAIPrompt} 
            className="btn-secondary btn-sm"
            disabled={activeCustomers.length === 0}
            title="Generate AI prompt for route optimization"
          >
            🤖 AI Prompt
          </button>
        </div>
      </div>

      {/* Flight Selection Display */}
      <SelectedFlightDisplay
        selectedFlight={selectedFlight}
        segmentFlights={segmentFlights}
        segments={segments}
        isMultiCustomer={isMultiCustomer}
        onClearFlight={onClearFlight}
        onClearSegment={onClearSegment}
        onSegmentClick={onSegmentClick}
        loadingSegmentFlights={loadingSegmentFlights}
        getTotalSegmentFlightsCost={getTotalSegmentFlightsCost}
      />

      {/* Base Card - Departure */}
      <BaseCard
        label="BASE (DEPARTURE)"
        technician={selectedTechnician}
        selectedAirport={selectedDepartureAirport}
        onTransportChange={onTransportChange}
        onTechnicianUpdate={onTechnicianUpdate}
      />
      
      {/* Departure Airport */}
      <AirportSelector
        label="🏠 Departure Airport"
        airports={selectedTechnician?.airports}
        selectedAirport={selectedDepartureAirport}
        placeholder="Select technician to see departure airports"
        onSelect={onDepartureAirportSelect}
      />
      
      {/* Customer List */}
      <div className="customers-list-new">
        {customers.map((customer, index) => {
          const isActive = customer.name || customer.address;
          
          return (
            <React.Fragment key={customer.id}>
              <CustomerForm
                customer={customer}
                index={index}
                searchQuery={searchQueries[customer.id]}
                suggestions={suggestions[customer.id]}
                showSuggestions={showSuggestions[customer.id]}
                customerNearestAirport={customerNearestAirports[customer.id]}
                loadingCustomerAirport={loadingCustomerAirports[customer.id]}
                canRemove={customers.length > 1}
                isDragging={draggedIndex === index}
                onSearch={onCustomerSearch}
                onSelectCustomer={onSelectCustomer}
                onTimeChange={onCustomerTimeChange}
                onRemove={onRemoveCustomer}
                onDeleteSavedCustomer={onDeleteSavedCustomer}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                machineInfo={customerMachineInfo?.[customer.id] || null}
                onMachineInfoChange={onMachineInfoChange}
              />
              
              {/* Travel Mode Card - Only show between customers */}
              {isActive && (
                index < customers.length - 1 && customers[index + 1] && (customers[index + 1].name || customers[index + 1].address) && (
                  <TravelModeCard
                    fromCustomerIndex={index + 1}
                    toCustomerIndex={index + 2}
                    travelMode={travelModes[index + 1]}
                    transferInfo={transferInfo[index + 1]}
                    onModeChange={(mode) => onTravelModeChange(index + 1, mode)}
                  />
                )
              )}
            </React.Fragment>
          );
        })}
        
        {/* Add Customer Button */}
        {customers.length < 10 && (
          <button 
            onClick={onAddCustomer}
            className="btn-add-customer"
          >
            + Add Customer
          </button>
        )}
      </div>

      {/* Return Airport */}
      <AirportSelector
        label="🏠 Return Airport"
        airports={selectedTechnician?.airports}
        selectedAirport={selectedReturnAirport}
        placeholder="Select technician to see return airports"
        onSelect={onReturnAirportSelect}
      />

      {/* Base Card - Return */}
      <BaseCard
        label="BASE (RETURN)"
        technician={selectedTechnician}
        selectedAirport={selectedReturnAirport}
        onTransportChange={onTransportChange}
        onTechnicianUpdate={onTechnicianUpdate}
      />
    </section>
  );
};

export default RoutePlanningSection;



