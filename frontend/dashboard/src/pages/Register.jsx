import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Database, Zap, Lock, ArrowLeft, Server } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    accessKeyId: '',
    secretAccessKey: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:3003';

  const handleChange = (e) => {
    setFormData({
      ... formData,
      [e. target.name]: e.target. value
    });
  };

  const handleSubmit = async (e) => {
    e. preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: data.message, type: 'success' });
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMessage({ text: data. message || 'Registration failed', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Registration Form */}
      <div className="w-full lg:w-2/5 bg-white flex items-center justify-center p-8 relative overflow-y-auto">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/login')}
          className="absolute top-6 left-6 w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center hover:bg-gray-800 transition-colors shadow-lg z-10"
        >
          <ArrowLeft className="text-white" size={24} />
        </button>

        <div className="w-full max-w-md py-12">
          {/* Logo & Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Cloud className="text-white" size={28} />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">Sign Up</h1>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed">
              Create your CloudOps account to start monitoring AWS resources, 
              optimizing costs, and managing cloud infrastructure efficiently.
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

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Username"
                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-full focus:outline-none focus:border-purple-500 focus:bg-white transition-all text-gray-800 placeholder-gray-500"
              />
            </div>

            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Email Address"
                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-full focus:outline-none focus:border-purple-500 focus:bg-white transition-all text-gray-800 placeholder-gray-500"
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
                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-full focus:outline-none focus:border-purple-500 focus:bg-white transition-all text-gray-800 placeholder-gray-500"
              />
            </div>

            <div>
              <input
                type="text"
                name="accessKeyId"
                value={formData. accessKeyId}
                onChange={handleChange}
                required
                placeholder="AWS Access Key ID"
                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-full focus:outline-none focus:border-purple-500 focus:bg-white transition-all text-gray-800 placeholder-gray-500"
              />
            </div>

            <div>
              <input
                type="password"
                name="secretAccessKey"
                value={formData. secretAccessKey}
                onChange={handleChange}
                required
                placeholder="AWS Secret Access Key"
                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-full focus:outline-none focus:border-purple-500 focus:bg-white transition-all text-gray-800 placeholder-gray-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white font-semibold py-4 rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all mt-6"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-purple-600 font-semibold hover:text-purple-700 hover:underline"
              >
                Login
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Illustration */}
      <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-purple-400 via-pink-400 to-indigo-500 items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        
        {/* Floating Stars */}
        <div className="absolute top-40 right-32 text-white/30 text-6xl animate-pulse">✦</div>
        <div className="absolute bottom-32 left-40 text-white/20 text-4xl animate-pulse delay-300">✦</div>
        <div className="absolute top-1/3 right-24 text-white/25 text-5xl animate-pulse delay-700">✦</div>

        {/* Main Illustration */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Dashboard Preview */}
          <div className="relative bg-white rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-transform duration-300 max-w-2xl">
            {/* Mini Dashboard */}
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-800">AWS Dashboard</h3>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>

              {/* Service Cards Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-orange-100 to-orange-200 p-4 rounded-xl">
                  <Server className="text-orange-600 mb-2" size={32} />
                  <p className="text-xs font-semibold text-gray-700">EC2</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
                <div className="bg-gradient-to-br from-green-100 to-green-200 p-4 rounded-xl">
                  <Database className="text-green-600 mb-2" size={32} />
                  <p className="text-xs font-semibold text-gray-700">S3</p>
                  <p className="text-2xl font-bold text-gray-900">8</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 p-4 rounded-xl">
                  <Zap className="text-yellow-600 mb-2" size={32} />
                  <p className="text-xs font-semibold text-gray-700">Lambda</p>
                  <p className="text-2xl font-bold text-gray-900">24</p>
                </div>
              </div>

              {/* Chart Area */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl">
                <div className="flex items-end gap-2 h-32">
                  {[40, 65, 45, 80, 55, 90, 70]. map((height, idx) => (
                    <div 
                      key={idx}
                      className="flex-1 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-lg transition-all hover:opacity-75"
                      style={{ height: `${height}%` }}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Security Badge */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl">
                <Lock className="text-indigo-600" size={24} />
                <div>
                  <p className="text-sm font-bold text-gray-800">Secure & Encrypted</p>
                  <p className="text-xs text-gray-600">AES-256 encryption</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Text */}
          <div className="mt-12 text-center">
            <h2 className="text-white text-3xl font-bold mb-3">Start Your Cloud Journey</h2>
            <p className="text-white/90 text-lg">Join thousands monitoring AWS resources efficiently</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;