'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const [email, setEmail] = useState('super@eng-njd.local');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(data.message ?? 'Login failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError(
          'Cannot reach the web server or API. Run `npm run dev` from the project root.',
        );
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-5xl tracking-tight text-[var(--text)]">
            Eng-NJD
          </p>
          <p className="mt-2 text-[var(--muted)] text-sm">{t('tagline')}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 backdrop-blur-sm"
        >
          <h1 className="text-lg font-medium mb-6 text-[var(--text)]">
            {t('signIn')}
          </h1>

          {error && (
            <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>
          )}

          <label className="block mb-4">
            <span className="text-sm text-[var(--muted)]">{t('email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              required
            />
          </label>

          <label className="block mb-6">
            <span className="text-sm text-[var(--muted)]">{t('password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5"
          >
            {loading ? t('signingIn') : t('enterDashboard')}
          </button>

          <p className="mt-4 text-xs text-[var(--muted)] text-center">
            {t('demoAccounts')}
          </p>
        </form>
      </div>
    </main>
  );
}
