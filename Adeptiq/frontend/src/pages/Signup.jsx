import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function Signup() {
const navigate = useNavigate();

const [form, setForm] = useState({
name: "",
email: "",
role: "student",
password: "",
confirmPassword: "",
});

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");

const handleChange = (event) => {
const { name, value } = event.target;

setForm((previous) => ({
  ...previous,
  [name]: value,
}));

setError("");
setSuccess("");


};

const handleSignup = async (event) => {
event.preventDefault();

if (loading) return;

setError("");
setSuccess("");

const name = form.name.trim();
const email = form.email.trim().toLowerCase();

if (!name || !email || !form.password || !form.confirmPassword) {
  setError("Please fill in all required fields.");
  return;
}

if (name.length < 2) {
  setError("Name must contain at least 2 characters.");
  return;
}

if (form.password.length < 6) {
  setError("Password must contain at least 6 characters.");
  return;
}

if (form.password !== form.confirmPassword) {
  setError("Passwords do not match.");
  return;
}

try {
  setLoading(true);

  const response = await api.post("/auth/register", {
    name,
    email,
    password: form.password,
    role: form.role,
  });

  const data = response.data;

  if (data.success === false) {
    setError(data.message || "Registration failed.");
    return;
  }

  setSuccess("Account created successfully! Redirecting to login...");

  setTimeout(() => {
    navigate("/login", {
      replace: true,
      state: { registeredEmail: email },
    });
  }, 1000);
} catch (err) {
  console.error("Signup error:", err);

  setError(
    err.response?.data?.message ||
      err.response?.data?.error ||
      "Unable to create your account. Please try again."
  );
} finally {
  setLoading(false);
}


};

return ( <main className="auth-page"> <section className="auth-card"> <Link to="/" className="auth-brand">
<img src="/logo.png" alt="" className="auth-brand-logo" />
<span>Adeptiq</span>
</Link>

    <div className="auth-heading">
      <div className="auth-symbol" aria-hidden="true">
        <img src="/logo.png" alt="" className="auth-symbol-image" />
      </div>

      <h1>Create your account</h1>
      <p>Join Adeptiq and start learning at your own pace.</p>
    </div>

    <form onSubmit={handleSignup} noValidate>
      <div className="auth-field">
        <label htmlFor="signup-name">Full name</label>
        <input
          id="signup-name"
          name="name"
          type="text"
          placeholder="Enter your full name"
          value={form.name}
          onChange={handleChange}
          autoComplete="name"
          maxLength={100}
          required
          disabled={loading}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="signup-email">Email address</label>
        <input
          id="signup-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
          disabled={loading}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="signup-role">I want to join as</label>
        <select
          id="signup-role"
          name="role"
          value={form.role}
          onChange={handleChange}
          disabled={loading}
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
      </div>

      <div className="auth-field">
        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          name="password"
          type="password"
          placeholder="At least 6 characters"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          minLength={6}
          required
          disabled={loading}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="signup-confirm-password">
          Confirm password
        </label>
        <input
          id="signup-confirm-password"
          name="confirmPassword"
          type="password"
          placeholder="Enter your password again"
          value={form.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          minLength={6}
          required
          disabled={loading}
        />
      </div>

      {error && (
        <div className="auth-message auth-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="auth-message auth-success" role="status">
          {success}
        </div>
      )}

      <button
        type="submit"
        className="auth-submit"
        disabled={loading}
      >
        {loading ? "Creating account..." : "Create account"}
        {!loading && <span aria-hidden="true">→</span>}
      </button>
    </form>

    <p className="auth-switch">
      Already have an account? <Link to="/login">Sign in</Link>
    </p>

    <p className="auth-note">
      Create an account to access your personalized learning dashboard.
    </p>
  </section>
</main>
);
}

export default Signup;
