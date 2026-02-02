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
import { Badge } from '../components/ui/badge';
import { Plus, Users } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Suppliers = () => {
  const { getAuthHeaders, hasRole } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    country: '',
    contact_email: '',
    contact_phone: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API_URL}/suppliers`, getAuthHeaders());
      setSuppliers(response.data);
    } catch (error) {
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/suppliers`, formData, getAuthHeaders());
      toast.success('Supplier created');
      setDialogOpen(false);
      setFormData({ code: '', name: '', country: '', contact_email: '', contact_phone: '' });
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create');
    }
  };

  return (
    <div className="space-y-6" data-testid="suppliers-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Manage supplier master data</p>
        </div>
        {hasRole(['master_steward']) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-animate bg-primary" data-testid="add-supplier-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Supplier</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="label-style">Code</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="SUP001"
                      required
                      data-testid="supplier-code-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-style">Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Supplier name"
                      required
                      data-testid="supplier-name-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="label-style">Country</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Germany"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="label-style">Email</Label>
                    <Input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="contact@supplier.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-style">Phone</Label>
                    <Input
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="+49 123 456 789"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary" data-testid="submit-supplier-btn">Create Supplier</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No suppliers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Country</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} data-testid={`supplier-row-${s.code}`}>
                    <td className="font-mono text-sm">{s.code}</td>
                    <td className="font-medium">{s.name}</td>
                    <td>{s.country}</td>
                    <td className="text-muted-foreground">{s.contact_email || '-'}</td>
                    <td className="text-muted-foreground">{s.contact_phone || '-'}</td>
                    <td><Badge className="status-active text-xs">{s.status}</Badge></td>
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

export default Suppliers;
