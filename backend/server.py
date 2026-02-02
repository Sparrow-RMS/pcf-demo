from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import csv
import io
import json
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'pcf-management-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="PCF Management System", version="1.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============== MODELS ==============

# User & Auth Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "batch_operator"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str
    is_active: bool = True

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

# Emission Factor Models
class EmissionFactorCreate(BaseModel):
    name: str
    source: str
    gwp_set: str = "AR6"  # AR5, AR6
    co2_factor: float
    ch4_factor: float = 0.0
    n2o_factor: float = 0.0
    unit: str = "kgCO2e/unit"
    category: str
    notes: Optional[str] = None

class EmissionFactorResponse(BaseModel):
    id: str
    name: str
    source: str
    gwp_set: str
    co2_factor: float
    ch4_factor: float
    n2o_factor: float
    co2e_factor: float
    unit: str
    category: str
    notes: Optional[str]
    version: int
    status: str
    created_at: str
    created_by: str
    activated_at: Optional[str]
    activated_by: Optional[str]

# Plant Models
class PlantCreate(BaseModel):
    code: str
    name: str
    location: str
    country: str
    timezone: str = "UTC"

class PlantResponse(BaseModel):
    id: str
    code: str
    name: str
    location: str
    country: str
    timezone: str
    status: str
    created_at: str

# Utility Source Models
class UtilitySourceCreate(BaseModel):
    code: str
    name: str
    utility_type: str  # electricity, natural_gas, steam, water
    plant_id: str
    emission_factor_id: str
    unit: str

class UtilitySourceResponse(BaseModel):
    id: str
    code: str
    name: str
    utility_type: str
    plant_id: str
    emission_factor_id: str
    unit: str
    status: str
    created_at: str

# Machine Models
class MachineCreate(BaseModel):
    code: str
    name: str
    plant_id: str
    energy_model: str  # metered, run_hours
    rated_power_kw: Optional[float] = None
    default_utility_source_id: str

class MachineResponse(BaseModel):
    id: str
    code: str
    name: str
    plant_id: str
    energy_model: str
    rated_power_kw: Optional[float]
    default_utility_source_id: str
    status: str
    created_at: str

# Supplier Models
class SupplierCreate(BaseModel):
    code: str
    name: str
    country: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class SupplierResponse(BaseModel):
    id: str
    code: str
    name: str
    country: str
    contact_email: Optional[str]
    contact_phone: Optional[str]
    status: str
    created_at: str

# Raw Material Models
class RawMaterialCreate(BaseModel):
    code: str
    name: str
    category: str
    unit: str
    default_emission_factor_id: Optional[str] = None

class RawMaterialResponse(BaseModel):
    id: str
    code: str
    name: str
    category: str
    unit: str
    default_emission_factor_id: Optional[str]
    version: int
    status: str
    created_at: str
    created_by: str

# Transport Lane Models
class TransportLaneCreate(BaseModel):
    code: str
    origin: str
    destination: str
    transport_mode: str  # road, rail, sea, air
    distance_km: float
    emission_factor_id: str

class TransportLaneResponse(BaseModel):
    id: str
    code: str
    origin: str
    destination: str
    transport_mode: str
    distance_km: float
    emission_factor_id: str
    status: str
    created_at: str

# Supplier-Raw Material Mapping
class SupplierRMMapCreate(BaseModel):
    supplier_id: str
    raw_material_id: str
    sourcing_share: float  # percentage
    transport_lane_id: str
    price_per_unit: Optional[float] = None
    emission_factor_override_id: Optional[str] = None

class SupplierRMMapResponse(BaseModel):
    id: str
    supplier_id: str
    raw_material_id: str
    sourcing_share: float
    transport_lane_id: str
    price_per_unit: Optional[float]
    emission_factor_override_id: Optional[str]
    status: str
    created_at: str

# SKU Models
class SKUCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    unit: str
    category: str
    plant_id: str

class SKUResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str]
    unit: str
    category: str
    plant_id: str
    status: str
    created_at: str

# BOM Models
class BOMLineCreate(BaseModel):
    item_type: str  # raw_material, intermediate_sku
    item_id: str
    quantity: float
    unit: str
    recovery_rate: float = 0.0  # for solvents

class BOMCoProductCreate(BaseModel):
    sku_id: str
    yield_ratio: float
    is_byproduct: bool = False

class BOMHeaderCreate(BaseModel):
    code: str
    name: str
    output_sku_id: str
    version: int = 1
    lines: List[BOMLineCreate]
    co_products: List[BOMCoProductCreate] = []

class BOMHeaderResponse(BaseModel):
    id: str
    code: str
    name: str
    output_sku_id: str
    version: int
    lines: List[dict]
    co_products: List[dict]
    status: str
    created_at: str
    created_by: str

# Batch Models
class BatchInputCreate(BaseModel):
    raw_material_id: str
    quantity: float
    supplier_id: Optional[str] = None

class BatchOutputCreate(BaseModel):
    sku_id: str
    quantity: float

class BatchEnergyCreate(BaseModel):
    machine_id: str
    utility_source_id: str
    quantity: float  # kWh or hours
    measurement_type: str  # metered, calculated

class BatchProcessEmissionCreate(BaseModel):
    emission_type: str  # measured, stoichiometric
    co2_kg: float
    method_notes: Optional[str] = None

class BatchHeaderCreate(BaseModel):
    batch_number: str
    plant_id: str
    bom_id: str
    planned_output_qty: float
    start_time: str
    inputs: List[BatchInputCreate] = []
    outputs: List[BatchOutputCreate] = []
    energy: List[BatchEnergyCreate] = []
    process_emissions: List[BatchProcessEmissionCreate] = []

