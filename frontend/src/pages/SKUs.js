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
import { Plus, Boxes } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const SKUs = () => {
  const { getAuthHeaders, hasRole } = useAuth();
  const [skus, setSKUs] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    unit: 'kg',
    category: '',
    plant_id: ''
  });

  const categories = ['Finished Good', 'Intermediate', 'By-product', 'Semi-finished'];
  const units = ['kg', 'L', 'pcs', 'MT'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [skusRes, plantsRes] = await Promise.all([
        axios.get(`${API_URL}/skus`, getAuthHeaders()),
        axios.get(`${API_URL}/plants`, getAuthHeaders())
      ]);
      setSKUs(skusRes.data);
      setPlants(plantsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/skus`, formData, getAuthHeaders());
      toast.success('SKU created');
      setDialogOpen(false);
      setFormData({ code: '', name: '', description: '', unit: 'kg', category: '', plant_id: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create');
    }
  };

  const getPlantName = (id) => plants.find(p => p.id === id)?.name || '-';

  return (
    <div className="space-y-6" data-testid="skus-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">SKUs</h1>
          <p className="text-muted-foreground mt-1">Manage Stock Keeping Units / Products</p>
        </div>
        {hasRole(['master_steward']) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-animate bg-primary" data-testid="add-sku-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add SKU
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add SKU</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="label-style">Code</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="SKU001"
                      required
                      data-testid="sku-code-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-style">Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Product A"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="label-style">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description..."
                    rows={2}
                  />
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
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary" data-testid="submit-sku-btn">Create SKU</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : skus.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No SKUs found</p>
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
                  <th>Plant</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {skus.map((sku) => (
                  <tr key={sku.id} data-testid={`sku-row-${sku.code}`}>
                    <td className="font-mono text-sm">{sku.code}</td>
                    <td className="font-medium">{sku.name}</td>
                    <td>{sku.category}</td>
                    <td>{sku.unit}</td>
                    <td>{getPlantName(sku.plant_id)}</td>
                    <td><Badge className="status-active text-xs">{sku.status}</Badge></td>
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

export default SKUs;
