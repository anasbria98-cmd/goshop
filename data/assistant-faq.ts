export type HelpLocale = "fr" | "ar";
export type HelpLink = { label: string; href: string };
export type HelpAnswer = { text: string; links: HelpLink[] };
type Localized = Record<HelpLocale, string>;
type HelpTopic = { id: string; question: Localized; answer: Localized; links: { label: Localized; href: string }[]; matches: RegExp };

const catalogue = { label: { fr: "Rechercher dans le catalogue", ar: "البحث في الكتالوج" }, href: "/recherche" };
const whatsapp = { label: { fr: "Contacter GO ELEC sur WhatsApp", ar: "التواصل مع GO ELEC عبر واتساب" }, href: "https://wa.me/212644535251" };

/** Prepared guidance based on the existing store information pages, not AI. */
const topics: HelpTopic[] = [
  {
    id: "products", question: { fr: "Trouver un produit", ar: "العثور على منتج" },
    answer: { fr: "Recherchez un produit par son nom, sa marque ou sa référence. Vous pouvez aussi parcourir les catégories du catalogue. Ouvrez sa fiche pour consulter ses informations actuelles.", ar: "ابحث عن المنتج باسمه أو علامته التجارية أو مرجعه، أو تصفح فئات الكتالوج. افتح صفحة المنتج للاطلاع على معلوماته الحالية." },
    links: [catalogue], matches: /produit|catalogue|reference|marque|cherch|trouver|product|brand|منتج|كتالوج|مرجع|علامة|ابحث/,
  },
  {
    id: "delivery", question: { fr: "Livraison au Maroc", ar: "التوصيل في المغرب" },
    answer: { fr: "GO ELEC organise la livraison au Maroc selon la zone, le poids et le volume de la commande. Les frais et le délai applicables sont confirmés avant expédition. Contactez notre équipe pour votre ville.", ar: "تنظم GO ELEC التوصيل في المغرب حسب المنطقة ووزن الطلب وحجمه. تُؤكد الرسوم والمدة قبل الشحن. تواصل مع فريقنا للاستفسار عن مدينتك." },
    links: [{ label: { fr: "Informations de livraison", ar: "معلومات التوصيل" }, href: "/informations/livraison" }, whatsapp], matches: /livr|expedi|shipping|delivery|توصيل|شحن/,
  },
  {
    id: "prices", question: { fr: "Vérifier un prix", ar: "التحقق من السعر" },
    answer: { fr: "Le prix actuel est affiché sur la fiche du produit. Si plusieurs couleurs ou variantes sont proposées, sélectionnez celle qui vous intéresse pour voir son prix. Les prix sont vérifiés de nouveau lors de la validation de la commande.", ar: "يظهر السعر الحالي على صفحة المنتج. إذا توفرت ألوان أو خيارات مختلفة، اختر الخيار المطلوب لمعرفة سعره. تُراجع الأسعار مجدداً عند تأكيد الطلب." },
    links: [catalogue, whatsapp], matches: /prix|tarif|combien|price|cost|سعر|ثمن|بكم/,
  },
  {
    id: "contact", question: { fr: "Contacter GO ELEC", ar: "التواصل مع GO ELEC" },
    answer: { fr: "Notre équipe vous accompagne avant et après votre commande. Contactez-nous sur WhatsApp au 06 44 53 52 51 ou par téléphone au 05 22 90 05 90.", ar: "يساعدك فريقنا قبل الطلب وبعده. تواصل معنا عبر واتساب على 06 44 53 52 51 أو عبر الهاتف على 05 22 90 05 90." },
    links: [whatsapp, { label: { fr: "Appeler GO ELEC", ar: "الاتصال بـ GO ELEC" }, href: "tel:+212522900590" }], matches: /contact|whatsapp|telephon|appeler|humain|equipe|conseiller|تواصل|واتساب|هاتف|اتصال/,
  },
  {
    id: "stock", question: { fr: "Disponibilité d’un produit", ar: "توفر المنتج" },
    answer: { fr: "Consultez la disponibilité sur la fiche du produit et choisissez la variante souhaitée lorsqu’il y en a plusieurs. Le stock est vérifié de nouveau lors de la validation. Pour confirmer une quantité précise, contactez notre équipe avec la référence.", ar: "اطلع على التوفر في صفحة المنتج واختر الخيار المطلوب إن وُجدت عدة خيارات. يُراجع المخزون مجدداً عند تأكيد الطلب. لتأكيد كمية محددة، أرسل المرجع إلى فريقنا." },
    links: [catalogue, whatsapp], matches: /stock|disponib|quantite|availability|مخزون|متوفر|توفر|كمية/,
  },
  {
    id: "payment", question: { fr: "Comment payer ?", ar: "كيف أدفع؟" },
    answer: { fr: "Le mode de paiement doit être confirmé pour votre commande. Une commande enregistrée reste en attente tant que ce mode n’a pas été confirmé. Contactez GO ELEC pour connaître les modalités applicables à votre achat.", ar: "يجب تأكيد طريقة الدفع الخاصة بطلبك. يبقى الطلب المسجل قيد الانتظار إلى أن تُؤكد طريقة الدفع. تواصل مع GO ELEC لمعرفة الخيارات المناسبة لطلبك." },
    links: [{ label: { fr: "Informations de paiement", ar: "معلومات الدفع" }, href: "/informations/paiement" }, whatsapp], matches: /paiement|payer|regler|carte bancaire|virement|payment|دفع|ادفع|أدفع/,
  },
  {
    id: "orders", question: { fr: "Suivre ma commande", ar: "تتبع طلبي" },
    answer: { fr: "Connectez-vous à votre compte pour consulter le statut de votre commande. Vous pouvez aussi contacter notre service client avec votre numéro de commande. Cette aide ne consulte pas vos commandes personnelles.", ar: "سجّل الدخول إلى حسابك للاطلاع على حالة طلبك، أو تواصل مع خدمة العملاء مع ذكر رقم الطلب. لا تطلع هذه المساعدة على طلباتك الشخصية." },
    links: [{ label: { fr: "Ouvrir mon compte", ar: "فتح حسابي" }, href: "/compte" }, whatsapp], matches: /command|suivi|suivre|order|tracking|طلب|تتبع/,
  },
  {
    id: "returns", question: { fr: "Retours et garanties", ar: "الإرجاع والضمان" },
    answer: { fr: "Contactez le service client avec votre numéro de commande pour toute demande de retour ou de garantie. Les conditions applicables dépendent du produit, de son état et de la garantie fabricant.", ar: "تواصل مع خدمة العملاء مع ذكر رقم طلبك لطلبات الإرجاع أو الضمان. تعتمد الشروط على المنتج وحالته وضمان الشركة المصنعة." },
    links: [{ label: { fr: "Retours et garanties", ar: "الإرجاع والضمان" }, href: "/informations/retours" }, whatsapp], matches: /retour|garanti|rembours|defect|panne|return|warranty|ارجاع|إرجاع|ضمان|استرجاع/,
  },
  {
    id: "colors", question: { fr: "Choisir une couleur", ar: "اختيار لون" },
    answer: { fr: "Sur les produits qui proposent des couleurs, cliquez sur la couleur souhaitée dans la fiche. La photo, la référence, le prix et la disponibilité s’actualisent pour cette variante. Ajoutez ensuite la variante choisie au panier.", ar: "في المنتجات التي توفر ألواناً، اضغط على اللون المطلوب في صفحة المنتج. تتحدث الصورة والمرجع والسعر والتوفر حسب الخيار المحدد، ثم يمكنك إضافته إلى السلة." },
    links: [catalogue], matches: /couleur|variante|finition|marron|blanc|noir|color|لون|الوان|ألوان/,
  },
  {
    id: "advice", question: { fr: "Besoin d’un conseil", ar: "أحتاج إلى نصيحة" },
    answer: { fr: "Décrivez votre projet à notre équipe : éclairage, câbles, protection électrique, appareillage ou photovoltaïque. Précisez les références et votre besoin pour être orienté. Faites valider les choix d’installation et le dimensionnement par un électricien qualifié.", ar: "اشرح مشروعك لفريقنا: الإنارة أو الكابلات أو الحماية الكهربائية أو المفاتيح والمقابس أو الطاقة الشمسية. اذكر المراجع واحتياجاتك لمساعدتك. استعن بكهربائي مؤهل للتحقق من اختيارات التركيب والمقاسات المناسبة." },
    links: [whatsapp, catalogue], matches: /conseil|choisir|materiel|installation|eclairage|cable|protection|solaire|photovolt|help|advice|نصيحة|اختيار|معدات|تركيب|إنارة|اضاءة|كابل|حماية|شمسي/,
  },
  {
    id: "pickup", question: { fr: "Retrait et horaires", ar: "الاستلام والمواعيد" },
    answer: { fr: "Les adresses, horaires et modalités de retrait confirmés sont communiqués par le service client lors de la préparation de la commande. Contactez-nous avant de vous déplacer.", ar: "تؤكد خدمة العملاء العناوين والمواعيد وترتيبات الاستلام أثناء تجهيز الطلب. يرجى التواصل معنا قبل الحضور." },
    links: [{ label: { fr: "Informations de retrait", ar: "معلومات الاستلام" }, href: "/informations/magasins" }, whatsapp], matches: /retrait|horaire|adresse|magasin|ouvrir|ouvert|pickup|استلام|مواعيد|عنوان|متجر/,
  },
];

