import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { 
  HardDrive, Activity, Database, TrendingUp, AlertCircle, Zap,
  RefreshCw, Home, ChevronRight, AlertTriangle, CheckCircle, Info,
  ArrowUp, ArrowDown, Gauge, BarChart3, Server, Cpu, Lock, Unlock,
  Archive, DollarSign, Clock, Shield
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
  ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ReferenceLine, ScatterChart, Scatter
} from 'recharts';

const API_GATEWAY_URL = "http://localhost:3003";
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#FF6B9D', '#C084FC'];

const EBSDashboard = ({ userId, initialRegion, onLogout }) => {
  const navigate = useNavigate();
  const [volumes, setVolumes] = useState([]);
  const [region, setRegion] = useState(initialRegion || "us-east-1");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30m');
  
  // Time-series data
  const [iopsHistoryData, setIopsHistoryData] = useState([]);
  const [throughputHistoryData, setThroughputHistoryData] = useState([]);
  const [latencyHistoryData, setLatencyHistoryData] = useState([]);
  const [queueDepthHistoryData, setQueueDepthHistoryData] = useState([]);
  const [burstBalanceHistoryData, setBurstBalanceHistoryData] = useState([]);
  
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

  const fetchEBSData = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = `${API_GATEWAY_URL}/api/data/metrics/${userId}?  region=${region}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Failed to fetch EBS data');
      
      const data = await res.json();
      const ebsData = data.resources.ebs || [];
      setVolumes(ebsData);
      
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Calculate total metrics
      const totalReadOps = ebsData.reduce((sum, vol) => sum + (parseFloat(vol.metrics.readOps) || 0), 0);
      const totalWriteOps = ebsData.reduce((sum, vol) => sum + (parseFloat(vol. metrics.writeOps) || 0), 0);
      const totalIOPS = totalReadOps + totalWriteOps;
      
      // Simulated advanced metrics (in production, get from CloudWatch)
      const readThroughput = Math.floor(Math.random() * 100) + 20; // MB/s
      const writeThroughput = Math.floor(Math.random() * 80) + 10; // MB/s
      const readLatency = 1 + Math.random() * 4; // ms
      const writeLatency = 1.5 + Math.random() * 5; // ms
      const queueDepth = Math.random() * 5;
      const burstBalance = 50 + Math.random() * 50; // % for gp2 volumes
      const volumeUtilization = 30 + Math.random() * 40; // %
      
      // Snapshot metrics
      const snapshotAge = Math.floor(Math.random() * 30); // days
      const snapshotCount = Math.floor(ebsData.length * 1.5); // simulated
      
      // Update time-series
      setIopsHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          read: parseFloat(totalReadOps. toFixed(0)),
          write: parseFloat(totalWriteOps.toFixed(0)),
          total: parseFloat(totalIOPS.toFixed(0))
        }];
        return updated. slice(-60);
      });

      setThroughputHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          read: readThroughput,
          write: writeThroughput,
          total: readThroughput + writeThroughput
        }];
        return updated.slice(-60);
      });

      setLatencyHistoryData(prev => {
        const updated = [... prev, {
          time: timestamp,
          read: parseFloat(readLatency.toFixed(2)),
          write: parseFloat(writeLatency.toFixed(2))
        }];
        return updated.slice(-60);
      });

      setQueueDepthHistoryData(prev => {
        const updated = [...  prev, {
          time: timestamp,
          queueDepth: parseFloat(queueDepth.toFixed(2)),
          threshold: 4
        }];
        return updated.slice(-60);
      });

      setBurstBalanceHistoryData(prev => {
        const updated = [... prev, {
          time: timestamp,
          balance: parseFloat(burstBalance. toFixed(2)),
          threshold: 20
        }];
        return updated.slice(-60);
      });
      
      setMetrics({
        totalInstances: (data.resources.ec2 || []).length,
        runningInstances: (data.resources.ec2 || []).filter(r => r.state === "running").length,
        avgCpu: 0,
        totalS3Buckets: (data.resources.s3 || []).length,
        totalRDS: (data.resources.rds || []).length,
        totalLambda: (data. resources.lambda || []).length,
        totalEBS: ebsData.length,
      });
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching EBS data:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleRegionChange = async (newRegion) => {
    setRegion(newRegion);
    setVolumes([]);
    setIopsHistoryData([]);
    setThroughputHistoryData([]);
    setLatencyHistoryData([]);
    setQueueDepthHistoryData([]);
    setBurstBalanceHistoryData([]);
    localStorage.setItem('region', newRegion);
    
    try {
      await fetch(`${API_GATEWAY_URL}/api/auth/update-region`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, region: newRegion })
      });
      
      setTimeout(() => fetchEBSData(), 2000);
    } catch (err) {
      console.error("Error updating region:", err);
    }
  };

  useEffect(() => {
    fetchEBSData();
    const interval = setInterval(fetchEBSData, 5000);
    return () => clearInterval(interval);
  }, [userId, region]);

  // Calculate metrics
  const totalVolumes = volumes.length;
  const inUseVolumes = volumes.filter(v => v.state === 'in-use').length;
  const availableVolumes = volumes. filter(v => v.state === 'available').length;
  const totalStorage = volumes.reduce((sum, vol) => sum + (parseFloat(vol.size) || 0), 0);
  
  const totalReadOps = volumes.reduce((sum, vol) => sum + (parseFloat(vol.metrics.readOps) || 0), 0);
  const totalWriteOps = volumes.reduce((sum, vol) => sum + (parseFloat(vol.metrics.writeOps) || 0), 0);

  // Volume type distribution
  const typeDistribution = volumes.reduce((acc, vol) => {
    acc[vol.volumeType] = (acc[vol.volumeType] || 0) + 1;
    return acc;
  }, {});
  const typeData = Object.entries(typeDistribution).map(([type, count]) => ({
    name: type,
    value: count
  }));

  // State distribution
  const stateData = [
    { name: 'In-Use', value: inUseVolumes, color: '#10B981' },
    { name: 'Available', value: availableVolumes, color: '#3B82F6' },
    { name: 'Other', value: totalVolumes - inUseVolumes - availableVolumes, color: '#6B7280' }
  ].filter(item => item.value > 0);

  // Storage by volume
  const storageByVolume = volumes
    .map(vol => ({
      name: vol.volumeId. substring(4, 15),
      size: parseFloat(vol.size) || 0,
      type: vol.volumeType
    }))
    .sort((a, b) => b.size - a.size)
    .  slice(0, 10);

  // IOPS by volume
  const iopsByVolume = volumes
    .filter(vol => vol.state === 'in-use')
    . map(vol => ({
      name: vol.volumeId.substring(4, 12),
      read: parseFloat(vol.metrics. readOps) || 0,
      write: parseFloat(vol.metrics.writeOps) || 0
    }))
    .sort((a, b) => (b.read + b.write) - (a. read + a.write))
    .  slice(0, 10);

  // Availability zone distribution
  const azDistribution = volumes.reduce((acc, vol) => {
    acc[vol. availabilityZone] = (acc[vol.availabilityZone] || 0) + 1;
    return acc;
  }, {});
  const azData = Object.entries(azDistribution).map(([az, count]) => ({
    name: az,
    value: count
  }));

  // Encryption status
  const encryptedVolumes = Math.floor(volumes.length * 0.7); // Simulated
  const unencryptedVolumes = volumes.length - encryptedVolumes;

  // Volume age (simulated)
  const oldVolumes = Math.floor(volumes.length * 0.3); // >1 year
  const recentVolumes = volumes.length - oldVolumes;

  // Latest metrics
  const latestIOPS = iopsHistoryData[iopsHistoryData.length - 1];
  const latestThroughput = throughputHistoryData[throughputHistoryData.length - 1];
  const latestLatency = latencyHistoryData[latencyHistoryData.length - 1];
  const latestQueueDepth = queueDepthHistoryData[queueDepthHistoryData.length - 1];
  const latestBurstBalance = burstBalanceHistoryData[burstBalanceHistoryData.length - 1];

  // Trends
  const iopsTrend = iopsHistoryData.length > 10 ? 
    (latestIOPS?. total || 0) - (iopsHistoryData[iopsHistoryData.length - 10]?.total || 0) : 0;
  const throughputTrend = throughputHistoryData.length > 10 ? 
    (latestThroughput?.total || 0) - (throughputHistoryData[throughputHistoryData.length - 10]?.total || 0) : 0;

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
                <span className="text-white font-semibold">EBS Volume Performance</span>
              </div>

              <div className="flex items-center gap-3">
                <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-1.  5 bg-gray-700 border border-gray-600 text-gray-200 rounded text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                  {timeRanges.map((r) => (<option key={r. value} value={r.value}>{r.  label}</option>))}
                </select>

                <select value={region} onChange={(e) => handleRegionChange(e.target. value)}
                  className="px-3 py-1. 5 bg-gray-700 border border-gray-600 text-gray-200 rounded text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                  {awsRegions.map((r) => (<option key={r.value} value={r.value}>{r.  label}</option>))}
                </select>

                <button onClick={fetchEBSData} disabled={loading}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 border border-gray-600"
                  title="Refresh">
                  <RefreshCw size={16} className={`text-gray-200 ${loading ? 'animate-spin' : ''}`} />
                </button>

                <div className="flex items-center gap-2 px-3 py-1. 5 bg-green-900/30 border border-green-700 rounded">
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
              <HardDrive className="text-purple-500" size={32} />
              EBS Volume & Storage Analytics
            </h1>
            <p className="text-gray-400 flex items-center gap-2 text-sm">
              <Clock size={14} />
              Disk I/O performance • Storage optimization • Snapshot management
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
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Total Volumes</span>
                <HardDrive size={16} className="text-purple-500" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{totalVolumes}</div>
              <div className="text-xs text-gray-500">{inUseVolumes} in use</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Total Storage</span>
                <Database size={16} className="text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-blue-400 mb-1">{totalStorage}</div>
              <div className="text-xs text-gray-500">GB provisioned</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-green-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">In-Use</span>
                <CheckCircle size={16} className="text-green-500" />
              </div>
              <div className="text-3xl font-bold text-green-400 mb-1">{inUseVolumes}</div>
              <div className="text-xs text-gray-500">attached volumes</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-orange-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Available</span>
                <AlertTriangle size={16} className="text-orange-500" />
              </div>
              <div className="text-3xl font-bold text-orange-400 mb-1">{availableVolumes}</div>
              <div className="text-xs text-gray-500">unattached (waste)</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-cyan-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Total IOPS</span>
                <div className="flex items-center gap-1">
                  {iopsTrend > 0 ? <ArrowUp size={12} className="text-cyan-400" /> : 
                   iopsTrend < 0 ? <ArrowDown size={12} className="text-green-400" /> : null}
                </div>
              </div>
              <div className="text-3xl font-bold text-cyan-400 mb-1">{latestIOPS?. total?.toLocaleString() || '0'}</div>
              <div className="text-xs text-gray-500">operations/sec</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-yellow-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Throughput</span>
                <div className="flex items-center gap-1">
                  {throughputTrend > 0 ?  <ArrowUp size={12} className="text-yellow-400" /> : 
                   throughputTrend < 0 ?  <ArrowDown size={12} className="text-green-400" /> : null}
                </div>
              </div>
              <div className="text-3xl font-bold text-yellow-400 mb-1">{latestThroughput?. total || '0'}</div>
              <div className="text-xs text-gray-500">MB/s</div>
            </div>
          </div>

          {/* Main Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* IOPS Over Time */}
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity size={20} className="text-cyan-500" />
                    Disk I/O Operations (IOPS)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Read and write operations per second</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
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

            {/* Volume Type Distribution */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Server size={20} className="text-purple-500" />
                Volume Types
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={(entry) => entry.name}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Throughput & Latency */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Throughput */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-yellow-500" />
                Disk Throughput (MB/s)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={throughputHistoryData}>
                  <defs>
                    <linearGradient id="readThroughputGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="writeThroughputGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v} MB/s`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Area type="monotone" dataKey="read" stroke="#10b981" fill="url(#readThroughputGrad)" strokeWidth={2} name="Read" />
                  <Area type="monotone" dataKey="write" stroke="#fbbf24" fill="url(#writeThroughputGrad)" strokeWidth={2} name="Write" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Latency */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={20} className="text-orange-500" />
                Disk Latency (ms)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={latencyHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v}ms`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Line type="monotone" dataKey="read" stroke="#f97316" strokeWidth={2.5} name="Read Latency" dot={false} />
                  <Line type="monotone" dataKey="write" stroke="#ef4444" strokeWidth={2} name="Write Latency" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Queue Depth & Burst Balance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Queue Depth */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Gauge size={20} className="text-indigo-500" />
                Disk Queue Depth
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={queueDepthHistoryData}>
                  <defs>
                    <linearGradient id="queueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={4} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: 'Warning', fill: '#fbbf24', fontSize: 10 }} />
                  <Area type="monotone" dataKey="queueDepth" stroke="#6366f1" fill="url(#queueGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Burst Balance (gp2) */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap size={20} className="text-green-500" />
                Burst Balance (gp2 volumes)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={burstBalanceHistoryData}>
                  <defs>
                    <linearGradient id="burstGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis domain={[0, 100]} stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical', fill: '#ef4444', fontSize: 10 }} />
                  <Area type="monotone" dataKey="balance" stroke="#10b981" fill="url(#burstGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Storage & IOPS by Volume */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Storage by Volume */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-500" />
                Top 10 Volumes by Size
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={storageByVolume} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v} GB`} />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: '10px' }} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="size" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* IOPS by Volume */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Activity size={20} className="text-cyan-500" />
                IOPS by Volume (Top 10)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={iopsByVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Bar dataKey="read" fill="#06b6d4" name="Read IOPS" />
                  <Bar dataKey="write" fill="#f97316" name="Write IOPS" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AZ Distribution & State Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* AZ Distribution */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Database size={20} className="text-orange-500" />
                Availability Zones
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={azData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {azData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Volume State */}
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle size={20} className="text-green-500" />
                Volume State Distribution
              </h3>
              <div className="grid grid-cols-3 gap-4 mt-6">
                {stateData.map((state, index) => (
                  <div key={index} className="p-4 rounded-lg border-2" style={{ borderColor: state.color, backgroundColor: `${state.color}10` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-lg" style={{ color: state.color }}>{state.name}</span>
                      <span className="text-3xl font-bold" style={{ color: state.color }}>{state.value}</span>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500" 
                        style={{ 
                          width: `${(state.value / totalVolumes) * 100}%`,
                          backgroundColor: state.color 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{((state.value / totalVolumes) * 100).toFixed(1)}% of total</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Volume Details Table */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <HardDrive size={20} className="text-gray-400" />
              Volume Inventory
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 border-b-2 border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Volume ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">State</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">AZ</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Read IOPS</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Write IOPS</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Encrypted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {volumes.map((volume) => {
                    const isInUse = volume.state === 'in-use';
                    const isEncrypted = Math.random() > 0.3; // Simulated
                    
                    return (
                      <tr key={volume. volumeId} className="hover:bg-gray-750 transition-colors text-gray-300">
                        <td className="px-4 py-3">
                          <div className={`w-2 h-2 rounded-full ${isInUse ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`}></div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-white">{volume.volumeId}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-purple-900/50 text-purple-400 rounded text-xs font-bold">
                            {volume.volumeType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-blue-400">{volume.size} GB</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            isInUse ? 'bg-green-900/50 text-green-400' : 'bg-orange-900/50 text-orange-400'
                          }`}>
                            {volume.state. toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{volume.availabilityZone}</td>
                        <td className="px-4 py-3 text-cyan-400">{volume.metrics.readOps}</td>
                        <td className="px-4 py-3 text-orange-400">{volume.metrics.writeOps}</td>
                        <td className="px-4 py-3">
                          {isEncrypted ? (
                            <Lock size={16} className="text-green-500" />
                          ) : (
                            <Unlock size={16} className="text-red-500" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {volumes.length === 0 && (
                <div className="text-center py-12">
                  <HardDrive size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500">No EBS volumes found in {region}</p>
                </div>
              )}
            </div>
          </div>

          {/* Alerts & Recommendations */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield size={20} className="text-yellow-500" />
              Storage Optimization & Cost Savings
            </h3>
            <div className="space-y-3">
              {availableVolumes > 0 && (
                <div className="flex items-start gap-3 p-4 bg-orange-900/30 border border-orange-700 rounded-lg">
                  <AlertTriangle size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-orange-400">Warning: Unattached Volumes Costing Money</p>
                      <span className="text-xs text-orange-500 font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-orange-300">
                      {availableVolumes} volume(s) are not attached to any instance. You're paying for unused storage (~${(availableVolumes * 0.10 * volumes.reduce((sum, v) => v.state === 'available' ? sum + parseFloat(v.size) : sum, 0) / availableVolumes || 0).toFixed(2)}/month). 
                      Create snapshots and delete if not needed.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button className="px-3 py-1 bg-orange-700 hover:bg-orange-600 text-white text-xs rounded transition-colors">Create Snapshots</button>
                      <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors">Delete Unused</button>
                    </div>
                  </div>
                </div>
              )}

              {latestBurstBalance?. balance < 20 && (
                <div className="flex items-start gap-3 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.  5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-red-400">Critical: Low Burst Balance</p>
                      <span className="text-xs text-red-500 font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-red-300">
                      gp2 volumes have low burst balance ({latestBurstBalance.balance. toFixed(1)}%).  Performance may degrade.  Upgrade to gp3 for consistent baseline performance.
                    </p>
                  </div>
                </div>
              )}

              {unencryptedVolumes > 0 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                  <Unlock size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-yellow-400">Security: Unencrypted Volumes</p>
                      <span className="text-xs text-yellow-500 font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-yellow-300">
                      {unencryptedVolumes} volume(s) are not encrypted. Enable encryption by default for compliance and security best practices.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                <DollarSign size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-400 mb-1">Cost Optimization Opportunities</p>
                  <ul className="text-xs text-blue-300 space-y-1">
                    <li>• <strong>Upgrade gp2 to gp3:</strong> Save 20% cost and get better baseline performance</li>
                    <li>• <strong>Delete old snapshots:</strong> Review snapshots older than 90 days for deletion</li>
                    <li>• <strong>Right-size volumes:</strong> Check if provisioned IOPS match actual usage</li>
                    <li>• <strong>Use EBS-optimized instances:</strong> Maximize throughput for intensive workloads</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-green-900/30 border border-green-700 rounded-lg">
                <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-400 mb-1">Best Practices</p>
                  <ul className="text-xs text-green-300 space-y-1">
                    <li>• Enable EBS encryption by default for all new volumes</li>
                    <li>• Set up automated snapshot lifecycle policies</li>
                    <li>• Monitor IOPS and throughput to detect performance issues</li>
                    <li>• Use CloudWatch alarms for burst balance on gp2 volumes</li>
                    <li>• Implement tagging strategy for cost allocation</li>
                    <li>• Regularly review and delete unused volumes and snapshots</li>
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

export default EBSDashboard;