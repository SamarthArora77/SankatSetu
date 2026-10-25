import React, { useState } from 'react';
import { X, ShieldCheck, LogIn, UserPlus, Loader2, AlertCircle, Lock } from 'lucide-react';
import { authApi, CurrentUser } from '../../api';
import { ApiError } from '../../api/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: CurrentUser) => void;
  initialMode?: 'login' | 'register';
  intent?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
  initialMode = 'login',
  intent,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'CITIZEN' | 'VOLUNTEER' | 'DONOR'>('CITIZEN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setEmail('');
      setPassword('');
      setName('');
      setPhone('');
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const resetFeedback = () => {
    setError(null);
    setFieldErrors({});
  };

  const handleError = (err: unknown) => {
    if (err instanceof ApiError) {
      setError(err.message);
      const mapped: Record<string, string> = {};
      for (const item of err.errors) {
        if (item.field) mapped[item.field] = item.message;
      }
      setFieldErrors(mapped);
    } else {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();
    setIsSubmitting(true);
    try {
      const user = await authApi.login(email, password);
      onAuthenticated(user);
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();
    setIsSubmitting(true);
    try {
      const user = await authApi.register({
        name,
        email,
        password,
        role,
        phone: phone.trim() || undefined,
      });
      onAuthenticated(user);
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    resetFeedback();
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 bg-forest-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-warm-400" />
            <h3 className="font-bold text-sm">SankatSetu Secure Access</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-forest-800 text-forest-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {intent && (
            <div className="p-3 rounded bg-warm-50 border border-warm-200 text-[11px] text-warm-900 flex items-start gap-2">
              <Lock className="w-4 h-4 text-warm-700 flex-shrink-0 mt-0.5" />
              <span>{intent}</span>
            </div>
          )}

          <div className="flex rounded-lg p-1 bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'login' ? 'bg-forest-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'register' ? 'bg-forest-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-[11px] text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
                />
                {fieldErrors.email && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.email}</p>}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
                />
                {fieldErrors.password && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs uppercase tracking-wide transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                <span>{isSubmitting ? 'Verifying Credentials...' : 'Sign In Securely'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
                />
                {fieldErrors.name && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.name}</p>}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
                />
                {fieldErrors.email && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.email}</p>}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Minimum 8 characters with at least one letter and one number.</p>
                {fieldErrors.password && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.password}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone (optional)</label>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
                  />
                  {fieldErrors.phone && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.phone}</p>}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Account Type</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as typeof role)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-forest-600 focus:outline-none"
                  >
                    <option value="CITIZEN">Citizen</option>
                    <option value="VOLUNTEER">Volunteer</option>
                    <option value="DONOR">Donor</option>
                  </select>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                Responder, NGO, and administrator accounts are provisioned by the emergency operations team and cannot be self-registered.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs uppercase tracking-wide transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                <span>{isSubmitting ? 'Creating Account...' : 'Create Secure Account'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
