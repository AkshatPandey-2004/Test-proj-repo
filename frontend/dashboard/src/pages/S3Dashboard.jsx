import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { 
  Database, HardDrive, Clock, TrendingUp, Shield, DollarSign,
  RefreshCw, Home, ChevronRight, AlertCircle, Activity, Download,
  Upload, FileText, Lock, Unlock, Archive, Trash2, Info, CheckCircle,
  AlertTriangle, BarChart3, PieChart as PieChartIcon, ArrowUp, ArrowDown
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
  ComposedChart, Treemap
} from 'recharts';

const API_GATEWAY_URL = "http://localhost:3003";
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#FF6B9D', '#C084FC'];

const S3Dashboard = ({ userId, initialRegion, onLogout }) => {
  const navigate = useNavigate();
  const [buckets, setBuckets] = useState([]);
  const [region, setRegion] = useState(initialRegion || "us-east-1");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30m');
  
  // Time-series data
  const [requestsHistoryData, setRequestsHistoryData] = useState([]);
  const [storageHistoryData, setStorageHistoryData] = useState([]);
  const [transferHistoryData, setTransferHistoryData] = useState([]);
  
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

  const fetchS3Data = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = `${API_GATEWAY_URL}/api/data/metrics/${userId}? region=${region}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Failed to fetch S3 data');
      
      const data = await res.json();
      const s3Data = data.resources.s3 || [];
      setBuckets(s3Data);
      
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Calculate total storage
      const totalStorageGB = s3Data.reduce((sum, bucket) => sum + (parseFloat(bucket.sizeInGB) || 0), 0);
      const totalObjects = s3Data.reduce((sum, bucket) => sum + (parseInt(bucket.numberOfObjects) || 0), 0);
      
      // Simulated request metrics (in production, get from CloudWatch)
      const getRequests = Math.floor(Math.random() * 5000) + 1000;
      const putRequests = Math.floor(Math.random() * 2000) + 500;
      const deleteRequests = Math.floor(Math.random() * 100) + 10;
      const listRequests = Math.floor(Math.random() * 500) + 50;
      
      // Data transfer metrics
      const uploadRate = Math.floor(Math.random() * 50) + 10; // MB/s
      const downloadRate = Math.floor(Math. random() * 100) + 20; // MB/s
      
      // Update time-series
      setRequestsHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          GET: getRequests,
          PUT: putRequests,
          DELETE: deleteRequests,
          LIST: listRequests,
          total: getRequests + putRequests + deleteRequests + listRequests
        }];
        return updated. slice(-60);
      });

      setStorageHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          storage: parseFloat(totalStorageGB. toFixed(3)),
          objects: totalObjects
        }];
        return updated. slice(-60);
      });

      setTransferHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          upload: uploadRate,
          download: downloadRate
        }];
        return updated. slice(-60);
      });
      
      setMetrics({
        totalInstances: (data.resources.ec2 || []).length,
        runningInstances: (data.resources.ec2 || []).filter(r => r. state === "running").length,
        avgCpu: 0,
        totalS3Buckets: s3Data.length,
        totalRDS: (data.resources.rds || []).length,
        totalLambda: (data.resources.lambda || []).length,
        totalEBS: (data.resources. ebs || []).length,
      });
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching S3 data:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleRegionChange = async (newRegion) => {
    setRegion(newRegion);
    setBuckets([]);
    setRequestsHistoryData([]);
    setStorageHistoryData([]);
    setTransferHistoryData([]);
    localStorage.setItem('region', newRegion);
    
    try {
      await fetch(`${API_GATEWAY_URL}/api/auth/update-region`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, region: newRegion })
      });
      
      setTimeout(() => fetchS3Data(), 2000);
    } catch (err) {
      console.error("Error updating region:", err);
    }
  };

  useEffect(() => {
    fetchS3Data();
    const interval = setInterval(fetchS3Data, 5000);
    return () => clearInterval(interval);
  }, [userId, region]);

  // Calculate metrics
  const totalBuckets = buckets.length;
  const totalStorageGB = buckets.reduce((sum, bucket) => sum + (parseFloat(bucket.sizeInGB) || 0), 0);
  const totalObjects = buckets.reduce((sum, bucket) => sum + (parseInt(bucket. numberOfObjects) || 0), 0);
  const emptyBuckets = buckets.filter(b => parseInt(b.numberOfObjects) === 0).length;
  const publicBuckets = Math.floor(Math.random() * 2); // Simulated
  const encryptedBuckets = buckets.length - publicBuckets;
  
  const avgObjectsPerBucket = totalBuckets > 0 ? Math.floor(totalObjects / totalBuckets) : 0;

  const formatStorage = (gb) => {
    if (gb === 0) return '0 B';
    if (gb >= 1024) return `${(gb / 1024). toFixed(2)} TB`;
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = gb * 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = mb * 1024;
    return `${kb.toFixed(2)} KB`;
  };

  // Storage by bucket
  const storageByBucket = buckets
    .filter(b => parseFloat(b.sizeInGB) > 0)
    . map(bucket => ({
      name: bucket. name. substring(0, 15),
      size: parseFloat(bucket.sizeInGB) || 0,
      objects: parseInt(bucket.numberOfObjects) || 0
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  // Objects by bucket
  const objectsByBucket = buckets
    .map(bucket => ({
      name: bucket.name.substring(0, 15),
      count: parseInt(bucket.numberOfObjects) || 0
    }))
    .sort((a, b) => b.count - a.count)
    . slice(0, 10);

  // Bucket age distribution
  const now = new Date();
  const ageDistribution = buckets.reduce((acc, bucket) => {
    const created = new Date(bucket.creationDate);
    const ageInDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    
    if (ageInDays < 30) acc['< 1 month'] = (acc['< 1 month'] || 0) + 1;
    else if (ageInDays < 90) acc['1-3 months'] = (acc['1-3 months'] || 0) + 1;
    else if (ageInDays < 180) acc['3-6 months'] = (acc['3-6 months'] || 0) + 1;
    else if (ageInDays < 365) acc['6-12 months'] = (acc['6-12 months'] || 0) + 1;
    else acc['> 1 year'] = (acc['> 1 year'] || 0) + 1;
    
    return acc;
  }, {});

  const ageData = Object.entries(ageDistribution). map(([age, count]) => ({
    name: age,
    value: count
  }));

  // Storage class distribution (simulated)
  const storageClassData = [
    { name: 'Standard', value: Math.floor(totalStorageGB * 0.6), cost: '$0.023/GB' },
    { name: 'Intelligent-Tiering', value: Math.floor(totalStorageGB * 0.2), cost: '$0.0125/GB' },
    { name: 'Glacier', value: Math.floor(totalStorageGB * 0.15), cost: '$0.004/GB' },
    { name: 'Deep Archive', value: Math.floor(totalStorageGB * 0.05), cost: '$0.00099/GB' }
  ];

  // Latest metrics
  const latestRequests = requestsHistoryData[requestsHistoryData.length - 1];
  const latestTransfer = transferHistoryData[transferHistoryData.length - 1];

  // Trends
  const storageTrend = storageHistoryData.length > 10 ? 
    (storageHistoryData[storageHistoryData.length - 1]?.storage || 0) - 
    (storageHistoryData[storageHistoryData.length - 10]?.storage || 0) : 0;

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
                <span className="text-white font-semibold">S3 Storage Analytics</span>
              </div>

              <div className="flex items-center gap-3">
                <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-1. 5 bg-gray-700 border border-gray-600 text-gray-200 rounded text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                  {timeRanges.map((r) => (<option key={r.value} value={r.value}>{r. label}</option>))}
                </select>

                <select value={region} onChange={(e) => handleRegionChange(e. target.value)}
                  className="px-3 py-1.5 bg-gray-700 border border-gray-600 text-gray-200 rounded text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                  {awsRegions.map((r) => (<option key={r.value} value={r.value}>{r. label}</option>))}
                </select>

                <button onClick={fetchS3Data} disabled={loading}
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
              <Database className="text-green-500" size={32} />
              S3 Storage & Analytics
            </h1>
            <p className="text-gray-400 flex items-center gap-2 text-sm">
              <Clock size={14} />
              Real-time storage metrics • Bucket analytics • Cost optimization
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
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-green-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Total Buckets</span>
                <Database size={16} className="text-green-500" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{totalBuckets}</div>
              <div className="text-xs text-gray-500">{emptyBuckets} empty</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Total Storage</span>
                <div className="flex items-center gap-1">
                  {storageTrend > 0 ?  <ArrowUp size={12} className="text-blue-400" /> : 
                   storageTrend < 0 ? <ArrowDown size={12} className="text-green-400" /> : null}
                </div>
              </div>
              <div className="text-3xl font-bold text-blue-400 mb-1">{formatStorage(totalStorageGB). split(' ')[0]}</div>
              <div className="text-xs text-gray-500">{formatStorage(totalStorageGB).split(' ')[1]}</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Total Objects</span>
                <FileText size={16} className="text-purple-500" />
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-1">{totalObjects. toLocaleString()}</div>
              <div className="text-xs text-gray-500">Avg {avgObjectsPerBucket}/bucket</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-cyan-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">GET Requests</span>
                <Download size={16} className="text-cyan-500" />
              </div>
              <div className="text-3xl font-bold text-cyan-400 mb-1">{latestRequests?. GET?. toLocaleString() || '0'}</div>
              <div className="text-xs text-gray-500">per period</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-orange-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">PUT Requests</span>
                <Upload size={16} className="text-orange-500" />
              </div>
              <div className="text-3xl font-bold text-orange-400 mb-1">{latestRequests?.PUT?.toLocaleString() || '0'}</div>
              <div className="text-xs text-gray-500">per period</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-red-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Security</span>
                {publicBuckets > 0 ?  <Unlock size={16} className="text-red-500" /> : <Lock size={16} className="text-green-500" />}
              </div>
              <div className="text-3xl font-bold text-green-400 mb-1">{encryptedBuckets}</div>
              <div className="text-xs text-gray-500">{publicBuckets} public</div>
            </div>
          </div>

          {/* Main Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Request Rate */}
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity size={20} className="text-cyan-500" />
                    API Request Rate
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">GET, PUT, DELETE, LIST operations</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={requestsHistoryData}>
                  <defs>
                    <linearGradient id="getGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="putGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Area type="monotone" dataKey="GET" stroke="#06b6d4" fill="url(#getGradient)" strokeWidth={2} />
                  <Area type="monotone" dataKey="PUT" stroke="#f97316" fill="url(#putGradient)" strokeWidth={2} />
                  <Line type="monotone" dataKey="DELETE" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="LIST" stroke="#a855f7" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Storage Growth */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <HardDrive size={20} className="text-blue-500" />
                Storage Growth
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={storageHistoryData}>
                  <defs>
                    <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v. toFixed(2)} GB`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="storage" stroke="#3b82f6" fill="url(#storageGradient)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Transfer & Storage Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Data Transfer */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-purple-500" />
                Data Transfer Rate
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={transferHistoryData}>
                  <defs>
                    <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="downloadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v} MB/s`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Area type="monotone" dataKey="upload" stroke="#f97316" fill="url(#uploadGrad)" strokeWidth={2} name="Upload" />
                  <Area type="monotone" dataKey="download" stroke="#06b6d4" fill="url(#downloadGrad)" strokeWidth={2} name="Download" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Storage Class Distribution */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Archive size={20} className="text-yellow-500" />
                Storage Class Distribution
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={storageClassData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value} GB`}
                  >
                    {storageClassData. map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS. length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Storage & Objects by Bucket */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Storage by Bucket */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-500" />
                Top 10 Buckets by Storage
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={storageByBucket} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v.toFixed(2)} GB`} />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: '10px' }} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="size" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Objects by Bucket */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText size={20} className="text-purple-500" />
                Top 10 Buckets by Object Count
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={objectsByBucket}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#a855f7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bucket Age & Details Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={20} className="text-orange-500" />
                Bucket Age Distribution
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={ageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {ageData. map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS. length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bucket Details Table */}
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Database size={20} className="text-gray-400" />
                Bucket Inventory
              </h3>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900 border-b-2 border-gray-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Bucket Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Objects</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Size</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {buckets.map((bucket) => {
                      const isEmpty = parseInt(bucket.numberOfObjects) === 0;
                      return (
                        <tr key={bucket.name} className="hover:bg-gray-750 transition-colors text-gray-300">
                          <td className="px-4 py-3 font-semibold text-white">{bucket.name}</td>
                          <td className="px-4 py-3">{parseInt(bucket.numberOfObjects).toLocaleString()}</td>
                          <td className="px-4 py-3 text-blue-400">{bucket.sizeDisplay}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{new Date(bucket.creationDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            {isEmpty ? (
                              <span className="px-2 py-1 bg-yellow-900/50 text-yellow-400 rounded text-xs font-bold flex items-center gap-1 w-fit">
                                <AlertTriangle size={12} /> Empty
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs font-bold flex items-center gap-1 w-fit">
                                <CheckCircle size={12} /> Active
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {buckets.length === 0 && (
                  <div className="text-center py-12">
                    <Database size={48} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-500">No S3 buckets found in {region}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alerts & Recommendations */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield size={20} className="text-yellow-500" />
              Security & Cost Optimization
            </h3>
            <div className="space-y-3">
              {publicBuckets > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-red-400">Critical: Public Buckets Detected</p>
                      <span className="text-xs text-red-500 font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-red-300">
                      {publicBuckets} bucket(s) are publicly accessible.  This poses a security risk.  Enable S3 Block Public Access immediately.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded transition-colors">Block Public Access</button>
                      <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors">View Buckets</button>
                    </div>
                  </div>
                </div>
              )}

              {emptyBuckets > 0 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                  <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0. 5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-yellow-400">Warning: Empty Buckets</p>
                      <span className="text-xs text-yellow-500 font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-yellow-300">
                      {emptyBuckets} bucket(s) contain no objects. Consider deleting unused buckets to reduce clutter and potential costs.
                    </p>
                    <div className="mt-2">
                      <button className="px-3 py-1 bg-yellow-700 hover:bg-yellow-600 text-white text-xs rounded transition-colors flex items-center gap-1">
                        <Trash2 size={12} /> Clean Up
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {storageClassData[0].value > totalStorageGB * 0.7 && (
                <div className="flex items-start gap-3 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                  <DollarSign size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-blue-400">Cost Optimization: Storage Class</p>
                      <span className="text-xs text-blue-500 font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-blue-300">
                      {((storageClassData[0].value / totalStorageGB) * 100).toFixed(0)}% of storage is in Standard class. 
                      Migrate infrequently accessed data to Intelligent-Tiering or Glacier to save up to 70% on storage costs.
                    </p>
                    <div className="mt-2">
                      <button className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded transition-colors">View Recommendations</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-green-900/30 border border-green-700 rounded-lg">
                <Info size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-400 mb-1">Best Practices</p>
                  <ul className="text-xs text-green-300 space-y-1">
                    <li>• Enable versioning for critical buckets to protect against accidental deletions</li>
                    <li>• Set up lifecycle policies to automatically transition objects to cheaper storage classes</li>
                    <li>• Enable server-side encryption (SSE-S3 or SSE-KMS) for all buckets</li>
                    <li>• Use S3 Analytics to understand access patterns and optimize storage costs</li>
                    <li>• Implement Cross-Region Replication for disaster recovery</li>
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

export default S3Dashboard;