class BatchHeaderResponse(BaseModel):
    id: str
    batch_number: str
    plant_id: str
    bom_id: str
    planned_output_qty: float
    actual_output_qty: Optional[float]
    start_time: str
    end_time: Optional[str]
    status: str  # open, closed, approved
    pcf_provisional: bool
    pcf_value: Optional[float]
    created_at: str
    created_by: str

# Allocation Rule Models
class AllocationRuleCreate(BaseModel):
    plant_id: str
    utility_pool: str
    allocation_method: str  # output_weight, runtime, custom
    driver_field: str

class AllocationRuleResponse(BaseModel):
    id: str
    plant_id: str
    utility_pool: str
    allocation_method: str
    driver_field: str
    status: str
    created_at: str

# Audit Log Model
class AuditLogResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    user_id: str
    user_email: str
    changes: dict
    timestamp: str

# Dashboard Models
class PCFTrendData(BaseModel):
    date: str
    pcf_value: float
    batch_count: int

class HotspotData(BaseModel):
    component: str
    contribution: float
    percentage: float

class SupplierRankingData(BaseModel):
    supplier_name: str
    contribution: float
    percentage: float

# ============== HELPER FUNCTIONS ==============

GWP_SETS = {
    "AR5": {"CO2": 1, "CH4": 28, "N2O": 265},
    "AR6": {"CO2": 1, "CH4": 27.9, "N2O": 273}
}

