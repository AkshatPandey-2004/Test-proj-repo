import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { 
  Database, Cpu, Activity, HardDrive, Zap, TrendingUp, Shield, Clock,
  RefreshCw, Home, ChevronRight, AlertCircle, AlertTriangle, CheckCircle,
  ArrowUp, ArrowDown, Info, Users, FileText, BarChart3, Gauge, Server
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
  ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ReferenceLine
} from 'recharts';

const API_GATEWAY_URL = "http://localhost:3003";
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#FF6B9D', '#C084FC'];

const RDSDashboard = ({ userId, initialRegion, onLogout }) => {
  const navigate = useNavigate();
  const [databases, setDatabases] = useState([]);
  const [region, setRegion] = useState(initialRegion || "us-east-1");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30m');
  
  // Time-series data
  const [cpuHistoryData, setCpuHistoryData] = useState([]);
  const [connectionsHistoryData, setConnectionsHistoryData] = useState([]);
  const [iopsHistoryData, setIopsHistoryData] = useState([]);
  const [latencyHistoryData, setLatencyHistoryData] = useState([]);
  const [replicationLagData, setReplicationLagData] = useState([]);
  
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
    { value: '5m', label: 'Last 5 min' },
    { value: '15m', label: 'Last 15 min' },
    { value: '30m', label: 'Last 30 min' },
    { value: '1h', label: 'Last 1 hour' },
    { value: '6h', label: 'Last 6 hours' },
    { value: '24h', label: 'Last 24 hours' },
  ];

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedEmail = localStorage.getItem('email');
    if (storedUsername) setUsername(storedUsername);
    if (storedEmail) setEmail(storedEmail);
  }, []);

  const fetchRDSData = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = `${API_GATEWAY_URL}/api/data/metrics/${userId}? region=${region}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Failed to fetch RDS data');
      
      const data = await res.json();
      const rdsData = data.resources.rds || [];
      setDatabases(rdsData);
      
      const timestamp = new Date(). toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Calculate metrics
      const cpuValues = rdsData.map(db => parseFloat(db.metrics.cpuUtilization) || 0);
      const avgCpu = cpuValues.length > 0 ? cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length : 0;
      const maxCpu = cpuValues.length > 0 ? Math.max(...cpuValues) : 0;
      const minCpu = cpuValues. length > 0 ? Math. min(...cpuValues) : 0;
      
      const totalConnections = rdsData.reduce((sum, db) => sum + (parseInt(db.metrics.connections) || 0), 0);
      const avgConnections = rdsData.length > 0 ? totalConnections / rdsData.length : 0;
      
      // Simulated advanced metrics (in production, get from CloudWatch)
      const readIOPS = Math.floor(Math.random() * 3000) + 500;
      const writeIOPS = Math.floor(Math.random() * 2000) + 300;
      const readLatency = 1 + Math.random() * 5; // ms
      const writeLatency = 2 + Math.random() * 8; // ms
      const replicationLag = Math.floor(Math.random() * 100); // seconds
      const diskQueueDepth = Math.random() * 2;
      const networkThroughput = Math.floor(Math.random() * 100) + 20; // MB/s
      
      // Update time-series
      setCpuHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          avg: parseFloat(avgCpu.toFixed(2)),
          max: parseFloat(maxCpu.toFixed(2)),
          min: parseFloat(minCpu.toFixed(2)),
          threshold: 80
        }];
        return updated. slice(-60);
      });

      setConnectionsHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          total: totalConnections,
          avg: parseFloat(avgConnections.toFixed(0)),
          active: Math.floor(totalConnections * 0.7),
          idle: Math.floor(totalConnections * 0.3)
        }];
        return updated.slice(-60);
      });

      setIopsHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          read: readIOPS,
          write: writeIOPS,
          total: readIOPS + writeIOPS
        }];
        return updated.slice(-60);
      });

      setLatencyHistoryData(prev => {
        const updated = [... prev, {
          time: timestamp,
          readLatency: parseFloat(readLatency.toFixed(2)),
          writeLatency: parseFloat(writeLatency. toFixed(2)),
          queueDepth: parseFloat(diskQueueDepth.toFixed(2))
        }];
        return updated.slice(-60);
      });

      setReplicationLagData(prev => {
        const updated = [...prev, {
          time: timestamp,
          lag: replicationLag,
          threshold: 60
        }];
        return updated.slice(-60);
      });
      
      setMetrics({
        totalInstances: (data.resources.ec2 || []).length,
        runningInstances: (data.resources.ec2 || []).filter(r => r. state === "running").length,
        avgCpu: 0,
        totalS3Buckets: (data.resources.s3 || []).length,
        totalRDS: rdsData.length,
        totalLambda: (data.resources.lambda || []).length,
        totalEBS: (data. resources.ebs || []).length,
      });
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching RDS data:", err);
      setError(err. message);
      setLoading(false);
    }
  };

  const handleRegionChange = async (newRegion) => {
    setRegion(newRegion);
    setDatabases([]);
    setCpuHistoryData([]);
    setConnectionsHistoryData([]);
    setIopsHistoryData([]);
    setLatencyHistoryData([]);
    setReplicationLagData([]);
    localStorage.setItem('region', newRegion);
    
    try {
      await fetch(`${API_GATEWAY_URL}/api/auth/update-region`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, region: newRegion })
      });
      
      setTimeout(() => fetchRDSData(), 2000);
    } catch (err) {
      console.error("Error updating region:", err);
    }
  };

  useEffect(() => {
    fetchRDSData();
    const interval = setInterval(fetchRDSData, 5000);
    return () => clearInterval(interval);
  }, [userId, region]);

  // Calculate metrics
  const totalDatabases = databases.length;
  const availableDatabases = databases.filter(db => db.status === 'available').length;
  const stoppedDatabases = databases. filter(db => db.status === 'stopped').length;
  const avgCpu = databases
    .map(db => parseFloat(db. metrics.cpuUtilization))
    .filter(v => ! isNaN(v))
    .reduce((a, b) => a + b, 0) / databases.length || 0;
  const totalConnections = databases.reduce((sum, db) => sum + (parseInt(db.metrics.connections) || 0), 0);

  // Engine distribution
  const engineDistribution = databases. reduce((acc, db) => {
    const engine = db.engine. split(' ')[0];
    acc[engine] = (acc[engine] || 0) + 1;
    return acc;
  }, {});
  const engineData = Object.entries(engineDistribution).map(([engine, count]) => ({
    name: engine,
    value: count
  }));

  // Instance class distribution
  const instanceClassData = databases.reduce((acc, db) => {
    acc[db.instanceClass] = (acc[db.instanceClass] || 0) + 1;
    return acc;
  }, {});
  const classData = Object.entries(instanceClassData).map(([className, count]) => ({
    name: className,
    value: count
  }));

  // CPU by database
  const cpuByDatabase = databases.map(db => ({
    name: db.identifier. substring(0, 12),
    cpu: parseFloat(db.metrics. cpuUtilization) || 0,
    engine: db.engine.split(' ')[0]
  })). sort((a, b) => b. cpu - a.cpu). slice(0, 10);

  // Connections by database
  const connectionsByDatabase = databases.map(db => ({
    name: db.identifier.substring(0, 12),
    connections: parseInt(db.metrics.connections) || 0
  })).sort((a, b) => b.connections - a.connections). slice(0, 10);

  // Latest metrics
  const latestCpu = cpuHistoryData[cpuHistoryData.length - 1];
  const latestConnections = connectionsHistoryData[connectionsHistoryData.length - 1];
  const latestIOPS = iopsHistoryData[iopsHistoryData.length - 1];
  const latestLatency = latencyHistoryData[latencyHistoryData.length - 1];
  const latestReplicationLag = replicationLagData[replicationLagData.length - 1];

  // Trends
  const cpuTrend = cpuHistoryData.length > 10 ? 
    (latestCpu?. avg || 0) - (cpuHistoryData[cpuHistoryData.length - 10]?.avg || 0) : 0;
  const connectionsTrend = connectionsHistoryData.length > 10 ? 
    (latestConnections?. total || 0) - (connectionsHistoryData[connectionsHistoryData.length - 10]?.total || 0) : 0;

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
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-30 shadow-lg">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Home size={14} className="text-gray-400" />
                <ChevronRight size={12} className="text-gray-600" />
                <span className="text-gray-400 hover:text-gray-200 cursor-pointer transition-colors" onClick={() => navigate('/dashboard')}>
                  Dashboards
                </span>
                <ChevronRight size={12} className="text-gray-600" />
                <span className="text-white font-semibold">RDS Database Monitoring</span>
              </div>

              <div className="flex items-center gap-3">
                <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-1. 5 bg-gray-700 border border-gray-600 text-gray-200 rounded text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                  {timeRanges. map((r) => (<option key={r.value} value={r.value}>{r. label}</option>))}
                </select>

                <select value={region} onChange={(e) => handleRegionChange(e. target.value)}
                  className="px-3 py-1.5 bg-gray-700 border border-gray-600 text-gray-200 rounded text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                  {awsRegions.map((r) => (<option key={r. value} value={r.value}>{r.label}</option>))}
                </select>

                <button onClick={fetchRDSData} disabled={loading}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 border border-gray-600"
                  title="Refresh">
                  <RefreshCw size={16} className={`text-gray-200 ${loading ? 'animate-spin' : ''}`} />
                </button>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 border border-green-700 rounded">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-400">Live (5s)</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Database className="text-blue-500" size={32} />
              RDS Database Performance
            </h1>
            <p className="text-gray-400 flex items-center gap-2 text-sm">
              <Clock size={14} />
              Real-time database metrics • Query performance • Connection monitoring
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

          {/* KPI Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Total Databases</span>
                <Database size={16} className="text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{totalDatabases}</div>
              <div className="text-xs text-gray-500">{availableDatabases} available</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-green-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Available</span>
                <CheckCircle size={16} className="text-green-500" />
              </div>
              <div className="text-3xl font-bold text-green-400 mb-1">{availableDatabases}</div>
              <div className="text-xs text-gray-500">ready for queries</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-orange-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Avg CPU</span>
                <div className="flex items-center gap-1">
                  {cpuTrend > 0 ?  <ArrowUp size={12} className="text-red-400" /> : 
                   cpuTrend < 0 ? <ArrowDown size={12} className="text-green-400" /> : null}
                </div>
              </div>
              <div className="text-3xl font-bold text-orange-400 mb-1">{latestCpu?.avg?. toFixed(1) || '0.0'}%</div>
              <div className="text-xs text-gray-500">Max: {latestCpu?.max?. toFixed(1) || '0'}%</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Connections</span>
                <div className="flex items-center gap-1">
                  {connectionsTrend > 0 ? <ArrowUp size={12} className="text-purple-400" /> : 
                   connectionsTrend < 0 ? <ArrowDown size={12} className="text-green-400" /> : null}
                </div>
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-1">{latestConnections?.total || '0'}</div>
              <div className="text-xs text-gray-500">{latestConnections?.active || '0'} active</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-cyan-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">IOPS</span>
                <Activity size={16} className="text-cyan-500" />
              </div>
              <div className="text-3xl font-bold text-cyan-400 mb-1">{latestIOPS?.total?. toLocaleString() || '0'}</div>
              <div className="text-xs text-gray-500">Read + Write</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-yellow-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Read Latency</span>
                <Clock size={16} className="text-yellow-500" />
              </div>
              <div className="text-3xl font-bold text-yellow-400 mb-1">{latestLatency?.readLatency?.toFixed(1) || '0.0'}</div>
              <div className="text-xs text-gray-500">ms</div>
            </div>
          </div>

          {/* Main Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* CPU Utilization */}
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Cpu size={20} className="text-orange-500" />
                    CPU Utilization
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Average, Max, and Min across all databases</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cpuHistoryData}>
                  <defs>
                    <linearGradient id="rdsCpuGrad" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="avg" stroke="#f97316" fill="url(#rdsCpuGrad)" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey="min" stroke="#6b7280" fill="none" strokeWidth={0.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Engine Distribution */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Server size={20} className="text-blue-500" />
                Database Engines
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={engineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={(entry) => entry.name}
                  >
                    {engineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Connections & IOPS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Database Connections */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users size={20} className="text-purple-500" />
                Database Connections
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={connectionsHistoryData}>
                  <defs>
                    <linearGradient id="activeConnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="idleConnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6b7280" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Area type="monotone" dataKey="active" stroke="#a855f7" fill="url(#activeConnGrad)" strokeWidth={2} name="Active" />
                  <Area type="monotone" dataKey="idle" stroke="#6b7280" fill="url(#idleConnGrad)" strokeWidth={2} name="Idle" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* IOPS */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <HardDrive size={20} className="text-cyan-500" />
                Disk IOPS
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={iopsHistoryData}>
                  <defs>
                    <linearGradient id="readIOPSGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="writeIOPSGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Area type="monotone" dataKey="read" stroke="#06b6d4" fill="url(#readIOPSGrad)" strokeWidth={2} name="Read IOPS" />
                  <Area type="monotone" dataKey="write" stroke="#f97316" fill="url(#writeIOPSGrad)" strokeWidth={2} name="Write IOPS" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Latency & Replication Lag */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Query Latency */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Gauge size={20} className="text-yellow-500" />
                Query Latency & Queue Depth
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={latencyHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis yAxisId="left" stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v} ms`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Bar yAxisId="left" dataKey="readLatency" fill="#fbbf24" name="Read Latency (ms)" />
                  <Bar yAxisId="left" dataKey="writeLatency" fill="#f97316" name="Write Latency (ms)" />
                  <Line yAxisId="right" type="monotone" dataKey="queueDepth" stroke="#ef4444" strokeWidth={2} name="Queue Depth" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Replication Lag */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Activity size={20} className="text-green-500" />
                Replication Lag
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={replicationLagData}>
                  <defs>
                    <linearGradient id="lagGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v}s`} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={60} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: 'Warning', fill: '#fbbf24', fontSize: 10 }} />
                  <Area type="monotone" dataKey="lag" stroke="#10b981" fill="url(#lagGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CPU & Connections by Database */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* CPU by Database */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-orange-500" />
                CPU by Database
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cpuByDatabase} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" domain={[0, 100]} stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: '10px' }} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={80} stroke="#ef4444" strokeDasharray="3 3" />
                  <Bar dataKey="cpu" fill="#f97316" radius={[0, 4, 4, 0]}>
                    {cpuByDatabase.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cpu > 80 ? '#ef4444' : entry.cpu > 50 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Connections by Database */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users size={20} className="text-purple-500" />
                Connections by Database
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={connectionsByDatabase}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="connections" fill="#a855f7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Database Details Table */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Database size={20} className="text-gray-400" />
              Database Inventory
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 border-b-2 border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Identifier</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Engine</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Instance Class</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">State</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">CPU %</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Connections</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Storage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {databases.map((db) => {
                    const cpuValue = parseFloat(db.metrics.cpuUtilization) || 0;
                    const isHealthy = db.status === 'available' && cpuValue < 80;
                    
                    return (
                      <tr key={db.identifier} className="hover:bg-gray-750 transition-colors text-gray-300">
                        <td className="px-4 py-3">
                          <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">{db.identifier}</td>
                        <td className="px-4 py-3">{db.engine}</td>
                        <td className="px-4 py-3 text-cyan-400">{db.instanceClass}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            db.status === 'available' ?  'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                          }`}>
                            {db.status. toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${
                                  cpuValue > 80 ? 'bg-red-500' : cpuValue > 50 ?  'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${cpuValue}%` }}
                              ></div>
                            </div>
                            <span className={`text-xs font-bold w-12 ${
                              cpuValue > 80 ? 'text-red-400' : cpuValue > 50 ? 'text-yellow-400' : 'text-green-400'
                            }`}>{cpuValue}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-purple-400">{db.metrics. connections}</td>
                        <td className="px-4 py-3">{db.storage} GB</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {databases.length === 0 && (
                <div className="text-center py-12">
                  <Database size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500">No RDS databases found in {region}</p>
                </div>
              )}
            </div>
          </div>

          {/* Alerts & Recommendations */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield size={20} className="text-yellow-500" />
              Performance Alerts & Recommendations
            </h3>
            <div className="space-y-3">
              {latestCpu?. avg > 70 && (
                <div className="flex items-start gap-3 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-red-400">Critical: High CPU Usage</p>
                      <span className="text-xs text-red-500 font-mono">{new Date(). toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-red-300">
                      Average CPU at {latestCpu.avg. toFixed(1)}%.  Consider upgrading instance class, optimizing queries, or enabling read replicas.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded transition-colors">Upgrade Instance</button>
                      <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors">View Queries</button>
                    </div>
                  </div>
                </div>
              )}

              {latestReplicationLag?.lag > 60 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                  <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0. 5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-yellow-400">Warning: High Replication Lag</p>
                      <span className="text-xs text-yellow-500 font-mono">{new Date(). toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-yellow-300">
                      Replication lag at {latestReplicationLag.lag}s. This may affect read replica data consistency.  Consider reducing write load or upgrading replica instance.
                    </p>
                  </div>
                </div>
              )}

              {stoppedDatabases > 0 && (
                <div className="flex items-start gap-3 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                  <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-blue-400">Info: Stopped Databases</p>
                      <span className="text-xs text-blue-500 font-mono">{new Date(). toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-blue-300">
                      {stoppedDatabases} database(s) are stopped. Stopped databases still incur storage costs.  Consider creating final snapshot and deleting if no longer needed.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-green-900/30 border border-green-700 rounded-lg">
                <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-400 mb-1">Best Practices</p>
                  <ul className="text-xs text-green-300 space-y-1">
                    <li>• Enable automated backups with retention period of 7-35 days</li>
                    <li>• Use RDS Performance Insights to identify and optimize slow queries</li>
                    <li>• Enable Enhanced Monitoring for detailed OS-level metrics</li>
                    <li>• Configure Multi-AZ deployment for high availability</li>
                    <li>• Set up CloudWatch alarms for CPU, connections, and IOPS thresholds</li>
                    <li>• Enable encryption at rest for compliance requirements</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RDSDashboard;