import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiRequest, getStoredAuth, saveAuth } from "../lib/auth";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getStoredAuth()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const tokens = await apiRequest("token/", {
        method: "POST",
        body: JSON.stringify({
          username: form.username,
          password: form.password,
        }),
      });

      const profile = await apiRequest("profile/", { token: tokens.access });
      saveAuth({ ...tokens, user: profile });
      navigate("/dashboard", { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">S</div>

        <div className="auth-heading">
          <div className="eyebrow">STUDENT PROJECT MANAGEMENT</div>
          <h1>Welcome back</h1>
          <p>Sign in to pick up where your team left off.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Username or email</span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              placeholder="Enter your username or email"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              required
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button auth-button" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="auth-link-text">
          Don’t have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
