# Travel Cost Automation System - Project Overview

## 🎯 Project Goal

Automate the creation of travel cost quotations for a German engineering services company. Currently, creating a quotation takes 60 minutes of manual work (searching flights, calculating costs, filling forms). The goal is to reduce this to 3 minutes with full automation.

## 📋 What This System Does

### Current Process (Manual)
1. User searches flights on booking sites → 15 min
2. User checks car rental prices → 10 min
3. User looks up hotel rates → 5 min
4. User calculates distances on Google Maps → 5 min
5. User finds government per diem rates → 5 min
6. User calculates all costs manually → 15 min
7. User fills quotation form → 5 min

**Total: ~60 minutes per quotation**

### Automated Process
1. User selects customer from database → 30 sec
2. User selects engineer and date → 30 sec
3. System automatically:
   - Fetches customer and engineer locations
   - Searches flights (all airlines, real-time prices)
   - Calculates drive distance and time
   - Compares flight vs. car options
   - Applies official German government rates
   - Calculates all cost components
   - Fills the quotation template
   - Generates PDF
4. User reviews and sends → 2 min

**Total: ~3 minutes per quotation (95% time savings!)**

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE (Web)                      │
│  - Customer Management  - Trip Planning  - Quotation View   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    BACKEND API SERVER                        │
│              (Node.js/Express or Python/FastAPI)            │
└────────┬──────────┬──────────┬──────────┬──────────┬────────┘
         │          │          │          │          │
    ┌────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐ ┌──▼─────┐
    │Customer│ │Engineer│ │  Trip  │ │  Cost  │ │Quotation│
    │  Mgmt  │ │  Mgmt  │ │Planning│ │  Calc  │ │   Gen   │
    └────┬───┘ └───┬────┘ └───┬────┘ └───┬────┘ └──┬─────┘
         │         │          │          │         │
         └─────────┴──────────┴──────────┴─────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌─────▼─────┐    ┌─────▼─────┐
    │PostgreSQL│      │  External │    │   File    │
    │ Database │      │    APIs   │    │  Storage  │
    └──────────┘      └─────┬─────┘    └───────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         ┌────▼────┐   ┌────▼────┐  ┌────▼─────┐
         │ Amadeus │   │ Google  │  │  Rates   │
         │ Flights │   │  Maps   │  │   DB     │
         └─────────┘   └─────────┘  └──────────┘
