import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useLogin } from "../../api/hooks";
import { useAuthStore } from "../../store/authStore";

export function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  if (user) return <Navigate to="/" replace />;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Connect4All Dashboard</h1>
        <p className="muted">Operator / admin sign in</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {login.isError && <p className="error-text">Invalid email or password.</p>}
        <button className="btn-primary" type="submit" disabled={login.isPending}>
          {login.isPending ? "Signing in..." : "Sign in"}
        </button>
        <p className="muted small">
          No account yet? Register one via <code>POST /auth/register</code>.
        </p>
      </form>
    </div>
  );
}
