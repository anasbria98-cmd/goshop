export interface CategoryFilter {
  key: string;
  label: string;
  options: string[];
}

export interface Category {
  slug: string;
  name: string;
  short: string;
  description: string;
  subcategories: string[];
  filters: CategoryFilter[];
  featured?: boolean;
}

const filter = (key: string, label: string, options: string[]): CategoryFilter => ({ key, label, options });
const brand = filter("brand", "Marque", []);

export const categories: Category[] = [
  {
    slug: "materiel-electrique",
    name: "Matériel électrique",
    short: "Matériel électrique",
    description: "Les équipements essentiels pour commander, raccorder et organiser une installation électrique résidentielle ou professionnelle.",
    subcategories: ["Contacteurs", "Relais et minuteries", "Boîtes et dérivations", "Mise à la terre", "Alimentations et transformateurs", "Accessoires d’installation"],
    filters: [filter("function", "Fonction", ["Commande", "Raccordement", "Alimentation", "Mise à la terre"]), filter("mounting", "Type de pose", ["Modulaire", "En saillie", "Encastré"]), brand],
    featured: true,
  },
  {
    slug: "interrupteurs-prises",
    name: "Interrupteurs & prises",
    short: "Interrupteurs & prises",
    description: "L’appareillage pour équiper les espaces de vie et de travail avec une finition cohérente et adaptée à chaque pose.",
    subcategories: ["Prises de courant", "Interrupteurs", "Plaques de finition", "Prises USB et multimédia", "Appareillage étanche", "Boîtes d’encastrement"],
    filters: [filter("range", "Gamme", ["Résidentiel", "Tertiaire", "Étanche"]), filter("color", "Couleur", ["Blanc", "Noir", "Métal"]), filter("mounting", "Type de pose", ["Encastré", "En saillie"]), brand],
    featured: true,
  },
  {
    slug: "tableaux-electriques",
    name: "Tableaux électriques",
    short: "Tableaux électriques",
    description: "Coffrets, armoires et accessoires pour construire une distribution lisible, évolutive et adaptée au chantier.",
    subcategories: ["Coffrets résidentiels", "Tableaux pré-équipés", "Armoires électriques", "Portes et façades", "Peignes et répartiteurs", "Accessoires de tableau"],
    filters: [filter("modules", "Nombre de modules", ["Jusqu’à 13", "14 à 26", "27 et plus"]), filter("rows", "Nombre de rangées", ["1 rangée", "2 rangées", "3 rangées et plus"]), filter("mounting", "Type de pose", ["Encastré", "En saillie"]), brand],
    featured: true,
  },
  {
    slug: "disjoncteurs-protections",
    name: "Disjoncteurs & protections",
    short: "Protections électriques",
    description: "Les dispositifs de protection des personnes, des circuits et des équipements pour chaque niveau d’installation.",
    subcategories: ["Disjoncteurs modulaires", "Interrupteurs différentiels", "Disjoncteurs différentiels", "Parafoudres", "Fusibles et porte-fusibles", "Protections moteur"],
    filters: [filter("amperage", "Calibre", ["2 à 10 A", "16 à 20 A", "25 à 40 A", "Plus de 40 A"]), filter("poles", "Nombre de pôles", ["1P+N", "2P", "3P", "4P"]), filter("curve", "Courbe", ["B", "C", "D"]), filter("protection", "Type de protection", ["Surcharge", "Différentielle", "Surtension"]), brand],
    featured: true,
  },
  {
    slug: "cables-fils",
    name: "Câbles & fils",
    short: "Câbles & fils",
    description: "Fils, câbles, gaines et connexions pour l’énergie, les réseaux et les installations courants faibles.",
    subcategories: ["Fils électriques", "Câbles rigides", "Câbles souples", "Gaines et conduits", "Câbles réseau et données", "Connecteurs et bornes"],
    filters: [filter("section", "Section", ["1,5 mm²", "2,5 mm²", "4 à 6 mm²", "10 mm² et plus"]), filter("conductors", "Nombre de conducteurs", ["1", "2", "3", "4 et plus"]), filter("cableType", "Type de câble", ["Rigide", "Souple", "Réseau", "Solaire"]), filter("length", "Conditionnement", ["À la coupe", "Couronne", "Touret"]), brand],
    featured: true,
  },
  {
    slug: "eclairage",
    name: "Éclairage",
    short: "Éclairage",
    description: "Des solutions d’éclairage intérieur, extérieur et technique pour créer le bon niveau de lumière dans chaque espace.",
    subcategories: ["Ampoules LED", "Spots encastrables", "Réglettes et panneaux LED", "Projecteurs extérieurs", "Luminaires", "Éclairage de sécurité"],
    filters: [filter("power", "Puissance", ["Jusqu’à 6 W", "7 à 12 W", "13 à 30 W", "Plus de 30 W"]), filter("temperature", "Température de couleur", ["Blanc chaud", "Blanc neutre", "Blanc froid"]), filter("socket", "Culot", ["E27", "E14", "GU10", "Intégré"]), filter("use", "Usage", ["Intérieur", "Extérieur", "Technique"]), brand],
    featured: true,
  },
  {
    slug: "domotique",
    name: "Domotique",
    short: "Domotique",
    description: "Les commandes et automatismes pour piloter l’éclairage, l’énergie, le confort et les ouvrants du bâtiment.",
    subcategories: ["Commandes connectées", "Prises connectées", "Thermostats", "Passerelles et contrôleurs", "Volets et automatismes", "Gestion de l’énergie"],
    filters: [filter("protocol", "Protocole", ["Wi-Fi", "Zigbee", "Bluetooth", "Filaire"]), filter("function", "Fonction", ["Éclairage", "Chauffage", "Volets", "Énergie"]), filter("compatibility", "Compatibilité", ["Application mobile", "Assistant vocal", "Système filaire"]), brand],
  },
  {
    slug: "outillage",
    name: "Outillage",
    short: "Outillage",
    description: "L’outillage à main, électroportatif et de mesure destiné aux électriciens, installateurs et techniciens.",
    subcategories: ["Outils à main", "Outillage électroportatif", "Appareils de mesure", "Consommables", "Rangement", "Protection individuelle"],
    filters: [filter("toolType", "Type d’outil", ["Coupe et dénudage", "Vissage", "Perçage", "Mesure"]), filter("powerSource", "Alimentation", ["Manuel", "Batterie", "Secteur"]), filter("voltage", "Tension batterie", ["12 V", "18 V", "36 V"]), brand],
  },
  {
    slug: "securite",
    name: "Sécurité",
    short: "Sécurité",
    description: "Les équipements de détection, vidéosurveillance, contrôle d’accès et communication pour protéger les bâtiments.",
    subcategories: ["Caméras", "Alarmes", "Interphones", "Détecteurs", "Contrôle d’accès", "Enregistreurs et stockage"],
    filters: [filter("equipment", "Type d’équipement", ["Caméra", "Alarme", "Interphone", "Détecteur"]), filter("connection", "Connexion", ["Filaire", "Wi-Fi", "PoE", "Sans fil"]), filter("resolution", "Résolution vidéo", ["2 MP", "4 MP", "8 MP et plus"]), brand],
  },
  {
    slug: "photovoltaique",
    name: "Photovoltaïque",
    short: "Photovoltaïque",
    description: "Les composants pour produire, convertir, stocker et protéger l’énergie solaire dans les installations raccordées ou autonomes.",
    subcategories: ["Panneaux solaires", "Onduleurs", "Batteries", "Fixations", "Câbles et connectique solaire", "Coffrets de protection"],
    filters: [filter("productType", "Type de produit", ["Panneau", "Onduleur", "Batterie", "Protection"]), filter("power", "Puissance", ["Jusqu’à 3 kW", "3 à 6 kW", "Plus de 6 kW"]), filter("phase", "Réseau", ["Monophasé", "Triphasé", "Hors réseau"]), brand],
    featured: true,
  },
  {
    slug: "bornes-recharge",
    name: "Bornes de recharge",
    short: "Bornes de recharge",
    description: "Les bornes, câbles et protections dédiés à la recharge des véhicules électriques à domicile et en entreprise.",
    subcategories: ["Bornes résidentielles", "Bornes professionnelles", "Câbles de recharge", "Supports et accessoires", "Protections dédiées", "Gestion de charge"],
    filters: [filter("power", "Puissance de charge", ["3,7 kW", "7,4 kW", "11 kW", "22 kW"]), filter("connector", "Connecteur", ["Type 2", "Prise renforcée", "Câble attaché"]), filter("phase", "Alimentation", ["Monophasé", "Triphasé"]), brand],
  },
  {
    slug: "climatisation",
    name: "Climatisation",
    short: "Climatisation",
    description: "Les solutions de climatisation, ventilation et traitement d’air pour le résidentiel et les espaces professionnels.",
    subcategories: ["Climatiseurs muraux", "Systèmes multi-split", "Ventilation", "Extracteurs", "Régulation", "Accessoires de pose"],
    filters: [filter("productType", "Type de produit", ["Climatiseur", "Ventilation", "Extraction", "Accessoire"]), filter("capacity", "Puissance frigorifique", ["Jusqu’à 9 000 BTU", "12 000 BTU", "18 000 BTU et plus"]), filter("energyClass", "Classe énergétique", ["A+", "A++", "A+++"]), brand],
  },
];

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  manufacturerRef: string;
  stock: number;
  fresh?: boolean;
  bestseller?: boolean;
  attributes?: Record<string, string>;
}

// Verified supplier products will be imported here in the next catalogue phase.
export const products: Product[] = [];

export const money = (value: number) =>
  new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + " DH";

export const storeInfo = {
  email: "contact@goelec.ma",
  phone: "",
  address: "",
};
