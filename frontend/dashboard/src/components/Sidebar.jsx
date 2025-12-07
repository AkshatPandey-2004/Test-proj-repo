import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Database,
  HardDrive,
  Zap,
  Archive,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Activity,
  TrendingUp,
  User
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const Sidebar = ({ userId, username, email, onLogout, metrics }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { name: 'EC2 Instances', icon: Server, path: '/ec2', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { name: 'S3 Buckets', icon: Database, path: '/s3', color: 'text-green-600', bgColor: 'bg-green-50' },
    { name: 'RDS Databases', icon: HardDrive, path: '/rds', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { name: 'Lambda Functions', icon: Zap, path: '/lambda', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { name: 'EBS Volumes', icon: Archive, path: '/ebs', color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
    { name: 'Alerts', icon: Bell, path: '/alerts', color: 'text-red-600', bgColor: 'bg-red-50' },
  ];

  const isActive = (path) => location. pathname === path || location.pathname.startsWith(path + '/');

  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false); // Close mobile menu after navigation
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsOpen(! isOpen)} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} className="text-gray-700" /> : <Menu size={24} className="text-gray-700" />}
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              CloudOps
            </h1>
          </div>
          <NotificationBell userId={userId} />
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 mt-[60px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } w-72 overflow-hidden shadow-xl lg:shadow-none`}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              CloudOps
            </h1>
            {/* Desktop Notification Bell */}
            <div className="hidden lg:block">
              <NotificationBell userId={userId} />
            </div>
            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsOpen(false)} 
              className="lg:hidden p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
          
          {/* User Info */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {username?. charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{username || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{email || 'user@example.com'}</p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-indigo-50 rounded-lg p-2 text-center">
                <p className="text-xs text-indigo-600 font-semibold mb-1">Resources</p>
                <p className="text-lg font-bold text-indigo-700">
                  {(metrics?.totalInstances || 0) + 
                   (metrics?.totalS3Buckets || 0) + 
                   (metrics?. totalRDS || 0) + 
                   (metrics?.totalLambda || 0) + 
                   (metrics?.totalEBS || 0)}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <p className="text-xs text-green-600 font-semibold mb-1">Active</p>
                <p className="text-lg font-bold text-green-700">{metrics?.runningInstances || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    active
                      ? `${item.bgColor} ${item. color} shadow-sm font-semibold`
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={20} className={active ? item.color : 'text-gray-500 group-hover:text-gray-700'} />
                  <span className="flex-1 text-left">{item.name}</span>
                  {active && <ChevronRight size={18} className={item.color} />}
                  
                  {/* Badge for resource counts */}
                  {item. path === '/ec2' && metrics?.totalInstances > 0 && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      active ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {metrics. totalInstances}
                    </span>
                  )}
                  {item.path === '/s3' && metrics?.totalS3Buckets > 0 && (
                    <span className={`px-2 py-0. 5 text-xs font-bold rounded-full ${
                      active ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {metrics.totalS3Buckets}
                    </span>
                  )}
                  {item.path === '/rds' && metrics?.totalRDS > 0 && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      active ? 'bg-purple-200 text-purple-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {metrics.totalRDS}
                    </span>
                  )}
                  {item.path === '/lambda' && metrics?.totalLambda > 0 && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      active ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {metrics.totalLambda}
                    </span>
                  )}
                  {item.path === '/ebs' && metrics?.totalEBS > 0 && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      active ? 'bg-cyan-200 text-cyan-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {metrics. totalEBS}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-gray-200"></div>

          {/* Additional Menu Items */}
          <div className="space-y-2">
            <button
              onClick={() => handleNavigation('/settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive('/settings')
                  ? 'bg-gray-100 text-gray-900 shadow-sm font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Settings size={20} className="text-gray-500 group-hover:text-gray-700" />
              <span className="flex-1 text-left">Settings</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 group"
            >
              <LogOut size={20} className="text-red-500" />
              <span className="flex-1 text-left font-medium">Logout</span>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} />
              <span className="text-sm font-semibold">System Status</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-90">All Systems Operational</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for mobile to prevent content from going under header */}
      <div className="lg:hidden h-[60px]"></div>
    </>
  );
};

export default Sidebar;