import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {
const navigate = useNavigate();
const location = useLocation();

const [email, setEmail] = useState(
location.state?.registeredEmail || ""
);
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleLogin(event) {
event.preventDefault();

if (loading) return;

setError("");

const cleanEmail = email.trim().toLowerCase();

if (!cleanEmail || !password) {
  setError("Please enter your email and password.");
  return;
}

try {
  setLoading(true);

  const response = await api.post("/auth/login", {
    email: cleanEmail,
    password,
  });

  const data = response.data;

  if (!data?.success || !data?.access_token || !data?.user) {
    setError(data?.message || "Login failed. Please try again.");
    return;
  }

  if (!["student", "teacher"].includes(data.user.role)) {
    setError("This account has an unsupported role.");
    return;
  }

  localStorage.setItem("learnadapt_token", data.access_token);
  localStorage.setItem(
    "learnadapt_user",
    JSON.stringify(data.user)
  );

  if (data.user.role === "student") {
    navigate("/student/dashboard", { replace: true });
  } else {
    navigate("/teacher/dashboard", { replace: true });
  }
} catch (err) {
  console.error("Login error:", err);

  setError(
    err.response?.data?.message ||
      (err.code === "ECONNABORTED"
        ? "The server took too long to respond. Please try again."
        : "Login failed. Check your connection, email, and password.")
  );
} finally {
  setLoading(false);
}

}

return ( <main className="auth-page"> <section className="auth-card"> <Link to="/" className="auth-brand">
<img src="/logo.png" alt="" className="auth-brand-logo" />
<span>Adeptiq</span>
</Link>

    <div className="auth-heading">
      <div className="auth-symbol" aria-hidden="true">
        <img src="/logo.png" alt="" className="auth-symbol-image" />
      </div>

      <h1>Welcome back</h1>
      <p>
        Sign in to continue your personalized learning journey.
      </p>
    </div>

    <form onSubmit={handleLogin}>
      <div className="auth-field">
        <label htmlFor="login-email">Email address</label>
        <input
          id="login-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <div className="auth-field">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <div className="auth-message auth-error" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="auth-submit"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign in"}
        {!loading && <span aria-hidden="true">→</span>}
      </button>
    </form>

    <p className="auth-switch">
      Don't have an account?{" "}
      <Link to="/signup">Create account</Link>
    </p>

    <p className="auth-note">
      Continue learning with Adeptiq.
    </p>
  </section>
</main>
);
}

export default Login;
