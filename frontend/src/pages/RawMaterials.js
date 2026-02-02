import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, Upload, Download, Check, X, Package } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const RawMaterials = () => {
  const { getAuthHeaders, hasRole } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [emissionFactors, setEmissionFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    unit: 'kg',
    default_emission_factor_id: ''
  });

  const categories = ['Chemicals', 'Metals', 'Plastics', 'Solvents', 'Packaging', 'Other'];
  const units = ['kg', 'L', 'pcs', 'm', 'm²', 'm³'];

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      const [rmRes, efRes] = await Promise.all([
        axios.get(`${API_URL}/raw-materials${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`, getAuthHeaders()),
        axios.get(`${API_URL}/emission-factors?status=active`, getAuthHeaders())
      ]);
      setMaterials(rmRes.data);
      setEmissionFactors(efRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/raw-materials`, formData, getAuthHeaders());
      toast.success('Raw material created');
      setDialogOpen(false);
      setFormData({ code: '', name: '', category: '', unit: 'kg', default_emission_factor_id: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create');
    }
  };

  const handleActivate = async (id) => {
    try {
      await axios.put(`${API_URL}/raw-materials/${id}/activate`, {}, getAuthHeaders());
      toast.success('Raw material activated');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to activate');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/raw-materials/upload`, formData, {
        ...getAuthHeaders(),
        headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.errors?.length > 0) {
        toast.warning(`Created ${response.data.created} items. ${response.data.errors.length} errors.`);
      } else {
        toast.success(`Successfully created ${response.data.created} raw materials`);
      }
      setUploadDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = async () => {
    try {
      const response = await axios.get(`${API_URL}/templates/raw-materials`, {
        ...getAuthHeaders(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'raw_materials_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'status-draft',
      active: 'status-active'
    };
    return <Badge className={`${styles[status] || ''} text-xs`}>{status}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="raw-materials-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">Raw Materials</h1>
          <p className="text-muted-foreground mt-1">Manage material master data</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
            </SelectContent>
          </Select>
          
          {hasRole(['master_steward']) && (
            <>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="btn-animate" data-testid="upload-btn">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Raw Materials</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV file with columns: code, name, category, unit, emission_factor_id
                    </p>
                    <Button variant="outline" onClick={downloadTemplate} className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                    <div className="border-2 border-dashed border-zinc-200 rounded-md p-6 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={handleUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">CSV or XLSX files</p>
                      </label>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-animate bg-primary" data-testid="add-material-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Material
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Raw Material</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="label-style">Code</Label>
                        <Input
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          placeholder="RM001"
                          required
                          data-testid="material-code-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="label-style">Name</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Material name"
                          required
                          data-testid="material-name-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="label-style">Category</Label>
                        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="label-style">Unit</Label>
                        <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {units.map(unit => (
                              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="label-style">Default Emission Factor</Label>
                      <Select 
                        value={formData.default_emission_factor_id} 
                        onValueChange={(v) => setFormData({ ...formData, default_emission_factor_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select emission factor (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {emissionFactors.map(ef => (
                            <SelectItem key={ef.id} value={ef.id}>
                              {ef.name} ({ef.co2e_factor} {ef.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-primary" data-testid="submit-material-btn">
                        Create Material
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="grid-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : materials.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No raw materials found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Version</th>
                  <th>Status</th>
                  {hasRole(['master_approver']) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {materials.map((rm) => (
                  <tr key={rm.id} data-testid={`material-row-${rm.code}`}>
                    <td className="font-mono text-sm">{rm.code}</td>
                    <td className="font-medium">{rm.name}</td>
                    <td>{rm.category}</td>
                    <td>{rm.unit}</td>
                    <td>v{rm.version}</td>
                    <td>{getStatusBadge(rm.status)}</td>
                    {hasRole(['master_approver']) && (
                      <td>
                        {rm.status === 'draft' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleActivate(rm.id)}
                            className="h-8"
                            data-testid={`activate-${rm.code}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Activate
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RawMaterials;
