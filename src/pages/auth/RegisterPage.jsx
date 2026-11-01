import React from 'react';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { registerUser, sendEmailVerification, logoutUser, deleteAuthUser } from '../../services/authService';
import { createUserDoc } from '../../services/userService';
import { authErrorMessage } from '../../lib/authErrors';
import { validateName } from '../../../shared/name.js';
import logo from '../../assets/logo.png';

const registerSchema = z.object({
  fullName: z.string().superRefine((v, ctx) => {
    const r = validateName(v);
    if (!r.ok) ctx.addIssue({ code: 'custom', message: r.message });
  }),
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['member', 'trainer']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  terms: z.literal(true, {
    error: 'Please confirm you have read the Privacy Notice',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const RegisterPage = () => {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: 'member',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    let cred;
    try {
      cred = await registerUser(data.email.trim(), data.password);
    } catch (error) {
      toast.error(authErrorMessage(error, 'Registration failed. Please try again.'));
      return;
    }

    try {
      // Create the profile first. If the rules reject it, remove the auth
      // account so the person can try again with the same email.
      await createUserDoc(cred.user.uid, {
        name: data.fullName.trim(),
        email: cred.user.email, // Firebase's normalised email, matched by the rules
        role: data.role,
      });
    } catch (error) {
      console.error('Profile creation failed', error);
      await deleteAuthUser(cred.user).catch(() => {});
      toast.error('Registration failed. Please try again.');
      return;
    }

    try {
      await sendEmailVerification(cred.user);
    } catch (error) {
      // The account exists; the user can resend from the login page.
      console.error('Verification email failed', error);
      toast.error('Account created, but the verification email could not be sent. Use "Resend" on the login page.');
    }

    // TC1 step 1: no dashboard yet. Sign out and ask them to check their inbox.
    await logoutUser();
    toast.success(
      data.role === 'trainer'
        ? 'Account created! Verify your email. An administrator will activate your trainer profile.'
        : 'Account created! Check your inbox to verify your email.'
    );
    navigate('/login', { state: { registeredEmail: cred.user.email } });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative">
      <div className="flex justify-center mb-4">
        <img src={logo} alt="GymTrace Logo" className="w-auto h-40 object-contain" />
      </div>

      {/* 2. REGISTER CARD */}
      <div className="bg-white w-full max-w-md p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800">Create your account</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">
          
          {/* FULL NAME INPUT */}
          <div>
            <label htmlFor="auth-fullName" className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="John Doe"
                className={`w-full bg-slate-50 border rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none ${
                    errors.fullName ? 'border-red-500' : 'border-slate-200'
                }`}
                id="auth-fullName" {...register('fullName')}
              />
            </div>
            {errors.fullName && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.fullName.message}</p>
            )}
          </div>

          {/* EMAIL INPUT */}
          <div>
            <label htmlFor="auth-email" className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="email" 
                placeholder="john@example.com"
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

          {/* ROLE SLECTOR */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">I am a...</label>
            <input type="hidden" {...register('role')} />
            <div className="grid grid-cols-2 gap-4">
              {/* Member Button */}
              <button
                type="button"
                onClick={() => setValue('role', 'member')}
                className={`py-3 rounded-xl font-medium border-2 transition-all ${
                  selectedRole === 'member' 
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50' 
                    : 'border-slate-200 text-slate-500 hover:border-emerald-200'
                }`}
              >
                Member
              </button>

              {/* Trainer Button */}
              <button
                type="button"
                onClick={() => setValue('role', 'trainer')}
                className={`py-3 rounded-xl font-medium border-2 transition-all ${
                  selectedRole === 'trainer' 
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50' 
                    : 'border-slate-200 text-slate-500 hover:border-emerald-200'
                }`}
              >
                Trainer
              </button>
            </div>
          </div>

          {/* PASSWORD INPUT */}
          <div>
            <label htmlFor="auth-password" className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
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

          {/* CONFIRM PASSWORD INPUT */}
          <div>
            <label htmlFor="auth-confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                placeholder="••••••••"
                className={`w-full bg-slate-50 border rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none ${
                    errors.confirmPassword ? 'border-red-500' : 'border-slate-200'
                }`}
                id="auth-confirmPassword" {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* TERMS CHECKBOX */}
          <div>
            <div className="flex items-center space-x-3">
                <input 
                type="checkbox" 
                id="terms"
                className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                {...register('terms')}
                />
                <label htmlFor="terms" className="text-sm text-slate-600 cursor-pointer">
                I have read the{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold hover:underline">
                  Privacy Notice
                </a>{' '}
                and agree to GymTrace using my data as it describes.
                </label>
            </div>
            {errors.terms && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.terms.message}</p>
            )}
          </div>
          
          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

        </form>

        <div className="mt-8 text-center bg-slate-50 py-3 rounded-xl border border-slate-100">
          <p className="text-slate-600 text-sm font-medium">
             Already have an account? <Link to="/login" className="text-emerald-600 font-bold hover:underline">Log in</Link>
          </p>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-12 text-center text-xs text-slate-400 font-medium">
        <p> Secure Access Portal • Babcock University Gym Management</p>
        <p className="mt-2 uppercase tracking-widest">© 2026 GYMTRACE PLATFORM</p>
      </div>

    </div>
  );
};

export default RegisterPage;
