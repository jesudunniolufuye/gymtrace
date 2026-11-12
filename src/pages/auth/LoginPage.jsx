import { useState } from 'react';
import { Mail, Lock, LogIn, MailCheck, AlertTriangle } from 'lucide-react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { loginUser, logoutUser, sendEmailVerification } from '../../services/authService';
import { getUserDoc } from '../../services/userService';
import { authErrorMessage } from '../../lib/authErrors';
import { dashboardPath } from '../../lib/roles';
import logo from '../../assets/logo.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const LoginPage = () => {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Shown after registering (set by RegisterPage) or after clicking the email link.
  const registeredEmail = location.state?.registeredEmail;
  const justVerified = searchParams.get('verified') === '1';
  const justReset = searchParams.get('reset') === '1';

  // Holds the credentials of an unverified login so we can resend the email.
  const [unverified, setUnverified] = useState(null);
  const [resending, setResending] = useState(false);

  const onSubmit = async (data) => {
    setUnverified(null);
    try {
      const cred = await loginUser(data.email, data.password);

      // TC1 step 2: no dashboard access until the email is verified.
      if (!cred.user.emailVerified) {
        await logoutUser();
        setUnverified({ email: data.email, password: data.password });
        toast.error('Please verify your email before logging in.');
        return;
      }

      const profile = await getUserDoc(cred.user.uid);
      if (!profile) {
        await logoutUser();
        toast.error('Account profile not found. Contact the gym administrator.');
        return;
      }

      toast.success('Logged in successfully!');
      navigate(dashboardPath(profile.role));
    } catch (error) {
      toast.error(authErrorMessage(error, 'Login failed. Please try again.'));
    }
  };

  const resendVerification = async () => {
    if (!unverified) return;
    setResending(true);
    try {
      // Sign in briefly to get the user object, send the email, sign out again.
      const cred = await loginUser(unverified.email, unverified.password);
      await sendEmailVerification(cred.user);
      await logoutUser();
      toast.success(`Verification email sent to ${unverified.email}.`);
    } catch (error) {
      toast.error(authErrorMessage(error, 'Could not resend the email. Please try again later.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative">
      {/* 1. Header Section */}
      <div className="mb-4">
        <img src={logo} alt="GymTrace Logo" className="w-auto h-36" />
      </div>

      {/* 2. Login Card */}
      <div className="bg-white w-full max-w-md p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
        <p className="text-slate-500 text-sm mt-2 mb-8 font-medium">
          Access your Babcock University gym account
        </p>

        {justVerified && (
          <div role="status" className="mb-6 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <MailCheck className="w-5 h-5 shrink-0" />
            <p>Your email has been verified. You can now log in.</p>
          </div>
        )}

        {justReset && (
          <div role="status" className="mb-6 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <MailCheck className="w-5 h-5 shrink-0" />
            <p>Your password has been changed. Log in with your new password.</p>
          </div>
        )}

        {registeredEmail && !justVerified && !unverified && (
          <div role="status" className="mb-6 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <MailCheck className="w-5 h-5 shrink-0" />
            <p>
              Account created. We sent a verification link to <strong>{registeredEmail}</strong>.
              Check your inbox (and spam folder), click the link, then log in here.
            </p>
          </div>
        )}

        {unverified && (
          <div role="alert" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>
                Your email address has not been verified yet. Open the link we sent to{' '}
                <strong>{unverified.email}</strong>, then log in again.
              </p>
            </div>
            <button
              type="button"
              onClick={resendVerification}
              disabled={resending}
              className="mt-3 ml-8 font-bold text-amber-800 underline disabled:opacity-60"
            >
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="auth-email" className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="name@babcock.edu.ng"
                className={`w-full bg-slate-50 border rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none ${
                    errors.email ? 'border-red-500' : 'border-slate-200'
                }`}
                id="auth-email" {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <div className="flex justify-between mb-2">
              <label htmlFor="auth-password" className="text-sm font-semibold text-slate-700">Password</label>
              <Link to="/forgot-password" className="text-sm text-emerald-600 font-bold hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                className={`w-full bg-slate-50 border rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none ${
                    errors.password ? 'border-red-500' : 'border-slate-200'
                }`}
                id="auth-password" {...register('password')}
              />
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span>Logging in...</span>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Login to Dashboard</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-600 text-sm font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-600 font-bold hover:underline">
              Register as Student/Staff
            </Link>
          </p>
        </div>
      </div>

      {/* 3. Footer */}
      <div className="mt-12 text-center text-xs text-slate-400 font-medium">
        <p className="mb-2 text-sm"><Link to="/help" className="text-emerald-700 font-semibold hover:underline">Need help?</Link></p>
        <p> Secure Access Portal • Babcock University Gym Management</p>
        <p className="mt-2 uppercase tracking-widest">© 2026 GYMTRACE PLATFORM</p>
      </div>
    </div>
  );
};

export default LoginPage;
