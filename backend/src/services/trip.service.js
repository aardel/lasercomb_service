const Trip = require('../models/trip.model');
const Customer = require('../models/customer.model');
const costCalculatorService = require('./cost-calculator.service');
const { calculateDistance } = require('./distance.service');

class TripService {
  /**
   * Create a new trip with automatic cost calculation
   */
  async createTrip(tripData) {
    try {
      // Determine trip type based on number of customers
      const customerIds = tripData.customer_ids || [];
      const tripType = customerIds.length > 1 ? 'combined' : 'single';

      // Prepare metadata with excess baggage if flight is selected
      const metadata = {
        ...tripData.metadata,
        ...(tripData.selected_travel_mode === 'flight' && tripData.excess_baggage ? {
          excess_baggage: tripData.excess_baggage
        } : {})
      };

      // Create the trip
      const trip = await Trip.create({
        ...tripData,
        trip_type: tripType,
        metadata: metadata
      });

      // Add customers to trip with machine info
      if (customerIds.length > 0) {
        for (let i = 0; i < customerIds.length; i++) {
          const customerId = customerIds[i];
          const customerData = tripData.customer_data?.[i] || {};
          await Trip.addCustomer(trip.id, customerId, {
            visit_order: i + 1,
            work_percentage: tripData.work_percentages?.[i] || (100 / customerIds.length),
            cost_percentage: tripData.cost_percentages?.[i] || (100 / customerIds.length),
            visit_duration_hours: tripData.visit_durations?.[i] || null,
            masch_typ: customerData.masch_typ || null,
            seriennr: customerData.seriennr || null,
            job_task: customerData.job_task || null
          });
        }
      }

      // Calculate costs if engineer and customer locations are provided
      if (tripData.engineer_location && customerIds.length > 0) {
        await this.calculateAndUpdateTripCosts(trip.id);
      }

      // Reload trip with all data
      return await this.getTripById(trip.id);
    } catch (error) {
      console.error('Error creating trip:', error);
      throw error;
    }
  }

