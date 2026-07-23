'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { clientApi } from '@/lib/client-api';
import {
  ALL_MANAGEABLE_ROLES,
  ManagedUser,
  Role,
  TEAM_ROLES,
} from '@/lib/types';

export function TeamManagementTab({
  allowSuperAdmin = false,
}: {
  allowSuperAdmin?: boolean;
}) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const tRoles = useTranslations('roles');
  const roles = allowSuperAdmin ? ALL_MANAGEABLE_ROLES : TEAM_ROLES;

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'SITE_ENGINEER' as Role,
    isActive: true,
  });

  async function load() {
    setLoading(true);
    try {
      const data = await clientApi<ManagedUser[]>('/users');
      setUsers(data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setForm({
      fullName: '',
      email: '',
      password: '',
      role: 'SITE_ENGINEER',
      isActive: true,
    });
  }

  function openEdit(user: ManagedUser) {
    setEditing(user);
    setCreating(false);
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      if (creating) {
        await clientApi('/users', {
          method: 'POST',
          body: JSON.stringify({
            fullName: form.fullName,
            email: form.email,
            password: form.password,
            role: form.role,
          }),
        });
      } else if (editing) {
        const body: Record<string, unknown> = {
          fullName: form.fullName,
          email: form.email,
          role: form.role,
          isActive: form.isActive,
        };
        if (form.password.trim()) body.password = form.password;
        await clientApi(`/users/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      }
      setCreating(false);
      setEditing(null);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function deactivate(user: ManagedUser) {
    if (!confirm(t('confirmDeactivate'))) return;
    try {
      await clientApi(`/users/${user.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Deactivate failed');
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">{tCommon('loading')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-[var(--text)]">
          {t('teamManagement')}
        </h3>
        <button type="button" className="btn-primary" onClick={openCreate}>
          {t('addUser')}
        </button>
      </div>

      {(creating || editing) && (
        <form
          onSubmit={onSubmit}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 grid gap-3 sm:grid-cols-2"
        >
          <h4 className="sm:col-span-2 font-medium text-[var(--text)]">
            {creating ? t('addUser') : t('editUser')}
          </h4>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('fullName')}</span>
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('email')}</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('password')}</span>
            <input
              required={creating}
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('role')}</span>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as Role }))
              }
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {tRoles(role)}
                </option>
              ))}
            </select>
          </label>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              {t('active')}
            </label>
          )}
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" className="btn-primary">
              {tCommon('save')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              {tCommon('cancel')}
            </button>
          </div>
        </form>
      )}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
              <tr>
                <th className="text-start px-4 py-3">{t('fullName')}</th>
                <th className="text-start px-4 py-3">{t('email')}</th>
                <th className="text-start px-4 py-3">{t('role')}</th>
                <th className="text-start px-4 py-3">{tCommon('status')}</th>
                <th className="text-end px-4 py-3">{tCommon('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                    {t('noUsers')}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-t border-[var(--border)] text-[var(--text)]">
                    <td className="px-4 py-3">{user.fullName}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3 text-sm">{tRoles(user.role)}</td>
                    <td className="px-4 py-3">
                      {user.isActive ? t('active') : t('inactive')}
                    </td>
                    <td className="px-4 py-3 text-end space-x-2 rtl:space-x-reverse">
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-1 !text-xs"
                        onClick={() => openEdit(user)}
                      >
                        {tCommon('edit')}
                      </button>
                      {user.isActive && (
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => deactivate(user)}
                        >
                          {tCommon('deactivate')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {message && (
        <p className="text-sm text-[var(--danger)]">{message}</p>
      )}
    </div>
  );
}
