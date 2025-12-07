import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {
  Bell, Plus, Home, ChevronRight, AlertCircle, CheckCircle, Clock,
  Power, Edit2, Trash2, Eye, RefreshCw, Search, Filter, TrendingUp
} from 'lucide-react';

const API_GATEWAY_URL = "http://localhost:3003";

const Alerts = ({ userId, onLogout }) => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const [metrics, setMetrics] = useState({
    totalInstances: 0,
    runningInstances: 0,
    avgCpu: 0,
    totalS3Buckets: 0,
    totalRDS: 0,
    totalLambda: 0,
    totalEBS: 0,
  });

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedEmail = localStorage.getItem('email');
    fetchAlerts();
    fetchStats();
  }, [userId]);

  const fetchAlerts = async () => {
  try {
    console.log('Fetching alerts for userId:', userId);  // ADD THIS
    const res = await fetch(`${API_GATEWAY_URL}/api/alerts/${userId}`);
    console.log('Response status:', res.status);  // ADD THIS
    const data = await res.json();
    console.log('Response data:', data);  // ADD THIS
    
    if (data.success) {
      console.log('Setting alerts:', data.alerts);  // ADD THIS
      setAlerts(data. alerts);
    } else {
      console.log('Success flag is false or missing');  // ADD THIS
    }
    setLoading(false);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    setLoading(false);
  }
};

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_GATEWAY_URL}/api/alerts/${userId}/stats/summary`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const toggleAlert = async (alertId, currentState) => {
    try {
      const res = await fetch(`${API_GATEWAY_URL}/api/alerts/${userId}/${alertId}/toggle`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (data.success) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  };

  const deleteAlert = async (alertId) => {
    if (! window.confirm('Are you sure you want to delete this alert?')) return;
    
    try {
      const res = await fetch(`${API_GATEWAY_URL}/api/alerts/${userId}/${alertId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchAlerts();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.description?. toLowerCase().includes(searchTerm. toLowerCase());
    const matchesService = filterService === 'all' || alert.service === filterService;
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    return matchesSearch && matchesService && matchesSeverity;
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getServiceIcon = (service) => {
    const icons = {
      'EC2': '🖥️',
      'S3': '🪣',
      'RDS': '🗄️',
      'Lambda': '⚡',
      'EBS': '💾',
      'Cost': '💰'
    };
    return icons[service] || '📊';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        userId={userId}
        username={localStorage.getItem('username')}
        email={localStorage.getItem('email')}
        onLogout={onLogout}
        metrics={metrics}
      />

      <div className="lg:ml-72 transition-all duration-300">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Home size={16} className="text-gray-500" />
                <ChevronRight size={14} className="text-gray-400" />
                <span className="text-gray-500 hover:text-gray-700 cursor-pointer" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </span>
                <ChevronRight size={14} className="text-gray-400" />
                <span className="font-semibold text-gray-700">Alerts</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchAlerts}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={20} className={`text-gray-700 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => navigate('/alerts/create')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  <Plus size={20} />
                  Create Alert
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <Bell className="text-indigo-600" size={32} />
              Alert Management
            </h1>
            <p className="text-gray-600">Monitor your AWS resources and get notified when thresholds are exceeded</p>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Total Alerts</span>
                  <Bell size={20} className="text-indigo-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800">{stats.totalAlerts}</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Enabled</span>
                  <CheckCircle size={20} className="text-green-500" />
                </div>
                <p className="text-3xl font-bold text-green-600">{stats.enabledAlerts}</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Total Triggers</span>
                  <TrendingUp size={20} className="text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-blue-600">{stats.totalTriggers}</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Last 24h</span>
                  <Clock size={20} className="text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-orange-600">{stats.recentTriggers}</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Unacknowledged</span>
                  <AlertCircle size={20} className="text-red-500" />
                </div>
                <p className="text-3xl font-bold text-red-600">{stats.unacknowledged}</p>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Services</option>
                <option value="EC2">EC2</option>
                <option value="S3">S3</option>
                <option value="RDS">RDS</option>
                <option value="Lambda">Lambda</option>
                <option value="EBS">EBS</option>
                <option value="Cost">Cost</option>
              </select>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>

          {/* Alerts List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={48} className="text-indigo-500 animate-spin" />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Bell size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Alerts Found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filterService !== 'all' || filterSeverity !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first alert to start monitoring'}
              </p>
              {! searchTerm && filterService === 'all' && filterSeverity === 'all' && (
                <button
                  onClick={() => navigate('/alerts/create')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  <Plus size={20} />
                  Create Your First Alert
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map(alert => (
                <div key={alert._id} className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="text-4xl">{getServiceIcon(alert.service)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-800">{alert.name}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(alert. severity)}`}>
                              {alert.severity. toUpperCase()}
                            </span>
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                              {alert.service}
                            </span>
                          </div>
                          {alert.description && (
                            <p className="text-gray-600 mb-3">{alert.description}</p>
                          )}
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Metric:</span>
                              <code className="px-2 py-1 bg-gray-100 rounded">{alert.metric}</code>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Condition:</span>
                              <code className="px-2 py-1 bg-gray-100 rounded">
                                {alert.condition. operator} {alert.condition.threshold}
                              </code>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Cooldown:</span>
                              <span>{alert.cooldownPeriod} min</span>
                            </div>
                          </div>
                          
                          {/* Notification Methods */}
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-sm text-gray-500">Notifications:</span>
                            {alert.notifications.email. enabled && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                📧 Email ({alert.notifications.email.recipients.length})
                              </span>
                            )}
                            {alert.notifications.inApp.enabled && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                🔔 In-App
                              </span>
                            )}
                            {alert.notifications.webhook.enabled && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                🔗 Webhook
                              </span>
                            )}
                          </div>

                          {/* Alert Stats */}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            <span>Triggered: {alert.triggerCount} times</span>
                            {alert.lastTriggered && (
                              <span>Last: {new Date(alert.lastTriggered).toLocaleString()}</span>
                            )}
                            <span>Created: {new Date(alert.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => toggleAlert(alert._id, alert.enabled)}
                          className={`p-2 rounded-lg transition-colors ${
                            alert.enabled 
                              ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title={alert.enabled ? 'Disable Alert' : 'Enable Alert'}
                        >
                          <Power size={20} />
                        </button>
                        <button
                          onClick={() => navigate(`/alerts/edit/${alert._id}`)}
                          className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors"
                          title="Edit Alert"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => deleteAlert(alert._id)}
                          className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                          title="Delete Alert"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                      <div className={`w-2 h-2 rounded-full ${alert.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        {alert.enabled ?  'Active - Monitoring' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Alerts;