```

## 📚 Core Modules

### 1. Customer Management
- **Purpose**: Manage customer database with locations
- **Features**:
  - Import from APplus ERP (XML/CSV)
  - Manual customer entry form
  - Bulk CSV upload
  - Geocoding (address → coordinates)
  - Airport detection
- **Status**: To be implemented

### 2. Engineer/Technician Management
- **Purpose**: Track engineers/technicians, locations, preferences
- **Features**:
  - Technician profiles with home location
  - Airport preferences
  - Ground transport preferences (taxi/car)
  - Starting location configuration
- **Status**: ✅ Implemented (Basic profile management)

### 3. Trip Planning
- **Purpose**: Create and manage trips (3 types)
- **Trip Types**:
  - **Single**: One engineer → one customer
  - **Combined**: One engineer → multiple customers (up to 8)
  - **Pending**: Quotation awaiting approval
- **Features**:
  - Advanced Trip Wizard interface
  - Route optimization (for combined trips)
  - Travel mode selection per segment (fly/drive)
  - Flight search and selection
  - Hotel and rental car search
  - Real-time cost preview
  - Interactive map visualization
  - Cost splitting for combined trips
- **Status**: ✅ Implemented

### 4. Cost Calculation Engine
- **Purpose**: Automatically calculate all costs using official rates
- **Calculations**:
  - Travel time costs (98 €/hour)
  - Working time costs (132 €/hour)
  - Distance costs (0.88 €/km for road)
  - Daily allowances (official government rates)
  - Hotel costs (official government rates)
  - Flight/taxi/parking/tolls
- **Data Sources**:
  - German government rates (ARVVwV 2025) - 180+ countries
  - Company custom rates (higher than minimum)
  - Real-time flight prices (Amadeus API)
  - Real-time distances (Google Maps API)
- **Status**: ✅ Implemented

### 5. Quotation Generation
- **Purpose**: Auto-fill quotation template and generate PDF
- **Output**: PDF matching the company template format
- **Status**: To be implemented

## 🗃️ Database Schema Overview

### Core Tables
1. **customers** - Customer master data with locations
2. **engineers** - Engineer profiles with skills and locations
3. **trips** - Trip planning (single/combined/pending)
4. **trip_customers** - Many-to-many relationship (combined trips)
5. **quotations** - Generated quotations with all costs
6. **country_travel_rates** - Official German government rates (180+ countries)
7. **company_custom_rates** - Company-specific rate overrides
8. **import_history** - Track APplus imports
9. **flight_searches** - Cache flight search results
10. **engineer_availability** - Engineer calendar

See `DATABASE_SCHEMA.sql` for complete schema definitions.

## 🔌 External API Integrations

### Required APIs

1. **Amadeus Flight Search API**
   - Purpose: Search flights, get real-time prices
   - Cost: FREE tier (2,000 searches/month)
   - Signup: https://developers.amadeus.com/
   - Docs: https://developers.amadeus.com/self-service/category/flights

2. **Google Maps Distance Matrix API**
   - Purpose: Calculate distances, drive times, routes
   - Cost: FREE $200/month credit (~40,000 requests)
   - Signup: https://console.cloud.google.com/
   - Docs: https://developers.google.com/maps/documentation/distance-matrix

3. **Google Maps Geocoding API**
   - Purpose: Convert addresses to coordinates
   - Cost: FREE $200/month credit (~40,000 requests)
   - Signup: https://console.cloud.google.com/
   - Docs: https://developers.google.com/maps/documentation/geocoding

### Optional APIs (Future)
- TollGuru API - Toll cost calculations
- Car Rental APIs - Automated rental quotes

## 📊 Official Government Rates

The system uses official German government travel expense rates published annually by the Bundesministerium der Finanzen (Federal Ministry of Finance).

**Source Document**: Auslandsreisekostenverordnung (ARV) - ARVVwV 2025

**Coverage**: 180+ countries with:
- Daily allowances (Tagesgeld) for >8h and 24h trips
- Hotel allowances (Übernachtungsgeld) per night
- Updated annually (current: January 2025)

**Example Rates** (Daily / Hotel):
- Germany: 14€/28€ | 20€
- France (Paris): 48€ | 159€
- UK (London): 47€ | 200€
- USA (New York): 59€ | 387€
- Switzerland (Zurich): 69€ | 212€

**Implementation**: One-time database import, annual updates

See `automation_strategy.txt` for complete rate tables and import instructions.

## 🎨 Technology Stack

### Recommended Stack

**Backend**:
- Node.js with Express (or Python with FastAPI)
- PostgreSQL database
- RESTful API architecture

**Frontend**:
- React (with TypeScript)
- Tailwind CSS for styling
- React Router for navigation

**Infrastructure**:
- Docker for containerization
- Railway/Render/Heroku for hosting
- AWS S3 or similar for file storage

**Key Libraries**:
- `axios` - API requests
- `pg` - PostgreSQL client
- `pdf-lib` or `pdfkit` - PDF generation
- `date-fns` - Date manipulation
- `csv-parser` - CSV imports
- `xml2js` - XML parsing
- `chokidar` - File watching

### Alternative Stack (Python)
- FastAPI + SQLAlchemy + Alembic
- React frontend (same)
- PostgreSQL (same)

## 📁 Project Structure

```
travel-cost-automation/
├── docs/                           # All documentation
│   ├── PROJECT_OVERVIEW.md         # This file
│   ├── IMPLEMENTATION_PLAN.md      # Step-by-step guide
│   ├── DATABASE_SCHEMA.sql         # Complete DB schema
│   ├── API_DOCUMENTATION.md        # API endpoints reference
│   ├── workflow_analysis.txt       # Business workflow details
│   ├── calculation_template_analysis.txt
│   ├── automation_strategy.txt
│   └── applus_integration_guide.txt
│
├── backend/
│   ├── src/
│   │   ├── config/                 # Configuration files
│   │   ├── models/                 # Database models
│   │   ├── routes/                 # API routes
│   │   ├── services/               # Business logic
│   │   │   ├── customer.service.js
│   │   │   ├── engineer.service.js
│   │   │   ├── trip.service.js
│   │   │   ├── cost-calculator.service.js
│   │   │   ├── flight-search.service.js
│   │   │   ├── distance.service.js
│   │   │   └── quotation.service.js
│   │   ├── utils/                  # Helper functions
│   │   ├── middleware/             # Express middleware
│   │   └── app.js                  # Main application
│   ├── tests/                      # Test files
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── customers/         # Customer management components
│   │   │   ├── trip/              # Trip-related components (15+ components)
│   │   │   └── ...                # Other shared components
│   │   ├── pages/                 # Page components
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useMap.js          # Google Maps management
│   │   │   ├── useFlightSearch.js # Flight search logic
│   │   │   └── useCostCalculation.js # Cost calculation
│   │   ├── services/              # API clients & storage
│   │   ├── utils/                 # Utility functions
│   │   ├── constants/             # Application constants
│   │   └── App.jsx
│   ├── public/
│   ├── package.json
│   └── tailwind.config.js
│
├── database/
│   ├── migrations/                 # Database migrations
│   ├── seeds/                      # Initial data
│   │   └── government_rates_2025.sql
│   └── schema.sql                  # Master schema
│
├── scripts/
│   ├── import-applus-data.js       # APplus import script
│   ├── update-rates.js             # Annual rate updates
│   └── file-watcher.js             # APplus file monitoring
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Set up project structure
- Initialize database
- Create customer management
- Manual customer entry working

