'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiPost, getErrorMessage } from '@/services/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const onSubmit = async (data: FormData) => {
    try {
      await apiPost('/auth/register', data);
      const tokens = await apiPost<{ access_token: string; refresh_token: string }>('/auth/login', {
        email: data.email,
        password: data.password,
      });
      login(tokens.access_token, tokens.refresh_token);
      showToast('Account created!', 'success');
      router.push('/');
    } catch (e) {
      showToast(getErrorMessage(e), 'error');
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-center bg-gradient-to-br from-navy-50 via-navy-100 to-white p-12 lg:flex">
        <h1 className="text-4xl font-bold tracking-tight text-navy-900">Get started</h1>
        <p className="mt-4 max-w-md text-lg text-muted">Simple daily tasks. No clutter, no complexity.</p>
      </div>
      <div className="flex items-center justify-center bg-surface-elevated p-6">
        <div className="card w-full max-w-md p-8">
          <h2 className="text-xl font-semibold text-foreground">Create account</h2>
          <p className="mt-1 text-sm text-muted">Start your productivity journey</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Full name</label>
              <input type="text" className="input" {...register('full_name')} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input type="email" className="input" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <input type="password" className="input" {...register('password')} />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>
            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create account'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            Have an account? <Link href="/login" className="font-medium text-navy-500 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
