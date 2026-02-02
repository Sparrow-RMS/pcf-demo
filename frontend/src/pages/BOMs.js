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
import { Plus, FileText, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const BOMs = () => {
  const { getAuthHeaders, hasRole } = useAuth();
  const [boms, setBOMs] = useState([]);
  const [skus, setSKUs] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    output_sku_id: '',
    lines: [],
    co_products: []
  });
  const [newLine, setNewLine] = useState({
    item_type: 'raw_material',
    item_id: '',
    quantity: '',
    unit: 'kg',
    recovery_rate: '0'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bomsRes, skusRes, rmRes] = await Promise.all([
        axios.get(`${API_URL}/boms`, getAuthHeaders()),
        axios.get(`${API_URL}/skus`, getAuthHeaders()),
        axios.get(`${API_URL}/raw-materials?status=active`, getAuthHeaders())
      ]);
      setBOMs(bomsRes.data);
      setSKUs(skusRes.data);
      setRawMaterials(rmRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    if (!newLine.item_id || !newLine.quantity) {
      toast.error('Please fill in item and quantity');
      return;
    }
    setFormData({
      ...formData,
      lines: [...formData.lines, {
        ...newLine,
        quantity: parseFloat(newLine.quantity),
        recovery_rate: parseFloat(newLine.recovery_rate || 0)
      }]
    });
    setNewLine({ item_type: 'raw_material', item_id: '', quantity: '', unit: 'kg', recovery_rate: '0' });
  };

  const handleRemoveLine = (index) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.lines.length === 0) {
      toast.error('Please add at least one BOM line');
      return;
    }
    try {
      await axios.post(`${API_URL}/boms`, formData, getAuthHeaders());
      toast.success('BOM created');
      setDialogOpen(false);
      setFormData({ code: '', name: '', output_sku_id: '', lines: [], co_products: [] });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create');
    }
  };

  const handleActivate = async (id) => {
    try {
      await axios.put(`${API_URL}/boms/${id}/activate`, {}, getAuthHeaders());
      toast.success('BOM activated');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to activate');
    }
  };

  const getSKUName = (id) => skus.find(s => s.id === id)?.name || id;
  const getRMName = (id) => rawMaterials.find(r => r.id === id)?.name || id;

  const getStatusBadge = (status) => {
    const styles = { draft: 'status-draft', active: 'status-active' };
    return <Badge className={`${styles[status] || ''} text-xs`}>{status}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="boms-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">BOMs / Recipes</h1>
          <p className="text-muted-foreground mt-1">Define Bill of Materials with nested structures</p>
        </div>
        {hasRole(['master_steward']) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-animate bg-primary" data-testid="add-bom-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create BOM
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create BOM / Recipe</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="label-style">Code</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="BOM001"
                      required
                      data-testid="bom-code-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-style">Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Product A Recipe"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="label-style">Output SKU</Label>
                  <Select value={formData.output_sku_id} onValueChange={(v) => setFormData({ ...formData, output_sku_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select output product" />
                    </SelectTrigger>
                    <SelectContent>
                      {skus.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* BOM Lines */}
                <div className="space-y-4">
                  <Label className="label-style">BOM Lines</Label>
                  
                  {/* Existing lines */}
                  {formData.lines.length > 0 && (
                    <div className="border rounded-md divide-y">
                      {formData.lines.map((line, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 text-sm">
                          <div className="flex-1">
                            <span className="font-medium">
                              {line.item_type === 'raw_material' ? getRMName(line.item_id) : getSKUName(line.item_id)}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              {line.quantity} {line.unit}
                            </span>
                            {line.recovery_rate > 0 && (
                              <span className="text-emerald-600 ml-2">({line.recovery_rate}% recovery)</span>
                            )}
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveLine(idx)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new line */}
                  <div className="grid grid-cols-5 gap-2 items-end border rounded-md p-3 bg-zinc-50">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={newLine.item_type} onValueChange={(v) => setNewLine({ ...newLine, item_type: v, item_id: '' })}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="raw_material">Raw Material</SelectItem>
                          <SelectItem value="intermediate_sku">Intermediate SKU</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Item</Label>
                      <Select value={newLine.item_id} onValueChange={(v) => setNewLine({ ...newLine, item_id: v })}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {newLine.item_type === 'raw_material'
                            ? rawMaterials.map(rm => <SelectItem key={rm.id} value={rm.id}>{rm.name}</SelectItem>)
                            : skus.filter(s => s.category === 'Intermediate').map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        value={newLine.quantity}
                        onChange={(e) => setNewLine({ ...newLine, quantity: e.target.value })}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Recovery %</Label>
                      <Input
                        type="number"
                        value={newLine.recovery_rate}
                        onChange={(e) => setNewLine({ ...newLine, recovery_rate: e.target.value })}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <Button type="button" onClick={handleAddLine} size="sm" className="h-9">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary" data-testid="submit-bom-btn">Create BOM</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : boms.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No BOMs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Output SKU</th>
                  <th>Lines</th>
                  <th>Version</th>
                  <th>Status</th>
                  {hasRole(['master_approver']) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {boms.map((bom) => (
                  <tr key={bom.id} data-testid={`bom-row-${bom.code}`}>
                    <td className="font-mono text-sm">{bom.code}</td>
                    <td className="font-medium">{bom.name}</td>
                    <td>{getSKUName(bom.output_sku_id)}</td>
                    <td>{bom.lines?.length || 0} items</td>
                    <td>v{bom.version}</td>
                    <td>{getStatusBadge(bom.status)}</td>
                    {hasRole(['master_approver']) && (
                      <td>
                        {bom.status === 'draft' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleActivate(bom.id)}
                            className="h-8"
                            data-testid={`activate-bom-${bom.code}`}
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

export default BOMs;
