#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class PCFAPITester:
    def __init__(self, base_url: str = "https://esg-emissions.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_entities = {}
        
    def log(self, message: str):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Exception: {str(e)}")
            return False, {}

    def test_health_check(self) -> bool:
        """Test basic health endpoint"""
        success, _ = self.run_test("Health Check", "GET", "health", 200)
        return success

    def test_login(self) -> bool:
        """Test login with demo credentials"""
        success, response = self.run_test(
            "Login", "POST", "auth/login", 200,
            data={"email": "admin@pcf.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.log(f"   Token obtained, User ID: {self.user_id}")
            return True
        return False

    def test_auth_me(self) -> bool:
        """Test getting current user info"""
        success, response = self.run_test("Get Current User", "GET", "auth/me", 200)
        if success:
            self.log(f"   User: {response.get('name')} ({response.get('role')})")
        return success

    def test_dashboard_summary(self) -> bool:
        """Test dashboard summary endpoint"""
        success, response = self.run_test("Dashboard Summary", "GET", "dashboard/summary", 200)
        if success:
            self.log(f"   Total batches: {response.get('total_batches', 0)}")
        return success

    def test_create_plant(self) -> bool:
        """Test creating a plant"""
        plant_data = {
            "code": "PLT001",
            "name": "Test Plant",
            "location": "Test City",
            "country": "Test Country",
            "timezone": "UTC"
        }
        success, response = self.run_test("Create Plant", "POST", "plants", 200, data=plant_data)
        if success and 'id' in response:
            self.created_entities['plant_id'] = response['id']
            self.log(f"   Created plant ID: {response['id']}")
        return success

    def test_get_plants(self) -> bool:
        """Test getting plants list"""
        success, response = self.run_test("Get Plants", "GET", "plants", 200)
        if success:
            self.log(f"   Found {len(response)} plants")
        return success

    def test_create_emission_factor(self) -> bool:
        """Test creating an emission factor"""
        ef_data = {
            "name": "Test Electricity Grid",
            "source": "Test Source 2024",
            "gwp_set": "AR6",
            "co2_factor": 0.5,
            "ch4_factor": 0.0,
            "n2o_factor": 0.0,
            "unit": "kgCO2e/kWh",
            "category": "Electricity",
            "notes": "Test emission factor"
        }
        success, response = self.run_test("Create Emission Factor", "POST", "emission-factors", 200, data=ef_data)
        if success and 'id' in response:
            self.created_entities['ef_id'] = response['id']
            self.log(f"   Created EF ID: {response['id']}, CO2e: {response.get('co2e_factor')}")
        return success

    def test_activate_emission_factor(self) -> bool:
        """Test activating an emission factor"""
        if 'ef_id' not in self.created_entities:
            self.log("❌ No emission factor to activate")
            return False
        
        ef_id = self.created_entities['ef_id']
        success, _ = self.run_test("Activate Emission Factor", "PUT", f"emission-factors/{ef_id}/activate", 200)
        return success

    def test_create_raw_material(self) -> bool:
        """Test creating a raw material"""
        rm_data = {
            "code": "RM001",
            "name": "Test Raw Material",
            "category": "Chemicals",
            "unit": "kg",
            "default_emission_factor_id": self.created_entities.get('ef_id')
        }
        success, response = self.run_test("Create Raw Material", "POST", "raw-materials", 200, data=rm_data)
        if success and 'id' in response:
            self.created_entities['rm_id'] = response['id']
            self.log(f"   Created RM ID: {response['id']}")
        return success

    def test_activate_raw_material(self) -> bool:
        """Test activating a raw material"""
        if 'rm_id' not in self.created_entities:
            self.log("❌ No raw material to activate")
            return False
        
        rm_id = self.created_entities['rm_id']
        success, _ = self.run_test("Activate Raw Material", "PUT", f"raw-materials/{rm_id}/activate", 200)
        return success

    def test_create_supplier(self) -> bool:
        """Test creating a supplier"""
        supplier_data = {
            "code": "SUP001",
            "name": "Test Supplier",
            "country": "Test Country",
            "contact_email": "test@supplier.com"
        }
        success, response = self.run_test("Create Supplier", "POST", "suppliers", 200, data=supplier_data)
        if success and 'id' in response:
            self.created_entities['supplier_id'] = response['id']
            self.log(f"   Created Supplier ID: {response['id']}")
        return success

    def test_create_sku(self) -> bool:
        """Test creating a SKU"""
        if 'plant_id' not in self.created_entities:
            self.log("❌ No plant available for SKU")
            return False
            
        sku_data = {
            "code": "SKU001",
            "name": "Test Product",
            "description": "Test product description",
            "unit": "kg",
            "category": "Finished Goods",
            "plant_id": self.created_entities['plant_id']
        }
        success, response = self.run_test("Create SKU", "POST", "skus", 200, data=sku_data)
        if success and 'id' in response:
            self.created_entities['sku_id'] = response['id']
            self.log(f"   Created SKU ID: {response['id']}")
        return success

    def test_create_utility_source(self) -> bool:
        """Test creating a utility source"""
        if 'plant_id' not in self.created_entities or 'ef_id' not in self.created_entities:
            self.log("❌ Missing plant or emission factor for utility source")
            return False
            
        utility_data = {
            "code": "ELEC001",
            "name": "Main Electricity",
            "utility_type": "electricity",
            "plant_id": self.created_entities['plant_id'],
            "emission_factor_id": self.created_entities['ef_id'],
            "unit": "kWh"
        }
        success, response = self.run_test("Create Utility Source", "POST", "utility-sources", 200, data=utility_data)
        if success and 'id' in response:
            self.created_entities['utility_id'] = response['id']
            self.log(f"   Created Utility ID: {response['id']}")
        return success

    def test_create_machine(self) -> bool:
        """Test creating a machine"""
        if 'plant_id' not in self.created_entities or 'utility_id' not in self.created_entities:
            self.log("❌ Missing plant or utility source for machine")
            return False
            
        machine_data = {
            "code": "MCH001",
            "name": "Test Machine",
            "plant_id": self.created_entities['plant_id'],
            "energy_model": "metered",
            "rated_power_kw": 100.0,
            "default_utility_source_id": self.created_entities['utility_id']
        }
        success, response = self.run_test("Create Machine", "POST", "machines", 200, data=machine_data)
        if success and 'id' in response:
            self.created_entities['machine_id'] = response['id']
            self.log(f"   Created Machine ID: {response['id']}")
        return success

    def test_create_bom(self) -> bool:
        """Test creating a BOM"""
        if 'sku_id' not in self.created_entities or 'rm_id' not in self.created_entities:
            self.log("❌ Missing SKU or raw material for BOM")
            return False
            
        bom_data = {
            "code": "BOM001",
            "name": "Test BOM",
            "output_sku_id": self.created_entities['sku_id'],
            "version": 1,
            "lines": [
                {
                    "item_type": "raw_material",
                    "item_id": self.created_entities['rm_id'],
                    "quantity": 10.0,
                    "unit": "kg",
                    "recovery_rate": 0.0
                }
            ],
            "co_products": []
        }
        success, response = self.run_test("Create BOM", "POST", "boms", 200, data=bom_data)
        if success and 'id' in response:
            self.created_entities['bom_id'] = response['id']
            self.log(f"   Created BOM ID: {response['id']}")
        return success

    def test_activate_bom(self) -> bool:
        """Test activating a BOM"""
        if 'bom_id' not in self.created_entities:
            self.log("❌ No BOM to activate")
            return False
        
        bom_id = self.created_entities['bom_id']
        success, _ = self.run_test("Activate BOM", "PUT", f"boms/{bom_id}/activate", 200)
        return success

    def test_create_batch(self) -> bool:
        """Test creating a batch"""
        if 'plant_id' not in self.created_entities or 'bom_id' not in self.created_entities:
            self.log("❌ Missing plant or BOM for batch")
            return False
            
        batch_data = {
            "batch_number": f"BATCH-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            "plant_id": self.created_entities['plant_id'],
            "bom_id": self.created_entities['bom_id'],
            "planned_output_qty": 100.0,
            "start_time": datetime.now().isoformat(),
            "inputs": [],
            "outputs": [],
            "energy": [],
            "process_emissions": []
        }
        success, response = self.run_test("Create Batch", "POST", "batches", 200, data=batch_data)
        if success and 'id' in response:
            self.created_entities['batch_id'] = response['id']
            self.log(f"   Created Batch ID: {response['id']}, PCF: {response.get('pcf_value', 0)}")
        return success

    def test_add_batch_input(self) -> bool:
        """Test adding input to batch"""
        if 'batch_id' not in self.created_entities or 'rm_id' not in self.created_entities:
            self.log("❌ Missing batch or raw material for input")
            return False
            
        input_data = {
            "raw_material_id": self.created_entities['rm_id'],
            "quantity": 50.0
        }
        batch_id = self.created_entities['batch_id']
        success, response = self.run_test("Add Batch Input", "PUT", f"batches/{batch_id}/inputs", 200, data=input_data)
        if success:
            self.log(f"   Updated PCF: {response.get('pcf_value', 0)}")
        return success

    def test_add_batch_output(self) -> bool:
        """Test adding output to batch"""
        if 'batch_id' not in self.created_entities or 'sku_id' not in self.created_entities:
            self.log("❌ Missing batch or SKU for output")
            return False
            
        output_data = {
            "sku_id": self.created_entities['sku_id'],
            "quantity": 90.0
        }
        batch_id = self.created_entities['batch_id']
        success, response = self.run_test("Add Batch Output", "PUT", f"batches/{batch_id}/outputs", 200, data=output_data)
        if success:
            self.log(f"   Updated PCF: {response.get('pcf_value', 0)}")
        return success

    def test_add_batch_energy(self) -> bool:
        """Test adding energy to batch"""
        if 'batch_id' not in self.created_entities or 'machine_id' not in self.created_entities or 'utility_id' not in self.created_entities:
            self.log("❌ Missing batch, machine, or utility for energy")
            return False
            
        energy_data = {
            "machine_id": self.created_entities['machine_id'],
            "utility_source_id": self.created_entities['utility_id'],
            "quantity": 25.0,
            "measurement_type": "metered"
        }
        batch_id = self.created_entities['batch_id']
        success, response = self.run_test("Add Batch Energy", "PUT", f"batches/{batch_id}/energy", 200, data=energy_data)
        if success:
            self.log(f"   Updated PCF: {response.get('pcf_value', 0)}")
        return success

    def test_close_batch(self) -> bool:
        """Test closing a batch"""
        if 'batch_id' not in self.created_entities:
            self.log("❌ No batch to close")
            return False
        
        batch_id = self.created_entities['batch_id']
        success, response = self.run_test("Close Batch", "PUT", f"batches/{batch_id}/close", 200)
        if success:
            self.log(f"   Final PCF: {response.get('pcf_value', 0)}")
        return success

    def test_approve_batch(self) -> bool:
        """Test approving a batch"""
        if 'batch_id' not in self.created_entities:
            self.log("❌ No batch to approve")
            return False
        
        batch_id = self.created_entities['batch_id']
        success, _ = self.run_test("Approve Batch", "PUT", f"batches/{batch_id}/approve", 200)
        return success

    def test_generate_certificate(self) -> bool:
        """Test generating a certificate"""
        if 'batch_id' not in self.created_entities:
            self.log("❌ No batch for certificate")
            return False
        
        batch_id = self.created_entities['batch_id']
        success, response = self.run_test("Generate Certificate", "POST", f"batches/{batch_id}/certificate", 200)
        if success and 'id' in response:
            self.created_entities['cert_id'] = response['id']
            self.log(f"   Certificate ID: {response['id']}")
        return success

    def test_get_certificates(self) -> bool:
        """Test getting certificates"""
        success, response = self.run_test("Get Certificates", "GET", "certificates", 200)
        if success:
            self.log(f"   Found {len(response)} certificates")
        return success

    def test_get_audit_logs(self) -> bool:
        """Test getting audit logs"""
        success, response = self.run_test("Get Audit Logs", "GET", "audit-logs", 200)
        if success:
            self.log(f"   Found {len(response)} audit logs")
        return success

    def run_all_tests(self) -> bool:
        """Run comprehensive test suite"""
        self.log("🚀 Starting PCF Management System API Tests")
        self.log(f"   Base URL: {self.base_url}")
        
        # Core tests
        tests = [
            self.test_health_check,
            self.test_login,
            self.test_auth_me,
            self.test_dashboard_summary,
            
            # Master data creation
            self.test_create_plant,
            self.test_get_plants,
            self.test_create_emission_factor,
            self.test_activate_emission_factor,
            self.test_create_raw_material,
            self.test_activate_raw_material,
            self.test_create_supplier,
            self.test_create_sku,
            self.test_create_utility_source,
            self.test_create_machine,
            
            # BOM and batch workflow
            self.test_create_bom,
            self.test_activate_bom,
            self.test_create_batch,
            self.test_add_batch_input,
            self.test_add_batch_output,
            self.test_add_batch_energy,
            self.test_close_batch,
            self.test_approve_batch,
            
            # Certificates and audit
            self.test_generate_certificate,
            self.test_get_certificates,
            self.test_get_audit_logs,
        ]
        
        failed_tests = []
        for test in tests:
            try:
                if not test():
                    failed_tests.append(test.__name__)
            except Exception as e:
                self.log(f"❌ {test.__name__} - Exception: {str(e)}")
                failed_tests.append(test.__name__)
        
        # Summary
        self.log("\n" + "="*60)
        self.log(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if failed_tests:
            self.log(f"❌ Failed tests: {', '.join(failed_tests)}")
            return False
        else:
            self.log("✅ All tests passed!")
            return True

def main():
    tester = PCFAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())