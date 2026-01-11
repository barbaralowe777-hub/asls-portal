import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ResetPassword: React.FC = () => {
  const [mode, setMode] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already logged in (e.g., admin), allow direct reset
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) setMode("reset");
    })();

    // If arriving from email, tokens are in the URL hash (#access_token=...)
    const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");
    const error_description = hashParams.get("error_description");

    if (error_description) {
      setError(error_description);
    }

    if (access_token) {
      (async () => {
        try {
          const { error: err } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || undefined,
          });
          if (err) throw err;
          setMode("reset");
          // clean hash so the token isn’t left in the URL
          try {
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          } catch {}
        } catch (e: any) {
          setError(e.message || "Invalid or expired reset link.");
        }
      })();
    }
  }, []);


  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (err) throw err;
      setMessage("If that email exists, a reset link has been sent. Please check your inbox.");
    } catch (err: any) {
      setError(err.message || "Unable to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!password || password !== confirm) {
      setError("Passwords must match.");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setMessage("Password updated. You can now log in with your new password.");
    } catch (err: any) {
      setError(err.message || "Unable to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-md rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
          {mode === "request" ? "Reset Password" : "Set New Password"}
        </h2>
        {message && <div className="bg-green-100 text-green-800 px-4 py-2 rounded mb-4">{message}</div>}
        {error && <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">{error}</div>}

        {mode === "request" ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-[#1dad21] focus:border-[#1dad21]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1dad21] text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-[#1dad21] focus:border-[#1dad21]"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-[#1dad21] focus:border-[#1dad21]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1dad21] text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
