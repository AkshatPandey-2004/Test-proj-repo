import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { 
  Zap, Activity, Clock, TrendingUp, AlertCircle, DollarSign,
  RefreshCw, Home, ChevronRight, AlertTriangle, CheckCircle, Info,
  ArrowUp, ArrowDown, Gauge, BarChart3, Users, FileText, Server,
  Cpu, HardDrive, GitBranch
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
  ComposedChart, ScatterChart, Scatter, ZAxis, ReferenceLine
} from 'recharts';

const API_GATEWAY_URL = "http://localhost:3003";
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#FF6B9D', '#C084FC'];

const LambdaDashboard = ({ userId, initialRegion, onLogout }) => {
  const navigate = useNavigate();
  const [functions, setFunctions] = useState([]);
  const [region, setRegion] = useState(initialRegion || "us-east-1");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30m');
  
  // Time-series data
  const [invocationsHistoryData, setInvocationsHistoryData] = useState([]);
  const [durationHistoryData, setDurationHistoryData] = useState([]);
  const [errorsHistoryData, setErrorsHistoryData] = useState([]);
  const [concurrencyHistoryData, setConcurrencyHistoryData] = useState([]);
  const [throttlesHistoryData, setThrottlesHistoryData] = useState([]);
  const [coldStartsHistoryData, setColdStartsHistoryData] = useState([]);
  
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

  const fetchLambdaData = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = `${API_GATEWAY_URL}/api/data/metrics/${userId}?  region=${region}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Failed to fetch Lambda data');
      
      const data = await res.json();
      const lambdaData = data.resources.lambda || [];
      setFunctions(lambdaData);
      
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Calculate metrics
      const totalInvocations = lambdaData.reduce((sum, func) => sum + (parseInt(func.metrics.invocations) || 0), 0);
      const totalErrors = lambdaData.reduce((sum, func) => sum + (parseInt(func.metrics.errors) || 0), 0);
      const errorRate = totalInvocations > 0 ?  ((totalErrors / totalInvocations) * 100) : 0;
      
      // Simulated advanced metrics (in production, get from CloudWatch)
      const successfulInvocations = totalInvocations - totalErrors;
      const avgDuration = 150 + Math.random() * 200; // ms
      const p50Duration = avgDuration * 0.8;
      const p95Duration = avgDuration * 1.5;
      const p99Duration = avgDuration * 2;
      const maxDuration = avgDuration * 2.5;
      
      const concurrentExecutions = Math.floor(Math.random() * 500) + 50;
      const throttles = Math.floor(Math.random() * 20);
      const coldStarts = Math.floor(totalInvocations * 0.05); // 5% cold starts
      const warmStarts = totalInvocations - coldStarts;
      
      const memoryUtilization = 45 + Math.random() * 30; // %
      const iteratorAge = Math.floor(Math.random() * 5000); // ms (for stream-based functions)
      
      // Update time-series
      setInvocationsHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          total: totalInvocations,
          successful: successfulInvocations,
          errors: totalErrors,
          errorRate: parseFloat(errorRate.toFixed(2))
        }];
        return updated.  slice(-60);
      });

      setDurationHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          avg: parseFloat(avgDuration.toFixed(2)),
          p50: parseFloat(p50Duration.toFixed(2)),
          p95: parseFloat(p95Duration. toFixed(2)),
          p99: parseFloat(p99Duration.toFixed(2)),
          max: parseFloat(maxDuration.toFixed(2))
        }];
        return updated. slice(-60);
      });

      setErrorsHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          errors: totalErrors,
          rate: parseFloat(errorRate.toFixed(2))
        }];
        return updated.slice(-60);
      });

      setConcurrencyHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          concurrent: concurrentExecutions,
          throttles: throttles
        }];
        return updated. slice(-60);
      });

      setThrottlesHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          throttles: throttles
        }];
        return updated.slice(-60);
      });

      setColdStartsHistoryData(prev => {
        const updated = [...prev, {
          time: timestamp,
          cold: coldStarts,
          warm: warmStarts,
          coldStartRate: totalInvocations > 0 ? parseFloat(((coldStarts / totalInvocations) * 100).  toFixed(2)) : 0
        }];
        return updated.slice(-60);
      });
      
      setMetrics({
        totalInstances: (data.resources.ec2 || []).length,
        runningInstances: (data.resources.ec2 || []).filter(r => r.state === "running").length,
        avgCpu: 0,
        totalS3Buckets: (data.resources.s3 || []).length,
        totalRDS: (data.resources.rds || []).length,
        totalLambda: lambdaData.length,
        totalEBS: (data.resources.ebs || []).length,
      });
      
      setLoading(false);
    } catch (err) {
      console. error("Error fetching Lambda data:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleRegionChange = async (newRegion) => {
    setRegion(newRegion);
    setFunctions([]);
    setInvocationsHistoryData([]);
    setDurationHistoryData([]);
    setErrorsHistoryData([]);
    setConcurrencyHistoryData([]);
    setThrottlesHistoryData([]);
    setColdStartsHistoryData([]);
    localStorage.setItem('region', newRegion);
    
    try {
      await fetch(`${API_GATEWAY_URL}/api/auth/update-region`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, region: newRegion })
      });
      
      setTimeout(() => fetchLambdaData(), 2000);
    } catch (err) {
      console.error("Error updating region:", err);
    }
  };

  useEffect(() => {
    fetchLambdaData();
    const interval = setInterval(fetchLambdaData, 5000);
    return () => clearInterval(interval);
  }, [userId, region]);

  // Calculate metrics
  const totalFunctions = functions.length;
  const totalInvocations = functions.reduce((sum, func) => sum + (parseInt(func.metrics.invocations) || 0), 0);
  const totalErrors = functions.reduce((sum, func) => sum + (parseInt(func.metrics.errors) || 0), 0);
  const errorRate = totalInvocations > 0 ? ((totalErrors / totalInvocations) * 100) : 0;

  // Runtime distribution
  const runtimeDistribution = functions.reduce((acc, func) => {
    const runtime = func.runtime || 'unknown';
    acc[runtime] = (acc[runtime] || 0) + 1;
    return acc;
  }, {});
  const runtimeData = Object.entries(runtimeDistribution).map(([runtime, count]) => ({
    name: runtime,
    value: count
  }));

  // Memory distribution
  const memoryDistribution = functions.reduce((acc, func) => {
    const memory = `${func.memorySize} MB`;
    acc[memory] = (acc[memory] || 0) + 1;
    return acc;
  }, {});
  const memoryData = Object.entries(memoryDistribution). map(([memory, count]) => ({
    name: memory,
    value: count
  }));

  // Invocations by function
  const invocationsByFunction = functions
    .map(func => ({
      name: func.name. substring(0, 15),
      invocations: parseInt(func.metrics.invocations) || 0,
      errors: parseInt(func.metrics.errors) || 0
    }))
    .sort((a, b) => b.invocations - a.invocations)
    .slice(0, 10);

  // Duration by function
  const durationByFunction = functions
    .map(func => ({
      name: func.name.substring(0, 15),
      duration: parseFloat(func.metrics.avgDuration) || 0
    }))
    .sort((a, b) => b.duration - a.duration)
    . slice(0, 10);

  // Performance scatter (invocations vs duration)
  const performanceScatter = functions.map(func => ({
    name: func.name.substring(0, 10),
    invocations: parseInt(func.metrics.invocations) || 0,
    duration: parseFloat(func.metrics. avgDuration) || 0,
    errors: parseInt(func. metrics.errors) || 0
  }));

  // Latest metrics
  const latestInvocations = invocationsHistoryData[invocationsHistoryData.length - 1];
  const latestDuration = durationHistoryData[durationHistoryData. length - 1];
  const latestConcurrency = concurrencyHistoryData[concurrencyHistoryData. length - 1];
  const latestColdStarts = coldStartsHistoryData[coldStartsHistoryData.length - 1];

  // Trends
  const invocationsTrend = invocationsHistoryData.length > 10 ? 
    (latestInvocations?. total || 0) - (invocationsHistoryData[invocationsHistoryData.length - 10]?.total || 0) : 0;
  const errorRateTrend = invocationsHistoryData.length > 10 ? 
    (latestInvocations?.errorRate || 0) - (invocationsHistoryData[invocationsHistoryData.length - 10]?.errorRate || 0) : 0;

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
                <span className="text-white font-semibold">Lambda Serverless Analytics</span>
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

                <button onClick={fetchLambdaData} disabled={loading}
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
              <Zap className="text-orange-500" size={32} />
              Lambda Serverless Monitoring
            </h1>
            <p className="text-gray-400 flex items-center gap-2 text-sm">
              <Clock size={14} />
              Function performance • Invocation tracking • Error analysis • Cost optimization
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
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-orange-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Total Functions</span>
                <Zap size={16} className="text-orange-500" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{totalFunctions}</div>
              <div className="text-xs text-gray-500">serverless</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Invocations</span>
                <div className="flex items-center gap-1">
                  {invocationsTrend > 0 ? <ArrowUp size={12} className="text-blue-400" /> : 
                   invocationsTrend < 0 ? <ArrowDown size={12} className="text-green-400" /> : null}
                </div>
              </div>
              <div className="text-3xl font-bold text-blue-400 mb-1">{latestInvocations?.total?. toLocaleString() || '0'}</div>
              <div className="text-xs text-gray-500">total calls</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-green-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Success Rate</span>
                <CheckCircle size={16} className="text-green-500" />
              </div>
              <div className="text-3xl font-bold text-green-400 mb-1">
                {latestInvocations ?  ((100 - latestInvocations.errorRate). toFixed(1)) : '100. 0'}%
              </div>
              <div className="text-xs text-gray-500">{latestInvocations?. successful?.toLocaleString() || '0'} successful</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-red-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Error Rate</span>
                <div className="flex items-center gap-1">
                  {errorRateTrend > 0 ? <ArrowUp size={12} className="text-red-400" /> : 
                   errorRateTrend < 0 ? <ArrowDown size={12} className="text-green-400" /> : null}
                </div>
              </div>
              <div className="text-3xl font-bold text-red-400 mb-1">{latestInvocations?.errorRate?.toFixed(2) || '0.00'}%</div>
              <div className="text-xs text-gray-500">{latestInvocations?.errors || '0'} errors</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Avg Duration</span>
                <Gauge size={16} className="text-purple-500" />
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-1">{latestDuration?.avg?.toFixed(0) || '0'}</div>
              <div className="text-xs text-gray-500">ms (P95: {latestDuration?.p95?.toFixed(0) || '0'}ms)</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-cyan-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Concurrency</span>
                <Activity size={16} className="text-cyan-500" />
              </div>
              <div className="text-3xl font-bold text-cyan-400 mb-1">{latestConcurrency?. concurrent || '0'}</div>
              <div className="text-xs text-gray-500">{latestConcurrency?.throttles || '0'} throttles</div>
            </div>
          </div>

          {/* Main Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Invocations Over Time */}
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity size={20} className="text-blue-500" />
                    Invocations & Errors
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Total invocations, successful, and errors over time</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={invocationsHistoryData}>
                  <defs>
                    <linearGradient id="invocGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#invocGrad)" strokeWidth={2} name="Total Invocations" />
                  <Area type="monotone" dataKey="errors" stroke="#ef4444" fill="url(#errorGrad)" strokeWidth={2} name="Errors" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Runtime Distribution */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <GitBranch size={20} className="text-orange-500" />
                Runtime Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={runtimeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={(entry) => entry.name}
                  >
                    {runtimeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Duration & Cold Starts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Function Duration */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={20} className="text-purple-500" />
                Execution Duration (P50, P95, P99)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={durationHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v}ms`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2} name="P50" dot={false} />
                  <Line type="monotone" dataKey="avg" stroke="#a855f7" strokeWidth={2.5} name="Avg" dot={false} />
                  <Line type="monotone" dataKey="p95" stroke="#f59e0b" strokeWidth={2} name="P95" dot={false} />
                  <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} name="P99" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Cold Starts */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Gauge size={20} className="text-cyan-500" />
                Cold Starts vs Warm Starts
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={coldStartsHistoryData}>
                  <defs>
                    <linearGradient id="coldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="warmGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Area type="monotone" dataKey="warm" stroke="#10b981" fill="url(#warmGrad)" stackId="1" strokeWidth={2} name="Warm Starts" />
                  <Area type="monotone" dataKey="cold" stroke="#06b6d4" fill="url(#coldGrad)" stackId="1" strokeWidth={2} name="Cold Starts" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Concurrency & Throttles */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Concurrent Executions */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users size={20} className="text-indigo-500" />
                Concurrent Executions
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={concurrencyHistoryData}>
                  <defs>
                    <linearGradient id="concurrencyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={1000} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: 'Account Limit', fill: '#fbbf24', fontSize: 10 }} />
                  <Area type="monotone" dataKey="concurrent" stroke="#6366f1" fill="url(#concurrencyGrad)" strokeWidth={2.5} name="Concurrent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Throttles */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-yellow-500" />
                Throttles
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={throttlesHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="throttles" fill="#fbbf24" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Invocations & Duration by Function */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Invocations by Function */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-500" />
                Top 10 Functions by Invocations
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={invocationsByFunction} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: '10px' }} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="invocations" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Duration by Function */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={20} className="text-purple-500" />
                Top 10 Functions by Duration
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={durationByFunction}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `${v}ms`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="duration" fill="#a855f7" radius={[8, 8, 0, 0]}>
                    {durationByFunction.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.duration > 3000 ? '#ef4444' : entry.duration > 1000 ?  '#f59e0b' : '#a855f7'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Scatter & Memory Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Performance Scatter */}
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-cyan-500" />
                Performance Analysis (Invocations vs Duration)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" dataKey="invocations" name="Invocations" stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <YAxis type="number" dataKey="duration" name="Duration (ms)" stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <ZAxis type="number" dataKey="errors" range={[50, 400]} name="Errors" />
                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Functions" data={performanceScatter} fill="#06b6d4">
                    {performanceScatter.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.errors > 0 ? '#ef4444' : COLORS[index % COLORS.length]} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Top-right: High usage + High duration (optimize) • Red dots: Functions with errors
              </p>
            </div>

            {/* Memory Distribution */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <HardDrive size={20} className="text-green-500" />
                Memory Allocation
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={memoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {memoryData. map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS. length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Function Details Table */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText size={20} className="text-gray-400" />
              Function Inventory
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 border-b-2 border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Function Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Runtime</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Memory</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Invocations</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Errors</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Avg Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {functions.map((func) => {
                    const funcErrors = parseInt(func.metrics.errors) || 0;
                    const funcInvocations = parseInt(func. metrics.invocations) || 0;
                    const funcErrorRate = funcInvocations > 0 ?  ((funcErrors / funcInvocations) * 100) : 0;
                    const isHealthy = funcErrorRate < 1;
                    
                    return (
                      <tr key={func.name} className="hover:bg-gray-750 transition-colors text-gray-300">
                        <td className="px-4 py-3 font-semibold text-white">{func.name}</td>
                        <td className="px-4 py-3 text-orange-400">{func.runtime}</td>
                        <td className="px-4 py-3">{func.memorySize} MB</td>
                        <td className="px-4 py-3 text-blue-400">{funcInvocations. toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            funcErrors > 0 ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'
                          }`}>
                            {funcErrors}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-purple-400">{func.metrics.avgDuration} ms</td>
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
              {functions.length === 0 && (
                <div className="text-center py-12">
                  <Zap size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500">No Lambda functions found in {region}</p>
                </div>
              )}
            </div>
          </div>

          {/* Alerts & Recommendations */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-yellow-500" />
              Optimization & Cost Savings
            </h3>
            <div className="space-y-3">
              {latestInvocations?. errorRate > 5 && (
                <div className="flex items-start gap-3 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-red-400">Critical: High Error Rate</p>
                      <span className="text-xs text-red-500 font-mono">{new Date(). toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-red-300">
                      Error rate at {latestInvocations. errorRate.toFixed(2)}%.  Investigate failing functions, check CloudWatch Logs, and implement proper error handling.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded transition-colors">View Logs</button>
                      <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors">Check X-Ray</button>
                    </div>
                  </div>
                </div>
              )}

              {durationByFunction.some(f => f.duration > 3000) && (
                <div className="flex items-start gap-3 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                  <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-yellow-400">Warning: Long Execution Time</p>
                      <span className="text-xs text-yellow-500 font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-yellow-300">
                      Some functions exceed 3 seconds duration.  Optimize code, increase memory allocation (CPU scales with memory), or break into smaller functions.
                    </p>
                  </div>
                </div>
              )}

              {latestColdStarts?.coldStartRate > 10 && (
                <div className="flex items-start gap-3 p-4 bg-cyan-900/30 border border-cyan-700 rounded-lg">
                  <Info size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-cyan-400">Info: High Cold Start Rate</p>
                      <span className="text-xs text-cyan-500 font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-cyan-300">
                      {latestColdStarts.coldStartRate.toFixed(1)}% cold starts detected. Consider using Provisioned Concurrency for latency-sensitive functions.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-green-900/30 border border-green-700 rounded-lg">
                <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-400 mb-1">Cost Optimization Tips</p>
                  <ul className="text-xs text-green-300 space-y-1">
                    <li>• Use Lambda Power Tuning to find optimal memory/cost balance</li>
                    <li>• Enable X-Ray tracing to identify performance bottlenecks</li>
                    <li>• Implement dead letter queues (DLQ) for failed async invocations</li>
                    <li>• Use reserved concurrency to prevent runaway costs</li>
                    <li>• Monitor billed duration vs actual execution time</li>
                    <li>• Consider Step Functions for complex workflows instead of chaining</li>
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

export default LambdaDashboard;