export function helpQuestions(locale: HelpLocale) {
  return topics.map((topic) => ({ id: topic.id, label: topic.question[locale] }));
}

export function helpTopicAnswer(id: string, locale: HelpLocale): HelpAnswer {
  const topic = topics.find((item) => item.id === id);
  if (!topic) return fallback(locale);
  return { text: topic.answer[locale], links: topic.links.map((link) => ({ label: link.label[locale], href: link.href })) };
}

/** Simple keyword matching only. Unknown questions never receive invented facts. */
export function answerHelpQuestion(question: string, locale: HelpLocale): HelpAnswer {
  const normalized = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const exact = topics.find((topic) => topic.question[locale].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === normalized);
  if (exact) return helpTopicAnswer(exact.id, locale);
  // Specific questions take precedence over generic words such as "produit".
  const priority = ["returns", "payment", "pickup", "orders", "stock", "delivery", "colors", "prices", "contact", "products", "advice"];
  const match = priority.map((id) => topics.find((topic) => topic.id === id)!).find((topic) => topic.matches.test(normalized));
  return match ? helpTopicAnswer(match.id, locale) : fallback(locale, question);
}

function fallback(locale: HelpLocale, query = ""): HelpAnswer {
  const trimmed = query.trim().slice(0, 500);
  return {
    text: locale === "ar" ? "أقدم إجابات جاهزة عن المتجر. اختر موضوعاً من الأسئلة أدناه، أو ابحث في الكتالوج، أو تواصل مع فريق GO ELEC للحصول على مساعدة خاصة بطلبك." : "Je propose des réponses préparées sur le magasin. Choisissez une question ci-dessous, recherchez dans le catalogue ou contactez l’équipe GO ELEC pour une réponse personnalisée.",
    links: [{ label: catalogue.label[locale], href: trimmed ? `/recherche?q=${encodeURIComponent(trimmed)}` : catalogue.href }, { label: whatsapp.label[locale], href: whatsapp.href }],
  };
}
