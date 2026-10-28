import { getAdminColorVariants } from "@/lib/admin-product-variants";
import { isAppareillage } from "@/lib/product-variants";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AdminHeader, EmptyState, PanelHeader, SubmitButton } from "../../_components";
import { ProductForm } from "../product-form";
import { ProductImageUpload } from "../_image-upload";
import { ProductImageGallery } from "../_image-gallery";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveProductAttribute } from "../../actions";
import { GeneralVariants } from "../_general-variants";
import type { GeneralVariantRow } from "@/lib/general-variant-input";

type ImageRow = { id: string; storage_path: string; alt_text: string | null; sort_order: number; is_primary: boolean };
type AttributeRow = { id: string; name: string; type: "text" | "number" | "boolean" | "select"; unit: string | null };
type OptionRow = { id: string; attribute_id: string; label: string; value: string };
type ValueRow = { attribute_id: string; option_id?: string | null; text_value?: string | null; number_value?: number | null; boolean_value?: boolean | null };
type VariantRow = GeneralVariantRow;
type CategoryAttribute = { category_id: string; attribute_id: string };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const results = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("brands").select("*").order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("product_categories").select("category_id,is_primary").eq("product_id", id),
    supabase.from("inventory").select("quantity,low_stock_threshold").eq("product_id", id).is("variant_id", null).maybeSingle(),
    supabase.from("product_images").select("*").eq("product_id", id).order("sort_order"),
    supabase.from("attributes").select("*").order("sort_order"),
    supabase.from("product_attribute_values").select("*").eq("product_id", id),
    supabase.from("product_variants").select("*").eq("product_id", id).order("created_at"),
    supabase.from("category_attributes").select("category_id,attribute_id"),
    supabase.from("attribute_options").select("*").order("sort_order"),
  ]);
  const product = results[0].data;
  if (!product) notFound();
  const brands = results[1].data ?? [];
  const categories = results[2].data ?? [];
  const assignments = results[3].data ?? [];
  const stock = results[4].data;
  const images = (results[5].data ?? []) as ImageRow[];
  const allAttributes = (results[6].data ?? []) as unknown as AttributeRow[];
  const values = (results[7].data ?? []) as unknown as ValueRow[];
  if (results[8].error) throw new Error("Impossible de charger les variantes. Rechargez la fiche avant de réessayer.");
  const variants = (results[8].data ?? []) as unknown as VariantRow[];
  const categoryAttributes = (results[9].data ?? []) as unknown as CategoryAttribute[];
  const options = (results[10].data ?? []) as unknown as OptionRow[];
  const categoryIds = assignments.map((item) => item.category_id);
  const relevantIds = new Set(categoryAttributes.filter((item) => categoryIds.includes(item.category_id)).map((item) => item.attribute_id));
  const attributes = relevantIds.size ? allAttributes.filter((attribute) => relevantIds.has(attribute.id)) : [];
  const colorEnabled = isAppareillage(categoryIds, categories);
  const colorData = await getAdminColorVariants(id);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <>
      <AdminHeader title={product.name} description={`SKU ${product.sku}`}>
        <Link className="admin-secondary" href="/admin/products">Retour au catalogue</Link>
      </AdminHeader>
      {saved ? <div className="admin-feedback admin-feedback--success" role="status"><CheckCircle2 size={18} /> Les modifications ont été enregistrées.</div> : null}
      <ProductForm product={{ ...product, categories: categoryIds, primaryCategory: assignments.find((item) => item.is_primary)?.category_id, stock: stock?.quantity, lowStockThreshold: stock?.low_stock_threshold }} brands={brands} categories={categories} colorVariants={colorData.rows} colorChoices={colorData.choices} />

      <section className="admin-panel admin-product-manager" id="images">
        <PanelHeader title="Galerie d’images" description="Importez, ordonnez et choisissez l’image principale." count={images.length} />
        <ProductImageUpload productId={id} />
        {images.length ? (
          <ProductImageGallery images={images} productId={id} productName={product.name} publicBase={base} />
        ) : <EmptyState title="Aucune image">Importez une ou plusieurs images pour créer la galerie produit.</EmptyState>}
      </section>

      <section className="admin-panel admin-product-manager" id="attributes">
        <PanelHeader title="Caractéristiques techniques" description="Attributs liés aux catégories sélectionnées." count={attributes.length} />
        {attributes.length ? (
          <div className="admin-attribute-grid">
            {attributes.map((attribute) => {
              const value = values.find((item) => item.attribute_id === attribute.id);
              const displayed = value?.text_value ?? value?.number_value ?? (value?.boolean_value == null ? "" : String(value.boolean_value));
              const attributeOptions = options.filter((option) => option.attribute_id === attribute.id);
              return (
                <form action={saveProductAttribute} className="admin-attribute-row" key={attribute.id}>
                  <input type="hidden" name="product_id" value={id} />
                  <input type="hidden" name="attribute_id" value={attribute.id} />
                  <label>{attribute.name}{attribute.unit ? <small>{attribute.unit}</small> : null}
                    {attribute.type === "boolean" ? <select name="value" defaultValue={String(displayed)}><option value="">Non renseigné</option><option value="true">Oui</option><option value="false">Non</option></select> : attribute.type === "select" ? <select name="option_id" defaultValue={value?.option_id ?? ""}><option value="">Non renseigné</option>{attributeOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select> : <input name="value" type={attribute.type === "number" ? "number" : "text"} defaultValue={String(displayed)} />}
                  </label>
                  <SubmitButton className="admin-secondary">Enregistrer</SubmitButton>
                </form>
              );
            })}
          </div>
        ) : <EmptyState title="Aucune caractéristique applicable">Associez des attributs aux catégories du produit pour les renseigner ici.</EmptyState>}
      </section>

      {!colorEnabled ? <GeneralVariants productId={id} rows={variants} basePrice={Number(product.price)} /> : null}
    </>
  );
}
