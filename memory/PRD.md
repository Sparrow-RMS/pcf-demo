# PCF Management System - Product Requirements Document

## Original Problem Statement
Build a comprehensive Carbon Footprint / PCF (Product Carbon Footprint) Management System with:
- **Epic 2.1**: Master Data Management (Raw Materials, Emission Factors, Suppliers, Machines, Transport Lanes)
- **Epic 2.2**: BOM/Recipe & Co-product Modeling
- **Epic 2.3**: Batch Register & Real-Time PCF calculation
- **Epic 2.4**: Dashboards, Certificates & Audit

## User Personas
1. **Super Admin**: Full system access, user management
2. **Master Approver**: Activate/approve master records and batches
3. **Master Data Steward**: Create/edit master data (raw materials, suppliers, etc.)
4. **ESG Analyst**: Manage emission factors with GWP sets
5. **Batch Operator**: Create and manage production batches
6. **Auditor**: View audit logs and export audit packs

## Core Requirements (Static)
- JWT-based RBAC authentication
- Master data versioning with approval workflow
- Real-time PCF calculation engine with CO2e computation
- Multi-output allocation (mass/economic)
- PDF certificate generation
- Complete audit trail
- CSV/Excel import/export for master data
- Dashboard with PCF trends, hotspots, supplier rankings

## What's Been Implemented (2024-02-02)

### Backend (FastAPI + MongoDB)
- [x] JWT Authentication with role-based access control
- [x] User management API
- [x] Emission Factors CRUD with CO2/CH4/N2O and GWP set support
- [x] Plants, Utility Sources, Machines CRUD
- [x] Suppliers, Raw Materials CRUD with activation workflow
- [x] Transport Lanes with emission factors
- [x] Supplier-Raw Material mapping with sourcing shares
- [x] SKUs management
- [x] BOM/Recipe builder with nested lines
- [x] Batch Register with real-time PCF calculation
- [x] Batch inputs/outputs/energy tracking
- [x] Batch close/approve workflow
- [x] Certificate generation with PDF export
- [x] Audit logs with entity tracking
- [x] Dashboard APIs (summary, trends, hotspots, supplier rankings)
- [x] CSV upload for raw materials bulk import

### Frontend (React + Tailwind + Shadcn/UI)
- [x] Login page with demo credentials
- [x] Dashboard with KPI cards and charts (Recharts)
- [x] Master Data pages: Raw Materials, Emission Factors, Suppliers, Transport Lanes, Machines, Plants, SKUs
- [x] BOM/Recipe builder with line management
- [x] Batches list and detail view
- [x] Certificate generation and PDF download
- [x] Audit logs viewer with entity filtering
- [x] User management (admin only)
- [x] Role-based navigation and actions
- [x] Industrial Eco-Brutalism design theme

## P0/P1/P2 Features Remaining

### P0 (Critical)
- All core features implemented ✓

### P1 (High Priority)
- [ ] Utility interval allocation across overlapping batches
- [ ] Process emission rules (stoichiometric calculations)
- [ ] Economic allocation method for co-products
- [ ] Supplier-specific EF overrides in PCF calculation

### P2 (Medium Priority)
- [ ] Excel export for audit packs
- [ ] Batch events API for MES integration
- [ ] BOM circular reference detection (enhanced)
- [ ] Multi-level BOM explosion view
- [ ] Certificate QR code for verification

## Next Tasks
1. Implement utility interval allocation logic
2. Add process emission rules management
3. Enhance BOM viewer with multi-level explosion
4. Add batch comparison feature
5. Implement economic allocation for co-products

## Tech Stack
- **Backend**: FastAPI, MongoDB (Motor), PyJWT, ReportLab
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, Recharts
- **Auth**: JWT with bcrypt password hashing
- **Design**: Industrial Eco-Brutalism (Deep Evergreen + Safety Orange)
