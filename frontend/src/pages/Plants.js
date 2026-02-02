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
import { Plus, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Plants = () => {
  const { getAuthHeaders, hasRole } = useAuth();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    country: '',
    timezone: 'UTC'
  });

  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    try {
      const response = await axios.get(`${API_URL}/plants`, getAuthHeaders());
      setPlants(response.data);
    } catch (error) {
      toast.error('Failed to fetch plants');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/plants`, formData, getAuthHeaders());
      toast.success('Plant created');
      setDialogOpen(false);
      setFormData({ code: '', name: '', location: '', country: '', timezone: 'UTC' });
      fetchPlants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create');
    }
  };

  return (
    <div className="space-y-6" data-testid="plants-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">Plants</h1>
          <p className="text-muted-foreground mt-1">Manage manufacturing facilities</p>
        </div>
        {hasRole(['master_steward']) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-animate bg-primary" data-testid="add-plant-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Plant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Plant</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="label-style">Code</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="PLT001"
                      required
                      data-testid="plant-code-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-style">Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Main Production Site"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="label-style">Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Frankfurt"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="label-style">Country</Label>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Germany"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-style">Timezone</Label>
                    <Input
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      placeholder="Europe/Berlin"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary" data-testid="submit-plant-btn">Create Plant</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : plants.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No plants found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Country</th>
                  <th>Timezone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {plants.map((p) => (
                  <tr key={p.id} data-testid={`plant-row-${p.code}`}>
                    <td className="font-mono text-sm">{p.code}</td>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.location}</td>
                    <td>{p.country}</td>
                    <td className="font-mono text-sm">{p.timezone}</td>
                    <td><Badge className="status-active text-xs">{p.status}</Badge></td>
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

export default Plants;
