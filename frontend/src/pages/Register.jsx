import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiRequest, getStoredAuth, saveAuth } from "../lib/auth";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
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
      await apiRequest("register/", {
        method: "POST",
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          first_name: form.firstName,
          last_name: form.lastName,
        }),
      });

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
    } catch (registerError) {
      setError(registerError.message || "Unable to create account.");
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
          <h1>Create your account</h1>
          <p>Set up your profile and start building with your team.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="auth-field-row">
            <label className="auth-field">
              <span>First name</span>
              <input
                type="text"
                name="firstName"
                autoComplete="given-name"
                placeholder="First name"
                value={form.firstName}
                onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              />
            </label>
            <label className="auth-field">
              <span>Last name</span>
              <input
                type="text"
                name="lastName"
                autoComplete="family-name"
                placeholder="Last name"
                value={form.lastName}
                onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              />
            </label>
          </div>
          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              placeholder="Choose a username"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              required
            />
          </label>
          <label className="auth-field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="Create a password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button auth-button" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-link-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;