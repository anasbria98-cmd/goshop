"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, ImagePlus, LoaderCircle, PackageCheck, Search, SlidersHorizontal, Tag, Warehouse } from "lucide-react";
import type { BrandRow, CategoryRow, ProductRow } from "@/lib/database.types";
import { saveProductWithVariantFeedback } from "../actions";
import { isAppareillage } from "@/lib/product-variants";
import type { ColorVariantDraft } from "@/lib/variant-input";
import { colorVariantListSchema } from "@/lib/variant-input";
import { ProductColors } from "./_product-colors";
import { ColorVariants } from "./_color-variants";
import { GeneralVariants } from "./_general-variants";
import { CategorySelector } from "./_category-selector";

type ProductFormValue = Partial<ProductRow> & {
  categories?: string[];
  primaryCategory?: string;
  stock?: number;
  lowStockThreshold?: number;
};

const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function ProductSaveActions({ editing, published, setStatus }: { editing: boolean; published: boolean; setStatus: (status: "draft" | "active") => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="admin-form-actions product-save-actions">
      <Link className="admin-secondary" href="/admin/products">Annuler</Link>
      <button className="admin-secondary" disabled={pending} type="submit" onClick={() => setStatus("draft")}>
        {pending ? <LoaderCircle className="admin-spinner" aria-hidden="true" size={16} /> : null}
        Enregistrer comme brouillon
      </button>
      <button className="admin-primary" disabled={pending} type="submit" onClick={() => setStatus("active")}>
        {pending ? <LoaderCircle className="admin-spinner" aria-hidden="true" size={16} /> : <PackageCheck aria-hidden="true" size={16} />}
        {editing && published ? "Enregistrer" : "Publier"}
      </button>
    </div>
  );
}

