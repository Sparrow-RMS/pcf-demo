import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import { 
  ArrowLeft, 
  Plus, 
  Leaf, 
  Package, 
  Zap, 
  FlaskConical,
  CheckCircle,
  Lock,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const BatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders, hasRole } = useAuth();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [skus, setSKUs] = useState([]);
  const [machines, setMachines] = useState([]);
  const [utilitySources, setUtilitySources] = useState([]);
  
  const [inputDialogOpen, setInputDialogOpen] = useState(false);
  const [outputDialogOpen, setOutputDialogOpen] = useState(false);
  const [energyDialogOpen, setEnergyDialogOpen] = useState(false);
  
  const [inputRmId, setInputRmId] = useState('');
  const [inputQty, setInputQty] = useState('');
  const [outputSkuId, setOutputSkuId] = useState('');
  const [outputQty, setOutputQty] = useState('');
  const [energyMachineId, setEnergyMachineId] = useState('');
  const [energyUtilityId, setEnergyUtilityId] = useState('');
  const [energyQty, setEnergyQty] = useState('');
  const [energyType, setEnergyType] = useState('metered');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const headers = getAuthHeaders();
      const batchRes = await axios.get(`${API_URL}/batches/${id}`, headers);
      const rmRes = await axios.get(`${API_URL}/raw-materials?status=active`, headers);
      const skuRes = await axios.get(`${API_URL}/skus`, headers);
      const machineRes = await axios.get(`${API_URL}/machines`, headers);
      const utilityRes = await axios.get(`${API_URL}/utility-sources`, headers);
      setBatch(batchRes.data);
      setRawMaterials(rmRes.data);
      setSKUs(skuRes.data);
      setMachines(machineRes.data);
      setUtilitySources(utilityRes.data);
    } catch (err) {
      toast.error('Failed to fetch batch data');
      navigate('/batches');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInput = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${API_URL}/batches/${id}/inputs`, {
        raw_material_id: inputRmId,
        quantity: parseFloat(inputQty)
      }, getAuthHeaders());
      toast.success(`Input added. PCF: ${response.data.pcf_value}`);
      setInputDialogOpen(false);
      setInputRmId('');
      setInputQty('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add input');
    }
  };

  const handleAddOutput = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${API_URL}/batches/${id}/outputs`, {
        sku_id: outputSkuId,
        quantity: parseFloat(outputQty)
      }, getAuthHeaders());
      toast.success(`Output added. PCF: ${response.data.pcf_value}`);
      setOutputDialogOpen(false);
      setOutputSkuId('');
      setOutputQty('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add output');
    }
  };

  const handleAddEnergy = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${API_URL}/batches/${id}/energy`, {
        machine_id: energyMachineId,
        utility_source_id: energyUtilityId,
        quantity: parseFloat(energyQty),
        measurement_type: energyType
      }, getAuthHeaders());
      toast.success(`Energy added. PCF: ${response.data.pcf_value}`);
      setEnergyDialogOpen(false);
      setEnergyMachineId('');
      setEnergyUtilityId('');
      setEnergyQty('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add energy');
    }
  };

  const handleCloseBatch = async () => {
    try {
      await axios.put(`${API_URL}/batches/${id}/close`, {}, getAuthHeaders());
      toast.success('Batch closed');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to close batch');
    }
  };

  const handleApproveBatch = async () => {
    try {
      await axios.put(`${API_URL}/batches/${id}/approve`, {}, getAuthHeaders());
      toast.success('Batch approved');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to approve batch');
    }
  };

  const handleGenerateCertificate = async () => {
    try {
      await axios.post(`${API_URL}/batches/${id}/certificate`, {}, getAuthHeaders());
      toast.success('Certificate generated');
      navigate('/certificates');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate certificate');
    }
  };

  const getRMName = (rmId) => {
    const found = rawMaterials.find(r => r.id === rmId);
    return found ? found.name : rmId;
  };

  const getSKUName = (skuId) => {
    const found = skus.find(s => s.id === skuId);
    return found ? found.name : skuId;
  };

  const getMachineName = (mId) => {
    const found = machines.find(m => m.id === mId);
    return found ? found.name : mId;
  };

  const getStatusBadge = (status) => {
    if (status === 'open') return <Badge className="status-open text-xs">{status}</Badge>;
    if (status === 'closed') return <Badge className="status-closed text-xs">{status}</Badge>;
    if (status === 'approved') return <Badge className="status-approved text-xs">{status}</Badge>;
    return <Badge className="text-xs">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!batch) return null;

  const batchInputs = batch.inputs || [];
  const batchOutputs = batch.outputs || [];
  const batchEnergy = batch.energy || [];

  return (
    <div className="space-y-6" data-testid="batch-detail-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/batches')} className="h-9 w-9 p-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">{batch.batch_number}</h1>
              {getStatusBadge(batch.status)}
              {batch.pcf_provisional && <Badge variant="outline" className="text-xs">Provisional</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">Started: {new Date(batch.start_time).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {batch.status === 'open' && hasRole(['batch_operator']) && (
            <Button variant="outline" onClick={handleCloseBatch} data-testid="close-batch-btn">
              <Lock className="w-4 h-4 mr-2" />
              Close Batch
            </Button>
          )}
          {batch.status === 'closed' && hasRole(['master_approver']) && (
            <Button onClick={handleApproveBatch} className="bg-emerald-600 hover:bg-emerald-700" data-testid="approve-batch-btn">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          )}
          {batch.status === 'approved' && hasRole(['master_approver']) && (
            <Button onClick={handleGenerateCertificate} className="bg-primary" data-testid="generate-cert-btn">
              <Award className="w-4 h-4 mr-2" />
              Generate Certificate
            </Button>
          )}
        </div>
      </div>

      <Card className="grid-card bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-style mb-2">Product Carbon Footprint</p>
              <p className="kpi-value text-4xl text-primary">
                {batch.pcf_value?.toFixed(4) || '0.0000'}
                <span className="text-lg font-normal text-muted-foreground ml-2">kgCO2e/unit</span>
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Leaf className="w-8 h-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="grid-card p-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Inputs
            </CardTitle>
            {batch.status === 'open' && hasRole(['batch_operator']) && (
              <Dialog open={inputDialogOpen} onOpenChange={setInputDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8" data-testid="add-input-btn">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Input</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddInput} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="label-style">Raw Material</Label>
                      <Select value={inputRmId} onValueChange={setInputRmId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          {rawMaterials.map(rm => (
                            <SelectItem key={rm.id} value={rm.id}>{rm.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="label-style">Quantity</Label>
                      <Input
                        type="number"
                        value={inputQty}
                        onChange={(e) => setInputQty(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setInputDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" className="bg-primary">Add Input</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {batchInputs.length > 0 ? (
              <div className="space-y-2">
                {batchInputs.map((inp, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-zinc-50 rounded text-sm">
                    <span>{getRMName(inp.raw_material_id)}</span>
                    <span className="font-mono">{inp.quantity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No inputs recorded</p>
            )}
          </CardContent>
        </Card>

        <Card className="grid-card p-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <FlaskConical className="w-5 h-5" />
              Outputs
            </CardTitle>
            {batch.status === 'open' && hasRole(['batch_operator']) && (
              <Dialog open={outputDialogOpen} onOpenChange={setOutputDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8" data-testid="add-output-btn">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Output</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddOutput} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="label-style">SKU</Label>
                      <Select value={outputSkuId} onValueChange={setOutputSkuId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select SKU" />
                        </SelectTrigger>
                        <SelectContent>
                          {skus.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="label-style">Quantity</Label>
                      <Input
                        type="number"
                        value={outputQty}
                        onChange={(e) => setOutputQty(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setOutputDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" className="bg-primary">Add Output</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {batchOutputs.length > 0 ? (
              <div className="space-y-2">
                {batchOutputs.map((out, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-zinc-50 rounded text-sm">
                    <span>{getSKUName(out.sku_id)}</span>
                    <span className="font-mono">{out.quantity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No outputs recorded</p>
            )}
          </CardContent>
        </Card>

        <Card className="grid-card p-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Energy
            </CardTitle>
            {batch.status === 'open' && hasRole(['batch_operator']) && (
              <Dialog open={energyDialogOpen} onOpenChange={setEnergyDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8" data-testid="add-energy-btn">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Energy Consumption</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddEnergy} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="label-style">Machine</Label>
                      <Select value={energyMachineId} onValueChange={setEnergyMachineId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select machine" />
                        </SelectTrigger>
                        <SelectContent>
                          {machines.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="label-style">Utility Source</Label>
                      <Select value={energyUtilityId} onValueChange={setEnergyUtilityId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select utility" />
                        </SelectTrigger>
                        <SelectContent>
                          {utilitySources.map(us => (
                            <SelectItem key={us.id} value={us.id}>{us.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="label-style">Quantity (kWh/hrs)</Label>
                        <Input
                          type="number"
                          value={energyQty}
                          onChange={(e) => setEnergyQty(e.target.value)}
                          placeholder="0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="label-style">Type</Label>
                        <Select value={energyType} onValueChange={setEnergyType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="metered">Metered</SelectItem>
                            <SelectItem value="calculated">Calculated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setEnergyDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" className="bg-primary">Add Energy</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {batchEnergy.length > 0 ? (
              <div className="space-y-2">
                {batchEnergy.map((e, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-zinc-50 rounded text-sm">
                    <span>{getMachineName(e.machine_id)}</span>
                    <span className="font-mono">{e.quantity} kWh</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No energy recorded</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BatchDetail;
