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
  const [bomCode, setBomCode] = useState('');
  const [bomName, setBomName] = useState('');
  const [outputSkuId, setOutputSkuId] = useState('');
  const [bomLines, setBomLines] = useState([]);
  const [newLineType, setNewLineType] = useState('raw_material');
  const [newLineItemId, setNewLineItemId] = useState('');
  const [newLineQty, setNewLineQty] = useState('');
  const [newLineRecovery, setNewLineRecovery] = useState('0');
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState(null);


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = getAuthHeaders();
      const bomsRes = await axios.get(`${API_URL}/boms`, headers);
      const skusRes = await axios.get(`${API_URL}/skus`, headers);
      const rmRes = await axios.get(`${API_URL}/raw-materials?status=active`, headers);
      setBOMs(bomsRes.data);
      setSKUs(skusRes.data);
      setRawMaterials(rmRes.data);
    } catch (err) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    if (!newLineItemId || !newLineQty) {
      toast.error('Please fill in item and quantity');
      return;
    }
    const line = {
      item_type: newLineType,
      item_id: newLineItemId,
      quantity: parseFloat(newLineQty),
      unit: 'kg',
      recovery_rate: parseFloat(newLineRecovery || 0)
    };
    setBomLines([...bomLines, line]);
    setNewLineItemId('');
    setNewLineQty('');
    setNewLineRecovery('0');
  };

  const handleRemoveLine = (index) => {
    setBomLines(bomLines.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (bomLines.length === 0) {
      toast.error('Please add at least one BOM line');
      return;
    }
    try {
      const data = {
        code: bomCode,
        name: bomName,
        output_sku_id: outputSkuId,
        lines: bomLines,
        co_products: []
      };
      await axios.post(`${API_URL}/boms`, data, getAuthHeaders());
      toast.success('BOM created');
      setDialogOpen(false);
      setBomCode('');
      setBomName('');
      setOutputSkuId('');
      setBomLines([]);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create');
    }
  };

  const handleActivate = async (id) => {
    try {
      await axios.put(`${API_URL}/boms/${id}/activate`, {}, getAuthHeaders());
      toast.success('BOM activated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to activate');
    }
  };

  const handleView = async (bom) => {
    try {
      const res = await axios.get(`${API_URL}/boms/${bom.id}`, getAuthHeaders());
      setSelectedBOM(res.data);
      setViewOpen(true);
    } catch {
      toast.error("Failed to fetch BOM details");
    }
  };

  const getSKUName = (id) => {
    const found = skus.find(s => s.id === id);
    return found ? found.name : id;
  };

  const getRMName = (id) => {
    const found = rawMaterials.find(r => r.id === id);
    return found ? found.name : id;
  };

  const getStatusBadge = (status) => {
    if (status === 'draft') return <Badge className="status-draft text-xs">{status}</Badge>;
    if (status === 'active') return <Badge className="status-active text-xs">{status}</Badge>;
    return <Badge className="text-xs">{status}</Badge>;
  };

  const itemOptions = newLineType === 'raw_material' 
    ? rawMaterials 
    : skus.filter(s => s.category === 'Intermediate');

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
                      value={bomCode}
                      onChange={(e) => setBomCode(e.target.value)}
                      placeholder="BOM001"
                      required
                      data-testid="bom-code-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-style">Name</Label>
                    <Input
                      value={bomName}
                      onChange={(e) => setBomName(e.target.value)}
                      placeholder="Product A Recipe"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="label-style">Output SKU</Label>
                  <Select value={outputSkuId} onValueChange={setOutputSkuId}>
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

                <div className="space-y-4">
                  <Label className="label-style">BOM Lines</Label>
                  
                  {bomLines.length > 0 && (
                    <div className="border rounded-md divide-y">
                      {bomLines.map((line, idx) => (
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

                  <div className="grid grid-cols-5 gap-2 items-end border rounded-md p-3 bg-zinc-50">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={newLineType} onValueChange={(v) => { setNewLineType(v); setNewLineItemId(''); }}>
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
                      <Select value={newLineItemId} onValueChange={setNewLineItemId}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {itemOptions.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        value={newLineQty}
                        onChange={(e) => setNewLineQty(e.target.value)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Recovery %</Label>
                      <Input
                        type="number"
                        value={newLineRecovery}
                        onChange={(e) => setNewLineRecovery(e.target.value)}
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
                      <td className="flex gap-2">
                          {/* VIEW BUTTON */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => handleView(bom)}
                          >
                            View
                          </Button>
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
      {/* SIMPLE VIEW POPUP */}
      {viewOpen && selectedBOM && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-lg p-6 w-[500px] shadow-xl">

            <h2 className="text-xl font-bold mb-4">BOM Details</h2>

            <p><b>Code:</b> {selectedBOM.code}</p>
            <p><b>Name:</b> {selectedBOM.name}</p>
            <p><b>Output SKU:</b> {getSKUName(selectedBOM.output_sku_id)}</p>
            <p><b>Version:</b> v{selectedBOM.version}</p>
            <p><b>Status:</b> {selectedBOM.status}</p>

            <div className="mt-4">
              <b>Items:</b>

              {selectedBOM.lines?.map((line, i) => (
                <div key={i} className="border p-3 mt-2 rounded">

                  {/* ITEM NAME */}
                  <div className="font-medium">
                    {line.item_type === 'raw_material'
                      ? getRMName(line.item_id)
                      : getSKUName(line.item_id)}
                  </div>

                  {/* TYPE */}
                  <div className="text-sm text-gray-600">
                    Type: {line.item_type === 'raw_material' ? 'Raw Material' : 'Intermediate SKU'}
                  </div>

                  {/* QTY */}
                  <div className="text-sm text-gray-600">
                    Qty: {line.quantity} {line.unit}
                  </div>

                  {/* RECOVERY */}
                  <div className="text-sm text-green-600">
                    Recovery: {line.recovery_rate || 0}%
                  </div>

                </div>
              ))}

            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={() => setViewOpen(false)}>Close</Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default BOMs;
