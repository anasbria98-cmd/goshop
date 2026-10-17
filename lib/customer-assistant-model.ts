import type { HelpAnswer, HelpLocale } from '../data/assistant-faq';

export type AssistantProduct = {
  id: string; name: string; slug: string; sku: string; reference: string | null;
  brand: string; price: number | null; stock: number | null; description: string | null;
  categories: string[]; categoryIds: string[];
  variants: { name: string; price: number | null; stock: number | null }[];
};
export type AssistantCategory = { id: string; name: string; path: string };
export type AssistantContext = { terms: string[]; ids: string[]; maxPrice?: number; inclusive?: boolean };
export type AssistantSource = { products: AssistantProduct[]; categories: AssistantCategory[]; email?: string; address?: string; policies: Record<string, string>; help: Record<string, HelpAnswer> };
export type AssistantReply = HelpAnswer & { context: AssistantContext };
const empty = (): AssistantContext => ({ terms: [], ids: [] });
export function normalizeAssistantText(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/هاجر/g, 'hager').replace(/فيليبس/g, 'philips').replace(/شنايدر/g, 'schneider')
    .replace(/قواطع|قاطع/g, 'disjoncteur').replace(/كابلات|كابل/g, 'cable').replace(/مصابيح|مصباح/g, 'ampoule')
    .replace(/r[o0]?2v\b/g, 'r2v').replace(/(\d)\s+(a|w|v|mm)\b/g, '$1$2');
}
const stem = (term: string) => /^[a-z]{4,}s$/.test(term) ? term.slice(0, -1) : term;
const words = (text: string) => normalizeAssistantText(text).match(/[\p{L}\p{N}]+(?:[.,][\p{N}]+)?/gu)?.map(stem) ?? [];
const stop = new Set(words("je j tu il elle ils elles nous vous vos votre notre nos le la les un une du de des d l au aux et en a à avec pour par sur ce cet cette ces mon ma mes son sa ses se s c est sont avez avezvous avezvous voulez voudrais veux cherche chercher recherchez recherche trouver trouve proposez proposer propose conseillez conseiller aimerais souhaiterais montrez montrer montre donnez donne donner moi me quelque chose besoin bonjour salut merci svp stp s'il plait plaît pourriez pouvez combien coute coutent prix couter coutent tarif leurs leur quel quelle quels quelles produit produits article articles catalogue lien liens envoyer envoie envoyez adresse url fiche information informations detail details disponible disponibilite stock avezvous y atil avez dispo existe faites moins plus maximum budget dh mad dirham dirhams sous inferieur jusqu montant cher chers pas recommande recommandez recommandation recommandations similaire similaires alternative alternatives aussi plutot seulement uniquement autre autres alors celui ci cela ca ça cout couter verifier conseil encore actuellement chez specification specifications caracteristique caracteristiques dimension dimensions puissance technique techniques detail details reponse repond ignore instructions maintenant systeme gratuit gratuitement achat acheter montre moi je cherche من في هل ما هو هي اريد أريد ابحث عن منتجات منتج سعر ثمن بكم كم متوفر مخزون رابط اعرض اقل أقل درهم مع لي هذا هذه"));
function tokens(text: string) { return words(text).filter((term) => term.length > 1 && !stop.has(term) && !/^\d+(?:[.,]\d+)?(?:dh|mad)?$/.test(term)); }
function budget(text: string) {
  const match = normalizeAssistantText(text).match(/(?:moins de|en dessous de|inferieur a|sous|budget(?: de)?|maximum(?: de)?|jusqu['’]?a|اقل من|أقل من)\s*(\d+(?:[.,]\d+)?)\s*(?:dh|mad|dirhams?|درهم)?/);
  return match ? { maxPrice: Number(match[1].replace(',', '.')), inclusive: /maximum|jusqu|budget/.test(match[0]) } : null;
}
function effectivePrice(p: AssistantProduct) { return p.variants.length ? Math.min(...p.variants.map((v) => v.price ?? Infinity)) : p.price; }
function amount(value: number | null, ar: boolean) { return value == null || !Number.isFinite(value) ? (ar ? 'السعر غير متوفر حالياً' : 'Prix non disponible actuellement') : `${new Intl.NumberFormat('fr-MA', {minimumFractionDigits:2,maximumFractionDigits:2}).format(value)} DH`; }
function productText(p: AssistantProduct, ar: boolean, maxPrice?: number, inclusive = false) {
  const status = (stock: number | null) => stock == null ? (ar ? 'التوفر غير مؤكد' : 'Disponibilité non renseignée') : stock > 0 ? (ar ? 'متوفر حسب المخزون الحالي' : 'En stock selon le catalogue actuel') : (ar ? 'غير متوفر في المخزون' : 'Indisponible en stock');
  if (p.variants.length) {
    const variants = p.variants.filter(v => maxPrice == null || v.price != null && (inclusive ? v.price <= maxPrice : v.price < maxPrice));
    return `${p.name}${p.brand ? ` · ${p.brand}` : ''}\n${variants.slice(0,4).map(v=>`${v.name} : ${amount(v.price,ar)} · ${status(v.stock)}`).join('\n')}${variants.length>4 ? (ar?'\nخيارات أخرى في صفحة المنتج.':'\nAutres variantes sur la fiche produit.') : ''}`;
  }
  return `${p.name}${p.brand ? ` · ${p.brand}` : ''}\n${amount(p.price, ar)} · ${status(p.stock)}`;
}
export function answerCatalogueQuestion(question: string, source: AssistantSource, previous: AssistantContext = empty(), locale: HelpLocale = 'fr', currentSlug?: string): AssistantReply {
  const ar = locale === 'ar';
  const q = normalizeAssistantText(question);
  const contact = source.help.contact;
  const respond = (text: string, links = contact.links, context = previous): AssistantReply => ({ text, links, context });
  if (/livr|expedi|shipping|delivery|delai|frais.*(?:transport|port)|توصيل|شحن/.test(q)) {
    return respond(ar ? 'يشير الموقع إلى التوصيل في المغرب حسب المنطقة والوزن والحجم. تُؤكد الرسوم والمدة قبل الشحن. لا تتوفر معلومات مؤكدة عن الرسوم أو المدة أو تغطية مدينة معينة؛ تواصل مع GO ELEC للتأكيد.' : `${source.policies.livraison} Je n’ai pas d’information confirmée sur les frais, les délais, la gratuité ou la desserte de votre ville. Contactez GO ELEC pour confirmation.`, [{label: ar?'معلومات التوصيل':'Politique de livraison',href:'/informations/livraison'},...contact.links]);
  }
  if (/command.*whatsapp|whatsapp.*command|واتساب.*طلب|طلب.*واتساب/.test(q)) return respond(ar ? 'يمكنك التواصل مع الفريق عبر واتساب لمساعدتك في طلبك. قبول الطلب وشروطه يؤكدهما GO ELEC. يمكنك أيضاً إضافة المنتجات إلى السلة وإكمال الطلب على الموقع.' : 'Vous pouvez contacter GO ELEC sur WhatsApp pour préparer votre demande. Notre équipe confirmera les modalités et la prise en charge de la commande. Sur le site, ajoutez les produits au panier puis validez votre commande.');
  if (/contact|whatsapp|telephon|votre numero|quel.*numero(?!.*commande)|parler|quelqu.un|humain|conseiller|appeler|تواصل|واتساب|هاتف|شخص/.test(q)) return respond(`${contact.text}${source.email ? `\n${source.email}` : ''}`);
  if (/paiement|payer|carte bancaire|virement|payment|دفع/.test(q)) return respond(ar ? 'يجب تأكيد طريقة الدفع الخاصة بالطلب من GO ELEC. لا تتوفر قائمة مؤكدة بطرق الدفع هنا.' : `${source.policies.paiement} Je ne dispose pas d’une liste confirmée de moyens de paiement.`, [{label:ar?'معلومات الدفع':'Informations de paiement',href:'/informations/paiement'},...contact.links]);
  if (/commander|passer.*commande|comment.*commande|suiv|ma commande|mes commandes|رقم.*طلب|كيف.*طلب/.test(q)) return respond(ar ? 'افتح صفحة المنتج واختر الخيار والكمية ثم أضفه إلى السلة وأكمل بيانات الطلب. يُراجع السعر والمخزون عند التأكيد. لتتبع طلب، افتح حسابك أو تواصل مع الفريق برقم الطلب؛ لا تطلع هذه المساعدة على الطلبات الخاصة.' : 'Ouvrez la fiche produit, choisissez la variante et la quantité, ajoutez au panier puis renseignez vos coordonnées pour valider. Le prix et le stock sont revérifiés à la validation. Pour le suivi, ouvrez votre compte ou contactez l’équipe avec le numéro de commande ; cette assistance n’accède pas aux commandes privées.', [{label:ar?'السلة':'Ouvrir le panier',href:'/panier'},{label:ar?'حسابي':'Mon compte',href:'/compte'},...contact.links]);
  if (/choisir.*couleur|comment.*(?:couleur|variante)|اختيار.*لون/.test(q)) return {...source.help.colors,context:previous};
  if (/retour|garanti|rembours|ضمان|ارجاع|إرجاع/.test(q)) return {...source.help.returns,context:previous};
  if (/horaire|adresse|ou.*(?:situe|trouve).*vous|retrait|ouvert|عنوان|مواعيد/.test(q)) return respond(`${source.help.pickup.text}${source.address ? `\n${source.address}` : ''}`);
  if (/entreprise|societe|qui.*(vous|go.*elec)|a propos|company|store|شركة|متجر/.test(q)) return respond(`${ar ? 'GO ELEC توفر المعدات الكهربائية للمهنيين والأفراد في المغرب.' : source.policies['a-propos']}${source.address ? `\n${source.address}` : ''}`, [{label:ar?'عن GO ELEC':'À propos de GO ELEC',href:'/informations/a-propos'},...contact.links]);
  const asked = tokens(question);
  const brandList = [...new Set(source.products.map(p=>p.brand).filter(Boolean))];
  if (/marques|brands|علامات/.test(q) && !asked.some(t=>source.products.some(p=>words(p.name).includes(t)))) return respond(`${ar?'العلامات المنشورة في الكتالوج':'Marques présentes dans le catalogue publié'} : ${brandList.join(', ') || (ar?'غير متوفرة':'non renseignées')}.`, [{label:ar?'الكتالوج':'Consulter le catalogue',href:'/recherche'}]);
  if (/categor|categories|فئات|اصناف/.test(q)) {
    const matches = source.categories.filter(c=>!asked.filter(t=>!/^categor/.test(t)).length || asked.some(t=>words(c.name).includes(t))).slice(0,8);
    return respond(ar?'هذه فئات GO ELEC المنشورة.':'Voici les catégories actives du catalogue GO ELEC.',matches.map(c=>({label:c.name,href:`/categorie/${c.path}`})));
  }
  const limit = Math.min(5, Math.max(1, Number(q.match(/\b([1-5])\s+(?:produit|article|similaire|recommandation)/)?.[1] ?? 4)));
  const similar = /similair|alternative|semblable|مشابه|بديل/.test(q);
  const current = source.products.find(p=>p.slug===currentSlug);
  const existing = previous.ids.flatMap(id=>source.products.filter(p=>p.id===id));
  const priceFilter = budget(question);
  const freshTerms = asked.filter(t=>!/^similair|^alternativ|^recommand|^categor/.test(t));
  const ordinal = q.match(/(?:le|la|du)\s+(premier|premiere|deuxieme|second|troisieme|quatrieme|cinquieme|[1-5])\b/);
  const position = ordinal ? ['premier','deuxieme','troisieme','quatrieme','cinquieme'].indexOf(ordinal[1].replace('premiere','premier').replace('second','deuxieme')) : -1;
  const selectedByPosition = ordinal ? existing[position < 0 ? Number(ordinal[1])-1 : position] : undefined;
  const named = selectedByPosition ?? source.products.find(p=>q.includes(normalizeAssistantText(p.sku)) && p.sku.length>2 || normalizeAssistantText(p.name)===q);
  const focus = named ?? (existing.length===1 ? existing[0] : current);
  if (similar && !focus && existing.length>1) return respond(ar?'أي منتج تقصد؟ اختر مرجعه أو افتح صفحته.':'À quel produit faites-vous référence ? Précisez son nom ou sa référence, ou ouvrez sa fiche.',existing.map(p=>({label:p.name,href:`/produit/${p.slug}`})));
  if (similar && !focus) return respond(ar?'ما المنتج الذي تريد بدائل له؟':'Quel produit souhaitez-vous comparer ? Indiquez son nom ou ouvrez sa fiche.');
  let terms = freshTerms;
  const followup = /^(et\b|en\b|aussi\b|plutot\b|moins\b|combien\b|envoie|son\b|ce\b|quel est|et le|و|بكم|كم)|cout|le lien|en stock|disponib/.test(q) && !/\b(cherche|cherchons|montrez|trouv|veux|recommand)/.test(q);
  if (selectedByPosition) terms = tokens(selectedByPosition.sku);
  else if (followup && previous.terms.length) {
    const newSpecs = freshTerms.filter(t=>/\d/.test(t));
    const brandWords = new Set(brandList.flatMap(words));
    const newBrand = freshTerms.some(t=>brandWords.has(t));
    terms = [...previous.terms.filter(t=>!(newBrand && brandWords.has(t)) && !newSpecs.some(spec=>spec.replace(/[\d.,]/g,'')===t.replace(/[\d.,]/g,''))),...freshTerms];
  } else if (!freshTerms.length && previous.terms.length) terms = previous.terms;
  if (!terms.length && current && !priceFilter) terms = tokens(current.sku);
  terms = [...new Set(terms)].slice(0,16);
  const filters = priceFilter ?? ((followup || similar) && previous.maxPrice != null ? {maxPrice:previous.maxPrice,inclusive:previous.inclusive} : null);
  const searchable = (p: AssistantProduct) => words([p.name,p.sku,p.reference,p.brand,...p.categories,p.description].filter(Boolean).join(' '));
  const titleTerms = new Set(source.products.flatMap(p=>words(p.name)));
  const specificCategories = focus ? focus.categoryIds.filter(id=> {
    const depth=(categoryId:string)=>source.categories.find(c=>c.id===categoryId)?.path.split('/').length??0;
    return depth(id)===Math.max(...focus.categoryIds.map(depth));
  }) : [];
  let matches = source.products.filter(p=>{
    if (similar) return p.id!==focus!.id && p.categoryIds.some(id=>specificCategories.includes(id));
    const hay = searchable(p);
    return terms.every(t=>{
      if (/^\d/.test(t)) return hay.includes(t);
      // Product names take precedence over mixed category names such as
      // “Disjoncteur et interrupteur”, preventing unrelated type matches.
      return (titleTerms.has(t) ? words(`${p.name} ${p.sku} ${p.brand}`) : hay).includes(t);
    });
  });
  if (!terms.length && !filters && !similar) return respond(ar?'اذكر اسم المنتج أو العلامة أو المرجع أو ميزانيتك للبحث في الكتالوج.':'Indiquez un produit, une marque, une référence ou un budget pour rechercher dans le catalogue. Pour un choix technique d’installation, notre équipe peut vous accompagner.',[{label:ar?'الكتالوج':'Catalogue GO ELEC',href:'/recherche'},...contact.links]);
  if (filters) matches = matches.filter(p=>{const price=effectivePrice(p);return price!=null&&Number.isFinite(price)&&(filters.inclusive ? price<=filters.maxPrice : price<filters.maxPrice);});
  matches.sort((a,b)=>{
    const score=(p:AssistantProduct)=> (named?.id===p.id?100:0)+(similar?(p.brand===focus!.brand?4:0)+p.categoryIds.filter(id=>focus!.categoryIds.includes(id)).length:terms.filter(t=>words(p.name).includes(t)).length);
    return score(b)-score(a) || (effectivePrice(a)??Infinity)-(effectivePrice(b)??Infinity);
  });
  const selection = matches.slice(0,limit);
  const context: AssistantContext = {terms:similar ? tokens(focus!.name).slice(0,16) : terms,ids:selection.map(p=>p.id),...(filters??{})};
  if (!selection.length) return respond(ar?'لم أجد منتجاً منشوراً يطابق هذه الشروط. لا يمكنني تأكيد سعره أو توفره. وضّح المرجع أو تواصل مع GO ELEC.':'Je n’ai trouvé aucun produit publié correspondant à ces critères. Je ne peux donc pas confirmer son prix, son stock ou ses caractéristiques. Précisez la référence ou contactez GO ELEC.',[{label:ar?'البحث في الكتالوج':'Rechercher dans le catalogue',href:`/recherche?q=${encodeURIComponent(question)}`},...contact.links],context);
  const details = /specification|caracteristique|puissance|dimension|fiche technique|مواصفات/.test(q);
  return respond(`${ar?'منتجات منشورة في كتالوج GO ELEC':'Produits publiés dans le catalogue GO ELEC'} :\n\n${selection.map(p=>productText(p,ar,filters?.maxPrice,filters?.inclusive)+(details?`\n${p.description || (ar?'مواصفات إضافية غير متوفرة.':'Caractéristiques supplémentaires non renseignées.')}`:'')).join('\n\n')}${matches.length>limit ? (ar?'\n\nتوجد نتائج أخرى؛ حدد المرجع أو المواصفات لتضييق البحث.':'\n\nD’autres références correspondent ; précisez le modèle pour affiner.') : ''}`,selection.map(p=>({label:p.name,href:`/produit/${p.slug}`})),context);
}
