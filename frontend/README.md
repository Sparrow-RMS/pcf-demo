# PCF Management System - Frontend

A React-based frontend for Product Carbon Footprint (PCF) management, featuring an industrial-themed dashboard, master data management, batch tracking, and certificate generation.

## Tech Stack

- **Framework**: React 19
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/UI (Radix primitives)
- **Charts**: Recharts
- **Routing**: React Router v7
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form + Zod
- **Notifications**: Sonner

## Prerequisites

- Node.js 18+
- Yarn (recommended) or npm

## Installation

1. **Navigate to the frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `/frontend` directory:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```

   For production, update to your deployed backend URL.

## Running the Application

### Development Mode
```bash
yarn start
# or
npm start
```

The app will be available at `http://localhost:3000`

### Production Build
```bash
yarn build
# or
npm run build
```

The build output will be in the `build/` directory.

### Serve Production Build
```bash
npx serve -s build
```

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn UI components
│   │   └── Layout.js        # Main layout with sidebar
│   ├── context/
│   │   └── AuthContext.js   # Authentication context
│   ├── pages/
│   │   ├── Login.js         # Login page
│   │   ├── Dashboard.js     # Main dashboard
│   │   ├── RawMaterials.js  # Raw materials management
│   │   ├── EmissionFactors.js
│   │   ├── Suppliers.js
│   │   ├── TransportLanes.js
│   │   ├── Machines.js
│   │   ├── Plants.js
│   │   ├── SKUs.js
│   │   ├── BOMs.js          # BOM/Recipe builder
│   │   ├── Batches.js       # Batch list
│   │   ├── BatchDetail.js   # Batch details & PCF
│   │   ├── Certificates.js  # Certificate management
│   │   ├── AuditLogs.js     # Audit trail viewer
│   │   └── Users.js         # User management (admin)
│   ├── App.js               # Main app with routing
│   ├── App.css
│   ├── index.js             # Entry point
│   └── index.css            # Global styles & Tailwind
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## Default Login Credentials

- **Email**: `admin@pcf.com`
- **Password**: `admin123`

## Features

### Dashboard
- KPI cards: Total Batches, Open Batches, Raw Materials, Avg PCF
- PCF Trends line chart
- Emission Hotspots pie chart
- Supplier Rankings bar chart
- Time range filter (7/30/90 days)

### Master Data Management
- **Raw Materials**: CRUD, bulk CSV upload, activation workflow
- **Emission Factors**: CO2/CH4/N2O input, GWP set selection, version management
- **Suppliers**: Contact management
- **Transport Lanes**: Route management with emission factors
- **Machines**: Energy model configuration (metered/run-hours)
- **Plants**: Manufacturing facility management
- **SKUs**: Product/intermediate management
- **BOMs/Recipes**: Nested bill of materials with recovery rates

### Batch Management
- Create batches linked to BOMs
- Add inputs (raw materials)
- Add outputs (SKUs)
- Add energy consumption
- Real-time PCF calculation
- Close → Approve workflow

### Certificates
- Generate PDF certificates for approved batches
- Download certificate PDFs
- View certificate history

### Audit Logs
- Complete audit trail
- Filter by entity type
- Search by entity ID
- Export audit packs (JSON)

### User Management (Admin Only)
- Create users with role assignment
- Change user roles
- Activate/deactivate users

## Design System

The UI follows an "Industrial Eco-Brutalism" design:

### Colors
- **Primary**: Deep Evergreen (#0F2F24)
- **Secondary**: Safety Orange (#FF5722)
- **Background**: Zinc-100 (#F4F4F5)
- **Accent**: Pale Emerald (#D1FAE5)

### Typography
- **Headings**: IBM Plex Sans (600, 700)
- **Body**: Manrope (400, 500, 600)
- **Mono**: JetBrains Mono (400)

### Components
- Grid-bordered cards
- Sharp/slightly rounded buttons
- High-contrast tooltips
- Visible borders and structure

## Role-Based Access

| Feature | superadmin | master_approver | master_steward | esg_analyst | batch_operator | auditor |
|---------|------------|-----------------|----------------|-------------|----------------|---------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create Master Data | ✓ | - | ✓ | - | - | - |
| Activate Records | ✓ | ✓ | - | - | - | - |
| Emission Factors | ✓ | - | ✓ | ✓ | - | - |
| Create Batches | ✓ | - | - | - | ✓ | - |
| Approve Batches | ✓ | ✓ | - | - | - | - |
| Generate Certs | ✓ | ✓ | - | - | - | - |
| View Audit Logs | ✓ | - | - | - | - | ✓ |
| User Management | ✓ | - | - | - | - | - |

## Testing

```bash
yarn test
# or
npm test
```

## Linting

```bash
yarn lint
# or
npm run lint
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Backend API URL | `http://localhost:8001` |

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License