### Phase 2: APplus Integration (Week 2-3)
- XML/CSV import
- File watcher service
- Automated customer sync

### Phase 3: Engineer Management (Week 3-4)
- Engineer profiles
- Skills and availability
- Assignment logic

### Phase 4: Cost Calculation (Week 4-5)
- Import government rates
- Build calculation engine
- Test all cost formulas

### Phase 5: API Integrations (Week 5-7)
- Google Maps integration
- Amadeus flight search
- Cost comparison logic

### Phase 6: Trip Planning (Week 7-8)
- Single trip creation
- Combined trip routing
- Pending trip tracking

### Phase 7: Quotation Generation (Week 8-9)
- PDF template design
- Auto-fill logic
- Download/email functionality

### Phase 8: Testing & Polish (Week 9-10)
- End-to-end testing
- User interface refinement
- Documentation
- Deployment

**Total Timeline: 10 weeks to production**

## 📝 Key Business Rules

### Travel Mode Selection
- Distance < 100 km → Always road
- Distance 100-300 km → Compare flight vs. road
- Distance > 300 km → Prefer flight
- International → Always flight

### Cost Splitting (Combined Trips)
- Up to 8 customers per trip
- Split by work percentage (must sum to 100%)
- Each customer gets separate quotation
- Same travel costs, proportional split

### Daily Allowances
- >8 hours but <24 hours: Small allowance (14€ Germany)
- 24+ hours: Large allowance (28€ Germany)
- Hotel: Only if overnight required (>18 hour trip)
- Rates vary by country (official government rates)

### Engineer Assignment
Priority:
1. Has required skills (mandatory)
2. Available on dates (mandatory)
3. Closest to customer (preferred)
4. Lowest travel cost (preferred)

### Rate Application
- Use official government rates (ARVVwV)
- Override with company custom rates if higher
- Company rates: 115€ hotel, 0.88€/km, 98€/h travel, 132€/h work

## 🔐 Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/travel_costs
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=travel_costs
DATABASE_USER=your_user
DATABASE_PASSWORD=your_password

