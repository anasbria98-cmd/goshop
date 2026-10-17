import "server-only";

import { createClient } from '@supabase/supabase-js';
import { unstable_rethrow } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPublicSupabaseEnv } from '@/lib/env';
import { adminPasswordInput, passwordUpdateError, type PasswordChangeState } from '@/lib/admin-password';

export async function changeOwnPassword(form: FormData): Promise<PasswordChangeState> {
  const parsed = adminPasswordInput.safeParse({currentPassword:form.get('currentPassword'),newPassword:form.get('newPassword'),confirmation:form.get('confirmation')});
  if (!parsed.success) return {success:false,message:'Vérifiez les champs indiqués.',errors:parsed.error.flatten().fieldErrors};
  const {currentPassword,newPassword} = parsed.data;
  try {
    const sessionClient = await createSupabaseServerClient();
    const {data:{user},error:userError} = await sessionClient.auth.getUser();
    if (userError || !user?.email) return {success:false,message:'Votre session ne permet pas cette opération. Reconnectez-vous à votre compte.'};
    const {url,key} = getPublicSupabaseEnv();
    // Never sign in on the cookie client: failed password verification must not
    // replace or invalidate the existing dashboard session. No privileged key.
    const verifier = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    try {
      const {data,error} = await verifier.auth.signInWithPassword({email:user.email,password:currentPassword});
      if (error) return error.code === 'invalid_credentials'
        ? {success:false,message:'Mot de passe actuel incorrect.',errors:{currentPassword:['Mot de passe actuel incorrect.']}}
        : {success:false,message:passwordUpdateError(error.code)};
      if (data.user?.id !== user.id || !data.session) return {success:false,message:'La vérification du compte a échoué. Aucun mot de passe n’a été modifié.'};
      // Supabase checks the supplied current password too on versions that
      // enforce it. Email, metadata, role and profile are never part of this call.
      const result = await sessionClient.auth.updateUser({password:newPassword,current_password:currentPassword});
      if (result.error) return {success:false,message:passwordUpdateError(result.error.code)};
      if (result.data.user?.id !== user.id) return {success:false,message:'Impossible de confirmer la mise à jour. Reconnectez-vous pour vérifier votre accès.'};
      return {success:true,message:'Mot de passe mis à jour avec succès.'};
    } finally {
      // Revoke only this temporary verification session, never all sessions.
      await verifier.auth.signOut({scope:'local'}).catch(() => {});
    }
  } catch (error) {
    unstable_rethrow(error);
    // Do not log errors or return provider payloads: these operations carry secrets.
    return {success:false,message:passwordUpdateError()};
  }
}
