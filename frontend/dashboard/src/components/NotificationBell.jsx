import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Eye, Trash2, AlertCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_GATEWAY_URL = "http://localhost:3003";

const NotificationBell = ({ userId }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef. current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(
        `${API_GATEWAY_URL}/api/alerts/${userId}/history/all? limit=20&acknowledged=false`
      );
      const data = await res.json();
      if (data.success) {
        setNotifications(data.history);
        setUnreadCount(data.history.filter(n => !n. acknowledged).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const acknowledgeNotification = async (notificationId) => {
    try {
      const res = await fetch(
        `${API_GATEWAY_URL}/api/alerts/${userId}/history/${notificationId}/acknowledge`,
        { method: 'PATCH' }
      );
      const data = await res.json();
      if (data.success) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error acknowledging notification:', error);
    }
  };

  const acknowledgeAll = async () => {
    setLoading(true);
    try {
      await Promise.all(
        notifications.map(n => 
          fetch(`${API_GATEWAY_URL}/api/alerts/${userId}/history/${n._id}/acknowledge`, {
            method: 'PATCH'
          })
        )
      );
      fetchNotifications();
    } catch (error) {
      console.error('Error acknowledging all:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📊';
    }
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(! isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell size={24} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Bell size={20} className="text-indigo-600" />
                Notifications
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white rounded-lg transition-colors"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>
            {unreadCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={acknowledgeAll}
                  disabled={loading}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold disabled:opacity-50"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium mb-1">No notifications</p>
                <p className="text-sm text-gray-500">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      ! notification.acknowledged ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Severity Icon */}
                      <div className="text-2xl flex-shrink-0 mt-1">
                        {getSeverityIcon(notification.severity)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getSeverityColor(notification. severity)}`}>
                              {notification.severity. toUpperCase()}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                              {notification.service}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                            <Clock size={12} />
                            {formatTimeAgo(notification.triggeredAt)}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-gray-800 mb-1">
                          {notification.alertId?. name || 'Alert Triggered'}
                        </p>
                        
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>Value: <strong className="text-gray-700">{notification.currentValue}</strong></span>
                          <span>•</span>
                          <span>Threshold: <strong className="text-gray-700">{notification.threshold}</strong></span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          {!notification.acknowledged && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                acknowledgeNotification(notification._id);
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded text-xs font-medium transition-colors"
                            >
                              <Check size={12} />
                              Acknowledge
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/alerts');
                              setIsOpen(false);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs font-medium transition-colors"
                          >
                            <Eye size={12} />
                            View Alert
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  navigate('/alerts/history');
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                View All Notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;