# APIs
AMADEUS_API_KEY=your_amadeus_key
AMADEUS_API_SECRET=your_amadeus_secret
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Application
NODE_ENV=development
PORT=3000
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3001

# File Storage
APPLUS_EXPORT_FOLDER=/shared/applus_exports
UPLOAD_FOLDER=/uploads
OUTPUT_FOLDER=/outputs

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Company Info
COMPANY_NAME=LASERCOMB
COMPANY_ADDRESS=Your Address
COMPANY_TAX_ID=Your Tax ID
```

## 🧪 Testing Strategy

### Unit Tests
- Cost calculation functions
- Distance calculations
- Rate lookups
- Date/time utilities

### Integration Tests
- API endpoints
- Database operations
- External API calls (mocked)

### End-to-End Tests
- Complete quotation flow
- Customer import flow
- Trip creation and calculation

### Test Coverage Goal
- Minimum 80% code coverage
- Critical paths: 100% coverage

## 📖 Documentation Files

All documentation is in the `docs/` folder:

1. **PROJECT_OVERVIEW.md** (this file) - High-level overview
2. **IMPLEMENTATION_PLAN.md** - Detailed step-by-step implementation
3. **DATABASE_SCHEMA.sql** - Complete database schema
4. **API_DOCUMENTATION.md** - API endpoints reference
5. **workflow_analysis.txt** - Business workflow details
6. **calculation_template_analysis.txt** - Cost calculation details
7. **automation_strategy.txt** - API integration strategy
8. **applus_integration_guide.txt** - APplus ERP integration

## 🎓 Getting Started (For New AI Assistant)

If you're an AI assistant taking over this project:

1. **Read this file first** to understand the big picture
2. **Read IMPLEMENTATION_PLAN.md** for step-by-step instructions
3. **Check DATABASE_SCHEMA.sql** for data structure
4. **Review workflow_analysis.txt** for business logic
5. **Read automation_strategy.txt** for API integration details

Then proceed with implementation following the phases in IMPLEMENTATION_PLAN.md.

## 🔄 Maintenance

### Annual Updates Required
- Government travel rates (January each year)
- Flight API credentials refresh
- Database backup verification

### Monthly Monitoring
- API usage and costs
- Import success rates
- System performance

### As Needed
- Customer database sync from APplus
- Engineer information updates
- Company rate adjustments

## 📞 Support & Resources

### Official Documentation
- ARVVwV Rates: https://www.bundesfinanzministerium.de/
- Amadeus API: https://developers.amadeus.com/
- Google Maps API: https://developers.google.com/maps

### Community Resources
- Stack Overflow for technical questions
- GitHub for code examples
- API provider support portals

## 🎯 Success Metrics

### Time Savings
- Current: 60 minutes per quotation
- Target: 3 minutes per quotation
- Goal: 95% time reduction

### Accuracy
- 100% calculation accuracy
- Compliance with government rates
- Consistent quotation format

### User Adoption
- 80%+ of quotations created via system
- <5 manual corrections per month
- Positive user feedback

## 🚨 Known Constraints

1. APplus ERP has limited API access (XML export only)
2. Flight prices are estimates until actual booking
3. Government rates update annually (manual import needed)
4. Some routes may not have direct flights
5. Hotel rates are maximums (actual may vary)

## 💡 Future Enhancements

### Phase 2 Features
- Mobile app for engineers
- Real-time trip tracking
- Automated expense reporting
- Multi-language support (English, German)

### Phase 3 Features
- Machine learning for cost predictions
- Historical data analysis
- Customer profitability reports
- Integration with accounting software

### Nice to Have
- Calendar integration (Outlook, Google)
- SMS notifications to engineers
- Real-time flight price tracking
- Automated booking (not just quotes)

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Status**: Core Functionality Operational ✅  
**Latest**: Phase 6.5 - Frontend Refactoring Complete (December 2024)  

For questions or clarifications, refer to the detailed documentation in the `docs/` folder.
