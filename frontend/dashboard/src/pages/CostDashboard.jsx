import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import CostCard from '../components/CostCard';
import ServiceCostCard from '../components/ServiceCostCard';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend
} from 'recharts';

const API_GATEWAY_URL = 'http://localhost:3003';

const CostDashboard = ({ userId }) => {
  const navigate = useNavigate();
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

  const fetchCostData = async () => {
  setLoading(true);
  setError(null);

  try {
    console.log('Fetching cost data for user:', userId);
    const response = await fetch(`${API_GATEWAY_URL}/api/data/costs/${userId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch cost data');
    }

    const data = await response.json();
    console.log('Cost data received:', data);
    console.log('Service breakdown:', data.serviceBreakdown);
    console.log('Daily costs:', data.dailyCosts);
    
    // Validate data structure
    if (!data.serviceBreakdown) {
      data.serviceBreakdown = [];
    }
    if (!data.dailyCosts) {
      data.dailyCosts = [];
    }
    
    setCostData(data);
    setLoading(false);
  } catch (err) {
    console.error('Error fetching cost data:', err);
    setError(err.message);
    setLoading(false);
  }
};

  useEffect(() => {
    if (userId) {
      fetchCostData();
      // Refresh every 5 minutes
      const interval = setInterval(fetchCostData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin"><RefreshCw size={48} className="text-indigo-600" /></div>
          <p className="text-gray-600 font-medium">Loading cost data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 mb-6 transition"
        >
          <ArrowLeft size={20} />
          <span className="font-semibold">Back to Dashboard</span>
        </button>
        
        <div className="bg-red-100 border border-red-300 text-red-800 p-6 rounded-xl">
          <h3 className="font-bold text-lg mb-2">Error Loading Cost Data</h3>
          <p>{error}</p>
          <p className="text-sm mt-2">Make sure your IAM user has Cost Explorer permissions.</p>
          <button 
            onClick={fetchCostData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const estimatedIncrease = costData ? 
    (parseFloat(costData.estimatedMonthlyTotal) - parseFloat(costData.currentMonthToDate)).toFixed(2) 
    : '0.00';

  // Prepare pie chart data
  const pieData = costData?.serviceBreakdown?.slice(0, 6).map(item => ({
    name: item.service.replace('Amazon ', '').replace('AWS ', ''),
    value: parseFloat(item.cost)
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 transition"
            >
              <ArrowLeft size={20} />
              <span className="font-semibold">Back</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-800">💰 Cost Monitoring</h1>
          </div>
          
          <button
            onClick={fetchCostData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-full shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
        </div>

        {/* Period Info */}
        <div className="flex items-center space-x-2 text-gray-600 mb-6">
          <Calendar size={16} />
          <span className="text-sm">
            Period: {costData?.period?.start} to {costData?.period?.end}
          </span>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <CostCard
            title="Current Month (To Date)"
            amount={costData?.currentMonthToDate || '0.00'}
            color="blue"
          />
          <CostCard
            title="Estimated Month Total"
            amount={costData?.estimatedMonthlyTotal || '0.00'}
            trend="up"
            trendValue={`+$${estimatedIncrease} remaining`}
            color="orange"
          />
          <CostCard
            title="Top Service"
            amount={costData?.serviceBreakdown?.[0]?.cost || '0.00'}
            color="green"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Cost Trend */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <TrendingUp size={20} className="mr-2 text-indigo-600" />
              Daily Cost Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={costData?.dailyCosts || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => new Date(date).getDate()}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  formatter={(value) => [`$${value}`, 'Cost']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Cost by Service (Pie Chart) */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <DollarSign size={20} className="mr-2 text-green-600" />
              Cost Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Cost by Service
          </h3>
          
          {costData?.serviceBreakdown?.length === 0 ? (
            <p className="text-gray-500 italic">No cost data available for this period.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {costData?.serviceBreakdown?.map((service, index) => (
                <ServiceCostCard
                  key={index}
                  service={service.service}
                  cost={service.cost}
                  percentage={service.percentage}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cost Optimization Tips */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-indigo-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 Cost Optimization Tips</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start space-x-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Stop unused EC2 instances during off-hours to save up to 70% on compute costs</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Enable S3 Intelligent-Tiering to automatically move data to cheaper storage classes</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Use Reserved Instances or Savings Plans for predictable workloads (save up to 72%)</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Delete old EBS snapshots and unused volumes</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CostDashboard;