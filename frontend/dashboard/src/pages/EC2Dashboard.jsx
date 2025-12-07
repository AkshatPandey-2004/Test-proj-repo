import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { 
  Server, Cpu, Activity, HardDrive, Network, Zap, TrendingUp, AlertCircle,
  RefreshCw, Home, ChevronRight, Clock, BarChart3, Database, Gauge,
  Thermometer, Wifi, GitBranch, DollarSign, CheckCircle, XCircle,
  ArrowUp, ArrowDown, Minus, AlertTriangle, Info, Shield
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
  ComposedChart, Scatter, ScatterChart, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, ReferenceLine
} from 'recharts';

const API_GATEWAY_URL = "http://localhost:3003";
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#FF6B9D', '#C084FC'];

const EC2Dashboard = ({ userId, initialRegion, onLogout }) => {
  const navigate = useNavigate();
  const [instances, setInstances] = useState([]);
  const [region, setRegion] = useState(initialRegion || "us-east-1");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30m');
  
  // Time-series data storage
  const [cpuHistoryData, setCpuHistoryData] = useState([]);
  const [memoryHistoryData, setMemoryHistoryData] = useState([]);
  const [networkHistoryData, setNetworkHistoryData] = useState([]);
  const [diskHistoryData, setDiskHistoryData] = useState([]);
  const [requestsHistoryData, setRequestsHistoryData] = useState([]);
  
  const [metrics, setMetrics] = useState({
    totalInstances: 0,
    runningInstances: 0,
    avgCpu: 0,
    totalS3Buckets: 0,
    totalRDS: 0,
    totalLambda: 0,
    totalEBS: 0,
  });

  const awsRegions = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'Europe (Ireland)' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
    { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' }
  ];

  const timeRanges = [
    { value: '5m', label: 'Last 5 min', points: 10 },
    { value: '15m', label: 'Last 15 min', points: 30 },
    { value: '30m', label: 'Last 30 min', points: 60 },
    { value: '1h', label: 'Last 1 hour', points: 120 },
    { value: '6h', label: 'Last 6 hours', points: 360 },
    { value: '24h', label: 'Last 24 hours', points: 288 },
  ];

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedEmail = localStorage.getItem('email');
    if (storedUsername) setUsername(storedUsername);
    if (storedEmail) setEmail(storedEmail);
  }, []);

  const fetchEC2Data = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = `${API_GATEWAY_URL}/api/data/metrics/${userId}? region=${region}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Failed to fetch EC2 data');
      
      const data = await res.json();
      const ec2Data = data.resources.ec2 || [];
      setInstances(ec2Data);
      
      const timestamp = new Date(). toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Calculate comprehensive metrics
      const runningInstances = ec2Data. filter(i => i.state === 'running');
      
      // CPU Metrics
      const cpuValues = ec2Data.map(i => parseFloat(i.metrics. cpuUtilization) || 0). filter(v => ! isNaN(v));
      const avgCpu = cpuValues.length > 0 ? cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length : 0;
      const maxCpu = cpuValues.length > 0 ? Math.max(...cpuValues) : 0;
      const minCpu = cpuValues.length > 0 ? Math.min(...cpuValues) : 0;
      const p95Cpu = cpuValues. length > 0 ? cpuValues.sort((a, b) => b - a)[Math.floor(cpuValues.length * 0.05)] || maxCpu : 0;

      // Simulated Memory Metrics (in production, fetch from CloudWatch)
      const avgMemory = 45 + Math.random() * 30; // 45-75%
      const maxMemory = avgMemory + 15;
      const minMemory = avgMemory - 10;

      // Network Metrics
      const totalNetworkIn = ec2Data.reduce((sum, i) => sum + (parseFloat(i.metrics.networkIn) || 0), 0);
      const totalNetworkOut = ec2Data.reduce((sum, i) => sum + (parseFloat(i.metrics.networkOut) || 0), 0);
      const networkThroughput = totalNetworkIn + totalNetworkOut;

      // Simulated Disk I/O (in production, fetch from CloudWatch)
      const diskReadOps = Math.floor(Math.random() * 500) + 100;
      const diskWriteOps = Math.floor(Math.random() * 300) + 50;
      const diskReadThroughput = Math.floor(Math.random() * 50) + 10; // MB/s
      const diskWriteThroughput = Math.floor(Math.random() * 30) + 5;

      // Simulated Request Rate
      const requestRate = Math.floor(Math.random() * 1000) + 200;
      const errorRate = Math.floor(Math. random() * 10);
      const responseTime = 50 + Math.random() * 150; // ms

      // Update time-series data
      setCpuHistoryData(prev => {
        const updated = [...prev, { 
          time: timestamp,
          avg: parseFloat(avgCpu.toFixed(2)),
          max: parseFloat(maxCpu.toFixed(2)),
          min: parseFloat(minCpu.toFixed(2)),
          p95: parseFloat(p95Cpu. toFixed(2)),
          threshold: 80
        }];
        return updated.slice(-60); // Keep last 60 points
      });

      setMemoryHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          avg: parseFloat(avgMemory.toFixed(2)),
          max: parseFloat(maxMemory.toFixed(2)),
          min: parseFloat(minMemory.toFixed(2)),
          threshold: 85
        }];
        return updated.slice(-60);
      });

      setNetworkHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          inbound: parseFloat(totalNetworkIn.toFixed(2)),
          outbound: parseFloat(totalNetworkOut.toFixed(2)),
          total: parseFloat(networkThroughput.toFixed(2))
        }];
        return updated.slice(-60);
      });

      setDiskHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          readOps: diskReadOps,
          writeOps: diskWriteOps,
          readThroughput: diskReadThroughput,
          writeThroughput: diskWriteThroughput
        }];
        return updated.slice(-60);
      });

      setRequestsHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          requests: requestRate,
          errors: errorRate,
          responseTime: parseFloat(responseTime.toFixed(2))
        }];
        return updated.slice(-60);
      });
      
      setMetrics({
        totalInstances: ec2Data.length,
        runningInstances: runningInstances.length,
        avgCpu: avgCpu.toFixed(2),
        totalS3Buckets: (data.resources.s3 || []).length,
        totalRDS: (data.resources.rds || []).length,
        totalLambda: (data.resources.lambda || []).length,
        totalEBS: (data. resources.ebs || []).length,
      });
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching EC2 data:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleRegionChange = async (newRegion) => {
    setRegion(newRegion);
    setInstances([]);
    setCpuHistoryData([]);
    setMemoryHistoryData([]);
    setNetworkHistoryData([]);
    setDiskHistoryData([]);
    setRequestsHistoryData([]);
    localStorage.setItem('region', newRegion);
    
    try {
      await fetch(`${API_GATEWAY_URL}/api/auth/update-region`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, region: newRegion })
      });
      
      setTimeout(() => fetchEC2Data(), 2000);
    } catch (err) {
      console.error("Error updating region:", err);
    }
  };

  useEffect(() => {
    fetchEC2Data();
    const interval = setInterval(fetchEC2Data, 5000);
    return () => clearInterval(interval);
  }, [userId, region]);

  // Calculate real-time metrics
  const totalInstances = instances.length;
  const runningInstances = instances.filter(i => i.state === 'running').length;
  const stoppedInstances = instances.filter(i => i.state === 'stopped').length;
  const healthyInstances = instances.filter(i => i.state === 'running' && parseFloat(i.metrics.cpuUtilization) < 80). length;
  const unhealthyInstances = runningInstances - healthyInstances;
  
  const avgCpu = instances
    .map(i => parseFloat(i. metrics.cpuUtilization))
    .filter(v => ! isNaN(v))
    .reduce((a, b) => a + b, 0) / instances.length || 0;

  const latestCpuData = cpuHistoryData[cpuHistoryData.length - 1];
  const latestMemoryData = memoryHistoryData[memoryHistoryData. length - 1];
  const latestNetworkData = networkHistoryData[networkHistoryData. length - 1];
  const latestDiskData = diskHistoryData[diskHistoryData. length - 1];
  const latestRequestData = requestsHistoryData[requestsHistoryData.length - 1];

  // Calculate trends
  const cpuTrend = cpuHistoryData.length > 2 ? 
    latestCpuData?. avg - cpuHistoryData[cpuHistoryData.length - 10]?.avg : 0;
  const memoryTrend = memoryHistoryData.length > 2 ? 
    latestMemoryData?. avg - memoryHistoryData[memoryHistoryData.length - 10]?.avg : 0;

  // Instance distribution
  const instanceTypeDistribution = instances.reduce((acc, instance) => {
    const type = instance.instanceType || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const instanceTypeData = Object.entries(instanceTypeDistribution). map(([type, count]) => ({
    name: type,
    value: count
  }));

  // Availability Zone distribution
  const azDistribution = instances.reduce((acc, instance) => {
    const az = region + 'a'; // Simulated, in production get from instance data
    acc[az] = (acc[az] || 0) + 1;
    return acc;
  }, {});

  const azData = Object.entries(azDistribution).map(([az, count]) => ({
    name: az,
    value: count
  }));

  // CPU distribution by instance
  const cpuByInstance = instances.slice(0, 10).map(instance => ({
    name: instance.name. substring(0, 12),
    cpu: parseFloat(instance.metrics. cpuUtilization) || 0,
    instanceType: instance.instanceType,
    state: instance.state
  })). sort((a, b) => b.cpu - a.cpu);

  // Network by instance
  const networkByInstance = instances.slice(0, 10).map(instance => ({
    name: instance.name.substring(0, 10),
    inbound: parseFloat(instance.metrics.networkIn) || 0,
    outbound: parseFloat(instance.metrics. networkOut) || 0
  }));

  // Custom Grafana-style tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-xl border border-gray-700">
          <p className="text-xs text-gray-400 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-bold">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Sidebar 
        userId={userId}
        username={username}
        email={email}
        onLogout={onLogout}
        metrics={metrics}
      />

      <div className="lg:ml-72 transition-all duration-300">
        {/* Grafana-style Dark Header */}
        <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-30 shadow-lg">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm">
                <Home size={14} className="text-gray-400" />
                <ChevronRight size={12} className="text-gray-600" />
                <span className="text-gray-400 hover:text-gray-200 cursor-pointer transition-colors" onClick={() => navigate('/dashboard')}>
                  Dashboards
                </span>
                <ChevronRight size={12} className="text-gray-600" />
                <span className="text-white font-semibold">EC2 Monitoring</span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {/* Time Range */}
                <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-1. 5 bg-gray-700 border border-gray-600 text-gray-200 rounded text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                  {timeRanges.map((r) => (<option key={r.value} value={r.value}>{r. label}</option>))}
                </select>

                {/* Region */}
                <select value={region} onChange={(e) => handleRegionChange(e.target. value)}
                  className="px-3 py-1.5 bg-gray-700 border border-gray-600 text-gray-200 rounded text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                  {awsRegions. map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>

                {/* Refresh */}
                <button onClick={fetchEC2Data} disabled={loading}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 border border-gray-600"
                  title="Refresh">
                  <RefreshCw size={16} className={`text-gray-200 ${loading ? 'animate-spin' : ''}`} />
                </button>

                {/* Auto-refresh indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 border border-green-700 rounded">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-400">Live (5s)</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {/* Dashboard Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Server className="text-blue-500" size={32} />
              EC2 Infrastructure Monitoring
            </h1>
            <p className="text-gray-400 flex items-center gap-2 text-sm">
              <Clock size={14} />
              Real-time metrics • Auto-refresh every 5s • Region: {awsRegions.find(r => r.value === region)?.label}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <span className="font-semibold text-red-400">Error:</span>
                <span className="text-red-300 ml-2">{error}</span>
              </div>
            </div>
          )}

          {/* KPI Row - Grafana Stats Panel Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            {/* Total Instances */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Total Instances</span>
                <Server size={16} className="text-gray-500" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{totalInstances}</div>
              <div className="text-xs text-gray-500">{runningInstances} running</div>
            </div>

            {/* Running */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-green-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Running</span>
                <CheckCircle size={16} className="text-green-500" />
              </div>
              <div className="text-3xl font-bold text-green-400 mb-1">{runningInstances}</div>
              <div className="text-xs text-gray-500">{healthyInstances} healthy</div>
            </div>

            {/* Stopped */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-red-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Stopped</span>
                <XCircle size={16} className="text-red-500" />
              </div>
              <div className="text-3xl font-bold text-red-400 mb-1">{stoppedInstances}</div>
              <div className="text-xs text-gray-500">not in use</div>
            </div>

            {/* CPU Average */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-orange-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Avg CPU</span>
                <div className="flex items-center gap-1">
                  {cpuTrend > 0 ?  <ArrowUp size={12} className="text-red-400" /> : 
                   cpuTrend < 0 ? <ArrowDown size={12} className="text-green-400" /> : 
                   <Minus size={12} className="text-gray-500" />}
                </div>
              </div>
              <div className="text-3xl font-bold text-orange-400 mb-1">{latestCpuData?.avg?. toFixed(1) || '0.0'}%</div>
              <div className="text-xs text-gray-500">P95: {latestCpuData?.p95?.toFixed(1) || '0'}%</div>
            </div>

            {/* Memory Average */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Avg Memory</span>
                <div className="flex items-center gap-1">
                  {memoryTrend > 0 ?  <ArrowUp size={12} className="text-red-400" /> : 
                   memoryTrend < 0 ?  <ArrowDown size={12} className="text-green-400" /> : 
                   <Minus size={12} className="text-gray-500" />}
                </div>
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-1">{latestMemoryData?.avg?.toFixed(1) || '0.0'}%</div>
              <div className="text-xs text-gray-500">Max: {latestMemoryData?. max?.toFixed(1) || '0'}%</div>
            </div>

            {/* Network Throughput */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-cyan-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Network</span>
                <Network size={16} className="text-cyan-500" />
              </div>
              <div className="text-3xl font-bold text-cyan-400 mb-1">{latestNetworkData?.total?.toFixed(0) || '0'}</div>
              <div className="text-xs text-gray-500">KB/s total</div>
            </div>

            {/* Unhealthy Instances */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-yellow-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Alerts</span>
                <AlertTriangle size={16} className="text-yellow-500" />
              </div>
              <div className="text-3xl font-bold text-yellow-400 mb-1">{unhealthyInstances}</div>
              <div className="text-xs text-gray-500">high CPU</div>
            </div>

            {/* Request Rate */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-indigo-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Requests/s</span>
                <Activity size={16} className="text-indigo-500" />
              </div>
              <div className="text-3xl font-bold text-indigo-400 mb-1">{latestRequestData?.requests || '0'}</div>
              <div className="text-xs text-gray-500">{latestRequestData?.errors || '0'} errors</div>
            </div>
          </div>

          {/* Main Monitoring Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* CPU Utilization - Large Panel */}
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Cpu size={20} className="text-orange-500" />
                    CPU Utilization
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Average, Max, Min, and P95</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span className="text-gray-400">Avg</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-gray-400">Max</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-gray-400">P95</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-600 rounded"></div>
                    <span className="text-gray-400">Threshold</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cpuHistoryData}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis domain={[0, 100]} stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Threshold', fill: '#ef4444', fontSize: 10 }} />
                  <Area type="monotone" dataKey="max" stroke="#ef4444" fill="none" strokeWidth={1} dot={false} />
                  <Area type="monotone" dataKey="avg" stroke="#f97316" fill="url(#cpuGradient)" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey="p95" stroke="#3b82f6" fill="none" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                  <Area type="monotone" dataKey="min" stroke="#6b7280" fill="none" strokeWidth={0.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Memory Utilization */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Database size={20} className="text-purple-500" />
                Memory Utilization
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={memoryHistoryData}>
                  <defs>
                    <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis domain={[0, 100]} stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="avg" stroke="#a855f7" fill="url(#memGradient)" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey="max" stroke="#ec4899" fill="none" strokeWidth={1} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Network & Disk I/O Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Network Traffic */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Network size={20} className="text-cyan-500" />
                Network Traffic
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={networkHistoryData}>
                  <defs>
                    <linearGradient id="netInGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="netOutGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v} KB/s`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="inbound" stroke="#06b6d4" fill="url(#netInGrad)" strokeWidth={2} name="Inbound" />
                  <Area type="monotone" dataKey="outbound" stroke="#8b5cf6" fill="url(#netOutGrad)" strokeWidth={2} name="Outbound" />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Disk I/O */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <HardDrive size={20} className="text-green-500" />
                Disk I/O Operations
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={diskHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis yAxisId="left" stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v} MB/s`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Bar yAxisId="left" dataKey="readOps" fill="#10b981" name="Read Ops" />
                  <Bar yAxisId="left" dataKey="writeOps" fill="#f59e0b" name="Write Ops" />
                  <Line yAxisId="right" type="monotone" dataKey="readThroughput" stroke="#22c55e" strokeWidth={2} name="Read MB/s" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="writeThroughput" stroke="#fb923c" strokeWidth={2} name="Write MB/s" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Request Rate & Response Time */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Request Rate */}
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Activity size={20} className="text-indigo-500" />
                Request Rate & Errors
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={requestsHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis yAxisId="left" stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v} ms`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Bar yAxisId="left" dataKey="requests" fill="#6366f1" name="Requests/s" />
                  <Bar yAxisId="left" dataKey="errors" fill="#ef4444" name="Errors/s" />
                  <Line yAxisId="right" type="monotone" dataKey="responseTime" stroke="#22c55e" strokeWidth={2} name="Response Time" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Instance Distribution */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Server size={20} className="text-blue-500" />
                Instance Types
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={instanceTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={(entry) => entry.name}
                  >
                    {instanceTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CPU by Instance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-orange-500" />
                CPU by Instance (Top 10)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cpuByInstance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" domain={[0, 100]} stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: '10px' }} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={80} stroke="#ef4444" strokeDasharray="3 3" />
                  <Bar dataKey="cpu" fill="#f97316" radius={[0, 4, 4, 0]}>
                    {cpuByInstance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cpu > 80 ? '#ef4444' : entry.cpu > 50 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Network by Instance */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Network size={20} className="text-cyan-500" />
                Network by Instance
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={networkByInstance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Bar dataKey="inbound" fill="#06b6d4" name="Inbound (KB/s)" />
                  <Bar dataKey="outbound" fill="#8b5cf6" name="Outbound (KB/s)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Instance Details Table - Grafana Table Panel */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Database size={20} className="text-gray-400" />
              Instance Inventory
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 border-b-2 border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Instance Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Instance ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">State</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">CPU %</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Network In</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Network Out</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {instances.map((instance) => {
                    const cpuValue = parseFloat(instance.metrics.cpuUtilization) || 0;
                    const isHealthy = instance.state === 'running' && cpuValue < 80;
                    
                    return (
                      <tr key={instance.id} className="hover:bg-gray-750 transition-colors text-gray-300">
                        <td className="px-4 py-3">
                          <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'} ${isHealthy && 'animate-pulse'}`}></div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">{instance.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{instance.id}</td>
                        <td className="px-4 py-3">{instance.instanceType}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            instance.state === 'running' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                          }`}>
                            {instance.state. toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${
                                  cpuValue > 80 ? 'bg-red-500' : cpuValue > 50 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${cpuValue}%` }}
                              ></div>
                            </div>
                            <span className={`text-xs font-bold w-12 ${
                              cpuValue > 80 ? 'text-red-400' : cpuValue > 50 ? 'text-yellow-400' : 'text-green-400'
                            }`}>{cpuValue}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-cyan-400">{instance.metrics. networkIn}</td>
                        <td className="px-4 py-3 text-purple-400">{instance.metrics. networkOut}</td>
                        <td className="px-4 py-3">
                          {isHealthy ? (
                            <CheckCircle size={16} className="text-green-500" />
                          ) : (
                            <AlertTriangle size={16} className="text-red-500" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {instances.length === 0 && (
                <div className="text-center py-12">
                  <Server size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500">No EC2 instances found in {region}</p>
                </div>
              )}
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-yellow-500" />
              Active Alerts & Recommendations
            </h3>
            <div className="space-y-3">
              {instances.filter(i => parseFloat(i.metrics.cpuUtilization) > 80). length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-red-400">Critical: High CPU Usage</p>
                      <span className="text-xs text-red-500 font-mono">{new Date(). toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-red-300">
                      {instances.filter(i => parseFloat(i.metrics.cpuUtilization) > 80).length} instance(s) exceeding 80% CPU threshold.  
                      Instances: {instances.filter(i => parseFloat(i.metrics.cpuUtilization) > 80). map(i => i.name).join(', ')}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded transition-colors">Scale Up</button>
                      <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors">View Details</button>
                    </div>
                  </div>
                </div>
              )}
              
              {latestMemoryData?. avg > 85 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                  <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0. 5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-yellow-400">Warning: High Memory Usage</p>
                      <span className="text-xs text-yellow-500 font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-yellow-300">
                      Average memory utilization at {latestMemoryData?.avg?. toFixed(1)}%. Consider increasing instance memory or optimizing applications.
                    </p>
                  </div>
                </div>
              )}

              {stoppedInstances > 0 && (
                <div className="flex items-start gap-3 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                  <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-blue-400">Info: Stopped Instances</p>
                      <span className="text-xs text-blue-500 font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-blue-300">
                      {stoppedInstances} instance(s) are stopped but still incurring EBS storage costs. Consider terminating if no longer needed.
                    </p>
                  </div>
                </div>
              )}

              {avgCpu < 10 && runningInstances > 0 && (
                <div className="flex items-start gap-3 p-4 bg-green-900/30 border border-green-700 rounded-lg">
                  <TrendingUp size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-green-400">Optimization: Low CPU Utilization</p>
                      <span className="text-xs text-green-500 font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-green-300">
                      Average CPU at {avgCpu.toFixed(1)}%. Consider rightsizing to smaller instance types to reduce costs by up to 50%.
                    </p>
                    <div className="mt-2">
                      <button className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded transition-colors">View Recommendations</button>
                    </div>
                  </div>
                </div>
              )}

              {instances.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
                  <p className="text-gray-400">No active alerts.  All systems normal.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EC2Dashboard;