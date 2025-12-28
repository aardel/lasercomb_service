import React from 'react';

/**
 * PerCustomerCosts Component
 * Displays cost breakdown per customer when costs are split
 */
const PerCustomerCosts = ({ costPreview, customers }) => {
  // Check if we have per-customer cost data
  const perCustomerCosts = costPreview?.per_customer_costs;

  if (!perCustomerCosts || perCustomerCosts.length <= 1) {
    return null; // Don't show for single customer
  }

  // Create a map of customer IDs to customer data for easy lookup
  const customerMap = {};
  customers.forEach(c => {
    customerMap[c.id] = c;
  });

  return (
    <div style={{
      marginTop: '24px',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      color: 'white'
    }}>
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: '18px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>💰</span>
        Cost Split Between Customers
      </h3>

      <div style={{
        fontSize: '13px',
        opacity: 0.9,
        marginBottom: '16px',
        padding: '8px 12px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        borderLeft: '3px solid rgba(255, 255, 255, 0.4)'
      }}>
        <strong>Note:</strong> Travel costs, allowances, hotel, and fees are shared based on cost %.
        Work time is individual per customer based on actual hours.
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {perCustomerCosts.map((customerCost, index) => {
          const customer = customerMap[customerCost.customer_id];

          return (
            <div
              key={customerCost.customer_id}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              {/* Customer Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                paddingBottom: '12px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    display: 'inline-block',
                    minWidth: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    textAlign: 'center',
                    lineHeight: '32px',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {index + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>
                      {customerCost.customer_name || customer?.name || 'Customer ' + (index + 1)}
                    </div>
                    {customer?.city && (
                      <div style={{ fontSize: '13px', opacity: 0.9 }}>
                        {customer.city}{customer.country && `, ${customer.country}`}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {customerCost.cost_percentage}%
                </div>
              </div>

              {/* Total Allocated Cost */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.25)',
                padding: '12px 16px',
                borderRadius: '6px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>Total Allocated Cost</span>
                <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  €{customerCost.allocated_cost.toFixed(2)}
                </span>
              </div>

              {/* Cost Breakdown */}
              <div style={{
                display: 'grid',
                gap: '8px',
                fontSize: '14px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  background: 'rgba(0, 0, 0, 0.1)',
                  borderRadius: '4px'
                }}>
                  <span>Travel Cost</span>
                  <span style={{ fontWeight: '500' }}>
                    €{customerCost.breakdown.travel_cost.toFixed(2)}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  background: 'rgba(0, 0, 0, 0.1)',
                  borderRadius: '4px'
                }}>
                  <span>
                    Work Time Cost
                    {customerCost.breakdown.work_hours > 0 && (
                      <span style={{ fontSize: '12px', opacity: 0.8, marginLeft: '4px' }}>
                        ({customerCost.breakdown.work_hours}h)
                      </span>
                    )}
                  </span>
                  <span style={{ fontWeight: '500' }}>
                    €{customerCost.breakdown.work_cost.toFixed(2)}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  background: 'rgba(0, 0, 0, 0.1)',
                  borderRadius: '4px'
                }}>
                  <span>Allowances</span>
                  <span style={{ fontWeight: '500' }}>
                    €{customerCost.breakdown.allowances.toFixed(2)}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  background: 'rgba(0, 0, 0, 0.1)',
                  borderRadius: '4px'
                }}>
                  <span>Hotel</span>
                  <span style={{ fontWeight: '500' }}>
                    €{customerCost.breakdown.hotel.toFixed(2)}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  background: 'rgba(0, 0, 0, 0.1)',
                  borderRadius: '4px'
                }}>
                  <span>Fees & Charges</span>
                  <span style={{ fontWeight: '500' }}>
                    €{customerCost.breakdown.fees.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Verification */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '15px',
        fontWeight: '600'
      }}>
        <span>Total (All Customers)</span>
        <span style={{ fontSize: '18px' }}>
          €{perCustomerCosts.reduce((sum, c) => sum + c.allocated_cost, 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export default PerCustomerCosts;
