import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  Leaf, 
  Users, 
  Truck, 
  Factory, 
  MapPin,
  Boxes,
  FileText,
  FlaskConical,
  Award,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { type: 'divider', label: 'Master Data' },
    { to: '/raw-materials', icon: Package, label: 'Raw Materials' },
    { to: '/emission-factors', icon: Leaf, label: 'Emission Factors' },
    { to: '/suppliers', icon: Users, label: 'Suppliers' },
    { to: '/transport-lanes', icon: Truck, label: 'Transport Lanes' },
    { to: '/machines', icon: Factory, label: 'Machines' },
    { to: '/plants', icon: MapPin, label: 'Plants' },
    { to: '/skus', icon: Boxes, label: 'SKUs' },
    { type: 'divider', label: 'Production' },
    { to: '/boms', icon: FileText, label: 'BOMs / Recipes' },
    { to: '/batches', icon: FlaskConical, label: 'Batches' },
    { type: 'divider', label: 'Reports' },
    { to: '/certificates', icon: Award, label: 'Certificates' },
    { to: '/audit-logs', icon: ClipboardList, label: 'Audit Logs', roles: ['auditor', 'superadmin'] },
    { to: '/users', icon: Settings, label: 'User Management', roles: ['superadmin'] },
  ];

  const roleLabels = {
    superadmin: 'Super Admin',
    master_approver: 'Master Approver',
    master_steward: 'Data Steward',
    esg_analyst: 'ESG Analyst',
    batch_operator: 'Batch Operator',
    auditor: 'Auditor'
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-zinc-200
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200">
            <div className="flex items-center gap-3">
              <img
                src="/sparrow_logo-2.png"
                alt="Sparrow Logo"
                className="h-7 max-h-7 w-auto object-contain"
              />
            </div>
            {/*<div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading font-bold text-lg text-primary">PCF Manager</span>
            </div>*/}
            <button 
              className="lg:hidden p-1 hover:bg-zinc-100 rounded"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {navItems.map((item, idx) => {
              if (item.type === 'divider') {
                return (
                  <div key={idx} className="mt-6 mb-2 px-3">
                    <span className="label-style">{item.label}</span>
                  </div>
                );
              }

              if (item.roles && !item.roles.includes(user?.role) && user?.role !== 'superadmin') {
                return null;
              }

              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-zinc-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 p-2 rounded hover:bg-zinc-100 transition-colors" data-testid="user-menu-trigger">
                  <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center">
                    <span className="font-medium text-primary">{user?.name?.charAt(0) || 'U'}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{roleLabels[user?.role] || user?.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="logout-btn">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center px-4 lg:px-6 sticky top-0 z-30">
          <button 
            className="lg:hidden p-2 -ml-2 mr-2 hover:bg-zinc-100 rounded"
            onClick={() => setSidebarOpen(true)}
            data-testid="mobile-menu-btn"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
           {/* Industry OS logo (right side) */}
          <img
            src="/industry-os.png"
            alt="Industry OS"
            className="h-11 w-auto object-contain"
          />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
