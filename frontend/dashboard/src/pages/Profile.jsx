import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, EyeOff, Loader } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    accessKeyId: '',
    secretAccessKey: '',
    newPassword: ''
  });
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const API_URL = 'http://localhost:3003';

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      fetchUserData(userId);
    } else {
      setFetchingData(false);
    }
  }, []);

  const fetchUserData = async (userId) => {
    setFetchingData(true);
    try {
      console.log('Fetching user profile for:', userId);
      const response = await fetch(`${API_URL}/api/profile/${userId}`);
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const data = await response.json();
      console.log('Received profile data:', data);
      
      setFormData({
        username: data.username || '',
        email: data.email || '',
        accessKeyId: data.accessKeyId || '',
        secretAccessKey: '', // Don't populate for security
        newPassword: ''
      });
      
      setFetchingData(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setMessage({ text: 'Failed to load profile data', type: 'error' });
      setFetchingData(false);
    }
  };

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

    const userId = localStorage.getItem('userId');

    try {
      // Only send fields that have values
      const updateData = {
        userId,
        username: formData.username,
        email: formData.email,
      };

      // Only include these if they're filled in
      if (formData.accessKeyId) {
        updateData.accessKeyId = formData.accessKeyId;
      }
      if (formData.secretAccessKey) {
        updateData.secretAccessKey = formData.secretAccessKey;
      }
      if (formData.newPassword) {
        updateData.newPassword = formData.newPassword;
      }

      console.log('Updating profile with:', updateData);

      const response = await fetch(`${API_URL}/api/user/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: 'Profile updated successfully!', type: 'success' });
        
        // Update localStorage
        localStorage.setItem('username', formData.username);
        localStorage.setItem('email', formData.email);
        
        // Clear sensitive fields after successful update
        setFormData({
          ...formData,
          secretAccessKey: '',
          newPassword: ''
        });
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setMessage({ text: data.message || 'Update failed', type: 'error' });
      }
    } catch (error) {
      console.error('Update error:', error);
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="animate-spin text-indigo-600" size={48} />
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 mb-6 transition"
        >
          <ArrowLeft size={20} />
          <span className="font-semibold">Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Profile Settings</h1>

          {message.text && (
            <div
              className={`p-4 rounded-lg mb-6 text-center ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-red-100 text-red-700 border border-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 transition"
              />
            </div>

            {/* Access Key */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                AWS Access Key ID
              </label>
              <input
                type="text"
                name="accessKeyId"
                value={formData.accessKeyId}
                onChange={handleChange}
                placeholder="AKIA..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 transition"
              />
              <p className="text-xs text-gray-500 mt-1">Current key is shown. Leave blank to keep unchanged.</p>
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                AWS Secret Access Key
              </label>
              <div className="relative">
                <input
                  type={showSecretKey ? 'text' : 'password'}
                  name="secretAccessKey"
                  value={formData.secretAccessKey}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current key"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 transition pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showSecretKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Only fill this if you want to update your secret key</p>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current password"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 transition pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Only fill this if you want to change your password</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;