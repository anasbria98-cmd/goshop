"use server";

import { requireRole } from '@/lib/auth';
import { changeOwnPassword } from '@/lib/account-password';
import type { PasswordChangeState } from '@/lib/admin-password';

export async function changeOwnAdminPassword(_previous: PasswordChangeState, form: FormData): Promise<PasswordChangeState> {
  await requireRole();
  return changeOwnPassword(form);
}
