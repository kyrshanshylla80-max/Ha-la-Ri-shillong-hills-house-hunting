import React, { useState } from 'react';
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  doc,
  getDoc,
  setDoc,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { translations } from '../i18n/khasi';
import { UserRole } from '../types/property';
import { X, Mail, Lock, User, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2, Key, Building2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'kh';
  initialMode?: 'login' | 'signup';
  defaultRole?: UserRole;
  onSuccess?: (user: { uid: string; email: string; displayName?: string; role: UserRole }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  lang,
  initialMode = 'login',
  defaultRole = 'tenant',
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCred.user.uid;
        const userProfile: { uid: string; email: string; displayName: string; role: UserRole; createdAt: string } = {
          uid,
          email,
          displayName: displayName.trim() || email.split('@')[0],
          role,
          createdAt: new Date().toISOString(),
        };

        const path = `users/${uid}`;
        try {
          await setDoc(doc(db, 'users', uid), userProfile);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }

        if (onSuccess) onSuccess(userProfile);
        onClose();
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        let userRole: UserRole = role;
        let userDisplayName = userCred.user.displayName || email.split('@')[0];

        try {
          const userSnap = await getDoc(doc(db, 'users', userCred.user.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.role === 'rent_owner' || data.role === 'owner' || data.role === 'tenant') {
              userRole = data.role;
            }
            if (data.displayName) {
              userDisplayName = data.displayName;
            }
          }
        } catch (e) {
          console.warn('Could not read existing role on login:', e);
        }

        if (onSuccess) {
          onSuccess({
            uid: userCred.user.uid,
            email: userCred.user.email || email,
            displayName: userDisplayName,
            role: userRole,
          });
        }
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account already exists with this email. Please log in.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Incorrect email or password. Please try again.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      let userRole: UserRole = role;
      let userDisplayName = user.displayName || user.email?.split('@')[0] || 'Shillong Member';

      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.role === 'rent_owner' || data.role === 'owner' || data.role === 'tenant') {
            userRole = data.role;
          }
          if (data.displayName) {
            userDisplayName = data.displayName;
          }
        } else {
          // First time Google user: create their profile document
          const newProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: userDisplayName,
            role: userRole,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }

      if (onSuccess) {
        onSuccess({
          uid: user.uid,
          email: user.email || '',
          displayName: userDisplayName,
          role: userRole,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err.message || 'Google sign-in could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">
              {mode === 'signup' ? 'Create Ha la Ri Account' : 'Welcome to Ha la Ri'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'signup'
                ? 'Join Shillong’s hill property marketplace'
                : 'Sign in to access your saved homes & hill listings'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Your Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Your Full Name"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-emerald-600 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Select Account Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('tenant')}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                        role === 'tenant'
                          ? 'border-sky-600 bg-sky-50 text-sky-950 font-semibold ring-2 ring-sky-500/20'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold">
                        <User className="w-3.5 h-3.5 text-sky-600" />
                        <span>Seeker</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Looking for home</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('rent_owner')}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                        role === 'rent_owner'
                          ? 'border-amber-600 bg-amber-50 text-amber-950 font-semibold ring-2 ring-amber-500/20'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold">
                        <Key className="w-3.5 h-3.5 text-amber-600" />
                        <span>Rent Owner</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Rent house landlord</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('owner')}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                        role === 'owner'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-semibold ring-2 ring-emerald-500/20'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sale Owner</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Property for sale</div>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-emerald-600 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-emerald-600 outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Account' : 'Sign In with Email'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social Sign-in Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
