import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

const API_GATEWAY_URL = 'http://localhost:3003';

const TrendChart = ({ userId, service, metric, title }) => {
  const [data, setData] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendData();
  }, [timeRange, service, metric, userId]);

  const fetchTrendData = async () => {
    setLoading(true);
    try {
      // Fetch historical data
      const historyRes = await fetch(
        `${API_GATEWAY_URL}/api/analytics/${userId}/metrics/history? service=${service}&metric=${metric}&timeRange=${timeRange}`
      );
      const historyData = await historyRes.json();
      
      if (historyData.success && historyData.data) {
        const formatted = historyData.data.map(d => ({
          time: new Date(d.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          }),
          value: parseFloat(d.value. toFixed(2)),
          fullDate: new Date(d.timestamp). toLocaleString()
        }));
        setData(formatted);
      }

      // Fetch trend comparison
      const trendRes = await fetch(
        `${API_GATEWAY_URL}/api/analytics/${userId}/metrics/trends?service=${service}&metric=${metric}`
      );
      const trendData = await trendRes.json();
      
      if (trendData.success) {
        setTrend(trendData. trends);
      }
    } catch (error) {
      console.error('Error fetching trend data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-800">{title || `${metric} Trend`}</h3>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="1h">Last Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {trend && trend.comparisons && (
        <div className="flex gap-6 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {trend.comparisons.week. direction === 'up' ? (
              <TrendingUp className="text-red-500" size={20} />
            ) : (
              <TrendingDown className="text-green-500" size={20} />
            )}
            <div>
              <span className="text-sm text-gray-600">vs Last Week</span>
              <p className={`font-semibold ${trend.comparisons.week.direction === 'up' ? 'text-red-600' : 'text-green-600'}`}>
                {Math.abs(trend.comparisons. week.change)}% {trend.comparisons.week.direction === 'up' ? '↑' : '↓'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {trend.comparisons.month.direction === 'up' ? (
              <TrendingUp className="text-red-500" size={20} />
            ) : (
              <TrendingDown className="text-green-500" size={20} />
            )}
            <div>
              <span className="text-sm text-gray-600">vs Last Month</span>
              <p className={`font-semibold ${trend. comparisons.month.direction === 'up' ? 'text-red-600' : 'text-green-600'}`}>
                {Math.abs(trend. comparisons.month.change)}% {trend.comparisons.month. direction === 'up' ? '↑' : '↓'}
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ?  (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">Loading trend data...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">No historical data available yet.  Data will be collected over time.</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #ddd',
                borderRadius: '8px'
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullDate;
                }
                return label;
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#6366f1" 
              strokeWidth={2}
              dot={{ fill: '#6366f1', r: 3 }}
              activeDot={{ r: 5 }}
              name={metric}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {data.length} data points
        </div>
      )}
    </div>
  );
};

export default TrendChart;