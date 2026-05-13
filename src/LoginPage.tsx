import { useAuth } from "./AuthContext";

export default function LoginPage() {
  const { signIn } = useAuth();

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🚲</div>
        <h1>Bike Vault</h1>
        <p>Personal bike inventory &amp; maintenance tracker</p>
        <button className="btn-primary btn-github" onClick={signIn}>
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
