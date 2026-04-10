"use client";

import { useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fontStack = "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const displayFont = "var(--font-instrument-serif), Georgia, serif";

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error");
    }
    setSubmitting(false);
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#0a0a12",
        color: "#c8d0dc",
        fontFamily: fontStack,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: "380px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          <div
            style={{
              fontFamily: displayFont,
              fontSize: "32px",
              color: "#e8ecf2",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Neural Cascade
          </div>
          <div
            style={{
              color: "#4a5568",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: "6px",
            }}
          >
            Brain Activity Visualizer
          </div>
        </div>
        <label
          style={{
            color: "#6b7280",
            fontSize: "10px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Access Password
        </label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "6px",
            padding: "12px 14px",
            color: "#e0e4ea",
            fontFamily: fontStack,
            fontSize: "13px",
            outline: "none",
          }}
        />
        {error && (
          <div style={{ color: "#ED4C67", fontSize: "11px" }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={submitting || !password}
          style={{
            background: "rgba(255,195,18,0.15)",
            border: "1px solid rgba(255,195,18,0.3)",
            color: submitting ? "#6b7280" : "#FFC312",
            padding: "12px 20px",
            borderRadius: "6px",
            cursor: submitting ? "default" : "pointer",
            fontFamily: fontStack,
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.05em",
          }}
        >
          {submitting ? "ENTERING..." : "ENTER"}
        </button>
      </form>
    </div>
  );
}
