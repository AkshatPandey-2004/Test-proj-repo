import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Server, Shield, ArrowLeft } from 'lucide-react';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    region: 'us-east-1'
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:3003';

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setMessage({ text: '', type: '' });

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType. includes('application/json')) {
      throw new Error('Server returned non-JSON response');
    }

    const data = await response.json();

    if (response.ok) {
      setMessage({ text: data.message, type: 'success' });
      
      // Use fallback to 'us-east-1' if region is undefined or null
      const userRegion = data.region || 'us-east-1';
      
      // Call the onLogin callback from App.js
      setTimeout(() => {
        onLogin(data.userId, data.username, data.email, userRegion);
      }, 1000);
    } else {
      setMessage({ text: data.message || 'Login failed', type: 'error' });
    }
  } catch (error) {
    console.error('Login error:', error);  // Add logging to see actual error
    setMessage({ text: 'Network error. Please try again.', type: 'error' });
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-2/5 bg-white flex items-center justify-center p-8 relative">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center hover:bg-gray-800 transition-colors shadow-lg"
        >
          <ArrowLeft className="text-white" size={24} />
        </button>

        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Cloud className="text-white" size={28} />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">CloudOps</h1>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed">
              Welcome to CloudOps, your intelligent platform for AWS resource monitoring 
              and cost optimization. Track EC2, S3, RDS, Lambda, and more across multiple regions.
            </p>
          </div>

          {/* Alert Message */}
          {message.text && (
            <div
              className={`p-4 rounded-xl mb-6 text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Username"
                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-full focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-gray-800 placeholder-gray-500"
              />
            </div>

            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Email"
                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-full focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-gray-800 placeholder-gray-500"
              />
            </div>

            <div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Password"
                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-full focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-gray-800 placeholder-gray-500"
              />
            </div>

            <div>
              <select
                name="region"
                value={formData.region}
                onChange={handleChange}
                required
                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-full focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-gray-800 appearance-none cursor-pointer"
              >
                {awsRegions.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white font-semibold py-4 rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              {loading ?  'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-gray-600">
              Don't have an account? {' '}
              <button
                onClick={() => navigate('/register')}
                className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline"
              >
                Sign Up
              </button>
            </p>
            <button className="text-indigo-600 font-semibold hover:underline text-sm">
              Forgot Password?
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Illustration */}
      <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500 items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        
        {/* Floating Stars */}
        <div className="absolute top-32 right-40 text-white/30 text-6xl animate-pulse">✦</div>
        <div className="absolute bottom-40 left-32 text-white/20 text-4xl animate-pulse delay-300">✦</div>
        <div className="absolute top-1/2 right-20 text-white/25 text-5xl animate-pulse delay-700">✦</div>

        {/* Main Illustration */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Cloud Infrastructure Illustration */}
          <div className="relative">
            {/* Main Cloud Server */}
            <div className="relative bg-white rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <div className="flex flex-col items-center gap-6">
                {/* Person with Laptop */}
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Server className="text-white" size={48} />
                    </div>
                  </div>
                  
                  {/* Person Illustration (Simple) */}
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full mb-2"></div>
                    <div className="w-24 h-32 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-t-full"></div>
                    <div className="flex gap-2 mt-2">
                      <div className="w-8 h-16 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg"></div>
                      <div className="w-8 h-16 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg"></div>
                    </div>
                  </div>
                </div>

                {/* AWS Services Icons */}
                <div className="flex gap-4 mt-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center transform hover:rotate-12 transition-transform">
                    <Server className="text-orange-600" size={32} />
                  </div>
                  <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center transform hover:rotate-12 transition-transform">
                    <Cloud className="text-green-600" size={32} />
                  </div>
                  <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center transform hover:rotate-12 transition-transform">
                    <Shield className="text-purple-600" size={32} />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Badges */}
            <div className="absolute -top-6 -right-6 bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg animate-bounce">
              Live Monitoring
            </div>
            <div className="absolute -bottom-6 -left-6 bg-yellow-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg animate-bounce delay-500">
              Cost Optimized
            </div>
          </div>

          {/* Bottom Text */}
          <div className="mt-12 text-center">
            <h2 className="text-white text-3xl font-bold mb-3">Monitor.  Optimize. Scale.</h2>
            <p className="text-white/90 text-lg">Real-time AWS resource tracking across all regions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;