export function ProductForm({ product = {}, brands, categories, defaultTaxRate = 20, colorVariants, colorChoices }: { product?: ProductFormValue; brands: BrandRow[]; categories: CategoryRow[]; defaultTaxRate?: number; colorVariants?: ColorVariantDraft[]; colorChoices?: { name: string; hex: string }[] }) {
  const [variantSaveState, variantSaveAction] = useActionState(saveProductWithVariantFeedback, { error: null, attempt: 0 });
  const [hiddenErrorAttempt, setHiddenErrorAttempt] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState(product.categories ?? []);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [variantsValid, setVariantsValid] = useState(true);
  const [sku, setSku] = useState(product.sku ?? "");
  const colorEnabled = isAppareillage(selectedCategories, categories);
  const [name, setName] = useState(product.name ?? "");
  const [slug, setSlug] = useState(product.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(product.slug));
  const [stockTracking, setStockTracking] = useState(product.stock_tracking ?? true);
  const [showValidationMessage, setShowValidationMessage] = useState(false);
  const statusRef = useRef<HTMLInputElement>(null);
  const editing = Boolean(product.id);
  const published = product.status === "active";
  const setStatus = (status: "draft" | "active") => { if (statusRef.current) statusRef.current.value = status; };

  return (
    <form action={variantSaveAction} className="admin-form product-editor product-editor-guided" onInvalid={() => setShowValidationMessage(true)} onSubmit={(event) => {
      const input = new FormData(event.currentTarget).get("color_variants");
      if (uploadBusy || (colorEnabled && !variantsValid) || (input && !colorVariantListSchema.safeParse(JSON.parse(String(input))).success)) { event.preventDefault(); setShowValidationMessage(true); event.currentTarget.querySelector("#variants")?.scrollIntoView({ block: "center" }); return; }
      setHiddenErrorAttempt(variantSaveState.attempt);
      setShowValidationMessage(false);
    }}>
      {product.id ? <input type="hidden" name="id" value={product.id} /> : null}
      {!colorEnabled && variantSaveState.error && variantSaveState.attempt !== hiddenErrorAttempt ? <p role="alert" className="admin-validation-message">{variantSaveState.error}</p> : null}
      <input ref={statusRef} type="hidden" name="status" defaultValue={product.status ?? "draft"} />
      <input type="hidden" name="main_image_url" value={product.main_image_url ?? ""} />

      <div className="admin-form-intro product-form-intro">
        <p>Commencez par le nom, le prix et la catégorie. Les champs marqués <span className="required-mark">*</span> sont obligatoires.</p>
        {showValidationMessage ? <div className="admin-validation-message" role="alert">Vérifiez les champs obligatoires indiqués.</div> : null}
      </div>

      <div className="product-editor-body">
        <div className="product-editor-primary">
          <section className="admin-panel product-step" aria-labelledby="product-information-title">
            <div className="admin-panel-heading"><div><span>01</span><h2 id="product-information-title">Informations du produit</h2></div><p>Ce que vos clients verront dans le catalogue.</p></div>
            <label><span>Nom du produit <span className="required-mark">*</span></span><input name="name" value={name} required autoFocus={!editing} placeholder="Ex. Disjoncteur Schneider 20A" onChange={(event) => { const nextName = event.target.value; setName(nextName); if (!slugEdited) setSlug(slugify(nextName)); }} /></label>
            <label>Description courte<textarea name="short_description" rows={3} defaultValue={product.short_description ?? ""} placeholder="Résumé affiché sur les listes de produits" /></label>
            <label>Description complète<textarea name="description" rows={7} defaultValue={product.description ?? ""} placeholder="Détails, usages et informations utiles pour le client" /></label>
          </section>

          <section className="admin-panel product-step" aria-labelledby="product-images-title">
            <div className="admin-panel-heading"><div><span>02</span><h2 id="product-images-title">Images</h2></div><p>Des photos claires facilitent la décision d’achat.</p></div>
            <div className="product-image-guide">
              <ImagePlus aria-hidden="true" size={28} />
              <div><strong>{editing ? "Gérer les images du produit" : "Les images viennent juste après l’enregistrement"}</strong><p>{editing ? "Importez plusieurs images, choisissez la principale et modifiez leur ordre." : "Créez le produit, puis le gestionnaire d’images s’ouvrira sur sa fiche."}</p></div>
              {editing ? <a className="admin-secondary" href="#images">Ouvrir les images</a> : null}
            </div>
          </section>

          <section className="admin-panel product-step" aria-labelledby="product-price-title">
            <div className="admin-panel-heading"><div><span>03</span><h2 id="product-price-title">Prix</h2></div><p>Montants affichés en dirhams marocains.</p></div>
            <div className="admin-form-grid">
              <label><span>Prix de vente <span className="required-mark">*</span></span><span className="admin-money-field"><input name="price" type="number" min="0" step="0.01" defaultValue={product.price ?? 0} required /><span>DH</span></span></label>
              <label>Prix barré / ancien prix<span className="admin-money-field"><input name="compare_at_price" type="number" min="0" step="0.01" defaultValue={product.compare_at_price ?? ""} /><span>DH</span></span></label>
              <label>Coût<span className="admin-money-field"><input name="cost_price" type="number" min="0" step="0.01" defaultValue={product.cost_price ?? ""} /><span>DH</span></span></label>
              <label>TVA<input name="tax_rate" type="number" min="0" max="100" step="0.01" defaultValue={product.tax_rate ?? defaultTaxRate} /><small>Taux configuré par défaut : {defaultTaxRate} %</small></label>
            </div>
          </section>

          <section className="admin-panel product-step" aria-labelledby="product-stock-title">
            <div className="admin-panel-heading"><div><span>04</span><h2 id="product-stock-title">Stock</h2></div><p>Disponibilité et règles de rupture.</p></div>
            <div className="admin-toggle-list">
              <label><span><strong>Suivre le stock</strong><small>Mettre à jour la disponibilité de ce produit.</small></span><input name="stock_tracking" type="checkbox" checked={stockTracking} onChange={(event) => setStockTracking(event.target.checked)} /></label>
              <label><span><strong>Autoriser la commande en rupture</strong><small>Le client pourra commander même si le stock est épuisé.</small></span><input name="allow_backorder" type="checkbox" defaultChecked={product.allow_backorder} /></label>
            </div>
            {stockTracking ? <div className="admin-form-grid product-stock-fields"><label>Quantité disponible<input name="stock" type="number" min="0" defaultValue={product.stock ?? 0} disabled={editing} />{editing ? <small>La quantité se modifie depuis la page Stocks.</small> : null}</label><label>Seuil de stock faible<input name="low_stock_threshold" type="number" min="0" defaultValue={product.lowStockThreshold ?? 5} /></label></div> : <><input type="hidden" name="stock" value={product.stock ?? 0} /><input type="hidden" name="low_stock_threshold" value={product.lowStockThreshold ?? 5} /></>}
          </section>

          <section className="admin-panel product-step" aria-labelledby="product-attributes-title">
            <div className="admin-panel-heading"><div><span>05</span><h2 id="product-attributes-title">Caractéristiques</h2></div><p>Uniquement les attributs utiles à la catégorie choisie.</p></div>
            <div className="product-image-guide product-attribute-guide">
              <SlidersHorizontal aria-hidden="true" size={26} />
              <div><strong>{editing ? "Compléter les caractéristiques techniques" : "Les caractéristiques s’adaptent à la catégorie"}</strong><p>{editing ? "Puissance, dimensions ou section apparaissent selon la catégorie du produit." : "Enregistrez d’abord le produit : seuls les champs liés à sa catégorie seront ensuite proposés."}</p></div>
              {editing ? <a className="admin-secondary" href="#attributes">Ouvrir</a> : null}
            </div>
          </section>
          {!editing && !colorEnabled ? <GeneralVariants /> : null}
          <ProductColors initial={product.display_colors} legacyColors={colorVariants?.filter(v=>v.is_active && v.color_name && v.image_path && /^#[0-9a-fA-F]{6}$/.test(v.color_hex)).map(v=>({name:v.color_name,hex:v.color_hex}))} />
          {colorEnabled ? <ColorVariants key={JSON.stringify(colorVariants ?? [])} initialRows={colorVariants} choices={colorChoices} baseSku={sku} onBusy={setUploadBusy} onValidityChange={setVariantsValid} saveError={variantSaveState.attempt !== hiddenErrorAttempt ? variantSaveState.error : null} /> : null}
        </div>

        <aside className="product-editor-sidebar">
          <section className="admin-panel product-side-card product-publish-card" aria-labelledby="product-status-title">
            <div className="product-side-title"><Eye aria-hidden="true" size={17} /><h2 id="product-status-title">Statut</h2></div>
            <div className={`product-current-status product-current-status--${product.status ?? "draft"}`}><span />{product.status === "active" ? "Publié" : product.status === "archived" ? "Archivé" : "Brouillon"}</div>
            <p>Gardez la fiche en brouillon ou rendez-la visible dans la boutique.</p>
            <ProductSaveActions editing={editing} published={published} setStatus={setStatus} />
          </section>

          <section className="admin-panel product-side-card" aria-labelledby="product-categories-title">
            <div className="product-side-title"><Tag aria-hidden="true" size={17} /><h2 id="product-categories-title">Catégorie et marque</h2></div>
            <label>Marque<select name="brand_id" defaultValue={product.brand_id ?? ""}><option value="">Sans marque</option>{brands.map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}</select></label>
            <CategorySelector categories={categories} initialSelected={product.categories} initialPrimary={product.primaryCategory} onSelectionChange={setSelectedCategories} />
          </section>

          <section className="admin-panel product-side-card" aria-labelledby="product-organization-title">
            <div className="product-side-title"><Warehouse aria-hidden="true" size={17} /><h2 id="product-organization-title">Organisation</h2></div>
            <label><span>SKU <span className="required-mark">*</span></span><input name="sku" value={sku} onChange={(event) => setSku(event.target.value)} required placeholder="Référence interne unique" /></label>
            <label>Référence fabricant<input name="manufacturer_reference" defaultValue={product.manufacturer_reference ?? ""} /></label>
            <label>Code-barres<input name="barcode" defaultValue={product.barcode ?? ""} /></label>
            <div className="admin-toggle-list admin-toggle-list--compact">
              <label><span>Mis en avant</span><input name="featured" type="checkbox" defaultChecked={product.featured} /></label>
              <label><span>Nouveauté</span><input name="is_new" type="checkbox" defaultChecked={product.is_new} /></label>
              <label><span>Meilleure vente</span><input name="is_best_seller" type="checkbox" defaultChecked={product.is_best_seller} /></label>
              <label><span>Promotion</span><input name="is_on_sale" type="checkbox" defaultChecked={product.is_on_sale} /></label>
            </div>
          </section>

          <section className="admin-panel product-side-card" aria-labelledby="product-seo-title">
            <div className="product-side-title"><Search aria-hidden="true" size={17} /><h2 id="product-seo-title">SEO et visibilité</h2></div>
            <label>Adresse du produit<span className="admin-slug-field"><input name="slug" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value); }} /><button type="button" onClick={() => { setSlug(slugify(name)); setSlugEdited(false); }}>Regénérer</button></span><small>Générée automatiquement depuis le nom.</small></label>
            <label>Titre SEO<input name="seo_title" defaultValue={product.seo_title ?? ""} /></label>
            <label>Description SEO<textarea name="seo_description" rows={3} defaultValue={product.seo_description ?? ""} /></label>
          </section>
        </aside>
      </div>

    </form>
  );
}
