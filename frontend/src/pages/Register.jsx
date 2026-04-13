import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer'
  });
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

    const result = await register(formData.name, formData.email, formData.password, formData.role);

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
              <label htmlFor="role">Register as</label>
              <select
                id="role"
                name="role"
                className="auth-input"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="customer">Customer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

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