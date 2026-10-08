import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

const forgotSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

export const ForgotPassword = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setApiError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const result = await response.json();
      if (!response.ok && response.status !== 202) {
        throw new Error(result.message || "Unable to request password reset.");
      }
      setIsSubmitted(true);
    } catch (err) {
      setApiError(err.message || "Failed to submit password reset request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden border border-slate-100">
        <div className="p-8">
          
          {!isSubmitted ? (
            <>
              <div className="flex justify-center mb-6">
                <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <Mail size={24} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Forgot Password</h2>
              <p className="text-sm text-slate-500 text-center mb-8">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={18} className="text-slate-400" />
                    </div>
                    <input
                      {...register('email')}
                      type="email"
                      className="pl-10 w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="name@university.edu"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
                </div>

                {apiError && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                    {apiError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                  <ArrowRight size={16} className="ml-2" />
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Check your email</h2>
              <p className="text-sm text-slate-500 mb-8">
                We've sent a password reset link to your email address. Please check your inbox.
              </p>
              
              <Link
                to="/login"
                className="w-full flex justify-center py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          )}
        </div>
        
        {!isSubmitted && (
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              Remember your password?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
