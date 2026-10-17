"use client";

import { useActionState } from 'react';
import { StoreText } from '@/components/storefront-language';
import { MIN_ADMIN_PASSWORD_LENGTH, type PasswordChangeState } from '@/lib/admin-password';
import { changeCustomerPassword } from './password-actions';
import styles from './account.module.css';

const initialState: PasswordChangeState = {success:false,message:''};
const fields = [
  {name:'currentPassword',label:'Mot de passe actuel',autocomplete:'current-password'},
  {name:'newPassword',label:'Nouveau mot de passe',autocomplete:'new-password'},
  {name:'confirmation',label:'Confirmer le nouveau mot de passe',autocomplete:'new-password'},
] as const;
export function CustomerPasswordForm() {
  const [state,action,pending] = useActionState(changeCustomerPassword,initialState);
  return <form action={action} className={styles.password} aria-busy={pending}>
    <p className={styles.muted}><StoreText>Utilisez au moins 12 caractères pour le nouveau mot de passe.</StoreText></p>
    {fields.map(field => <label key={field.name} htmlFor={`customer-${field.name}`}><StoreText>{field.label}</StoreText>
      <input id={`customer-${field.name}`} name={field.name} type="password" autoComplete={field.autocomplete} required disabled={pending} minLength={field.name === 'currentPassword' ? undefined : MIN_ADMIN_PASSWORD_LENGTH} maxLength={field.name === 'currentPassword' ? 1024 : 128} aria-invalid={Boolean(state.errors?.[field.name])} aria-describedby={state.errors?.[field.name] ? `customer-${field.name}-error` : undefined}/>
      {state.errors?.[field.name] && <small id={`customer-${field.name}-error`} role="alert"><StoreText>{state.errors[field.name]!.join(' ')}</StoreText></small>}
    </label>)}
    {state.message && <p className={state.success ? styles.success : styles.error} role={state.success ? 'status' : 'alert'}><StoreText>{state.message}</StoreText></p>}
    <button className="button navy" disabled={pending}><StoreText>{pending ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}</StoreText></button>
  </form>;
}
