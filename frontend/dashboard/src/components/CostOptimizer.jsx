import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingDown, AlertCircle, CheckCircle,
  Clock, Lightbulb, ArrowRight, Filter, X, 
  Server, Database, HardDrive, Package
} from 'lucide-react';
import Navbar from './Navbar';

const API_GATEWAY_URL = "http://localhost:3003";

// Custom Alert Component
const CustomAlert = ({ type, title, message, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl mx-4">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
        type === 'success' ? 'bg-green-100' : 'bg-red-100'
      }`}>
        {type === 'success' ? (
          <CheckCircle size={40} className="text-green-600" />
        ) : (
          <X size={40} className="text-red-600" />
        )}
      </div>
      <h3 className="text-xl font-bold text-center mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-700 text-center mb-6">{message}</p>
      <button 
        onClick={onClose} 
        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
          type === 'success' 
            ? 'bg-green-600 text-white hover:bg-green-700' 
            : 'bg-red-600 text-white hover:bg-red-700'
        }`}
      >
        OK
      </button>
    </div>
  </div>
);

const CostOptimizer = ({ userId }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [savingsAchieved, setSavingsAchieved] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showImplemented, setShowImplemented] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [actualSavings, setActualSavings] = useState('');
  const [alert, setAlert] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId, showImplemented]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Generate fresh recommendations
      await fetch(`${API_GATEWAY_URL}/api/optimizer/${userId}/generate`, {
        method: 'POST'
      });

      // Fetch recommendations
      const recsResponse = await fetch(
        `${API_GATEWAY_URL}/api/optimizer/${userId}/recommendations? implemented=${showImplemented}`
      );
      const recsData = await recsResponse.json();
      setRecommendations(recsData. recommendations || []);

      // Fetch summary
      const summaryResponse = await fetch(`${API_GATEWAY_URL}/api/optimizer/${userId}/summary`);
      const summaryData = await summaryResponse.json();
      setSummary(summaryData. summary);

      // Fetch savings achieved
      const savingsResponse = await fetch(`${API_GATEWAY_URL}/api/optimizer/${userId}/savings-achieved`);
      const savingsData = await savingsResponse.json();
      setSavingsAchieved(savingsData);

    } catch (error) {
      console.error('Error fetching cost optimization data:', error);
    }
    setLoading(false);
  };

  const handleMarkAsDone = (recommendation) => {
    setSelectedRecommendation(recommendation);
    setActualSavings(recommendation.estimatedMonthlySavings. toString());
  };

  const confirmMarkAsDone = async () => {
    if (!selectedRecommendation) return;

    setVerifying(true);
    
    try {
      // Step 1: Verify changes were made
      const verifyResponse = await fetch(
        `${API_GATEWAY_URL}/api/optimizer/recommendations/${selectedRecommendation._id}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        }
      );

      const verificationResult = await verifyResponse.json();

      // Step 2: Block if verification fails
      if (verificationResult.verified === false) {
        setAlert({
          type: 'error',
          title: 'Verification Failed',
          message: verificationResult.reason || 'Changes not detected. Please make the required changes before marking as done.'
        });
        setVerifying(false);
        return;
      }

      // Step 3: Mark as implemented only if verified
      const response = await fetch(
        `${API_GATEWAY_URL}/api/optimizer/recommendations/${selectedRecommendation._id}/implement`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            actualSavings: parseFloat(actualSavings) || selectedRecommendation.estimatedMonthlySavings 
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        // Step 4: Show success alert
        setAlert({
          type: 'success',
          title: 'Changes Verified!',
          message: `Recommendation successfully implemented. ${verificationResult.reason || ''}`
        });
        setSelectedRecommendation(null);
        setActualSavings('');
        fetchData();
      } else {
        setAlert({
          type: 'error',
          title: 'Implementation Failed',
          message: result.error || 'Failed to mark recommendation as implemented'
        });
      }
    } catch (error) {
      console.error('Error marking as done:', error);
      setAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to process recommendation. Please try again.'
      });
    } finally {
      setVerifying(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'Hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Compute': return <Server size={20} />;
      case 'Database': return <Database size={20} />;
      case 'Storage': return <HardDrive size={20} />;
      case 'Network': return <Package size={20} />;
      default: return <DollarSign size={20} />;
    }
  };

  const filteredRecommendations = recommendations. filter(rec => {
    if (filter !== 'all' && rec.priority !== filter) return false;
    if (categoryFilter !== 'all' && rec.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar onLogout={() => {
        localStorage.clear();
        window.location.href = '/login';
      }} />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">💡 Cost Optimization</h1>
              <p className="text-green-100">AI-powered recommendations to reduce your AWS costs</p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-6 py-3 bg-white text-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors disabled:opacity-50"
            >
              {loading ?  'Analyzing...' : 'Refresh Analysis'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Potential Monthly Savings */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Potential Savings</p>
                  <p className="text-2xl font-bold text-gray-800">${summary.potentialMonthlySavings}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">per month</p>
            </div>

            {/* Yearly Projection */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Yearly Projection</p>
                  <p className="text-2xl font-bold text-gray-800">${summary.potentialYearlySavings}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">annual savings</p>
            </div>

            {/* Active Recommendations */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Lightbulb className="text-orange-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Tips</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.activeRecommendations}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">recommendations</p>
            </div>

            {/* Savings Achieved */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-purple-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Saved So Far</p>
                  <p className="text-2xl font-bold text-gray-800">${savingsAchieved?. totalActualSavings || 0}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">{summary.implementedRecommendations} implemented</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter:</span>
            </div>

            {/* Priority Filter */}
            <div className="flex gap-2">
              {['all', 'High', 'Medium', 'Low'].map(p => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === p
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p === 'all' ? 'All Priorities' : p}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div className="flex gap-2">
              {['all', 'Compute', 'Storage', 'Database']. map(c => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    categoryFilter === c
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {c === 'all' ? 'All Categories' : c}
                </button>
              ))}
            </div>

            {/* Show Implemented Toggle */}
            <label className="flex items-center gap-2 ml-auto cursor-pointer">
              <input
                type="checkbox"
                checked={showImplemented}
                onChange={(e) => setShowImplemented(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span className="text-sm text-gray-700">Show Implemented</span>
            </label>
          </div>
        </div>

        {/* Recommendations List */}
        <div className="space-y-4">
          {filteredRecommendations.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">All Optimized!  🎉</h3>
              <p className="text-gray-600">Your infrastructure is running efficiently. No recommendations at this time.</p>
            </div>
          ) : (
            filteredRecommendations. map((rec) => (
              <div
                key={rec._id}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Category Icon */}
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                      {getCategoryIcon(rec.category)}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-800">{rec.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(rec.priority)}`}>
                          {rec.priority} Priority
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4">{rec.description}</p>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Monthly Savings</p>
                          <p className="text-lg font-bold text-green-600">${rec.estimatedMonthlySavings}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Yearly Savings</p>
                          <p className="text-lg font-bold text-blue-600">${rec.estimatedYearlySavings}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Difficulty</p>
                          <p className={`text-sm font-semibold ${getDifficultyColor(rec.difficulty)}`}>
                            {rec.difficulty}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Time Required</p>
                          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                            <Clock size={14} />
                            {rec. implementationTime}
                          </p>
                        </div>
                      </div>

                      {/* Impact Badge */}
                      <div className="flex items-center gap-2 mb-4">
                        <AlertCircle size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Impact: <span className="font-semibold">{rec.impact}</span>
                        </span>
                      </div>

                      {/* Resource Details */}
                      {rec.resourceDetails && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Affected Resources:</p>
                          <div className="text-sm text-gray-600">
                            {rec.resourceDetails.instances && (
                              <div>
                                {rec.resourceDetails.instances.map((inst, idx) => (
                                  <div key={idx} className="mb-1">
                                    • {inst.name} ({inst.id}) {inst.cpu && `- CPU: ${inst.cpu}%`}
                                  </div>
                                ))}
                              </div>
                            )}
                            {rec.resourceDetails.buckets && (
                              <div>
                                {rec.resourceDetails.buckets.map((bucket, idx) => (
                                  <div key={idx} className="mb-1">
                                    • {bucket.name} - {bucket.size}
                                  </div>
                                ))}
                              </div>
                            )}
                            {rec.resourceDetails.databases && (
                              <div>
                                {rec.resourceDetails.databases.map((db, idx) => (
                                  <div key={idx} className="mb-1">
                                    • {db.identifier} ({db.class}) - CPU: {db.cpu}%
                                  </div>
                                ))}
                              </div>
                            )}
                            {rec.resourceDetails.volumes && (
                              <div>
                                {rec.resourceDetails.volumes.map((vol, idx) => (
                                  <div key={idx} className="mb-1">
                                    • {vol.volumeId} - {vol.size} ({vol.type})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  {! rec.implemented ?  (
                    <button
                      onClick={() => handleMarkAsDone(rec)}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <CheckCircle size={18} />
                      Mark as Done
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={20} />
                      <span className="font-semibold">Implemented</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mark as Done Modal */}
      {selectedRecommendation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Mark as Implemented</h3>
              <button
                onClick={() => {
                  setSelectedRecommendation(null);
                  setActualSavings('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4 font-semibold">{selectedRecommendation.title}</p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Estimated Savings:</span> ${selectedRecommendation.estimatedMonthlySavings}/month
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">⚠️ Verification Process:</span> The system will automatically verify that you've made the required changes in AWS before marking this as complete. Changes must be verified.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actual Monthly Savings (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={actualSavings}
                    onChange={(e) => setActualSavings(e.target.value)}
                    placeholder={selectedRecommendation.estimatedMonthlySavings. toString()}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave blank to use estimated savings</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedRecommendation(null);
                  setActualSavings('');
                }}
                disabled={verifying}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkAsDone}
                disabled={verifying}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Verifying...
                  </>
                ) : (
                  'Verify & Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert */}
      {alert && (
        <CustomAlert
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
};

export default CostOptimizer;