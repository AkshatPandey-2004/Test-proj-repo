import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {
  ArrowLeft, Save, Mail, Bell, Webhook, AlertCircle, CheckCircle, Info
} from 'lucide-react';

const API_GATEWAY_URL = "http://localhost:3003";

const CreateAlert = ({ userId, onLogout }) => {
  const navigate = useNavigate();
  const { alertId } = useParams();
  const isEdit = !!alertId;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    service: 'EC2',
    metric: 'cpuUtilization',
    condition: {
      operator: '>',
      threshold: 80,
      duration: 5
    },
    resourceFilter: {
      monitoringScope: 'all',
      resourceIds: [],
      aggregation: 'average',
      region: 'us-east-1'
    },
    notifications: {
      email: {
        enabled: true,
        recipients: [localStorage.getItem('email') || '']
      },
      inApp: {
        enabled: true
      },
      webhook: {
        enabled: false,
        url: ''
      }
    },
    severity: 'warning',
    cooldownPeriod: 15,
    enabled: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableResources, setAvailableResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);

  const serviceMetrics = {
    'EC2': [
      { value: 'cpuUtilization', label: 'CPU Utilization (%)' },
      { value: 'instanceCount', label: 'Instance Count' },
      { value: 'runningInstances', label: 'Running Instances' },
      { value: 'stoppedInstances', label: 'Stopped Instances' }
    ],
    'S3': [
      { value: 'bucketSize', label: 'Bucket Size (GB)' },
      { value: 'bucketCount', label: 'Bucket Count' },
      { value: 'objectCount', label: 'Object Count' }
    ],
    'RDS': [
      { value: 'cpuUtilization', label: 'CPU Utilization (%)' },
      { value: 'connections', label: 'Database Connections' },
      { value: 'databaseCount', label: 'Database Count' }
    ],
    'Lambda': [
      { value: 'errorRate', label: 'Error Rate (%)' },
      { value: 'invocations', label: 'Invocations' },
      { value: 'errors', label: 'Errors' }
    ],
    'EBS': [
      { value: 'volumeCount', label: 'Volume Count' },
      { value: 'availableVolumes', label: 'Available Volumes' },
      { value: 'totalStorage', label: 'Total Storage (GB)' }
    ],
    'Cost': [
      { value: 'monthlyCost', label: 'Monthly Cost ($)' },
      { value: 'dailyCost', label: 'Daily Cost ($)' }
    ]
  };

  useEffect(() => {
    if (isEdit) {
      fetchAlert();
    }
  }, [alertId]);

  useEffect(() => {
    // Fetch available resources when service changes and monitoring scope is 'specific'
    if (formData.resourceFilter.monitoringScope === 'specific') {
      fetchAvailableResources();
    }
  }, [formData.service, formData.resourceFilter.region, formData.resourceFilter.monitoringScope]);

  const fetchAvailableResources = async () => {
    setLoadingResources(true);
    try {
      const res = await fetch(
        `${API_GATEWAY_URL}/api/data/resources/${userId}?service=${formData.service}&region=${formData.resourceFilter.region}`
      );
      const data = await res.json();
      if (data.resources) {
        setAvailableResources(data.resources);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
      setAvailableResources([]);
    } finally {
      setLoadingResources(false);
    }
  };

  const fetchAlert = async () => {
    try {
      const res = await fetch(`${API_GATEWAY_URL}/api/alerts/${userId}/${alertId}`);
      const data = await res.json();
      if (data.success) {
        setFormData(data.alert);
      }
    } catch (error) {
      console.error('Error fetching alert:', error);
      setError('Failed to load alert');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate specific resource monitoring
    if (formData.resourceFilter.monitoringScope === 'specific' && formData.resourceFilter.resourceIds.length === 0) {
      setError('Please select at least one resource for specific monitoring');
      setLoading(false);
      return;
    }

    // Remove empty email recipients
    const cleanedFormData = {
      ...formData,
      notifications: {
        ...formData.notifications,
        email: {
          ...formData.notifications.email,
          recipients: formData.notifications.email.recipients.filter(email => email.trim() !== '')
        }
      }
    };

    // Validate at least one email recipient if email notifications enabled
    if (cleanedFormData.notifications.email.enabled && cleanedFormData.notifications.email.recipients.length === 0) {
      setError('Please provide at least one email recipient or disable email notifications');
      setLoading(false);
      return;
    }

    // Strip MongoDB internal fields when editing
const { _id, userId: uid, triggerCount, createdAt, updatedAt, __v, lastTriggered, ...dataToSubmit } = cleanedFormData;

console.log('📤 Submitting alert data:', JSON.stringify(dataToSubmit, null, 2));

try {
  const url = isEdit 
    ?  `${API_GATEWAY_URL}/api/alerts/${userId}/${alertId}`
    : `${API_GATEWAY_URL}/api/alerts/${userId}`;
  
  const res = await fetch(url, {
    method: isEdit ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataToSubmit)
  });

      const data = await res.json();
      
      if (data.success) {
        setSuccess(isEdit ? 'Alert updated successfully!' : 'Alert created successfully!');
        setTimeout(() => navigate('/alerts'), 1500);
      } else {
        console.error('❌ Server error:', data);
        // Display detailed validation errors if available
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map(err => 
            typeof err === 'string' ? err : `${err.field}: ${err.message}`
          ).join(', ');
          setError(`Validation failed: ${errorMessages}`);
        } else {
          setError(data.message || 'Failed to save alert');
        }
      }
    } catch (error) {
      console.error('❌ Error saving alert:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addEmailRecipient = () => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        email: {
          ... prev.notifications.email,
          recipients: [...prev.notifications.email. recipients, '']
        }
      }
    }));
  };

  const updateEmailRecipient = (index, value) => {
    const newRecipients = [...formData.notifications.email.recipients];
    newRecipients[index] = value;
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        email: {
          ...prev.notifications.email,
          recipients: newRecipients
        }
      }
    }));
  };

  const removeEmailRecipient = (index) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        email: {
          ...prev.notifications.email,
          recipients: prev.notifications.email.recipients.filter((_, i) => i !== index)
        }
      }
    }));
  };

  const toggleResourceSelection = (resourceId) => {
    setFormData(prev => {
      const currentIds = prev.resourceFilter.resourceIds || [];
      const newIds = currentIds.includes(resourceId)
        ? currentIds.filter(id => id !== resourceId)
        : [...currentIds, resourceId];
      
      return {
        ...prev,
        resourceFilter: {
          ...prev.resourceFilter,
          resourceIds: newIds
        }
      };
    });
  };

  const selectAllResources = () => {
    setFormData(prev => ({
      ...prev,
      resourceFilter: {
        ...prev.resourceFilter,
        resourceIds: availableResources.map(r => r.id)
      }
    }));
  };

  const clearResourceSelection = () => {
    setFormData(prev => ({
      ...prev,
      resourceFilter: {
        ...prev.resourceFilter,
        resourceIds: []
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        userId={userId}
        username={localStorage.getItem('username')}
        email={localStorage. getItem('email')}
        onLogout={onLogout}
        metrics={{}}
      />

      <div className="lg:ml-72 transition-all duration-300">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/alerts')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft size={20} />
                Back to Alerts
              </button>
              <h1 className="text-xl font-bold text-gray-800">
                {isEdit ? 'Edit Alert' : 'Create New Alert'}
              </h1>
            </div>
          </div>
        </header>

        <main className="p-6 max-w-4xl mx-auto">
          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
              <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Alert Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData. name}
                    onChange={(e) => setFormData({ ...formData, name: e. target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., High CPU Usage Alert"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData. description}
                    onChange={(e) => setFormData({ ...formData, description: e.target. value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                    placeholder="Optional description of this alert"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Service *
                    </label>
                    <select
                      required
                      value={formData. service}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        service: e.target.value,
                        metric: serviceMetrics[e.target.value][0].value
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.keys(serviceMetrics).map(service => (
                        <option key={service} value={service}>{service}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Metric *
                    </label>
                    <select
                      required
                      value={formData.metric}
                      onChange={(e) => setFormData({ ... formData, metric: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {serviceMetrics[formData.service]. map(metric => (
                        <option key={metric.value} value={metric.value}>{metric.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Condition */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Alert Condition</h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Operator *
                  </label>
                  <select
                    required
                    value={formData.condition.operator}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      condition: { ...formData.condition, operator: e. target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value=">">Greater than (&gt;)</option>
                    <option value="<">Less than (&lt;)</option>
                    <option value=">=">Greater or equal (&gt;=)</option>
                    <option value="<=">Less or equal (&lt;=)</option>
                    <option value="==">Equal (==)</option>
                    <option value="!=">Not equal (!=)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Threshold *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.condition.threshold}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      condition: { ...formData.condition, threshold: parseFloat(e.target.value) }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="80"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={formData.condition.duration}
                    onChange={(e) => setFormData({ 
                      ... formData, 
                      condition: { ...formData.condition, duration: parseInt(e.target. value) }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <Info size={16} className="inline mr-2" />
                  Alert will trigger when: <strong>{formData.metric} {formData.condition.operator} {formData.condition.threshold}</strong> for {formData.condition.duration} minute(s)
                </p>
              </div>
            </div>

            {/* Resource Filter */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Resource Monitoring</h2>
              
              <div className="space-y-4">
                {/* Monitoring Scope Radio Buttons */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Monitoring Scope
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="monitoringScope"
                        value="all"
                        checked={formData.resourceFilter.monitoringScope === 'all'}
                        onChange={(e) => setFormData({
                          ...formData,
                          resourceFilter: {
                            ...formData.resourceFilter,
                            monitoringScope: e.target.value,
                            resourceIds: []
                          }
                        })}
                        className="mr-3"
                      />
                      <div>
                        <span className="font-semibold">Monitor All Resources (Average)</span>
                        <p className="text-sm text-gray-600">Monitor all resources of this type using average aggregation</p>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="monitoringScope"
                        value="specific"
                        checked={formData.resourceFilter.monitoringScope === 'specific'}
                        onChange={(e) => setFormData({
                          ...formData,
                          resourceFilter: {
                            ...formData.resourceFilter,
                            monitoringScope: e.target.value
                          }
                        })}
                        className="mr-3"
                      />
                      <div>
                        <span className="font-semibold">Monitor Specific Resources</span>
                        <p className="text-sm text-gray-600">Select specific resources to monitor individually</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Resource Selection (shown when specific is selected) */}
                {formData.resourceFilter.monitoringScope === 'specific' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Select Resources
                      </label>
                      
                      {loadingResources ? (
                        <div className="p-4 border border-gray-300 rounded-lg text-center text-gray-600">
                          Loading available resources...
                        </div>
                      ) : availableResources.length === 0 ? (
                        <div className="p-4 border border-gray-300 rounded-lg text-center text-gray-600">
                          No resources found for {formData.service} in {formData.resourceFilter.region}
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2 mb-2">
                            <button
                              type="button"
                              onClick={selectAllResources}
                              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              Select All
                            </button>
                            <span className="text-gray-400">|</span>
                            <button
                              type="button"
                              onClick={clearResourceSelection}
                              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              Clear All
                            </button>
                          </div>
                          <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                            {availableResources.map((resource) => (
                              <label
                                key={resource.id}
                                className="flex items-start p-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.resourceFilter.resourceIds.includes(resource.id)}
                                  onChange={() => toggleResourceSelection(resource.id)}
                                  className="mt-1 mr-3"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-800">{resource.displayName}</div>
                                  {resource.metadata && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      {Object.entries(resource.metadata).map(([key, value]) => (
                                        <span key={key} className="mr-3">
                                          {key}: {value}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            {formData.resourceFilter.resourceIds.length} resource(s) selected
                          </p>
                        </>
                      )}
                    </div>

                    {/* Aggregation Method (shown when multiple resources selected) */}
                    {formData.resourceFilter.resourceIds.length > 1 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Aggregation Method
                        </label>
                        <select
                          value={formData.resourceFilter.aggregation}
                          onChange={(e) => setFormData({
                            ...formData,
                            resourceFilter: {
                              ...formData.resourceFilter,
                              aggregation: e.target.value
                            }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="average">Average - Calculate average across selected resources</option>
                          <option value="maximum">Maximum - Use highest value from selected resources</option>
                          <option value="minimum">Minimum - Use lowest value from selected resources</option>
                          <option value="sum">Sum - Total of all selected resources</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          How to calculate the metric when monitoring multiple resources
                        </p>
                      </div>
                    )}

                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        <Info size={16} className="inline mr-2" />
                        Make sure to select at least one resource for specific monitoring
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Notification Settings</h2>
              
              {/* Email Notifications */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail size={20} className="text-blue-600" />
                    <span className="font-semibold text-gray-800">Email Notifications</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notifications.email. enabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        notifications: {
                          ...formData.notifications,
                          email: { ...formData.notifications.email, enabled: e.target.checked }
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {formData.notifications. email.enabled && (
                  <div className="space-y-2">
                    {formData.notifications.email.recipients. map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateEmailRecipient(index, e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="email@example.com"
                        />
                        {formData.notifications.email.recipients. length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEmailRecipient(index)}
                            className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addEmailRecipient}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      + Add another email
                    </button>
                  </div>
                )}
              </div>

              {/* In-App Notifications */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={20} className="text-purple-600" />
                    <span className="font-semibold text-gray-800">In-App Notifications</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notifications.inApp.enabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        notifications: {
                          ...formData.notifications,
                          inApp: { ... formData.notifications.inApp, enabled: e.target.checked }
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Webhook */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Webhook size={20} className="text-green-600" />
                    <span className="font-semibold text-gray-800">Webhook (Slack/Discord/Teams)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notifications.webhook.enabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        notifications: {
                          ...formData.notifications,
                          webhook: { ...formData.notifications.webhook, enabled: e.target.checked }
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {formData. notifications.webhook.enabled && (
                  <input
                    type="url"
                    value={formData.notifications.webhook.url}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: {
                        ...formData.notifications,
                        webhook: { ...formData.notifications.webhook, url: e.target.value }
                      }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://hooks.slack.com/services/..."
                  />
                )}
              </div>
            </div>

            {/* Additional Settings */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Additional Settings</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Severity
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e. target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cooldown Period (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={formData.cooldownPeriod}
                    onChange={(e) => setFormData({ ...formData, cooldownPeriod: parseInt(e.target. value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Time to wait before sending another notification</p>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                <Save size={20} />
                {loading ? 'Saving.. .' : (isEdit ? 'Update Alert' : 'Create Alert')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/alerts')}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default CreateAlert;