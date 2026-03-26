import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Mail, User, AlertCircle } from 'lucide-react'

export default function Login() {

  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle input changes
  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  // Handle login form submit
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Replace with your actual login endpoint
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }
      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fill demo credentials
  function fillDemoCredentials(role) {
    setFormData({ username: role, password: 'password123' });
  }

  // Skip login: set demo user/token and redirect
  function skipLogin() {
    localStorage.setItem('token', 'demo');
    localStorage.setItem('user', JSON.stringify({ username: 'demo', role: 'demo' }));
    navigate('/');
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to access your EMR system</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">

                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Credentials */}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-semibold text-gray-600 mb-2">Demo Accounts:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fillDemoCredentials('admin')}
                className="text-xs px-3 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
          </form>

          {/* Skip Login Button (always visible) */}
          <button
            type="button"
            onClick={skipLogin}
            className="w-full mt-4 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Skip Login (Demo)
          </button>
                Admin
              <button
                onClick={() => fillDemoCredentials('doctor')}
                className="text-xs px-3 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                Doctor
              </button>
              <button
                onClick={() => fillDemoCredentials('nurse')}
                className="text-xs px-3 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                Nurse
              </button>
              <button
                onClick={() => fillDemoCredentials('receptionist')}
                className="text-xs px-3 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                Receptionist
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">All demo passwords: password123</p>
            {/* Optionally, you can add dev-only quick login here if needed */}
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-600">Don't have an account? </span>
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              Register
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>© 2026 Healthcare EMR System. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
