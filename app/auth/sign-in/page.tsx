import { StoreText } from "@/components/storefront-language";
import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { AuthSubmitButton } from "@/components/auth-submit-button";

export const metadata = { title: "Connexion" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <section className="auth-page wrap">
      <form action={signIn} className="auth-card">
        <h1><StoreText>Connexion</StoreText></h1>
        <p><StoreText>Accédez à votre espace GO ELEC.</StoreText></p>
        {params.error && <div className="form-error"><StoreText>{params.error}</StoreText></div>}
        {params.message && <div className="form-success"><StoreText>{params.message}</StoreText></div>}
        {params.next ? <input type="hidden" name="next" value={params.next} /> : null}
        <label><StoreText>E-mail</StoreText><input required type="email" name="email" autoComplete="email" /></label>
        <label><StoreText>Mot de passe</StoreText><input required minLength={8} type="password" name="password" autoComplete="current-password" /></label>
        <AuthSubmitButton />
        <Link href="/auth/sign-up"><StoreText>Créer un compte</StoreText></Link>
      </form>
    </section>
  );
}
