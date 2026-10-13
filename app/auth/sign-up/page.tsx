import { StoreText } from "@/components/storefront-language";
import Link from "next/link";
import { signUp } from "@/app/auth/actions";

export const metadata = { title: "Créer un compte" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <section className="auth-page wrap">
      <form action={signUp} className="auth-card">
        <h1><StoreText>Créer mon compte</StoreText></h1>
        <p><StoreText>Suivez vos commandes et retrouvez vos sélections.</StoreText></p>
        {error && <div className="form-error"><StoreText>{error}</StoreText></div>}
        <div className="form-grid two">
          <label><StoreText>Prénom</StoreText><input required name="first_name" /></label>
          <label><StoreText>Nom</StoreText><input required name="last_name" /></label>
        </div>
        <label><StoreText>E-mail</StoreText><input required type="email" name="email" autoComplete="email" /></label>
        <label><StoreText>Mot de passe</StoreText><input required minLength={8} type="password" name="password" autoComplete="new-password" /></label>
        <button className="button orange" type="submit"><StoreText>Créer mon compte</StoreText></button>
        <Link href="/auth/sign-in"><StoreText>J’ai déjà un compte</StoreText></Link>
      </form>
    </section>
  );
}
