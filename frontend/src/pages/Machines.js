import { useState, useEffect } from 'react';
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
import { Plus, Factory } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Machines = () => {
  const { getAuthHeaders, hasRole } = useAuth();
  const [machines, setMachines] = useState([]);
  const [plants, setPlants] = useState([]);
  const [utilitySources, setUtilitySources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    plant_id: '',
    energy_model: 'metered',
    rated_power_kw: '',
    default_utility_source_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [machinesRes, plantsRes, utilitiesRes] = await Promise.all([
        axios.get(`${API_URL}/machines`, getAuthHeaders()),
        axios.get(`${API_URL}/plants`, getAuthHeaders()),
        axios.get(`${API_URL}/utility-sources`, getAuthHeaders())
      ]);
      setMachines(machinesRes.data);
      setPlants(plantsRes.data);
      setUtilitySources(utilitiesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/machines`, {
        ...formData,
        rated_power_kw: formData.rated_power_kw ? parseFloat(formData.rated_power_kw) : null
      }, getAuthHeaders());
      toast.success('Machine created');
      setDialogOpen(false);
      setFormData({ code: '', name: '', plant_id: '', energy_model: 'metered', rated_power_kw: '', default_utility_source_id: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create');
    }
  };

  const getPlantName = (id) => plants.find(p => p.id === id)?.name || '-';

  return (
    <div className="space-y-6" data-testid="machines-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">Machines</h1>
          <p className="text-muted-foreground mt-1">Define machine energy models for emissions calculation</p>
        </div>
        {hasRole(['master_steward']) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-animate bg-primary" data-testid="add-machine-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Machine
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Machine</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="label-style">Code</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="MCH001"
                      required
                      data-testid="machine-code-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-style">Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Reactor A"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="label-style">Plant</Label>
                  <Select value={formData.plant_id} onValueChange={(v) => setFormData({ ...formData, plant_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {plants.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="label-style">Energy Model</Label>
                    <Select value={formData.energy_model} onValueChange={(v) => setFormData({ ...formData, energy_model: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metered">Metered</SelectItem>
                        <SelectItem value="run_hours">Run Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="label-style">Rated Power (kW)</Label>
                    <Input
                      type="number"
                      value={formData.rated_power_kw}
                      onChange={(e) => setFormData({ ...formData, rated_power_kw: e.target.value })}
                      placeholder="Required for run_hours"
                      disabled={formData.energy_model !== 'run_hours'}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="label-style">Default Utility Source</Label>
                  <Select value={formData.default_utility_source_id} onValueChange={(v) => setFormData({ ...formData, default_utility_source_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select utility source" />
                    </SelectTrigger>
                    <SelectContent>
                      {utilitySources.map(us => (
                        <SelectItem key={us.id} value={us.id}>{us.name} ({us.utility_type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary" data-testid="submit-machine-btn">Create Machine</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : machines.length === 0 ? (
          <div className="p-12 text-center">
            <Factory className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No machines found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Plant</th>
                  <th>Energy Model</th>
                  <th>Rated Power</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => (
                  <tr key={m.id} data-testid={`machine-row-${m.code}`}>
                    <td className="font-mono text-sm">{m.code}</td>
                    <td className="font-medium">{m.name}</td>
                    <td>{getPlantName(m.plant_id)}</td>
                    <td><Badge variant="outline" className="capitalize">{m.energy_model.replace('_', ' ')}</Badge></td>
                    <td className="font-mono">{m.rated_power_kw ? `${m.rated_power_kw} kW` : '-'}</td>
                    <td><Badge className="status-active text-xs">{m.status}</Badge></td>
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

export default Machines;
