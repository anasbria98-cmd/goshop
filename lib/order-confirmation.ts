/** Pure email rendering and best-effort delivery; invoked only by the server wrapper. */
export type ConfirmationOrder = {
  id: string; order_number: string; created_at: string; email: string; phone: string | null;
  currency: string; grand_total: number; shipping_address_snapshot: unknown;
};
export type ConfirmationItem = {product_name:string;variant_name:string|null;quantity:number;unit_price:number;line_total:number};
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function orderConfirmation(order: ConfirmationOrder, items: ConfirmationItem[]) {
  const address = order.shipping_address_snapshot && typeof order.shipping_address_snapshot === 'object' && !Array.isArray(order.shipping_address_snapshot) ? order.shipping_address_snapshot as Record<string,unknown> : {};
  const field = (key:string) => typeof address[key] === 'string' ? String(address[key]) : '';
  const name = [field('first_name'),field('last_name')].filter(Boolean).join(' ');
  const lines = [field('address_line_1'),field('address_line_2'),[field('postal_code'),field('city')].filter(Boolean).join(' '),field('region'),field('country')].filter(Boolean);
  const price = (amount:number) => new Intl.NumberFormat('fr-MA',{style:'currency',currency:order.currency.trim()}).format(Number(amount)).replace(/[\u00a0\u202f]/g, ' ');
  const date = new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short',timeZone:'Africa/Casablanca'}).format(new Date(order.created_at));
  const productLabel = (item:ConfirmationItem) => [item.product_name,item.variant_name].filter(Boolean).join(' — ');
  const text = [`GO ELEC — Merci pour votre commande`,name ? `Bonjour ${name},` : 'Bonjour,',`Votre commande a bien été reçue et sera traitée par notre équipe.`,`Commande : ${order.order_number}`,`Date : ${date}`,...items.map(item=>`${productLabel(item)} | Quantité : ${item.quantity} | Prix unitaire : ${price(item.unit_price)} | Total : ${price(item.line_total)}`),`Total de la commande : ${price(order.grand_total)}`,...(lines.length ? ['Adresse de livraison :',...lines] : []),...(order.phone ? [`Téléphone : ${order.phone}`] : []),'Une question ? Contactez-nous : contact@goelec.ma'].join('\n\n');
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirmation de commande GO ELEC</title></head><body style="margin:0;padding:16px;background:#f4f6f9;font-family:Arial,sans-serif;color:#30353b"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e3e7ed;border-radius:12px"><tr><td style="padding:24px;border-bottom:4px solid #294f9f"><img src="https://www.goelec.ma/branding/goelec_electrical_security_logo.png" width="180" alt="GO ELEC" style="display:block;width:180px;max-width:100%;height:auto"></td></tr><tr><td style="padding:24px"><h1 style="margin:0 0 20px;font-size:24px;color:#294f9f">Merci pour votre commande</h1><p>${escapeHtml(name ? `Bonjour ${name},` : 'Bonjour,')}</p><p style="line-height:1.6">Votre commande a bien été reçue et sera traitée par notre équipe.</p><p style="line-height:1.7"><strong>Commande ${escapeHtml(order.order_number)}</strong><br>Date : ${escapeHtml(date)}</p><table width="100%" cellspacing="0" cellpadding="8" style="border-collapse:collapse;font-size:13px;table-layout:fixed"><thead><tr style="background:#294f9f;color:#fff"><th align="left" style="width:40%">Produit</th><th align="center" style="width:12%">Qté</th><th align="right">Prix unitaire</th><th align="right">Total</th></tr></thead><tbody>${items.map(item=>`<tr><td style="border-bottom:1px solid #e3e7ed;overflow-wrap:anywhere">${escapeHtml(productLabel(item))}</td><td align="center" style="border-bottom:1px solid #e3e7ed">${item.quantity}</td><td align="right" style="border-bottom:1px solid #e3e7ed;overflow-wrap:anywhere">${escapeHtml(price(item.unit_price))}</td><td align="right" style="border-bottom:1px solid #e3e7ed;overflow-wrap:anywhere">${escapeHtml(price(item.line_total))}</td></tr>`).join('')}</tbody></table><p style="text-align:right;font-size:18px;color:#294f9f"><strong>Total : ${escapeHtml(price(order.grand_total))}</strong></p>${lines.length ? `<h2 style="font-size:16px">Adresse de livraison</h2><p style="line-height:1.6">${lines.map(escapeHtml).join('<br>')}</p>` : ''}${order.phone ? `<p>Téléphone : ${escapeHtml(order.phone)}</p>` : ''}<p style="font-size:13px;border-top:1px solid #e3e7ed;padding-top:20px">Une question ? <a style="color:#294f9f" href="mailto:contact@goelec.ma">contact@goelec.ma</a></p></td></tr></table></td></tr></table></body></html>`;
  return {subject:`GO ELEC – Confirmation de votre commande ${order.order_number}`,html,text};
}

type DeliveryDependencies = {key?:string;load:()=>Promise<{order:ConfirmationOrder;items:ConfirmationItem[]}>;request?:typeof fetch;log:(code:string)=>void};
/** No raw provider errors, recipients, addresses, payloads or credentials enter logs. */
export async function deliverOrderConfirmation({key,load,request=fetch,log}:DeliveryDependencies): Promise<void> {
  try {
    if (!key) { log('missing_api_key'); return; }
    const {order,items} = await load();
    if (!items.length) { log('missing_order_items'); return; }
    const content = orderConfirmation(order,items);
    const response = await request('https://api.resend.com/emails',{
      method:'POST',signal:AbortSignal.timeout(8000),
      headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`order-confirmation/${order.id}`},
      body:JSON.stringify({from:'GO ELEC <noreply@goelec.ma>',reply_to:'contact@goelec.ma',to:[order.email],...content}),
    });
    if (!response.ok) log(`provider_http_${response.status}`);
  } catch { log('delivery_failed'); }
}
