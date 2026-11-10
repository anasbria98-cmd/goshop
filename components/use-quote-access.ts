'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createQuoteAccess } from '@/lib/quote-access';

export function useQuoteAccess() {
  const pathname = usePathname();
  const [access, setAccess] = useState<{path: string; allowed: boolean} | null>(null);
  useEffect(() => {
    const gate = createQuoteAccess(async () => {
      const {data, error} = await createSupabaseBrowserClient().auth.getUser();
      return !error && !!data.user;
    }, allowed => setAccess({path: pathname, allowed}));
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const client = createSupabaseBrowserClient();
      const scheduleCheck = () => {
        gate.hide();
        clearTimeout(timer);
        // Supabase Auth callbacks must not await another Auth call under its lock.
        timer = setTimeout(() => { void gate.check(); }, 0);
      };
      const {data: {subscription}} = client.auth.onAuthStateChange(event => {
        if (event === 'SIGNED_OUT') { clearTimeout(timer); gate.hide(); }
        else scheduleCheck();
      });
      const visible = () => { if (document.visibilityState === 'visible') scheduleCheck(); };
      window.addEventListener('focus', scheduleCheck);
      document.addEventListener('visibilitychange', visible);
      void gate.check();
      return () => {
        gate.dispose(); clearTimeout(timer); subscription.unsubscribe();
        window.removeEventListener('focus', scheduleCheck);
        document.removeEventListener('visibilitychange', visible);
      };
    } catch { return () => gate.dispose(); }
  }, [pathname]);
  // Hidden on the server, initial hydration and navigation until Auth is verified.
  return access?.path === pathname && access.allowed;
}
