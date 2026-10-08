export interface Category {
  slug: string;
  name: string;
  short: string;
  image: string;
  subcategories: string[];
}
export const categories: Category[] = [
  {
    slug: "materiel-electrique",
    name: "Matériel électrique",
    short: "Matériel électrique",
    image: "breaker",
    subcategories: [
      "Tableaux électriques",
      "Disjoncteurs",
      "Interrupteurs différentiels",
      "Parafoudres",
      "Coffrets électriques",
      "Mise à la terre",
      "Contacteurs",
      "Minuteries",
      "Accessoires tableau",
    ],
  },
  {
    slug: "interrupteurs-prises",
    name: "Interrupteurs & prises",
    short: "Interrupteurs & prises",
    image: "socket",
    subcategories: [
      "Prises de courant",
      "Interrupteurs",
      "Plaques de finition",
      "Prises USB",
      "Appareillage étanche",
      "Boîtes d’encastrement",
    ],
  },
  {
    slug: "eclairage",
    name: "Éclairage",
    short: "Éclairage LED",
    image: "bulb",
    subcategories: [
      "Ampoules LED",
      "Spots encastrables",
      "Réglettes LED",
      "Projecteurs extérieurs",
      "Luminaires",
      "Éclairage de sécurité",
    ],
  },
  {
    slug: "cables-fils",
    name: "Câbles & fils",
    short: "Câbles & fils",
    image: "cable",
    subcategories: [
      "Fils électriques",
      "Câbles rigides",
      "Câbles souples",
      "Gaines ICTA",
      "Câbles réseau",
      "Connexions rapides",
    ],
  },
  {
    slug: "outillage",
    name: "Outillage",
    short: "Outillage",
    image: "drill",
    subcategories: [
      "Perceuses & visseuses",
      "Outils à main",
      "Appareils de mesure",
      "Équipements de protection",
      "Consommables",
    ],
  },
  {
    slug: "domotique",
    name: "Domotique",
    short: "Maison connectée",
    image: "socket",
    subcategories: [
      "Prises connectées",
      "Commandes connectées",
      "Thermostats",
      "Passerelles",
      "Volets roulants",
    ],
  },
  {
    slug: "securite",
    name: "Sécurité",
    short: "Sécurité",
    image: "panel",
    subcategories: [
      "Caméras",
      "Alarmes",
      "Interphones",
      "Détecteurs",
      "Contrôle d’accès",
    ],
  },
  {
    slug: "photovoltaique",
    name: "Photovoltaïque",
    short: "Photovoltaïque",
    image: "solar",
    subcategories: [
      "Panneaux solaires",
      "Onduleurs",
      "Batteries",
      "Fixations",
      "Coffrets de protection",
    ],
  },
  {
    slug: "bornes-recharge",
    name: "Bornes de recharge",
    short: "Bornes de recharge",
    image: "panel",
    subcategories: [
      "Bornes résidentielles",
      "Bornes professionnelles",
      "Câbles de recharge",
      "Protections électriques",
    ],
  },
  {
    slug: "climatisation",
    name: "Climatisation",
    short: "Climatisation",
    image: "panel",
    subcategories: [
      "Climatiseurs",
      "Ventilation",
      "Extracteurs",
      "Accessoires de pose",
    ],
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
}
export const products: Product[] = [
  {
    id: "GS1004",
    slug: "ampoule-philips-led-e27",
    name: "Ampoule LED E27 9W — blanc chaud",
    brand: "Philips",
    category: "eclairage",
    image: "bulb",
    price: 29,
    oldPrice: 39,
    rating: 4.6,
    reviews: 65,
    manufacturerRef: "PH-LED9W827",
    stock: 240,
  },
  {
    id: "GS1005",
    slug: "borne-wago-221",
    name: "Bornes de connexion 3 entrées — lot de 10",
    brand: "Wago",
    category: "cables-fils",
    image: "connector",
    price: 79,
    oldPrice: 95,
    rating: 4.9,
    reviews: 51,
    manufacturerRef: "221-413",
    stock: 68,
  },
  {
    id: "GS1006",
    slug: "cable-electrique-25",
    name: "Fil électrique H07V-U 2,5 mm² — 100 m",
    brand: "Nexans",
    category: "cables-fils",
    image: "cable",
    price: 349,
    rating: 4.8,
    reviews: 19,
    manufacturerRef: "H07VU-25-100",
    stock: 22,
  },
  {
    id: "GS1007",
    slug: "perceuse-sans-fil-18v",
    name: "Perceuse-visseuse sans fil 18V avec batterie",
    brand: "Bosch",
    category: "outillage",
    image: "drill",
    price: 1190,
    oldPrice: 1390,
    rating: 4.8,
    reviews: 24,
    manufacturerRef: "GSB-18V",
    stock: 16,
    fresh: true,
  },
  {
    id: "GS1008",
    slug: "panneau-solaire-450w",
    name: "Panneau solaire monocristallin 450W",
    brand: "JA Solar",
    category: "photovoltaique",
    image: "solar",
    price: 1290,
    oldPrice: 1490,
    rating: 4.7,
    reviews: 12,
    manufacturerRef: "JAM54-450",
    stock: 18,
    fresh: true,
  },
  {
    id: "GS1011",
    slug: "ampoule-led-12w",
    name: "Ampoule LED E27 12W — blanc neutre",
    brand: "Philips",
    category: "eclairage",
    image: "bulb",
    price: 39,
    rating: 4.7,
    reviews: 32,
    manufacturerRef: "PH-LED12W840",
    stock: 150,
    fresh: true,
  },
];
export const money = (value: number) =>
  new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DH";
export const storeInfo = {
  email: "contact@goelec.ma",
  phone: "+212 (0)5 XX XX XX XX",
  address: "Adresse et points de retrait à confirmer",
};
