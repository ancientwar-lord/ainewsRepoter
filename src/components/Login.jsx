import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError("");
    try {
      await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      // Optionally redirect or show success
    } catch (err) {
      setRegError(err.message);
    }
    setRegLoading(false);
  };

  return (
    <div style={{
      maxWidth: 400,
      margin: "40px auto",
      padding: 32,
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 8px 32px rgba(60,60,120,0.15)",
      fontFamily: "Segoe UI, Arial, sans-serif"
    }}>
      <h2 style={{
        textAlign: "center",
        marginBottom: 24,
        color: "#3a3a6c",
        letterSpacing: 1
      }}>{isRegister ? "Register" : "Login"}</h2>
      {!isRegister ? (
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #d1d1e0",
              fontSize: 16,
              outline: "none",
              transition: "border-color 0.2s",
              boxSizing: "border-box"
            }}
            onFocus={e => e.target.style.borderColor = "#3a3a6c"}
            onBlur={e => e.target.style.borderColor = "#d1d1e0"}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #d1d1e0",
              fontSize: 16,
              outline: "none",
              transition: "border-color 0.2s",
              boxSizing: "border-box"
            }}
            onFocus={e => e.target.style.borderColor = "#3a3a6c"}
            onBlur={e => e.target.style.borderColor = "#d1d1e0"}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 0",
              background: loading ? "#b3b3cc" : "#3a3a6c",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 17,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(60,60,120,0.08)",
              transition: "background 0.2s"
            }}
            onMouseOver={e => { if (!loading) e.target.style.background = "#23234c"; }}
            onMouseOut={e => { if (!loading) e.target.style.background = "#3a3a6c"; }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          {error && <div style={{ color: "#d32f2f", marginTop: 12, textAlign: "center" }}>{error}</div>}
          <div style={{ marginTop: 18, textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              style={{
                background: "none",
                border: "none",
                color: "#3a3a6c",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 500
              }}
            >
              New user? Register here
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <input
            type="email"
            placeholder="Email"
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #d1d1e0",
              fontSize: 16,
              outline: "none",
              transition: "border-color 0.2s",
              boxSizing: "border-box"
            }}
            onFocus={e => e.target.style.borderColor = "#3a3a6c"}
            onBlur={e => e.target.style.borderColor = "#d1d1e0"}
          />
          <input
            type="password"
            placeholder="Password"
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #d1d1e0",
              fontSize: 16,
              outline: "none",
              transition: "border-color 0.2s",
              boxSizing: "border-box"
            }}
            onFocus={e => e.target.style.borderColor = "#3a3a6c"}
            onBlur={e => e.target.style.borderColor = "#d1d1e0"}
          />
          <button
            type="submit"
            disabled={regLoading}
            style={{
              width: "100%",
              padding: "12px 0",
              background: regLoading ? "#b3b3cc" : "#3a3a6c",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 17,
              fontWeight: 600,
              cursor: regLoading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(60,60,120,0.08)",
              transition: "background 0.2s"
            }}
            onMouseOver={e => { if (!regLoading) e.target.style.background = "#23234c"; }}
            onMouseOut={e => { if (!regLoading) e.target.style.background = "#3a3a6c"; }}
          >
            {regLoading ? "Registering..." : "Register"}
          </button>
          {regError && <div style={{ color: "#d32f2f", marginTop: 12, textAlign: "center" }}>{regError}</div>}
          <div style={{ marginTop: 18, textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              style={{
                background: "none",
                border: "none",
                color: "#3a3a6c",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 500
              }}
            >
              Already have an account? Login
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Login;
