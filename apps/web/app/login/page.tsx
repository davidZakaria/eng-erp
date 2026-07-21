'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('consultant@eng-njd.local');
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
        const data = await res.json();
        throw new Error(data.message ?? 'Login failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
          <p className="mt-2 text-[var(--muted)] text-sm">
            Engineering Real Estate ERP — Egypt
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/80 p-8 backdrop-blur-sm"
        >
          <h1 className="text-lg font-medium mb-6">Sign in</h1>

          {error && (
            <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>
          )}

          <label className="block mb-4">
            <span className="text-sm text-[var(--muted)]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[#0f1419] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              required
            />
          </label>

          <label className="block mb-6">
            <span className="text-sm text-[var(--muted)]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[#0f1419] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Enter Dashboard'}
          </button>

          <p className="mt-4 text-xs text-[var(--muted)] text-center">
            Demo: consultant@eng-njd.local / head@eng-njd.local — Password123!
          </p>
        </form>
      </div>
    </main>
  );
}
