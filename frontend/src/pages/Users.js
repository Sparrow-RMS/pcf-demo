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
import { Plus, Users, Shield, Ban, Check } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const UserManagement = () => {
  const { getAuthHeaders, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'batch_operator'
  });

  const roles = [
    { value: 'superadmin', label: 'Super Admin', color: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'master_approver', label: 'Master Approver', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'master_steward', label: 'Data Steward', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'esg_analyst', label: 'ESG Analyst', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { value: 'batch_operator', label: 'Batch Operator', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'auditor', label: 'Auditor', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`, getAuthHeaders());
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/auth/register`, formData, getAuthHeaders());
      toast.success('User created');
      setDialogOpen(false);
      setFormData({ email: '', password: '', name: '', role: 'batch_operator' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`${API_URL}/users/${userId}/role?role=${newRole}`, {}, getAuthHeaders());
      toast.success('Role updated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await axios.put(`${API_URL}/users/${userId}/status?is_active=${!currentStatus}`, {}, getAuthHeaders());
      toast.success(currentStatus ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = roles.find(r => r.value === role);
    return (
      <Badge className={`${roleConfig?.color || 'bg-zinc-50 text-zinc-700'} text-xs border`}>
        {roleConfig?.label || role}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" data-testid="users-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage system users and their roles</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-animate bg-primary" data-testid="add-user-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="label-style">Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                  data-testid="user-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="label-style">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                  data-testid="user-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="label-style">Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label className="label-style">Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary" data-testid="submit-user-btn">Create User</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Legend */}
      <div className="grid-card p-4">
        <p className="label-style mb-3">Role Permissions</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-600" />
            <span><strong>Super Admin:</strong> Full access</span>
          </div>
          <div className="flex items-center gap-2">
            <span><strong>Master Approver:</strong> Activate/Approve records</span>
          </div>
          <div className="flex items-center gap-2">
            <span><strong>Data Steward:</strong> Create/Edit master data</span>
          </div>
          <div className="flex items-center gap-2">
            <span><strong>ESG Analyst:</strong> Emission factors</span>
          </div>
          <div className="flex items-center gap-2">
            <span><strong>Batch Operator:</strong> Production batches</span>
          </div>
          <div className="flex items-center gap-2">
            <span><strong>Auditor:</strong> View audit logs</span>
          </div>
        </div>
      </div>

      <div className="grid-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} data-testid={`user-row-${u.email}`}>
                    <td className="font-medium">{u.name}</td>
                    <td className="text-muted-foreground">{u.email}</td>
                    <td>
                      <Select 
                        value={u.role} 
                        onValueChange={(v) => handleRoleChange(u.id, v)}
                        disabled={u.id === currentUser?.id}
                      >
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue>{getRoleBadge(u.role)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map(role => (
                            <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td>
                      <Badge className={u.is_active ? 'status-active' : 'status-draft'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      {u.id !== currentUser?.id && (
                        <Button 
                          size="sm" 
                          variant={u.is_active ? 'destructive' : 'outline'}
                          onClick={() => handleStatusToggle(u.id, u.is_active)}
                          className="h-8"
                        >
                          {u.is_active ? (
                            <>
                              <Ban className="w-4 h-4 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Activate
                            </>
                          )}
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

export default UserManagement;
