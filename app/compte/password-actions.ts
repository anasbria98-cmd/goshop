"use server";

import { redirect } from 'next/navigation';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { isAdminRole } from '@/lib/auth-routing';
import { changeOwnPassword } from '@/lib/account-password';
import type { PasswordChangeState } from '@/lib/admin-password';

export async function changeCustomerPassword(_previous: PasswordChangeState, form: FormData): Promise<PasswordChangeState> {
  await requireUser();
  const profile = await getCurrentProfile();
  if (isAdminRole(profile?.role)) redirect('/admin');
  return changeOwnPassword(form);
}
