function Login() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">S</div>

        <h1>Welcome back</h1>
        <p>Sign in to your SPMS account.</p>

        <input type="email" placeholder="Email address" />
        <input type="password" placeholder="Password" />

        <button className="primary-button auth-button">
          Login
        </button>
      </div>
    </div>
  );
}

export default Login;