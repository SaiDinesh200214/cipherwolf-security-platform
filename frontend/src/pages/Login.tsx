import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest, clearAdminToken, setAdminToken } from "../services/api";

type Channel = "email" | "whatsapp";
type Mode = "login" | "loginOtp" | "forgot" | "reset" | "unlock" | "unlockOtp";

interface OtpResponse {
  challengeId: string;
  destination: string;
  expiresInSeconds: number;
  message: string;
}

interface LoginVerifyResponse {
  csrfToken: string;
}

const initialOtpSeconds = 300;

function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <label className="relative block">
      <input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-full border border-(--border) bg-(--bg-primary) px-5 py-3 pl-12 pr-12 text-center text-(--text) outline-none transition placeholder:text-(--text-secondary) focus:border-(--primary)"
        autoComplete={autoComplete}
        required
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-4 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-(--text-secondary) transition hover:bg-white hover:text-(--text)"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        <Icon size={18} />
      </button>
    </label>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = typeof location.state === "object" && location.state && "from" in location.state && typeof location.state.from === "string" ? location.state.from : "/admin";
  const [mode, setMode] = useState<Mode>("login");
  const [channel, setChannel] = useState<Channel>("email");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [destination, setDestination] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(initialOtpSeconds);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Opening the login screen should always show the login form.
    // Existing admin cookies still protect /admin, but they should not skip /admin/login.
    clearAdminToken();
  }, []);

  useEffect(() => {
    if (mode !== "loginOtp" && mode !== "reset" && mode !== "unlockOtp") return;
    if (secondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mode, secondsLeft]);

  const formattedTimer = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = String(secondsLeft % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [secondsLeft]);

  const resetOtpState = () => {
    setOtp("");
    setChallengeId("");
    setDestination("");
    setSecondsLeft(initialOtpSeconds);
    setNotice("");
    setError("");
  };

  const startLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const response = await apiRequest<OtpResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, channel }),
      });

      setChallengeId(response.challengeId);
      setDestination(response.destination);
      setSecondsLeft(response.expiresInSeconds);
      setNotice(response.message);
      setMode("loginOtp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start login.");
    } finally {
      setLoading(false);
    }
  };

  const verifyLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiRequest<LoginVerifyResponse>("/auth/login/verify", {
        method: "POST",
        body: JSON.stringify({ challengeId, otp }),
      });

      setAdminToken(response.csrfToken);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  const startForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const response = await apiRequest<OtpResponse>("/auth/password/forgot", {
        method: "POST",
        body: JSON.stringify({ username, channel }),
      });

      setChallengeId(response.challengeId);
      setDestination(response.destination);
      setSecondsLeft(response.expiresInSeconds);
      setNotice(response.message);
      setMode("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reset OTP.");
    } finally {
      setLoading(false);
    }
  };

  const startUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const response = await apiRequest<OtpResponse>("/auth/unlock", {
        method: "POST",
        body: JSON.stringify({ username, channel }),
      });

      setChallengeId(response.challengeId);
      setDestination(response.destination);
      setSecondsLeft(response.expiresInSeconds);
      setNotice(response.message);
      setMode("unlockOtp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send unlock OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verifyUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiRequest("/auth/unlock/verify", {
        method: "POST",
        body: JSON.stringify({ challengeId, otp }),
      });

      resetOtpState();
      setNotice("Account unlocked. Login with your password.");
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unlock account.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password must match.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest("/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ challengeId, otp, newPassword }),
      });

      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      resetOtpState();
      setNotice("Password updated. Login with your new password.");
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const ChannelSelector = () => (
    <div className="grid grid-cols-2 gap-2 rounded-full bg-(--bg-primary) p-1">
      <button
        type="button"
        onClick={() => setChannel("email")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${channel === "email" ? "bg-(--primary) text-white" : "text-(--text-secondary)"}`}
      >
        Email
      </button>
      <button
        type="button"
        onClick={() => setChannel("whatsapp")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${channel === "whatsapp" ? "bg-(--primary) text-white" : "text-(--text-secondary)"}`}
      >
        WhatsApp
      </button>
    </div>
  );

  const canUpdatePassword =
    !loading &&
    secondsLeft > 0 &&
    otp.length === 6 &&
    newPassword.length >= 10 &&
    confirmPassword.length >= 10 &&
    newPassword === confirmPassword;

  const resetHint = (() => {
    if (otp.length !== 6) return "Enter the 6-digit OTP.";
    if (newPassword.length < 10) return "New password must be at least 10 characters.";
    if (confirmPassword.length < 10) return "Confirm your new password.";
    if (newPassword !== confirmPassword) return "Passwords do not match.";
    if (secondsLeft === 0) return "OTP expired. Go back and request a new OTP.";
    return "";
  })();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-(--bg-primary) px-6 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-(--border) bg-white p-8 text-center shadow-xl sm:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-(--border) bg-(--bg-primary)">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--text)" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
          </svg>
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--text-secondary)">CipherWolf Admin</p>
        <h1 className="mt-2 text-2xl font-bold text-(--text)">
          {mode === "forgot" || mode === "reset" ? "Reset Password" : mode === "unlock" || mode === "unlockOtp" ? "Unlock Account" : "Secure Login"}
        </h1>

        {notice && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p>}
        {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

        {mode === "login" && (
          <form onSubmit={startLogin} className="mt-8 flex flex-col gap-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="rounded-full border border-(--border) bg-(--bg-primary) px-5 py-3 text-center text-(--text) outline-none transition placeholder:text-(--text-secondary) focus:border-(--primary)"
              autoComplete="username"
              required
            />
            <PasswordField value={password} onChange={setPassword} placeholder="Password" autoComplete="current-password" />
            <ChannelSelector />
            <button disabled={loading} className="mt-2 rounded-full bg-(--primary) py-3 font-semibold text-white transition hover:bg-(--primary-light) disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetOtpState();
                setMode("forgot");
              }}
              className="text-sm font-medium text-(--text-secondary) transition hover:text-(--text)"
            >
              Forgot password?
            </button>
            <button
              type="button"
              onClick={() => {
                resetOtpState();
                setMode("unlock");
              }}
              className="text-sm font-medium text-(--text-secondary) transition hover:text-(--text)"
            >
              Unlock locked account
            </button>
          </form>
        )}

        {mode === "loginOtp" && (
          <form onSubmit={verifyLogin} className="mt-8 flex flex-col gap-4">
            <p className="text-sm text-(--text-secondary)">OTP sent to {destination}. Expires in {formattedTimer}.</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="6-digit OTP"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="rounded-full border border-(--border) bg-(--bg-primary) px-5 py-3 text-center text-xl font-bold tracking-[0.35em] text-(--text) outline-none transition placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-(--text-secondary) focus:border-(--primary)"
              autoComplete="one-time-code"
              required
            />
            <button disabled={loading || secondsLeft === 0 || otp.length !== 6} className="rounded-full bg-(--primary) py-3 font-semibold text-white transition hover:bg-(--primary-light) disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Verifying..." : "Verify and Login"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetOtpState();
                setMode("login");
              }}
              className="text-sm font-medium text-(--text-secondary) transition hover:text-(--text)"
            >
              Back to login
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={startForgotPassword} className="mt-8 flex flex-col gap-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="rounded-full border border-(--border) bg-(--bg-primary) px-5 py-3 text-center text-(--text) outline-none transition placeholder:text-(--text-secondary) focus:border-(--primary)"
              autoComplete="username"
              required
            />
            <ChannelSelector />
            <button disabled={loading} className="mt-2 rounded-full bg-(--primary) py-3 font-semibold text-white transition hover:bg-(--primary-light) disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Sending OTP..." : "Send Reset OTP"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetOtpState();
                setMode("login");
              }}
              className="text-sm font-medium text-(--text-secondary) transition hover:text-(--text)"
            >
              Back to login
            </button>
          </form>
        )}

        {mode === "unlock" && (
          <form onSubmit={startUnlock} className="mt-8 flex flex-col gap-4">
            <p className="text-sm leading-6 text-(--text-secondary)">After 3 failed attempts, request an unlock OTP or wait for automatic unlock after 24 hours.</p>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="rounded-full border border-(--border) bg-(--bg-primary) px-5 py-3 text-center text-(--text) outline-none transition placeholder:text-(--text-secondary) focus:border-(--primary)"
              autoComplete="username"
              required
            />
            <ChannelSelector />
            <button disabled={loading} className="mt-2 rounded-full bg-(--primary) py-3 font-semibold text-white transition hover:bg-(--primary-light) disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Sending OTP..." : "Send Unlock OTP"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetOtpState();
                setMode("login");
              }}
              className="text-sm font-medium text-(--text-secondary) transition hover:text-(--text)"
            >
              Back to login
            </button>
          </form>
        )}

        {mode === "unlockOtp" && (
          <form onSubmit={verifyUnlock} className="mt-8 flex flex-col gap-4">
            <p className="text-sm text-(--text-secondary)">Unlock OTP sent to {destination}. Expires in {formattedTimer}.</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="6-digit OTP"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="rounded-full border border-(--border) bg-(--bg-primary) px-5 py-3 text-center text-xl font-bold tracking-[0.35em] text-(--text) outline-none transition placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-(--text-secondary) focus:border-(--primary)"
              autoComplete="one-time-code"
              required
            />
            <button disabled={loading || secondsLeft === 0 || otp.length !== 6} className="rounded-full bg-(--primary) py-3 font-semibold text-white transition hover:bg-(--primary-light) disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Unlocking..." : "Verify and Unlock"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetOtpState();
                setMode("login");
              }}
              className="text-sm font-medium text-(--text-secondary) transition hover:text-(--text)"
            >
              Back to login
            </button>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={resetPassword} className="mt-8 flex flex-col gap-4">
            <p className="text-sm text-(--text-secondary)">Reset OTP sent to {destination}. Expires in {formattedTimer}.</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="6-digit OTP"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="rounded-full border border-(--border) bg-(--bg-primary) px-5 py-3 text-center text-xl font-bold tracking-[0.35em] text-(--text) outline-none transition placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-(--text-secondary) focus:border-(--primary)"
              autoComplete="one-time-code"
              required
            />
            <PasswordField value={newPassword} onChange={setNewPassword} placeholder="New password" autoComplete="new-password" />
            <PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" autoComplete="new-password" />
            {resetHint && <p className="text-sm font-medium text-(--text-secondary)">{resetHint}</p>}
            <button disabled={!canUpdatePassword} className="rounded-full bg-(--primary) py-3 font-semibold text-white transition hover:bg-(--primary-light) disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Updating..." : "Update Password"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetOtpState();
                setMode("login");
              }}
              className="text-sm font-medium text-(--text-secondary) transition hover:text-(--text)"
            >
              Back to login
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
