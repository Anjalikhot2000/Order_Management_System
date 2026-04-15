import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';

const ADMIN_CODE = 'ADMIN';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [role, setRole] = useState('customer');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (role === 'admin' && adminCode.trim() !== ADMIN_CODE) {
      setError('Invalid admin code');
      setLoading(false);
      return;
    }

    const result = await register(formData.name, formData.email, formData.password, role, adminCode.trim());

    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-shell">
      <div className="auth-grid">
        <section className="auth-panel">
          <div className="text-panel">
            <div className="logo-header">
              <Logo variant="default" size="lg" showText={true} />
            </div>
            <span className="eyebrow">Create Account</span>
            <h1>Stay connected</h1>
            <p className="lead-text">
              Join the platform to manage orders, view products, and track your customer experience with a modern dashboard.
            </p>
            <div className="feature-pill">Secure · Fast · Easy to use</div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <p className="auth-card-label">Hello there!</p>
            <h2>Create your account</h2>
            <p className="auth-card-description">Fill in the details below to get started with order management and product browsing.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="auth-input"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="auth-input"
                placeholder="username@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="auth-input"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="auth-input"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                className="auth-input"
                value={role}
                onChange={(e) => {
                  const selectedRole = e.target.value;
                  setRole(selectedRole);
                  if (selectedRole !== 'admin') {
                    setAdminCode('');
                  }
                }}
              >
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
              </select>
              <small className="auth-input-hint">Enter admin code only if authorized.</small>
            </div>

            {role === 'admin' && (
              <div className="form-group">
                <label htmlFor="adminCode">Admin Secret Code</label>
                <input
                  id="adminCode"
                  name="adminCode"
                  type="text"
                  className="auth-input"
                  placeholder="Enter Admin Secret Code"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  autoComplete="off"
                />
                <small className="auth-input-hint">Enter admin code only if authorized.</small>
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}

            <button type="submit" disabled={loading} className="auth-button">
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <div className="auth-footer">
              <span>Already have an account?</span>{' '}
              <Link to="/login" className="auth-link">Sign in</Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Register;