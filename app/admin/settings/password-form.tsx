"use client";

import { useActionState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { SubmitButton } from '../_submit-button';
import { MIN_ADMIN_PASSWORD_LENGTH, type PasswordChangeState } from '@/lib/admin-password';
import { changeOwnAdminPassword } from './password-actions';

const initialState: PasswordChangeState = {success:false,message:''};
export function ChangePasswordForm() {
  const [state,action,pending] = useActionState(changeOwnAdminPassword,initialState);
  return <form action={action} className="admin-form-grid" aria-busy={pending}>
    <p className="admin-form-wide">Cette modification concerne uniquement votre compte connecté. Utilisez au moins {MIN_ADMIN_PASSWORD_LENGTH} caractères pour le nouveau mot de passe.</p>
    <label className="admin-form-wide" htmlFor="admin-current-password">Mot de passe actuel
      <input id="admin-current-password" name="currentPassword" type="password" autoComplete="current-password" required maxLength={1024} disabled={pending} aria-invalid={Boolean(state.errors?.currentPassword)} aria-describedby={state.errors?.currentPassword ? 'admin-current-password-error' : undefined} />
      {state.errors?.currentPassword && <small id="admin-current-password-error" role="alert">{state.errors.currentPassword.join(' ')}</small>}
    </label>
    <label htmlFor="admin-new-password">Nouveau mot de passe
      <input id="admin-new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={MIN_ADMIN_PASSWORD_LENGTH} maxLength={128} disabled={pending} aria-invalid={Boolean(state.errors?.newPassword)} aria-describedby={state.errors?.newPassword ? 'admin-new-password-error' : undefined} />
      {state.errors?.newPassword && <small id="admin-new-password-error" role="alert">{state.errors.newPassword.join(' ')}</small>}
    </label>
    <label htmlFor="admin-password-confirmation">Confirmer le nouveau mot de passe
      <input id="admin-password-confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={MIN_ADMIN_PASSWORD_LENGTH} maxLength={128} disabled={pending} aria-invalid={Boolean(state.errors?.confirmation)} aria-describedby={state.errors?.confirmation ? 'admin-password-confirmation-error' : undefined} />
      {state.errors?.confirmation && <small id="admin-password-confirmation-error" role="alert">{state.errors.confirmation.join(' ')}</small>}
    </label>
    {state.message && <div className={`admin-form-wide ${state.success ? 'admin-feedback admin-feedback--success' : 'admin-validation-message'}`} role={state.success ? 'status' : 'alert'}>{state.success && <CheckCircle2 size={18} aria-hidden="true" />}{state.message}</div>}
    <div className="admin-form-wide admin-editor-actions"><SubmitButton>Mettre à jour le mot de passe</SubmitButton></div>
  </form>;
}
