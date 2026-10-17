import { z } from 'zod';

export const MIN_ADMIN_PASSWORD_LENGTH = 12;
export const adminPasswordInput = z.object({
  currentPassword: z.string().min(1, 'Saisissez votre mot de passe actuel.').max(1024, 'Mot de passe actuel invalide.'),
  newPassword: z.string().min(MIN_ADMIN_PASSWORD_LENGTH, 'Le nouveau mot de passe doit contenir au moins 12 caractères.').max(128, 'Le nouveau mot de passe doit contenir au maximum 128 caractères.'),
  confirmation: z.string().min(1, 'Confirmez le nouveau mot de passe.').max(128, 'La confirmation est trop longue.'),
}).refine(input => input.newPassword === input.confirmation, {path:['confirmation'],message:'Les nouveaux mots de passe ne correspondent pas.'})
  .refine(input => input.newPassword !== input.currentPassword, {path:['newPassword'],message:'Le nouveau mot de passe doit être différent du mot de passe actuel.'});

export type PasswordChangeState = { success: boolean; message: string; errors?: Partial<Record<'currentPassword'|'newPassword'|'confirmation', string[]>> };

export function passwordUpdateError(code?: string): string {
  if (code === 'weak_password') return 'Le nouveau mot de passe ne respecte pas la politique de sécurité Supabase. Choisissez un mot de passe plus robuste.';
  if (code === 'same_password') return 'Le nouveau mot de passe doit être différent du mot de passe actuel.';
  if (code === 'reauthentication_needed' || code === 'reauthentication_not_valid') return 'Supabase exige une authentification récente. Reconnectez-vous, puis réessayez de changer le mot de passe.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return 'Trop de tentatives. Patientez quelques instants avant de réessayer.';
  return 'Impossible de mettre à jour le mot de passe. Réessayez dans quelques instants.';
}
