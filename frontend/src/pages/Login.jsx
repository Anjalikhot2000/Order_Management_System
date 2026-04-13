import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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

    const result = await login(formData.email, formData.password);

    if (result.success) {
      // Role is automatically determined from the database
      navigate('/');
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
            <span className="eyebrow">Login Design Examples</span>
            <h1>Welcome back</h1>
            <p className="lead-text">
              We are really happy to see you again! Use your credentials to access your dashboard and continue managing orders.
            </p>
            <div className="feature-pill">Creative · Convenient · Secure</div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <p className="auth-card-label">Hello!</p>
            <h2>Sign in to your account</h2>
            <p className="auth-card-description">Enter your email and password to continue to the order management dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
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

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" disabled={loading} className="auth-button">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="auth-footer">
              <span>Don't have an account?</span>{' '}
              <Link to="/register" className="auth-link">Create one</Link>
            </div>

            <div className="divider-row">or sign in with</div>

            <div className="social-row">
              <button type="button" className="social-btn">Facebook</button>
              <button type="button" className="social-btn">Google</button>
              <button type="button" className="social-btn">Apple</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;