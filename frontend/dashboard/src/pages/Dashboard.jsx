import React, { useState, useEffect } from "react";
import { 
  Server, Cloud, RefreshCw, Settings, LogOut, ChevronDown, 
  Database, Zap, HardDrive, DollarSign, TrendingUp, AlertCircle,
  Home, ChevronRight, Activity, Cpu, Gauge
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TrendChart from "../components/TrendChart";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

const API_GATEWAY_URL = "http://localhost:3003";

const Dashboard = ({ userId, initialRegion, onLogout }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalInstances: 0,
    runningInstances: 0,
    avgCpu: 0,
    totalS3Buckets: 0,
    totalRDS: 0,
    totalLambda: 0,
    totalEBS: 0,
  });
  const [cpuHistory, setCpuHistory] = useState([]);
  const [resources, setResources] = useState({
    ec2: [],
    s3: [],
    rds: [],
    lambda: [],
    ebs: []
  });
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [region, setRegion] = useState(initialRegion || "us-east-1");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedEmail = localStorage.getItem('email');
    if (storedUsername) setUsername(storedUsername);
    if (storedEmail) setEmail(storedEmail);
  }, []);

  const fetchMetrics = async () => {
    if (!userId) {
      console.error('No userId provided');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const url = `${API_GATEWAY_URL}/api/data/metrics/${userId}? region=${region}`;
      const res = await fetch(url);
      
      const contentType = res.headers.get('content-type');
      if (! contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response.');
      }
      
      if (! res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();

      setResources({
        ec2: data.resources.ec2 || [],
        s3: data.resources.s3 || [],
        rds: data.resources.rds || [],
        lambda: data.resources.lambda || [],
        ebs: data.resources.ebs || []
      });

      const ec2Instances = data.resources.ec2 || [];
      const totalInstances = ec2Instances. length;
      const runningInstances = ec2Instances.filter(r => r.state === "running").length;

      const numericCpus = ec2Instances
        .map((r) => parseFloat(r.metrics.cpuUtilization))
        .filter((v) => ! isNaN(v));

      const avgCpu = numericCpus.length > 0
        ? (numericCpus.reduce((a, b) => a + b, 0) / numericCpus.length).toFixed(2)
        : "0.00";

      setCpuHistory((prev) => {
        const now = new Date(). toLocaleTimeString();
        const updated = [... prev, { time: now, cpu: parseFloat(avgCpu) }];
        return updated. slice(-15);
      });

      setMetrics({
        totalInstances,
        runningInstances,
        avgCpu,
        totalS3Buckets: (data.resources.s3 || []).length,
        totalRDS: (data.resources.rds || []).length,
        totalLambda: (data. resources.lambda || []).length,
        totalEBS: (data.resources.ebs || []). length,
      });

      setLoading(false);
    } catch (err) {
      console. error("Error fetching metrics:", err);
      setError(err.message || "Failed to fetch AWS data.");
      setLoading(false);
    }
  };

  const fetchCostData = async () => {
    try {
      const response = await fetch(`${API_GATEWAY_URL}/api/data/costs/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setCostData(data);
      }
    } catch (err) {
      console.error("Error fetching cost data:", err);
    }
  };

  const handleRegionChange = async (newRegion) => {
    setRegion(newRegion);
    setResources({ ec2: [], s3: [], rds: [], lambda: [], ebs: [] });
    setCpuHistory([]);
    setMetrics({ totalInstances: 0, runningInstances: 0, avgCpu: 0, totalS3Buckets: 0, totalRDS: 0, totalLambda: 0, totalEBS: 0 });
    localStorage.setItem('region', newRegion);
    
    try {
      await fetch(`${API_GATEWAY_URL}/api/auth/update-region`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, region: newRegion })
      });
      
      setTimeout(() => {
        fetchMetrics();
        fetchCostData();
      }, 2000);
    } catch (err) {
      console.error("Error updating region:", err);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchCostData();
    const interval = setInterval(() => {
      fetchMetrics();
      fetchCostData();
    }, 5000);
    return () => clearInterval(interval);
  }, [userId, region]);

  const { totalInstances, runningInstances, avgCpu, totalS3Buckets, totalRDS, totalLambda, totalEBS } = metrics;

  const costChartData = costData?. dailyCosts?.slice(-7) || [];
  const pieData = costData?.serviceBreakdown?. slice(0, 5). map(item => ({
    name: item.service. replace('Amazon ', '').replace('AWS ', ''),
    value: parseFloat(item.cost)
  })) || [];
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Component */}
      <Sidebar 
        userId={userId}
        username={username}
        email={email}
        onLogout={onLogout}
        metrics={metrics}
      />

      {/* Main Content */}
      <div className="lg:ml-72 transition-all duration-300">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm">
                <Home size={16} className="text-gray-500" />
                <ChevronRight size={14} className="text-gray-400" />
                <span className="font-semibold text-gray-700">Dashboard</span>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-3">
                {/* Region Selector */}
                <select
                  value={region}
                  onChange={(e) => handleRegionChange(e.target. value)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {awsRegions.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>

                {/* Refresh Button */}
                <button
                  onClick={() => {
                    fetchMetrics();
                    fetchCostData();
                  }}
                  disabled={loading}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw size={20} className={`text-gray-700 ${loading ? 'animate-spin' : ''}`} />
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {username. charAt(0).toUpperCase()}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-bold text-gray-800">{username}</p>
                        <p className="text-xs text-gray-500 mt-1">{email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/profile');
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <Settings size={18} />
                        <span>Profile Settings</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          if (onLogout) onLogout();
                          navigate('/login');
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                      >
                        <LogOut size={18} />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome back, {username}!  👋</h1>
            <p className="text-gray-600">Here's what's happening with your AWS infrastructure today. </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <span className="font-semibold text-red-800">Error:</span>
                <span className="text-red-700 ml-2">{error}</span>
              </div>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Resources */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Cloud size={24} className="text-blue-600" />
                </div>
                <TrendingUp size={20} className="text-green-500" />
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">Total Resources</h3>
              <p className="text-3xl font-bold text-gray-800">
                {totalInstances + totalS3Buckets + totalRDS + totalLambda + totalEBS}
              </p>
              <p className="text-xs text-gray-500 mt-2">Across all services</p>
            </div>

            {/* Running EC2 */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                 onClick={() => navigate('/ec2')}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Server size={24} className="text-orange-600" />
                </div>
                <Activity size={20} className="text-orange-500" />
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">Running EC2</h3>
              <p className="text-3xl font-bold text-gray-800">{runningInstances}</p>
              <p className="text-xs text-gray-500 mt-2">of {totalInstances} instances</p>
            </div>

            {/* Average CPU */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Cpu size={24} className="text-purple-600" />
                </div>
                <Gauge size={20} className="text-purple-500" />
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">Avg CPU Usage</h3>
              <p className="text-3xl font-bold text-gray-800">{avgCpu}%</p>
              <p className="text-xs text-gray-500 mt-2">Across all EC2 instances</p>
            </div>

            {/* Monthly Cost */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                 onClick={() => navigate('/costs')}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign size={24} className="text-green-600" />
                </div>
                <TrendingUp size={20} className="text-green-500" />
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">Month to Date</h3>
              <p className="text-3xl font-bold text-gray-800">
                ${costData?.currentMonthToDate || '0. 00'}
              </p>
              <p className="text-xs text-gray-500 mt-2">Est. ${costData?.estimatedMonthlyTotal || '0.00'} total</p>
            </div>
          </div>
            {/* Historical Trends Section - NEW */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Historical Trends</h2>
                <p className="text-sm text-gray-600">Track your resource usage over time</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* EC2 CPU Utilization Trend */}
              <TrendChart 
                userId={userId} 
                service="EC2" 
                metric="cpuUtilization"
                title="EC2 CPU Utilization Over Time"
              />

              {/* EC2 Instance Count Trend */}
              <TrendChart 
                userId={userId} 
                service="EC2" 
                metric="instanceCount"
                title="EC2 Instance Count Trend"
              />

              {/* S3 Bucket Count Trend */}
              <TrendChart 
                userId={userId} 
                service="S3" 
                metric="bucketCount"
                title="S3 Bucket Count Trend"
              />

              {/* RDS Database Count Trend */}
              <TrendChart 
                userId={userId} 
                service="RDS" 
                metric="databaseCount"
                title="RDS Database Count Trend"
              />
            </div>
          </div>
          {/* Main Grid - Charts & Resources */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* CPU Usage Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">EC2 CPU Usage</h3>
                  <p className="text-sm text-gray-500">Real-time monitoring</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-600">{avgCpu}%</p>
                  <p className="text-xs text-gray-500">Current</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={cpuHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" style={{ fontSize: '12px' }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="cpu" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Service Distribution */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Resource Distribution</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                     onClick={() => navigate('/ec2')}>
                  <div className="flex items-center gap-3">
                    <Server size={20} className="text-orange-600" />
                    <span className="font-medium text-gray-700">EC2</span>
                  </div>
                  <span className="font-bold text-gray-800">{totalInstances}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                     onClick={() => navigate('/s3')}>
                  <div className="flex items-center gap-3">
                    <Database size={20} className="text-green-600" />
                    <span className="font-medium text-gray-700">S3</span>
                  </div>
                  <span className="font-bold text-gray-800">{totalS3Buckets}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                     onClick={() => navigate('/rds')}>
                  <div className="flex items-center gap-3">
                    <Database size={20} className="text-blue-600" />
                    <span className="font-medium text-gray-700">RDS</span>
                  </div>
                  <span className="font-bold text-gray-800">{totalRDS}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                     onClick={() => navigate('/lambda')}>
                  <div className="flex items-center gap-3">
                    <Zap size={20} className="text-yellow-600" />
                    <span className="font-medium text-gray-700">Lambda</span>
                  </div>
                  <span className="font-bold text-gray-800">{totalLambda}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                     onClick={() => navigate('/ebs')}>
                  <div className="flex items-center gap-3">
                    <HardDrive size={20} className="text-purple-600" />
                    <span className="font-medium text-gray-700">EBS</span>
                  </div>
                  <span className="font-bold text-gray-800">{totalEBS}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Overview Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Cost Trend */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Cost Trend (7 Days)</h3>
                  <p className="text-sm text-gray-500">Daily spending overview</p>
                </div>
                <button 
                  onClick={() => navigate('/costs')}
                  className="text-sm text-indigo-600 font-semibold hover:text-indigo-700"
                >
                  View Details →
                </button>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={costChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={(date) => new Date(date).getDate()} style={{ fontSize: '12px' }} />
                  <YAxis tickFormatter={(v) => `$${v}`} style={{ fontSize: '12px' }} />
                  <Tooltip formatter={(value) => [`$${value}`, 'Cost']} />
                  <Bar dataKey="cost" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Cost by Service */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Cost by Service</h3>
                  <p className="text-sm text-gray-500">Top 5 services</p>
                </div>
                <button 
                  onClick={() => navigate('/costs')}
                  className="text-sm text-indigo-600 font-semibold hover:text-indigo-700"
                >
                  View All →
                </button>
              </div>
              {pieData. length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400">
                  <p>No cost data available</p>
                </div>
              )}
            </div>
          </div>

          {/* All Services Overview - Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* S3 Buckets Preview */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Recent S3 Buckets</h3>
                <button 
                  onClick={() => navigate('/s3')}
                  className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1"
                >
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="space-y-3">
                {resources.s3.slice(0, 5).map((bucket) => (
                  <div key={bucket.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                       onClick={() => navigate('/s3')}>
                    <div className="flex items-center gap-3">
                      <Database size={18} className="text-green-600" />
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{bucket.name}</p>
                        <p className="text-xs text-gray-500">{bucket.numberOfObjects} objects</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 font-semibold">{bucket.sizeDisplay}</span>
                  </div>
                ))}
                {resources.s3.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No S3 buckets found in {region}</p>
                )}
              </div>
            </div>

            {/* Lambda Functions Preview */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Recent Lambda Functions</h3>
                <button 
                  onClick={() => navigate('/lambda')}
                  className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1"
                >
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="space-y-3">
                {resources.lambda.slice(0, 5).map((func) => (
                  <div key={func.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                       onClick={() => navigate('/lambda')}>
                    <div className="flex items-center gap-3">
                      <Zap size={18} className="text-yellow-600" />
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{func.name}</p>
                        <p className="text-xs text-gray-500">{func. runtime}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 font-semibold">{func. metrics.invocations} calls</span>
                  </div>
                ))}
                {resources.lambda.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No Lambda functions found in {region}</p>
                )}
              </div>
            </div>
          </div>

          {/* EC2 Instances Table */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">EC2 Instances Overview</h3>
              <button 
                onClick={() => navigate('/ec2')}
                className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1"
              >
                View All <ChevronRight size={16} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Instance ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">CPU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {resources.ec2.slice(0, 5). map((instance) => (
                    <tr key={instance.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/ec2')}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{instance.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{instance.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{instance.instanceType}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          instance. state === 'running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {instance.state}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{instance.metrics.cpuUtilization}%</td>
                    </tr>
                  ))}
                  {resources.ec2.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        No EC2 instances found in {region}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RDS & EBS Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* RDS Databases */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">RDS Databases</h3>
                <button 
                  onClick={() => navigate('/rds')}
                  className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1"
                >
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="space-y-3">
                {resources.rds. slice(0, 4).map((db) => (
                  <div key={db. identifier} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                       onClick={() => navigate('/rds')}>
                    <div className="flex items-center gap-3">
                      <Database size={18} className="text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{db.identifier}</p>
                        <p className="text-xs text-gray-500">{db. engine}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      db. status === 'available' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {db.status}
                    </span>
                  </div>
                ))}
                {resources.rds.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No RDS databases found in {region}</p>
                )}
              </div>
            </div>

            {/* EBS Volumes */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">EBS Volumes</h3>
                <button 
                  onClick={() => navigate('/ebs')}
                  className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1"
                >
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="space-y-3">
                {resources.ebs.slice(0, 4).map((volume) => (
                  <div key={volume.volumeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                       onClick={() => navigate('/ebs')}>
                    <div className="flex items-center gap-3">
                      <HardDrive size={18} className="text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{volume.volumeId}</p>
                        <p className="text-xs text-gray-500">{volume.volumeType}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 font-semibold">{volume.size}</span>
                  </div>
                ))}
                {resources.ebs.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No EBS volumes found in {region}</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;