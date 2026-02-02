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
import { Plus, Truck } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const TransportLanes = () => {
  const { getAuthHeaders, hasRole } = useAuth();
  const [lanes, setLanes] = useState([]);
  const [emissionFactors, setEmissionFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    origin: '',
    destination: '',
    transport_mode: 'road',
    distance_km: '',
    emission_factor_id: ''
  });

  const transportModes = ['road', 'rail', 'sea', 'air'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [lanesRes, efRes] = await Promise.all([
        axios.get(`${API_URL}/transport-lanes`, getAuthHeaders()),
        axios.get(`${API_URL}/emission-factors?status=active&category=Transport`, getAuthHeaders())
      ]);
      setLanes(lanesRes.data);
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
      await axios.post(`${API_URL}/transport-lanes`, {
        ...formData,
        distance_km: parseFloat(formData.distance_km)
      }, getAuthHeaders());
      toast.success('Transport lane created');
      setDialogOpen(false);
      setFormData({ code: '', origin: '', destination: '', transport_mode: 'road', distance_km: '', emission_factor_id: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create');
    }
  };

  const getModeIcon = (mode) => {
    const icons = { road: '🚛', rail: '🚂', sea: '🚢', air: '✈️' };
    return icons[mode] || '📦';
  };

  return (
    <div className="space-y-6" data-testid="transport-lanes-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">Transport Lanes</h1>
          <p className="text-muted-foreground mt-1">Manage logistics routes and emission factors</p>
        </div>
        {hasRole(['master_steward']) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-animate bg-primary" data-testid="add-lane-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Lane
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transport Lane</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="label-style">Code</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="TL001"
                    required
                    data-testid="lane-code-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="label-style">Origin</Label>
                    <Input
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      placeholder="Hamburg, DE"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-style">Destination</Label>
                    <Input
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      placeholder="Rotterdam, NL"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="label-style">Transport Mode</Label>
                    <Select value={formData.transport_mode} onValueChange={(v) => setFormData({ ...formData, transport_mode: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {transportModes.map(mode => (
                          <SelectItem key={mode} value={mode} className="capitalize">{mode}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="label-style">Distance (km)</Label>
                    <Input
                      type="number"
                      value={formData.distance_km}
                      onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                      placeholder="450"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="label-style">Emission Factor</Label>
                  <Select value={formData.emission_factor_id} onValueChange={(v) => setFormData({ ...formData, emission_factor_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select emission factor" />
                    </SelectTrigger>
                    <SelectContent>
                      {emissionFactors.map(ef => (
                        <SelectItem key={ef.id} value={ef.id}>{ef.name} ({ef.co2e_factor} {ef.unit})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary" data-testid="submit-lane-btn">Create Lane</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : lanes.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No transport lanes found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Route</th>
                  <th>Mode</th>
                  <th>Distance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lanes.map((lane) => (
                  <tr key={lane.id} data-testid={`lane-row-${lane.code}`}>
                    <td className="font-mono text-sm">{lane.code}</td>
                    <td>
                      <span className="font-medium">{lane.origin}</span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="font-medium">{lane.destination}</span>
                    </td>
                    <td>
                      <span className="mr-2">{getModeIcon(lane.transport_mode)}</span>
                      <span className="capitalize">{lane.transport_mode}</span>
                    </td>
                    <td className="font-mono">{lane.distance_km} km</td>
                    <td><Badge className="status-active text-xs">{lane.status}</Badge></td>
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

export default TransportLanes;
