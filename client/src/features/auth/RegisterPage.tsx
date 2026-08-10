import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useSignup } from "../../api/hooks";
import { useAuthStore } from "../../store/authStore";

export function RegisterPage() {
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"resident" | "traveller">("resident");
  const signup = useSignup();

  if (user) return <Navigate to="/" replace />;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    signup.mutate({ email, password, role });
  }

  const emailTaken =
    signup.isError && (signup.error as { response?: { data?: { error?: string } } })?.response?.data?.error === "email_taken";

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Create an account</h1>
        <p className="muted">Join Connect4All to browse and report coverage in Laos.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <label>
          I am a...
          <select value={role} onChange={(e) => setRole(e.target.value as "resident" | "traveller")}>
            <option value="resident">Resident of Laos</option>
            <option value="traveller">Traveller / visitor</option>
          </select>
        </label>
        {emailTaken && <p className="error-text">That email is already registered.</p>}
        {signup.isError && !emailTaken && <p className="error-text">Could not create account. Try again.</p>}
        <button className="btn-primary" type="submit" disabled={signup.isPending}>
          {signup.isPending ? "Creating account..." : "Create account"}
        </button>
        <p className="muted small">
          Already have an account? <Link to="/login">Sign in</Link>.
        </p>
      </form>
    </div>
  );
}