def calculate_co2e(co2: float, ch4: float, n2o: float, gwp_set: str = "AR6") -> float:
    gwp = GWP_SETS.get(gwp_set, GWP_SETS["AR6"])
    return co2 * gwp["CO2"] + ch4 * gwp["CH4"] + n2o * gwp["N2O"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_roles(allowed_roles: List[str]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed_roles and user["role"] != "superadmin":
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

async def create_audit_log(entity_type: str, entity_id: str, action: str, user: dict, changes: dict):
    log = {
        "id": str(uuid.uuid4()),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "user_id": user["id"],
        "user_email": user["email"],
        "changes": changes,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(log)

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"],
        is_active=user["is_active"]
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account disabled")
    
    token = create_token(user["id"], user["email"], user["role"])
    return TokenResponse(
        token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=user["created_at"],
            is_active=user.get("is_active", True)
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"],
        is_active=user.get("is_active", True)
    )

# ============== USER MANAGEMENT ==============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(require_roles(["superadmin"]))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, user: dict = Depends(require_roles(["superadmin"]))):
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await create_audit_log("user", user_id, "role_change", user, {"new_role": role})
    return {"message": "Role updated"}

@api_router.put("/users/{user_id}/status")
async def update_user_status(user_id: str, is_active: bool, user: dict = Depends(require_roles(["superadmin"]))):
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": is_active}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await create_audit_log("user", user_id, "status_change", user, {"is_active": is_active})
    return {"message": "Status updated"}

# ============== EMISSION FACTORS ==============

@api_router.post("/emission-factors", response_model=EmissionFactorResponse)
async def create_emission_factor(data: EmissionFactorCreate, user: dict = Depends(require_roles(["master_steward", "esg_analyst"]))):
    co2e = calculate_co2e(data.co2_factor, data.ch4_factor, data.n2o_factor, data.gwp_set)
    ef = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "source": data.source,
        "gwp_set": data.gwp_set,
        "co2_factor": data.co2_factor,
        "ch4_factor": data.ch4_factor,
        "n2o_factor": data.n2o_factor,
        "co2e_factor": co2e,
        "unit": data.unit,
        "category": data.category,
        "notes": data.notes,
        "version": 1,
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "activated_at": None,
        "activated_by": None
    }
    await db.emission_factors.insert_one(ef)
    await create_audit_log("emission_factor", ef["id"], "create", user, {"name": data.name})
    return EmissionFactorResponse(**ef)

@api_router.get("/emission-factors", response_model=List[EmissionFactorResponse])
async def get_emission_factors(
    status: Optional[str] = None,
    category: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    efs = await db.emission_factors.find(query, {"_id": 0}).to_list(1000)
    return [EmissionFactorResponse(**ef) for ef in efs]

@api_router.get("/emission-factors/{ef_id}", response_model=EmissionFactorResponse)
async def get_emission_factor(ef_id: str, user: dict = Depends(get_current_user)):
    ef = await db.emission_factors.find_one({"id": ef_id}, {"_id": 0})
    if not ef:
        raise HTTPException(status_code=404, detail="Emission factor not found")
    return EmissionFactorResponse(**ef)

@api_router.put("/emission-factors/{ef_id}/activate")
async def activate_emission_factor(ef_id: str, user: dict = Depends(require_roles(["master_approver"]))):
    ef = await db.emission_factors.find_one({"id": ef_id}, {"_id": 0})
    if not ef:
        raise HTTPException(status_code=404, detail="Emission factor not found")
    if ef["status"] == "active":
        raise HTTPException(status_code=400, detail="Already active")
    
    await db.emission_factors.update_one(
        {"id": ef_id},
        {"$set": {
            "status": "active",
            "activated_at": datetime.now(timezone.utc).isoformat(),
            "activated_by": user["id"]
        }}
    )
    await create_audit_log("emission_factor", ef_id, "activate", user, {"previous_status": ef["status"]})
    return {"message": "Emission factor activated"}

@api_router.post("/emission-factors/{ef_id}/new-version", response_model=EmissionFactorResponse)
async def create_ef_new_version(ef_id: str, data: EmissionFactorCreate, user: dict = Depends(require_roles(["master_steward", "esg_analyst"]))):
    old_ef = await db.emission_factors.find_one({"id": ef_id}, {"_id": 0})
    if not old_ef:
        raise HTTPException(status_code=404, detail="Emission factor not found")
    
    co2e = calculate_co2e(data.co2_factor, data.ch4_factor, data.n2o_factor, data.gwp_set)
    new_ef = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "source": data.source,
        "gwp_set": data.gwp_set,
        "co2_factor": data.co2_factor,
        "ch4_factor": data.ch4_factor,
        "n2o_factor": data.n2o_factor,
        "co2e_factor": co2e,
        "unit": data.unit,
        "category": data.category,
        "notes": data.notes,
        "version": old_ef["version"] + 1,
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "activated_at": None,
        "activated_by": None,
        "previous_version_id": ef_id
    }
    await db.emission_factors.insert_one(new_ef)
    await create_audit_log("emission_factor", new_ef["id"], "new_version", user, {"from_version": old_ef["version"]})
    return EmissionFactorResponse(**new_ef)

# ============== PLANTS ==============

@api_router.post("/plants", response_model=PlantResponse)
async def create_plant(data: PlantCreate, user: dict = Depends(require_roles(["master_steward"]))):
    plant = {
        "id": str(uuid.uuid4()),
        "code": data.code,
        "name": data.name,
        "location": data.location,
        "country": data.country,
        "timezone": data.timezone,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.plants.insert_one(plant)
    await create_audit_log("plant", plant["id"], "create", user, {"code": data.code})
    return PlantResponse(**plant)

@api_router.get("/plants", response_model=List[PlantResponse])
async def get_plants(user: dict = Depends(get_current_user)):
    plants = await db.plants.find({}, {"_id": 0}).to_list(1000)
    return [PlantResponse(**p) for p in plants]

@api_router.get("/plants/{plant_id}", response_model=PlantResponse)
async def get_plant(plant_id: str, user: dict = Depends(get_current_user)):
    plant = await db.plants.find_one({"id": plant_id}, {"_id": 0})
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return PlantResponse(**plant)

# ============== UTILITY SOURCES ==============

@api_router.post("/utility-sources", response_model=UtilitySourceResponse)
async def create_utility_source(data: UtilitySourceCreate, user: dict = Depends(require_roles(["master_steward"]))):
    source = {
        "id": str(uuid.uuid4()),
        "code": data.code,
        "name": data.name,
        "utility_type": data.utility_type,
        "plant_id": data.plant_id,
        "emission_factor_id": data.emission_factor_id,
        "unit": data.unit,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.utility_sources.insert_one(source)
    await create_audit_log("utility_source", source["id"], "create", user, {"code": data.code})
    return UtilitySourceResponse(**source)

@api_router.get("/utility-sources", response_model=List[UtilitySourceResponse])
async def get_utility_sources(plant_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if plant_id:
        query["plant_id"] = plant_id
    sources = await db.utility_sources.find(query, {"_id": 0}).to_list(1000)
    return [UtilitySourceResponse(**s) for s in sources]

# ============== MACHINES ==============

@api_router.post("/machines", response_model=MachineResponse)
async def create_machine(data: MachineCreate, user: dict = Depends(require_roles(["master_steward"]))):
    machine = {
        "id": str(uuid.uuid4()),
        "code": data.code,
        "name": data.name,
        "plant_id": data.plant_id,
        "energy_model": data.energy_model,
        "rated_power_kw": data.rated_power_kw,
        "default_utility_source_id": data.default_utility_source_id,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.machines.insert_one(machine)
    await create_audit_log("machine", machine["id"], "create", user, {"code": data.code})
    return MachineResponse(**machine)

@api_router.get("/machines", response_model=List[MachineResponse])
async def get_machines(plant_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if plant_id:
        query["plant_id"] = plant_id
    machines = await db.machines.find(query, {"_id": 0}).to_list(1000)
    return [MachineResponse(**m) for m in machines]

# ============== SUPPLIERS ==============

@api_router.post("/suppliers", response_model=SupplierResponse)
async def create_supplier(data: SupplierCreate, user: dict = Depends(require_roles(["master_steward"]))):
    supplier = {
        "id": str(uuid.uuid4()),
        "code": data.code,
        "name": data.name,
        "country": data.country,
        "contact_email": data.contact_email,
        "contact_phone": data.contact_phone,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.suppliers.insert_one(supplier)
    await create_audit_log("supplier", supplier["id"], "create", user, {"code": data.code})
    return SupplierResponse(**supplier)

@api_router.get("/suppliers", response_model=List[SupplierResponse])
async def get_suppliers(user: dict = Depends(get_current_user)):
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(1000)
    return [SupplierResponse(**s) for s in suppliers]

# ============== RAW MATERIALS ==============

@api_router.post("/raw-materials", response_model=RawMaterialResponse)
async def create_raw_material(data: RawMaterialCreate, user: dict = Depends(require_roles(["master_steward"]))):
    rm = {
        "id": str(uuid.uuid4()),
        "code": data.code,
        "name": data.name,
        "category": data.category,
        "unit": data.unit,
        "default_emission_factor_id": data.default_emission_factor_id,
        "version": 1,
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    await db.raw_materials.insert_one(rm)
    await create_audit_log("raw_material", rm["id"], "create", user, {"code": data.code})
    return RawMaterialResponse(**rm)

@api_router.get("/raw-materials", response_model=List[RawMaterialResponse])
async def get_raw_materials(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    rms = await db.raw_materials.find(query, {"_id": 0}).to_list(1000)
    return [RawMaterialResponse(**rm) for rm in rms]

@api_router.put("/raw-materials/{rm_id}/activate")
async def activate_raw_material(rm_id: str, user: dict = Depends(require_roles(["master_approver"]))):
    rm = await db.raw_materials.find_one({"id": rm_id}, {"_id": 0})
    if not rm:
        raise HTTPException(status_code=404, detail="Raw material not found")
    
    await db.raw_materials.update_one(
        {"id": rm_id},
        {"$set": {"status": "active", "activated_at": datetime.now(timezone.utc).isoformat(), "activated_by": user["id"]}}
    )
    await create_audit_log("raw_material", rm_id, "activate", user, {"previous_status": rm["status"]})
    return {"message": "Raw material activated"}

@api_router.post("/raw-materials/upload")
async def upload_raw_materials(file: UploadFile = File(...), user: dict = Depends(require_roles(["master_steward"]))):
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(status_code=400, detail="File must be CSV or XLSX")
    
    content = await file.read()
    errors = []
    created = []
    
    try:
        # Parse CSV
        decoded = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        required_columns = {'code', 'name', 'category', 'unit'}
        
        if not required_columns.issubset(set(reader.fieldnames or [])):
            raise HTTPException(status_code=400, detail=f"Missing required columns: {required_columns - set(reader.fieldnames or [])}")
        
        for row_num, row in enumerate(reader, start=2):
            try:
                if not row.get('code') or not row.get('name'):
                    errors.append({"row": row_num, "error": "Missing required fields (code, name)"})
                    continue
                
                existing = await db.raw_materials.find_one({"code": row['code']})
                if existing:
                    errors.append({"row": row_num, "error": f"Code '{row['code']}' already exists"})
                    continue
                
                rm = {
                    "id": str(uuid.uuid4()),
                    "code": row['code'],
                    "name": row['name'],
                    "category": row.get('category', 'General'),
                    "unit": row.get('unit', 'kg'),
                    "default_emission_factor_id": row.get('emission_factor_id'),
                    "version": 1,
                    "status": "draft",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": user["id"]
                }
                await db.raw_materials.insert_one(rm)
                created.append(rm["code"])
            except Exception as e:
                errors.append({"row": row_num, "error": str(e)})
        
        await create_audit_log("raw_material", "bulk", "upload", user, {"created_count": len(created)})
        return {"created": len(created), "errors": errors, "created_codes": created}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

# ============== TRANSPORT LANES ==============

@api_router.post("/transport-lanes", response_model=TransportLaneResponse)
async def create_transport_lane(data: TransportLaneCreate, user: dict = Depends(require_roles(["master_steward"]))):
    lane = {
        "id": str(uuid.uuid4()),
        "code": data.code,
        "origin": data.origin,
        "destination": data.destination,
        "transport_mode": data.transport_mode,
        "distance_km": data.distance_km,
        "emission_factor_id": data.emission_factor_id,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transport_lanes.insert_one(lane)
    await create_audit_log("transport_lane", lane["id"], "create", user, {"code": data.code})
    return TransportLaneResponse(**lane)

@api_router.get("/transport-lanes", response_model=List[TransportLaneResponse])
async def get_transport_lanes(user: dict = Depends(get_current_user)):
    lanes = await db.transport_lanes.find({}, {"_id": 0}).to_list(1000)
    return [TransportLaneResponse(**l) for l in lanes]

# ============== SUPPLIER-RM MAPPING ==============

@api_router.post("/supplier-rm-maps", response_model=SupplierRMMapResponse)
async def create_supplier_rm_map(data: SupplierRMMapCreate, user: dict = Depends(require_roles(["master_steward"]))):
    # Validate transport lane is active
    lane = await db.transport_lanes.find_one({"id": data.transport_lane_id, "status": "active"})
    if not lane:
        raise HTTPException(status_code=400, detail="Transport lane must exist and be active")
    
    # Check sourcing share sum
    existing_shares = await db.supplier_rm_maps.find(
        {"raw_material_id": data.raw_material_id, "status": "active"}, {"_id": 0}
    ).to_list(1000)
    total_share = sum(m["sourcing_share"] for m in existing_shares) + data.sourcing_share
    
    if total_share > 100:
        raise HTTPException(status_code=400, detail=f"Total sourcing share would exceed 100% ({total_share}%)")
    
    mapping = {
        "id": str(uuid.uuid4()),
        "supplier_id": data.supplier_id,
        "raw_material_id": data.raw_material_id,
        "sourcing_share": data.sourcing_share,
        "transport_lane_id": data.transport_lane_id,
        "price_per_unit": data.price_per_unit,
        "emission_factor_override_id": data.emission_factor_override_id,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.supplier_rm_maps.insert_one(mapping)
    await create_audit_log("supplier_rm_map", mapping["id"], "create", user, {"supplier_id": data.supplier_id, "rm_id": data.raw_material_id})
    return SupplierRMMapResponse(**mapping)

@api_router.get("/supplier-rm-maps", response_model=List[SupplierRMMapResponse])
async def get_supplier_rm_maps(raw_material_id: Optional[str] = None, supplier_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if raw_material_id:
        query["raw_material_id"] = raw_material_id
    if supplier_id:
        query["supplier_id"] = supplier_id
    maps = await db.supplier_rm_maps.find(query, {"_id": 0}).to_list(1000)
    return [SupplierRMMapResponse(**m) for m in maps]

# ============== SKUs ==============

@api_router.post("/skus", response_model=SKUResponse)
async def create_sku(data: SKUCreate, user: dict = Depends(require_roles(["master_steward"]))):
    sku = {
        "id": str(uuid.uuid4()),
        "code": data.code,
        "name": data.name,
        "description": data.description,
        "unit": data.unit,
        "category": data.category,
        "plant_id": data.plant_id,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.skus.insert_one(sku)
    await create_audit_log("sku", sku["id"], "create", user, {"code": data.code})
    return SKUResponse(**sku)

@api_router.get("/skus", response_model=List[SKUResponse])
async def get_skus(plant_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if plant_id:
        query["plant_id"] = plant_id
    skus = await db.skus.find(query, {"_id": 0}).to_list(1000)
    return [SKUResponse(**s) for s in skus]

# ============== BOMs ==============

@api_router.post("/boms", response_model=BOMHeaderResponse)
async def create_bom(data: BOMHeaderCreate, user: dict = Depends(require_roles(["master_steward"]))):
    # Check for circular references (simplified)
    for line in data.lines:
        if line.item_type == "intermediate_sku" and line.item_id == data.output_sku_id:
            raise HTTPException(status_code=400, detail="Circular BOM reference detected")
    
    bom = {
        "id": str(uuid.uuid4()),
        "code": data.code,
        "name": data.name,
        "output_sku_id": data.output_sku_id,
        "version": data.version,
        "lines": [l.model_dump() for l in data.lines],
        "co_products": [c.model_dump() for c in data.co_products],
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    await db.boms.insert_one(bom)
    await create_audit_log("bom", bom["id"], "create", user, {"code": data.code})
    return BOMHeaderResponse(**bom)

@api_router.get("/boms", response_model=List[BOMHeaderResponse])
async def get_boms(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    boms = await db.boms.find(query, {"_id": 0}).to_list(1000)
    return [BOMHeaderResponse(**b) for b in boms]

@api_router.get("/boms/{bom_id}", response_model=BOMHeaderResponse)
async def get_bom(bom_id: str, user: dict = Depends(get_current_user)):
    bom = await db.boms.find_one({"id": bom_id}, {"_id": 0})
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")
    return BOMHeaderResponse(**bom)

@api_router.put("/boms/{bom_id}/activate")
async def activate_bom(bom_id: str, user: dict = Depends(require_roles(["master_approver"]))):
    bom = await db.boms.find_one({"id": bom_id}, {"_id": 0})
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")
    
    await db.boms.update_one(
        {"id": bom_id},
        {"$set": {"status": "active", "activated_at": datetime.now(timezone.utc).isoformat(), "activated_by": user["id"]}}
    )
    await create_audit_log("bom", bom_id, "activate", user, {"previous_status": bom["status"]})
    return {"message": "BOM activated"}

# ============== ALLOCATION RULES ==============

@api_router.post("/allocation-rules", response_model=AllocationRuleResponse)
async def create_allocation_rule(data: AllocationRuleCreate, user: dict = Depends(require_roles(["master_steward"]))):
    rule = {
        "id": str(uuid.uuid4()),
        "plant_id": data.plant_id,
        "utility_pool": data.utility_pool,
        "allocation_method": data.allocation_method,
        "driver_field": data.driver_field,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.allocation_rules.insert_one(rule)
    await create_audit_log("allocation_rule", rule["id"], "create", user, {"plant_id": data.plant_id})
    return AllocationRuleResponse(**rule)

@api_router.get("/allocation-rules", response_model=List[AllocationRuleResponse])
async def get_allocation_rules(plant_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if plant_id:
        query["plant_id"] = plant_id
    rules = await db.allocation_rules.find(query, {"_id": 0}).to_list(1000)
    return [AllocationRuleResponse(**r) for r in rules]

# ============== BATCHES ==============

async def calculate_batch_pcf(batch_id: str) -> float:
    """Calculate PCF for a batch based on inputs, energy, and process emissions"""
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        return 0.0
    
    total_co2e = 0.0
    
    # Calculate material emissions
    for inp in batch.get("inputs", []):
        rm = await db.raw_materials.find_one({"id": inp["raw_material_id"]}, {"_id": 0})
        if rm and rm.get("default_emission_factor_id"):
            ef = await db.emission_factors.find_one({"id": rm["default_emission_factor_id"]}, {"_id": 0})
            if ef:
                total_co2e += inp["quantity"] * ef.get("co2e_factor", 0)
    
    # Calculate energy emissions
    for energy in batch.get("energy", []):
        source = await db.utility_sources.find_one({"id": energy["utility_source_id"]}, {"_id": 0})
        if source and source.get("emission_factor_id"):
            ef = await db.emission_factors.find_one({"id": source["emission_factor_id"]}, {"_id": 0})
            if ef:
                total_co2e += energy["quantity"] * ef.get("co2e_factor", 0)
    
    # Add process emissions
    for pe in batch.get("process_emissions", []):
        total_co2e += pe.get("co2_kg", 0)
    
    # Calculate per-unit PCF
    total_output = sum(o["quantity"] for o in batch.get("outputs", [])) or batch.get("planned_output_qty", 1)
    return round(total_co2e / total_output, 4) if total_output > 0 else 0.0

@api_router.post("/batches", response_model=BatchHeaderResponse)
async def create_batch(data: BatchHeaderCreate, user: dict = Depends(require_roles(["batch_operator"]))):
    batch = {
        "id": str(uuid.uuid4()),
        "batch_number": data.batch_number,
        "plant_id": data.plant_id,
        "bom_id": data.bom_id,
        "planned_output_qty": data.planned_output_qty,
        "actual_output_qty": None,
        "start_time": data.start_time,
        "end_time": None,
        "status": "open",
        "pcf_provisional": True,
        "pcf_value": None,
        "inputs": [i.model_dump() for i in data.inputs],
        "outputs": [o.model_dump() for o in data.outputs],
        "energy": [e.model_dump() for e in data.energy],
        "process_emissions": [p.model_dump() for p in data.process_emissions],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    await db.batches.insert_one(batch)
    
    # Calculate initial PCF
    pcf = await calculate_batch_pcf(batch["id"])
    await db.batches.update_one({"id": batch["id"]}, {"$set": {"pcf_value": pcf}})
    batch["pcf_value"] = pcf
    
    await create_audit_log("batch", batch["id"], "create", user, {"batch_number": data.batch_number})
    return BatchHeaderResponse(**batch)

@api_router.get("/batches", response_model=List[BatchHeaderResponse])
async def get_batches(
    plant_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if plant_id:
        query["plant_id"] = plant_id
    if status:
        query["status"] = status
    batches = await db.batches.find(query, {"_id": 0}).to_list(1000)
    return [BatchHeaderResponse(**b) for b in batches]

@api_router.get("/batches/{batch_id}", response_model=dict)
async def get_batch(batch_id: str, user: dict = Depends(get_current_user)):
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch

@api_router.put("/batches/{batch_id}/inputs")
async def add_batch_input(batch_id: str, data: BatchInputCreate, user: dict = Depends(require_roles(["batch_operator"]))):
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch["status"] != "open":
        raise HTTPException(status_code=400, detail="Batch is not open")
    
    await db.batches.update_one(
        {"id": batch_id},
        {"$push": {"inputs": data.model_dump()}}
    )
    pcf = await calculate_batch_pcf(batch_id)
    await db.batches.update_one({"id": batch_id}, {"$set": {"pcf_value": pcf}})
    
    await create_audit_log("batch", batch_id, "add_input", user, {"input": data.model_dump()})
    return {"message": "Input added", "pcf_value": pcf}

@api_router.put("/batches/{batch_id}/outputs")
async def add_batch_output(batch_id: str, data: BatchOutputCreate, user: dict = Depends(require_roles(["batch_operator"]))):
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch["status"] != "open":
        raise HTTPException(status_code=400, detail="Batch is not open")
    
    await db.batches.update_one(
        {"id": batch_id},
        {"$push": {"outputs": data.model_dump()}}
    )
    
    # Update actual output qty
    updated_batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    actual_qty = sum(o["quantity"] for o in updated_batch.get("outputs", []))
    pcf = await calculate_batch_pcf(batch_id)
    await db.batches.update_one({"id": batch_id}, {"$set": {"actual_output_qty": actual_qty, "pcf_value": pcf}})
    
    await create_audit_log("batch", batch_id, "add_output", user, {"output": data.model_dump()})
    return {"message": "Output added", "pcf_value": pcf}

@api_router.put("/batches/{batch_id}/energy")
async def add_batch_energy(batch_id: str, data: BatchEnergyCreate, user: dict = Depends(require_roles(["batch_operator"]))):
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch["status"] != "open":
        raise HTTPException(status_code=400, detail="Batch is not open")
    
    await db.batches.update_one(
        {"id": batch_id},
        {"$push": {"energy": data.model_dump()}}
    )
    pcf = await calculate_batch_pcf(batch_id)
    await db.batches.update_one({"id": batch_id}, {"$set": {"pcf_value": pcf}})
    
    await create_audit_log("batch", batch_id, "add_energy", user, {"energy": data.model_dump()})
    return {"message": "Energy added", "pcf_value": pcf}

@api_router.put("/batches/{batch_id}/close")
async def close_batch(batch_id: str, user: dict = Depends(require_roles(["batch_operator"]))):
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch["status"] != "open":
        raise HTTPException(status_code=400, detail="Batch is not open")
    
    pcf = await calculate_batch_pcf(batch_id)
    await db.batches.update_one(
        {"id": batch_id},
        {"$set": {
            "status": "closed",
            "end_time": datetime.now(timezone.utc).isoformat(),
            "pcf_provisional": False,
            "pcf_value": pcf
        }}
    )
    
    await create_audit_log("batch", batch_id, "close", user, {"pcf_value": pcf})
    return {"message": "Batch closed", "pcf_value": pcf}

@api_router.put("/batches/{batch_id}/approve")
async def approve_batch(batch_id: str, user: dict = Depends(require_roles(["master_approver"]))):
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch["status"] != "closed":
        raise HTTPException(status_code=400, detail="Batch must be closed before approval")
    
    await db.batches.update_one(
        {"id": batch_id},
        {"$set": {
            "status": "approved",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": user["id"]
        }}
    )
    
    # Create PCF register entries for each output
    for output in batch.get("outputs", []):
        register_entry = {
            "id": str(uuid.uuid4()),
            "batch_id": batch_id,
            "batch_number": batch["batch_number"],
            "sku_id": output["sku_id"],
            "output_qty": output["quantity"],
            "pcf_value": batch["pcf_value"],
            "allocation_method": "mass",  # Default
            "calculation_timestamp": datetime.now(timezone.utc).isoformat(),
            "traceability_snapshot": {
                "inputs": batch.get("inputs", []),
                "energy": batch.get("energy", []),
                "process_emissions": batch.get("process_emissions", [])
            }
        }
        await db.pcf_registers.insert_one(register_entry)
    
    await create_audit_log("batch", batch_id, "approve", user, {"pcf_value": batch["pcf_value"]})
    return {"message": "Batch approved"}

# ============== BATCH API (MES Integration) ==============

@api_router.post("/batches/events")
async def post_batch_event(
    batch_number: str,
    event_type: str,
    event_data: dict,
    user: dict = Depends(get_current_user)
):
    """Idempotent API for MES to post batch events"""
    batch = await db.batches.find_one({"batch_number": batch_number}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    event_id = event_data.get("event_id", str(uuid.uuid4()))
    
    # Check for idempotency
    existing = await db.batch_events.find_one({"event_id": event_id})
    if existing:
        return {"message": "Event already processed", "event_id": event_id}
    
    # Store event
    event = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "batch_id": batch["id"],
        "batch_number": batch_number,
        "event_type": event_type,
        "event_data": event_data,
        "processed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.batch_events.insert_one(event)
    
    # Process event based on type
    if event_type == "input":
        await db.batches.update_one(
            {"id": batch["id"]},
            {"$push": {"inputs": event_data}}
        )
    elif event_type == "output":
        await db.batches.update_one(
            {"id": batch["id"]},
            {"$push": {"outputs": event_data}}
        )
    elif event_type == "energy":
        await db.batches.update_one(
            {"id": batch["id"]},
            {"$push": {"energy": event_data}}
        )
    
    # Recalculate PCF
    pcf = await calculate_batch_pcf(batch["id"])
    await db.batches.update_one({"id": batch["id"]}, {"$set": {"pcf_value": pcf}})
    
    return {"message": "Event processed", "event_id": event_id, "pcf_value": pcf}

# ============== CERTIFICATES ==============

@api_router.post("/batches/{batch_id}/certificate")
async def generate_certificate(batch_id: str, user: dict = Depends(require_roles(["master_approver"]))):
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch["status"] != "approved":
        raise HTTPException(status_code=400, detail="Only approved batches can generate certificates")
    
    # Get related data
    plant = await db.plants.find_one({"id": batch["plant_id"]}, {"_id": 0})
    bom = await db.boms.find_one({"id": batch["bom_id"]}, {"_id": 0})
    
    certificate = {
        "id": str(uuid.uuid4()),
        "batch_id": batch_id,
        "batch_number": batch["batch_number"],
        "plant_name": plant["name"] if plant else "Unknown",
        "bom_name": bom["name"] if bom else "Unknown",
        "pcf_value": batch["pcf_value"],
        "pcf_unit": "kgCO2e/unit",
        "gwp_set": "AR6",
        "allocation_method": "Mass-based",
        "boundary": "Cradle-to-gate",
        "outputs": batch.get("outputs", []),
        "calculation_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": user["id"]
    }
    await db.certificates.insert_one(certificate)
    
    await create_audit_log("certificate", certificate["id"], "generate", user, {"batch_id": batch_id})
    return certificate

@api_router.get("/certificates", response_model=List[dict])
async def get_certificates(batch_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if batch_id:
        query["batch_id"] = batch_id
    certs = await db.certificates.find(query, {"_id": 0}).to_list(1000)
    return certs

@api_router.get("/certificates/{cert_id}/pdf")
async def download_certificate_pdf(cert_id: str, user: dict = Depends(get_current_user)):
    cert = await db.certificates.find_one({"id": cert_id}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Generate PDF using reportlab
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []
        
        # Title
        elements.append(Paragraph(f"<b>Product Carbon Footprint Certificate</b>", styles['Title']))
        elements.append(Spacer(1, 20))
        
        # Certificate details
        data = [
            ["Certificate ID:", cert["id"]],
            ["Batch Number:", cert["batch_number"]],
            ["Plant:", cert["plant_name"]],
            ["Recipe/BOM:", cert["bom_name"]],
            ["PCF Value:", f"{cert['pcf_value']} {cert['pcf_unit']}"],
            ["GWP Set:", cert["gwp_set"]],
            ["Allocation Method:", cert["allocation_method"]],
            ["System Boundary:", cert["boundary"]],
            ["Generated:", cert["generated_at"]],
        ]
        
        table = Table(data, colWidths=[150, 350])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)
        
        doc.build(elements)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=certificate_{cert['batch_number']}.pdf"}
        )
    except ImportError:
        raise HTTPException(status_code=500, detail="PDF generation not available")

# ============== AUDIT LOGS ==============

@api_router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user: dict = Depends(require_roles(["auditor", "superadmin"]))
):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    return [AuditLogResponse(**l) for l in logs]

@api_router.get("/audit-export/{batch_id}")
async def export_audit_pack(batch_id: str, user: dict = Depends(require_roles(["auditor", "superadmin"]))):
    """Export complete audit pack for a batch"""
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Gather all related data
    plant = await db.plants.find_one({"id": batch["plant_id"]}, {"_id": 0})
    bom = await db.boms.find_one({"id": batch["bom_id"]}, {"_id": 0})
    
    # Get emission factors used
    ef_ids = set()
    for inp in batch.get("inputs", []):
        rm = await db.raw_materials.find_one({"id": inp["raw_material_id"]}, {"_id": 0})
        if rm and rm.get("default_emission_factor_id"):
            ef_ids.add(rm["default_emission_factor_id"])
    
    for energy in batch.get("energy", []):
        source = await db.utility_sources.find_one({"id": energy["utility_source_id"]}, {"_id": 0})
        if source and source.get("emission_factor_id"):
            ef_ids.add(source["emission_factor_id"])
    
    emission_factors = await db.emission_factors.find({"id": {"$in": list(ef_ids)}}, {"_id": 0}).to_list(100)
    
    # Get audit logs
    audit_logs = await db.audit_logs.find({"entity_id": batch_id}, {"_id": 0}).to_list(1000)
    
    # Get certificates
    certificates = await db.certificates.find({"batch_id": batch_id}, {"_id": 0}).to_list(100)
    
    export_pack = {
        "export_timestamp": datetime.now(timezone.utc).isoformat(),
        "batch": batch,
        "plant": plant,
        "bom": bom,
        "emission_factors": emission_factors,
        "audit_logs": audit_logs,
        "certificates": certificates,
        "calculation_methodology": {
            "gwp_set": "AR6",
            "allocation_method": "mass-based",
            "boundary": "cradle-to-gate"
        }
    }
    
    return export_pack

# ============== DASHBOARD ==============

@api_router.get("/dashboard/pcf-trends")
async def get_pcf_trends(
    plant_id: Optional[str] = None,
    sku_id: Optional[str] = None,
    days: int = 30,
    user: dict = Depends(get_current_user)
):
    query = {"status": {"$in": ["closed", "approved"]}}
    if plant_id:
        query["plant_id"] = plant_id
    
    batches = await db.batches.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Group by date
    trends = {}
    for batch in batches:
        date = batch["created_at"][:10]
        if date not in trends:
            trends[date] = {"total_pcf": 0, "count": 0}
        trends[date]["total_pcf"] += batch.get("pcf_value", 0)
        trends[date]["count"] += 1
    
    return [
        {"date": date, "pcf_value": round(data["total_pcf"] / data["count"], 2), "batch_count": data["count"]}
        for date, data in sorted(trends.items())[-days:]
    ]

@api_router.get("/dashboard/hotspots")
async def get_hotspots(plant_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"status": {"$in": ["closed", "approved"]}}
    if plant_id:
        query["plant_id"] = plant_id
    
    batches = await db.batches.find(query, {"_id": 0}).to_list(100)
    
    components = {"materials": 0, "energy": 0, "process": 0, "transport": 0}
    
    for batch in batches:
        # Estimate component contributions (simplified)
        total = batch.get("pcf_value", 0) or 1
        materials_count = len(batch.get("inputs", []))
        energy_count = len(batch.get("energy", []))
        process_count = len(batch.get("process_emissions", []))
        
        components["materials"] += materials_count * 0.4 * total
        components["energy"] += energy_count * 0.35 * total
        components["process"] += process_count * 0.15 * total
        components["transport"] += 0.1 * total
    
    total = sum(components.values()) or 1
    return [
        {"component": comp, "contribution": round(val, 2), "percentage": round(val / total * 100, 1)}
        for comp, val in sorted(components.items(), key=lambda x: -x[1])
    ]

@api_router.get("/dashboard/supplier-rankings")
async def get_supplier_rankings(user: dict = Depends(get_current_user)):
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(100)
    
    rankings = []
    total_contribution = 0
    
    for supplier in suppliers:
        # Get supplier-RM mappings
        mappings = await db.supplier_rm_maps.find({"supplier_id": supplier["id"]}, {"_id": 0}).to_list(100)
        contribution = sum(m.get("sourcing_share", 0) for m in mappings) * 0.5  # Simplified
        total_contribution += contribution
        rankings.append({
            "supplier_name": supplier["name"],
            "contribution": round(contribution, 2)
        })
    
    # Calculate percentages
    for r in rankings:
        r["percentage"] = round(r["contribution"] / total_contribution * 100, 1) if total_contribution > 0 else 0
    
    return sorted(rankings, key=lambda x: -x["contribution"])[:10]

@api_router.get("/dashboard/summary")
async def get_dashboard_summary(user: dict = Depends(get_current_user)):
    # Counts
    batch_count = await db.batches.count_documents({})
    open_batches = await db.batches.count_documents({"status": "open"})
    approved_batches = await db.batches.count_documents({"status": "approved"})
    rm_count = await db.raw_materials.count_documents({})
    supplier_count = await db.suppliers.count_documents({})
    ef_count = await db.emission_factors.count_documents({})
    
    # Average PCF
    batches = await db.batches.find({"status": {"$in": ["closed", "approved"]}}, {"_id": 0, "pcf_value": 1}).to_list(1000)
    avg_pcf = sum(b.get("pcf_value", 0) for b in batches) / len(batches) if batches else 0
    
    return {
        "total_batches": batch_count,
        "open_batches": open_batches,
        "approved_batches": approved_batches,
        "raw_materials": rm_count,
        "suppliers": supplier_count,
        "emission_factors": ef_count,
        "average_pcf": round(avg_pcf, 2)
    }

# ============== TEMPLATES ==============

@api_router.get("/templates/raw-materials")
async def get_raw_materials_template():
    """Return CSV template for raw materials upload"""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['code', 'name', 'category', 'unit', 'emission_factor_id'])
    writer.writerow(['RM001', 'Example Material', 'Chemicals', 'kg', ''])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=raw_materials_template.csv"}
    )

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "PCF Management System API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    # Create superadmin user if not exists
    admin = await db.users.find_one({"email": "admin@pcf.com"})
    if not admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@pcf.com",
            "password_hash": hash_password("admin123"),
            "name": "Super Admin",
            "role": "superadmin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info("Created superadmin user: admin@pcf.com / admin123")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
