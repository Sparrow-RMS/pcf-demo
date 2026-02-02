import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { Plus, Check, Leaf, Copy } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const EmissionFactors = () => {
  const { getAuthHeaders, hasRole } = useAuth();
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    source: '',
    gwp_set: 'AR6',
    co2_factor: '',
    ch4_factor: '0',
    n2o_factor: '0',
    unit: 'kgCO2e/kg',
    category: '',
    notes: ''
  });

  const categories = ['Electricity', 'Natural Gas', 'Transport', 'Materials', 'Waste', 'Water', 'Other'];
  const gwpSets = ['AR5', 'AR6'];

  useEffect(() => {
    fetchFactors();
  }, [statusFilter, categoryFilter]);

  const fetchFactors = async () => {
    try {
      let url = `${API_URL}/emission-factors`;
      const params = [];
      if (statusFilter !== 'all') params.push(`status=${statusFilter}`);
      if (categoryFilter !== 'all') params.push(`category=${categoryFilter}`);
      if (params.length) url += `?${params.join('&')}`;
      
      const response = await axios.get(url, getAuthHeaders());
      setFactors(response.data);
    } catch (error) {
      toast.error('Failed to fetch emission factors');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        co2_factor: parseFloat(formData.co2_factor),
        ch4_factor: parseFloat(formData.ch4_factor || 0),
        n2o_factor: parseFloat(formData.n2o_factor || 0)
      };
      await axios.post(`${API_URL}/emission-factors`, data, getAuthHeaders());
      toast.success('Emission factor created');
      setDialogOpen(false);
      setFormData({
        name: '', source: '', gwp_set: 'AR6', co2_factor: '',
        ch4_factor: '0', n2o_factor: '0', unit: 'kgCO2e/kg', category: '', notes: ''
      });
      fetchFactors();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create');
    }
  };

  const handleActivate = async (id) => {
    try {
      await axios.put(`${API_URL}/emission-factors/${id}/activate`, {}, getAuthHeaders());
      toast.success('Emission factor activated');
      fetchFactors();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to activate');
    }
  };

  const handleNewVersion = async (ef) => {
    try {
      const data = {
        name: ef.name,
        source: ef.source,
        gwp_set: ef.gwp_set,
        co2_factor: ef.co2_factor,
        ch4_factor: ef.ch4_factor,
        n2o_factor: ef.n2o_factor,
        unit: ef.unit,
        category: ef.category,
        notes: ef.notes
      };
      await axios.post(`${API_URL}/emission-factors/${ef.id}/new-version`, data, getAuthHeaders());
      toast.success('New version created');
      fetchFactors();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create version');
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
    <div className="space-y-6" data-testid="emission-factors-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">Emission Factors</h1>
          <p className="text-muted-foreground mt-1">Manage CO2e conversion factors with GWP sets</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {hasRole(['master_steward', 'esg_analyst']) && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-animate bg-primary" data-testid="add-ef-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Factor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Emission Factor</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="label-style">Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Grid Electricity UK"
                        required
                        data-testid="ef-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="label-style">Source</Label>
                      <Input
                        value={formData.source}
                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                        placeholder="DEFRA 2024"
                        required
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
                      <Label className="label-style">GWP Set</Label>
                      <Select value={formData.gwp_set} onValueChange={(v) => setFormData({ ...formData, gwp_set: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gwpSets.map(set => (
                            <SelectItem key={set} value={set}>{set}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="label-style">CO2 Factor</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={formData.co2_factor}
                        onChange={(e) => setFormData({ ...formData, co2_factor: e.target.value })}
                        placeholder="0.0"
                        required
                        data-testid="ef-co2-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="label-style">CH4 Factor</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={formData.ch4_factor}
                        onChange={(e) => setFormData({ ...formData, ch4_factor: e.target.value })}
                        placeholder="0.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="label-style">N2O Factor</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={formData.n2o_factor}
                        onChange={(e) => setFormData({ ...formData, n2o_factor: e.target.value })}
                        placeholder="0.0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="label-style">Unit</Label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="kgCO2e/kWh"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-style">Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-primary" data-testid="submit-ef-btn">
                      Create Factor
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="grid-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : factors.length === 0 ? (
          <div className="p-12 text-center">
            <Leaf className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No emission factors found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Category</th>
                  <th>CO2e Factor</th>
                  <th>GWP Set</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {factors.map((ef) => (
                  <tr key={ef.id} data-testid={`ef-row-${ef.name}`}>
                    <td className="font-medium">{ef.name}</td>
                    <td className="text-muted-foreground">{ef.source}</td>
                    <td>{ef.category}</td>
                    <td className="font-mono">{ef.co2e_factor} <span className="text-xs text-muted-foreground">{ef.unit}</span></td>
                    <td><Badge variant="outline">{ef.gwp_set}</Badge></td>
                    <td>v{ef.version}</td>
                    <td>{getStatusBadge(ef.status)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {ef.status === 'draft' && hasRole(['master_approver']) && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleActivate(ef.id)}
                            className="h-8"
                            data-testid={`activate-ef-${ef.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        {hasRole(['master_steward', 'esg_analyst']) && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleNewVersion(ef)}
                            className="h-8"
                            title="Create new version"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
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

export default EmissionFactors;
