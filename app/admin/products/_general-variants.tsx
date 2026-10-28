"use client";

import { useActionState, useState } from "react";
import { EmptyState, PanelHeader, Status } from "../_components";
import { addGeneralVariant, removeGeneralVariant } from "./variant-actions";
import { generalVariantSchema, generalVariantError, type GeneralVariantInput, type GeneralVariantRow } from "@/lib/general-variant-input";
import { money } from "@/lib/catalog-model";

const empty = { name: "", sku: "", barcode: "", price: "", compare_at_price: "", cost_price: "", stock: "0", low_stock_threshold: "5", is_active: true };
const fields = [
  ["name", "Nom"], ["sku", "SKU"], ["barcode", "Code-barres"],
  ["price", "Prix (DH)"], ["compare_at_price", "Prix barré (DH)"], ["cost_price", "Coût (DH)"],
  ["stock", "Stock initial"], ["low_stock_threshold", "Seuil faible"],
] as const;

export function GeneralVariants({ productId, rows = [], basePrice = 0 }: { productId?: string; rows?: GeneralVariantRow[]; basePrice?: number }) {
  const [draft, setDraft] = useState(empty);
  const [staged, setStaged] = useState<GeneralVariantInput[]>([]);
  const [localMessage, setLocalMessage] = useState<{ error?: string; success?: string }>({});
  const [activeFeedback, setActiveFeedback] = useState<"add" | "delete" | "local">("local");
  const [state, action, pending] = useActionState(addGeneralVariant, { error: null, success: null });
  const [deletion, deleteAction, deleting] = useActionState(removeGeneralVariant, { error: null, success: null });
  const [previousState, setPreviousState] = useState(state);
  // Reset only after a confirmed save; failed requests keep all entered fields.
  if (previousState !== state) {
    setPreviousState(state);
    if (state.success) setDraft(empty);
  }
  const allRows = productId ? rows : staged.map((row, index) => ({ ...row, id: String(index) }));
  const feedback = activeFeedback === "add" ? state : activeFeedback === "delete" ? deletion : localMessage;

  function stageVariant() {
    setActiveFeedback("local");
    const parsed = generalVariantSchema.safeParse(draft);
    if (!parsed.success) { setLocalMessage({ error: generalVariantError(parsed.error) }); return; }
    if (staged.some(row => row.sku === parsed.data.sku)) { setLocalMessage({ error: "Ce SKU existe déjà. Choisissez un SKU unique." }); return; }
    setStaged(previous => [...previous, parsed.data]);
    setDraft(empty);
    setLocalMessage({ success: "Variante ajoutée à la liste. Enregistrez le produit pour la conserver." });
  }

  const controls = <>
    {productId ? <input type="hidden" name="product_id" value={productId} /> : <input type="hidden" name="general_variants" value={JSON.stringify(staged)} />}
    {fields.map(([key, label]) => {
      const text = key === "name" || key === "sku" || key === "barcode";
      const required = key === "name" || key === "sku";
      return <label key={key}><span>{label}{required ? <b className="required-mark"> *</b> : null}</span>
        <input name={productId ? key : undefined} value={draft[key]} type={text ? "text" : "number"}
          required={Boolean(productId && required)} maxLength={text ? key === "name" ? 120 : 80 : undefined}
          min={text ? undefined : 0} step={text ? undefined : key === "stock" || key === "low_stock_threshold" ? 1 : "0.01"}
          onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} />
      </label>;
    })}
    <label className="admin-checkbox"><input name={productId ? "is_active" : undefined} type="checkbox" checked={draft.is_active}
      onChange={event => setDraft(previous => ({ ...previous, is_active: event.target.checked }))} /> Variante active</label>
    <button className="admin-primary" type={productId ? "submit" : "button"} disabled={pending || deleting} onClick={productId ? undefined : stageVariant}>
      {pending ? "Enregistrement…" : "Ajouter la variante"}
    </button>
  </>;

  return <section className="admin-panel admin-product-manager" id="general-variants">
    <PanelHeader title="Variantes" description={`Déclinaisons avec SKU et prix propres.${!productId ? " Enregistrez le produit pour conserver les variantes ajoutées." : ""}`} count={allRows.length} />
    {feedback.error ? <p className="admin-validation-message" role="alert">{feedback.error}</p> : null}
    {feedback.success ? <p className="admin-feedback admin-feedback--success" role="status">{feedback.success}</p> : null}
    {allRows.length ? <div className="admin-table-wrap"><table>
      <thead><tr><th>Nom</th><th>SKU</th><th>Prix</th><th>Statut</th><th>Action</th></tr></thead>
      <tbody>{allRows.map(row => <tr key={row.id}>
        <td data-label="Nom"><strong>{row.name}</strong></td><td data-label="SKU"><code>{row.sku}</code></td>
        <td data-label="Prix">{money(row.price ?? basePrice)}</td><td data-label="Statut"><Status>{row.is_active ? "Active" : "Inactive"}</Status></td>
        <td data-label="Action">{productId ? <form action={deleteAction} onSubmit={() => setActiveFeedback("delete")}>
          <input type="hidden" name="product_id" value={productId} /><input type="hidden" name="id" value={row.id} />
          <button className="admin-danger-link" disabled={deleting || pending}>Supprimer</button>
        </form> : <button type="button" className="admin-danger-link" onClick={() => {
          setStaged(previous => previous.filter((_, index) => String(index) !== row.id));
          setLocalMessage({ success: "Variante retirée de la liste." });
        }}>Supprimer</button>}</td>
      </tr>)}</tbody>
    </table></div> : <EmptyState title="Aucune variante">Le produit utilise actuellement son SKU principal.</EmptyState>}
    {productId ? <form action={action} className="admin-form-grid admin-variant-form" onSubmit={() => setActiveFeedback("add")}>{controls}</form>
      : <div className="admin-form-grid admin-variant-form">{controls}</div>}
  </section>;
}
