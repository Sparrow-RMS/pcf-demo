import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  FlaskConical, 
  Package, 
  Users, 
  Leaf,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const COLORS = ['#0F2F24', '#FF5722', '#10B981', '#F59E0B', '#6366F1'];

const Dashboard = () => {
  const { getAuthHeaders } = useAuth();
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, trendsRes, hotspotsRes, suppliersRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/summary`, getAuthHeaders()),
        axios.get(`${API_URL}/dashboard/pcf-trends?days=${timeRange}`, getAuthHeaders()),
        axios.get(`${API_URL}/dashboard/hotspots`, getAuthHeaders()),
        axios.get(`${API_URL}/dashboard/supplier-rankings`, getAuthHeaders())
      ]);
      setSummary(summaryRes.data);
      setTrends(trendsRes.data);
      setHotspots(hotspotsRes.data);
      setSuppliers(suppliersRes.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="grid-card h-32 skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { 
      label: 'Total Batches', 
      value: summary?.total_batches || 0, 
      icon: FlaskConical,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    { 
      label: 'Open Batches', 
      value: summary?.open_batches || 0, 
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    { 
      label: 'Raw Materials', 
      value: summary?.raw_materials || 0, 
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Avg PCF', 
      value: `${summary?.average_pcf || 0}`, 
      unit: 'kgCO2e',
      icon: Leaf,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground mt-1">PCF Performance Overview</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40" data-testid="time-range-select">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="grid-card" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="label-style mb-2">{stat.label}</p>
                  <p className="kpi-value text-3xl">
                    {stat.value}
                    {stat.unit && <span className="text-base font-normal text-muted-foreground ml-1">{stat.unit}</span>}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PCF Trends */}
        <Card className="grid-card p-0">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg">PCF Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(val) => val.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="pcf_value" 
                    name="PCF (kgCO2e)"
                    stroke="#0F2F24" 
                    strokeWidth={2}
                    dot={{ fill: '#0F2F24', strokeWidth: 0, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hotspots */}
        <Card className="grid-card p-0">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg">Emission Hotspots</CardTitle>
          </CardHeader>
          <CardContent>
            {hotspots.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={240}>
                  <PieChart>
                    <Pie
                      data={hotspots}
                      dataKey="percentage"
                      nameKey="component"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {hotspots.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {hotspots.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-sm" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="flex-1 text-sm capitalize">{item.component}</span>
                      <span className="font-mono text-sm font-medium">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No hotspot data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier Rankings */}
      <Card className="grid-card p-0">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-lg">Top Supplier Contributors</CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={suppliers.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis 
                  dataKey="supplier_name" 
                  type="category" 
                  tick={{ fontSize: 12 }} 
                  width={120}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="contribution" 
                  name="Contribution"
                  fill="#0F2F24" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No supplier data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
