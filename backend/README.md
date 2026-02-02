# PCF Management System - Backend

A FastAPI-based backend for Product Carbon Footprint (PCF) management, providing APIs for master data management, batch tracking, real-time PCF calculation, and certificate generation.

## Tech Stack

- **Framework**: FastAPI
- **Database**: MongoDB (with Motor async driver)
- **Authentication**: JWT with bcrypt password hashing
- **PDF Generation**: ReportLab

## Prerequisites

- Python 3.11+
- MongoDB 4.4+
- pip or pipenv

## Installation

1. **Clone the repository** (if applicable)

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Create a `.env` file in the `/backend` directory:
   ```env
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=pcf_database
   JWT_SECRET=your-secret-key-here
   CORS_ORIGINS=*
   ```

## Running the Application

### Development Mode
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Production Mode
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
```

The API will be available at `http://localhost:8001`

## API Documentation

Once running, access the interactive API documentation:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## Default Credentials

On first startup, a superadmin user is automatically created:
- **Email**: `admin@pcf.com`
- **Password**: `admin123`

## API Endpoints Overview

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user info |

### Master Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/emission-factors` | Emission factors CRUD |
| PUT | `/api/emission-factors/{id}/activate` | Activate emission factor |
| GET/POST | `/api/raw-materials` | Raw materials CRUD |
| POST | `/api/raw-materials/upload` | Bulk upload via CSV |
| GET/POST | `/api/suppliers` | Suppliers CRUD |
| GET/POST | `/api/plants` | Plants CRUD |
| GET/POST | `/api/machines` | Machines CRUD |
| GET/POST | `/api/transport-lanes` | Transport lanes CRUD |
| GET/POST | `/api/skus` | SKUs CRUD |
| GET/POST | `/api/boms` | BOMs/Recipes CRUD |

### Batch Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/batches` | List/Create batches |
| GET | `/api/batches/{id}` | Get batch details |
| PUT | `/api/batches/{id}/inputs` | Add batch input |
| PUT | `/api/batches/{id}/outputs` | Add batch output |
| PUT | `/api/batches/{id}/energy` | Add energy consumption |
| PUT | `/api/batches/{id}/close` | Close batch |
| PUT | `/api/batches/{id}/approve` | Approve batch |

### Certificates & Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/batches/{id}/certificate` | Generate certificate |
| GET | `/api/certificates` | List certificates |
| GET | `/api/certificates/{id}/pdf` | Download PDF certificate |
| GET | `/api/audit-logs` | View audit logs |
| GET | `/api/audit-export/{batch_id}` | Export audit pack |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Dashboard KPIs |
| GET | `/api/dashboard/pcf-trends` | PCF trend data |
| GET | `/api/dashboard/hotspots` | Emission hotspots |
| GET | `/api/dashboard/supplier-rankings` | Supplier contributions |

## User Roles

| Role | Permissions |
|------|-------------|
| `superadmin` | Full access to all features |
| `master_approver` | Activate/approve master records and batches |
| `master_steward` | Create/edit master data |
| `esg_analyst` | Manage emission factors |
| `batch_operator` | Create and manage batches |
| `auditor` | View audit logs and export packs |

## PCF Calculation

The system calculates CO2e using IPCC GWP sets:

**AR6 (default)**:
- CO2: 1
- CH4: 27.9
- N2O: 273

**AR5**:
- CO2: 1
- CH4: 28
- N2O: 265

Formula: `CO2e = CO2 × GWP_CO2 + CH4 × GWP_CH4 + N2O × GWP_N2O`

## Testing

```bash
pytest tests/ -v
```

## License

MIT License