  /**
   * Calculate costs for a trip and update the trip record
   */
  async calculateAndUpdateTripCosts(tripId) {
    const trip = await Trip.findById(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const tripCustomers = await Trip.getCustomers(tripId);
    if (tripCustomers.length === 0) {
      throw new Error('No customers assigned to trip');
    }

    if (!trip.planned_start_date) {
      return trip;
    }

    // Get engineer location
    const engineerLocation = trip.metadata?.engineer_location || {
      lat: 48.6705944, // Lasercomb GmbH
      lng: 9.4406713
    };

    // Prepare customer data for multi-stop calculation
    const customersData = await Promise.all(tripCustomers.map(async (tc) => {
      const customer = await Customer.findById(tc.customer_id);
      return {
        customer_id: tc.customer_id,
        name: customer.name,
        city: customer.city,
        country: customer.country,
        coordinates: customer.latitude && customer.longitude
          ? { lat: parseFloat(customer.latitude), lng: parseFloat(customer.longitude) }
          : null,
        work_hours: tc.visit_duration_hours || (trip.work_hours_estimate * (tc.work_percentage / 100)) || 0
      };
    }));

    // Calculate costs using multi-stop logic
    const costs = await costCalculatorService.calculateMultiStopTripCosts({
      engineer_location: engineerLocation,
      customers: customersData,
      date: trip.planned_start_date,
      trip_customers: tripCustomers // Pass trip_customers data including cost_percentage
    });

    // Preserve excess_baggage in metadata if it exists
    const metadata = typeof trip.metadata === 'string' 
      ? JSON.parse(trip.metadata) 
      : (trip.metadata || {});
    
    // Update trip with calculated costs and optimized route
    const updatedTrip = await Trip.update(tripId, {
      estimated_total_cost: costs.total_quotation,
      total_distance_km: costs.total_distance_km,
      total_travel_hours: costs.total_travel_hours,
      optimized_route: JSON.stringify(costs.metadata.optimized_sequence),
      metadata: {
        ...metadata,
        cost_breakdown: costs,
        engineer_location: engineerLocation
      }
    });

    return updatedTrip;
  }

  /**
   * Get trip by ID with all related data
   */
  async getTripById(id) {
    const trip = await Trip.findById(id);
    if (!trip) {
      throw new Error('Trip not found');
    }

    // Get customers
    const customers = await Trip.getCustomers(id);

    // Parse JSON fields
    if (trip.metadata) {
      trip.metadata = typeof trip.metadata === 'string'
        ? JSON.parse(trip.metadata)
        : trip.metadata;
    }
    if (trip.optimized_route) {
      trip.optimized_route = typeof trip.optimized_route === 'string'
        ? JSON.parse(trip.optimized_route)
        : trip.optimized_route;
    }

    return {
      ...trip,
      customers
    };
  }

  /**
   * Get all trips with filters
   */
  async getAllTrips(filters) {
    const trips = await Trip.findAll(filters);

    // Parse JSON fields and add customer counts
    return await Promise.all(trips.map(async (trip) => {
      if (trip.metadata) {
        trip.metadata = typeof trip.metadata === 'string'
          ? JSON.parse(trip.metadata)
          : trip.metadata;
      }
      if (trip.optimized_route) {
        trip.optimized_route = typeof trip.optimized_route === 'string'
          ? JSON.parse(trip.optimized_route)
          : trip.optimized_route;
      }

      const customers = await Trip.getCustomers(trip.id);
      trip.customer_count = customers.length;

      return trip;
    }));
  }

  /**
   * Update trip
   */
  async updateTrip(id, tripData) {
    // If customers are being updated
    if (tripData.customer_ids) {
      // Remove all existing customers
      const existingCustomers = await Trip.getCustomers(id);
      for (const customer of existingCustomers) {
        await Trip.removeCustomer(id, customer.customer_id);
      }

      // Add new customers with machine info
      for (let i = 0; i < tripData.customer_ids.length; i++) {
        const customerId = tripData.customer_ids[i];
        const customerData = tripData.customer_data?.[i] || {};
        await Trip.addCustomer(id, customerId, {
          visit_order: i + 1,
          work_percentage: tripData.work_percentages?.[i] || (100 / tripData.customer_ids.length),
          cost_percentage: tripData.cost_percentages?.[i] || (100 / tripData.customer_ids.length),
          visit_duration_hours: tripData.visit_durations?.[i] || null,
          masch_typ: customerData.masch_typ || null,
          seriennr: customerData.seriennr || null,
          job_task: customerData.job_task || null
        });
      }

      // Update trip type
      await Trip.updateTripType(id);
    }

    // Update trip fields
    const updatedTrip = await Trip.update(id, tripData);

    // Recalculate costs if relevant fields changed
    if (tripData.engineer_location || tripData.planned_start_date || tripData.work_hours_estimate) {
      try {
        await this.calculateAndUpdateTripCosts(id);
        return await this.getTripById(id);
      } catch (error) {
        console.warn('Could not recalculate costs:', error.message);
      }
    }

    return await this.getTripById(id);
  }

  /**
   * Delete trip
   */
  async deleteTrip(id) {
    await Trip.delete(id);
  }

  /**
   * Add customer to existing trip
   */
  async addCustomerToTrip(tripId, customerId, customerData = {}) {
    await Trip.addCustomer(tripId, customerId, customerData);
    await Trip.updateTripType(tripId);
    return await this.getTripById(tripId);
  }

  /**
   * Remove customer from trip
   */
  async removeCustomerFromTrip(tripId, customerId) {
    await Trip.removeCustomer(tripId, customerId);
    await Trip.updateTripType(tripId);
    return await this.getTripById(tripId);
  }
}

module.exports = new TripService();


