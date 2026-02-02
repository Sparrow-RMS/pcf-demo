import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Plus, FlaskConical, Eye, Leaf } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Batches = () => {
  const { getAuthHeaders, hasRole } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [plants, setPlants] = useState([]);
  const [boms, setBOMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    batch_number: '',
    plant_id: '',
    bom_id: '',
    planned_output_qty: '',
    start_time: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      const [batchesRes, plantsRes, bomsRes] = await Promise.all([
        axios.get(`${API_URL}/batches${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`, getAuthHeaders()),
        axios.get(`${API_URL}/plants`, getAuthHeaders()),
        axios.get(`${API_URL}/boms?status=active`, getAuthHeaders())
      ]);
      setBatches(batchesRes.data);
      setPlants(plantsRes.data);
      setBOMs(bomsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/batches`, {
        ...formData,
        planned_output_qty: parseFloat(formData.planned_output_qty)
      }, getAuthHeaders());
      toast.success('Batch created');
      setDialogOpen(false);
      setFormData({
        batch_number: '',
        plant_id: '',
        bom_id: '',
        planned_output_qty: '',
        start_time: new Date().toISOString().slice(0, 16)
      });
      fetchData();
      navigate(`/batches/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create');
    }
  };

  const getPlantName = (id) => plants.find(p => p.id === id)?.name || '-';
  const getBOMName = (id) => boms.find(b => b.id === id)?.name || '-';

  const getStatusBadge = (status) => {
    const styles = {
      open: 'status-open',
      closed: 'status-closed',
      approved: 'status-approved'
    };
    return <Badge className={`${styles[status] || ''} text-xs`}>{status}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="batches-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">Batches</h1>
          <p className="text-muted-foreground mt-1">Production batches with real-time PCF calculation</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="batch-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
          
          {hasRole(['batch_operator']) && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-animate bg-primary" data-testid="create-batch-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Batch
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Batch</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="label-style">Batch Number</Label>
                    <Input
                      value={formData.batch_number}
                      onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                      placeholder="BATCH-2024-001"
                      required
                      data-testid="batch-number-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <Label className="label-style">BOM / Recipe</Label>
                      <Select value={formData.bom_id} onValueChange={(v) => setFormData({ ...formData, bom_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select BOM" />
                        </SelectTrigger>
                        <SelectContent>
                          {boms.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="label-style">Planned Output Qty</Label>
                      <Input
                        type="number"
                        value={formData.planned_output_qty}
                        onChange={(e) => setFormData({ ...formData, planned_output_qty: e.target.value })}
                        placeholder="1000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="label-style">Start Time</Label>
                      <Input
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-primary" data-testid="submit-batch-btn">Create Batch</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center">
            <FlaskConical className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No batches found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Batch #</th>
                  <th>Plant</th>
                  <th>BOM</th>
                  <th>Planned Qty</th>
                  <th>PCF</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} data-testid={`batch-row-${batch.batch_number}`}>
                    <td className="font-mono text-sm font-medium">{batch.batch_number}</td>
                    <td>{getPlantName(batch.plant_id)}</td>
                    <td>{getBOMName(batch.bom_id)}</td>
                    <td className="font-mono">{batch.planned_output_qty}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-emerald-600" />
                        <span className="font-mono font-medium">
                          {batch.pcf_value?.toFixed(4) || '-'}
                        </span>
                        {batch.pcf_provisional && (
                          <Badge variant="outline" className="text-xs">provisional</Badge>
                        )}
                      </div>
                    </td>
                    <td>{getStatusBadge(batch.status)}</td>
                    <td>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => navigate(`/batches/${batch.id}`)}
                        className="h-8"
                        data-testid={`view-batch-${batch.batch_number}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
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

export default Batches;
