import React, { useState, useEffect } from 'react';
import { getSettings } from '../../services/settingsStorage';
import { logger } from '../../utils/logger';
import './CarUsageTab.css';

const CarUsageTab = ({ carUsage, onCarUsageChange }) => {
  const [personalCar, setPersonalCar] = useState({
    car_number: carUsage?.personal_car_number || '',
    km: carUsage?.personal_car_km || 0,
    rate: carUsage?.personal_car_rate || 0.35,
    total: carUsage?.personal_car_total || 0
  });
  const [companyCar, setCompanyCar] = useState({
    car_number: carUsage?.company_car_number || '',
    total_km: carUsage?.company_car_total_km || 0
  });
  const [rentalCars, setRentalCars] = useState(
    carUsage?.rental_car_notes && Array.isArray(carUsage.rental_car_notes) && carUsage.rental_car_notes.length > 0
      ? carUsage.rental_car_notes
      : ['']
  );

  // Load fuel rate from settings
  useEffect(() => {
    const settings = getSettings();
    if (settings?.billing?.kmRateOwnCar) {
      setPersonalCar(prev => ({ ...prev, rate: settings.billing.kmRateOwnCar }));
    }
  }, []);

  // Calculate personal car total when KM or rate changes
  useEffect(() => {
    const total = (parseFloat(personalCar.km) || 0) * (parseFloat(personalCar.rate) || 0);
    setPersonalCar(prev => ({ ...prev, total: Math.round(total * 100) / 100 }));
  }, [personalCar.km, personalCar.rate]);

  // Update parent when data changes
  useEffect(() => {
    onCarUsageChange({
      personal_car_number: personalCar.car_number,
      personal_car_km: personalCar.km,
      personal_car_rate: personalCar.rate,
      personal_car_total: personalCar.total,
      company_car_number: companyCar.car_number,
      company_car_total_km: companyCar.total_km,
      rental_car_notes: rentalCars.filter(note => note.trim().length > 0)
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalCar, companyCar, rentalCars]); // onCarUsageChange is stable, no need to include

  const addRentalCar = () => {
    setRentalCars([...rentalCars, '']);
  };

  const removeRentalCar = (index) => {
    if (rentalCars.length > 1) {
      const updated = rentalCars.filter((_, i) => i !== index);
      setRentalCars(updated);
    }
  };

  const updateRentalCar = (index, value) => {
    const updated = [...rentalCars];
    updated[index] = value;
    setRentalCars(updated);
  };

  return (
    <div className="car-usage-tab">
      <div className="tab-header">
        <h2>Car Usage</h2>
      </div>

      <div className="car-sections">
        {/* Personal Car Section */}
        <div className="car-section">
          <h3>Personal Car</h3>
          <div className="car-fields">
            <div className="field-group">
              <label>Car Number</label>
              <input
                type="text"
                value={personalCar.car_number}
                onChange={(e) => setPersonalCar({ ...personalCar, car_number: e.target.value })}
                placeholder="Enter car number"
              />
            </div>
            <div className="field-group">
              <label>KM</label>
              <input
                type="number"
                step="0.01"
                value={personalCar.km}
                onChange={(e) => setPersonalCar({ ...personalCar, km: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="field-group">
              <label>Rate (€/km)</label>
              <input
                type="number"
                step="0.01"
                value={personalCar.rate}
                onChange={(e) => setPersonalCar({ ...personalCar, rate: parseFloat(e.target.value) || 0.35 })}
                placeholder="0.35"
              />
            </div>
            <div className="field-group">
              <label>Total</label>
              <div className="total-display">€{personalCar.total.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Company Car Section */}
        <div className="car-section">
          <h3>Company Car</h3>
          <div className="car-fields">
            <div className="field-group">
              <label>Car Number</label>
              <input
                type="text"
                value={companyCar.car_number}
                onChange={(e) => setCompanyCar({ ...companyCar, car_number: e.target.value })}
                placeholder="Enter car number"
              />
            </div>
            <div className="field-group">
              <label>Total KM</label>
              <input
                type="number"
                step="0.01"
                value={companyCar.total_km}
                onChange={(e) => setCompanyCar({ ...companyCar, total_km: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Rental Cars Section */}
        <div className="car-section">
          <div className="section-header">
            <h3>Rental Cars</h3>
            <button className="add-rental-btn" onClick={addRentalCar}>
              + Add Rental Car
            </button>
          </div>
          <div className="rental-cars-list">
            {rentalCars.map((note, index) => (
              <div key={index} className="rental-car-item">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => updateRentalCar(index, e.target.value)}
                  placeholder={`Rental Car ${index + 1} Notes`}
                />
                {rentalCars.length > 1 && (
                  <button
                    className="remove-rental-btn"
                    onClick={() => removeRentalCar(index)}
                    title="Remove rental car"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarUsageTab;
