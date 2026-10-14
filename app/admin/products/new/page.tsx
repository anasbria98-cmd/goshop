import { getAdminColorVariants } from "@/lib/admin-product-variants";
import { AdminHeader } from "../../_components";
import { ProductForm } from "../product-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewProductPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: brands }, { data: categories }, { data: taxSetting }] = await Promise.all([
    supabase.from("brands").select("*").order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("store_settings").select("value").eq("key", "default_tax_rate").maybeSingle(),
  ]);
  const colorData = await getAdminColorVariants();
  const configuredTax = Number(taxSetting?.value ?? 20);

  return (
    <>
      <AdminHeader title="Ajouter un produit" description="Renseignez l’essentiel, enregistrez, puis ajoutez les images et caractéristiques." />
      <ProductForm brands={brands ?? []} categories={categories ?? []} colorChoices={colorData.choices} defaultTaxRate={Number.isFinite(configuredTax) ? configuredTax : 20} />
    </>
  );
}
