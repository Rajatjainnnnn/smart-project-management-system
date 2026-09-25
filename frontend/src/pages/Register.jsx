function Register() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">S</div>

        <h1>Create account</h1>
        <p>Join your student project team.</p>

        <input type="text" placeholder="Full name" />
        <input type="email" placeholder="Email address" />
        <input type="password" placeholder="Password" />

        <button className="primary-button auth-button">
          Create Account
        </button>
      </div>
    </div>
  );
}

export default Register;