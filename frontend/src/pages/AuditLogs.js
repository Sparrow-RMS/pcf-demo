import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { ClipboardList, Download, Search } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const AuditLogs = () => {
  const { getAuthHeaders } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [searchId, setSearchId] = useState('');

  const entityTypes = ['emission_factor', 'raw_material', 'batch', 'bom', 'supplier', 'certificate', 'user'];

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  const fetchLogs = async () => {
    try {
      let url = `${API_URL}/audit-logs`;
      if (entityFilter !== 'all') {
        url += `?entity_type=${entityFilter}`;
      }
      const response = await axios.get(url, getAuthHeaders());
      setLogs(response.data);
    } catch (error) {
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchId.trim()) {
      fetchLogs();
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/audit-logs?entity_id=${searchId}`, getAuthHeaders());
      setLogs(response.data);
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const exportAuditPack = async (batchId) => {
    try {
      const response = await axios.get(`${API_URL}/audit-export/${batchId}`, getAuthHeaders());
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_pack_${batchId}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Audit pack exported');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const getActionBadge = (action) => {
    const colors = {
      create: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      activate: 'bg-blue-50 text-blue-700 border-blue-200',
      close: 'bg-amber-50 text-amber-700 border-amber-200',
      approve: 'bg-purple-50 text-purple-700 border-purple-200',
      upload: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      new_version: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };
    return <Badge className={`${colors[action] || 'bg-zinc-50 text-zinc-700'} text-xs border`}>{action}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="audit-logs-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">Complete audit trail of all system changes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entityTypes.map(type => (
              <SelectItem key={type} value={type} className="capitalize">{type.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input
            placeholder="Search by Entity ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="w-64"
          />
          <Button variant="outline" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Changes</th>
                  <th>Export</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} data-testid={`log-row-${log.id}`}>
                    <td className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="capitalize">{log.entity_type.replace('_', ' ')}</td>
                    <td className="font-mono text-xs">{log.entity_id.slice(0, 12)}...</td>
                    <td>{getActionBadge(log.action)}</td>
                    <td className="text-sm">{log.user_email}</td>
                    <td className="max-w-xs">
                      <pre className="text-xs bg-zinc-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.changes, null, 1).slice(0, 100)}...
                      </pre>
                    </td>
                    <td>
                      {log.entity_type === 'batch' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => exportAuditPack(log.entity_id)}
                          className="h-8"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
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

export default AuditLogs;
