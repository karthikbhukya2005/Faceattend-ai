import React, { useMemo, useState } from 'react';
import {
  User,
  ShieldCheck,
  LockKeyhole,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { authService } from '../services/auth';

const passwordInputClass =
  'mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 pr-11 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20';

const PasswordInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  placeholder: string;
  autoComplete: string;
}> = ({
  label,
  value,
  onChange,
  show,
  setShow,
  placeholder,
  autoComplete,
}) => (
  <div>
    <label className="text-xs font-semibold text-slate-300">{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={passwordInputClass}
      />
      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-200"
        aria-label={show ? `Hide ${label}` : `Show ${label}`}
      >
        {show ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  </div>
);

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = authService.getUser();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const passwordChecks = useMemo(() => ({
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  }), [newPassword]);

  const passwordStrong =
    passwordChecks.length &&
    passwordChecks.upper &&
    passwordChecks.lower &&
    passwordChecks.number &&
    passwordChecks.special;

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Please fill in all password fields.');
      return;
    }

    if (!passwordStrong) {
      setErrorMessage(
        'New password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
      );
      return;
    }

    if (newPassword === oldPassword) {
      setErrorMessage('New password must be different from your current password.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    try {
      setSaving(true);

      const response = await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });

      setSuccessMessage(
        response?.message || 'Password updated successfully.'
      );

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;

      if (Array.isArray(detail)) {
        setErrorMessage(
          detail.map((item: any) => item?.msg || 'Invalid password').join(', ')
        );
      } else {
        setErrorMessage(
          detail || 'Unable to update password. Please try again.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    authService.clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Account Settings
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Manage your account information and security preferences
            </p>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <div className="mb-5 flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
            <User className="h-4 w-4 text-slate-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Account Information</h2>
            <p className="text-[11px] text-slate-500">
              Your currently authenticated account
            </p>
          </div>
        </div>

        {currentUser ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Name
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {currentUser.name}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Email
              </p>
              <p className="mt-1 break-all text-sm font-semibold text-white">
                {currentUser.email}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                ID
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {currentUser.employee_id}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Role
              </p>
              <span className="mt-1 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                {currentUser.role}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Account information is unavailable.
          </p>
        )}
      </section>

      {/* Change Password */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <div className="mb-5 flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10">
            <LockKeyhole className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Change Password</h2>
            <p className="text-[11px] text-slate-500">
              Update your password without logging out
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="max-w-2xl space-y-4">
          <PasswordInput
            label="Current Password"
            value={oldPassword}
            onChange={setOldPassword}
            show={showOldPassword}
            setShow={setShowOldPassword}
            placeholder="Enter your current password"
            autoComplete="current-password"
          />

          <PasswordInput
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            show={showNewPassword}
            setShow={setShowNewPassword}
            placeholder="Enter your new password"
            autoComplete="new-password"
          />

          {newPassword && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="mb-2 text-[11px] font-semibold text-slate-400">
                Password requirements
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {[
                  ['At least 8 characters', passwordChecks.length],
                  ['One uppercase letter', passwordChecks.upper],
                  ['One lowercase letter', passwordChecks.lower],
                  ['One number', passwordChecks.number],
                  ['One special character', passwordChecks.special],
                ].map(([text, valid]) => (
                  <div
                    key={String(text)}
                    className={`flex items-center gap-2 text-[11px] ${
                      valid ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        valid ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          )}

          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirmPassword}
            setShow={setShowConfirmPassword}
            placeholder="Re-enter your new password"
            autoComplete="new-password"
          />

          {confirmPassword && (
            <p
              className={`text-[11px] ${
                passwordsMatch ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {passwordsMatch
                ? '✓ Passwords match'
                : '✕ Passwords do not match'}
            </p>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-relaxed text-slate-500">
              Your password is securely hashed on the server. Never share your
              password with another person.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LockKeyhole className="h-4 w-4" />
              {saving ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </form>
      </section>

      {/* Security / Session */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Session Security</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Sign out when using a shared or public computer.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
