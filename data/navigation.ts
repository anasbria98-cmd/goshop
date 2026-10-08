export interface NavigationItem {
  name: string;
  href: string;
}

export interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

export interface NavigationCategory {
  slug: string;
  name: string;
  shortName?: string;
  href: string;
  groups: NavigationGroup[];
  showInMainBar?: boolean;
}

const item = (category: string, name: string, slug: string): NavigationItem => ({
  name,
  href: `/categorie/${category}/${slug}`,
});

export const navigationCategories: NavigationCategory[] = [
  {
    slug: "materiel-electrique",
    name: "Matériel électrique",
    href: "/categorie/materiel-electrique",
    showInMainBar: true,
    groups: [
      {
        title: "Boîtes & coffrets",
        items: [
          item("materiel-electrique", "Boite encastrement", "boite-encastrement"),
          item("materiel-electrique", "Boite dérivation", "boite-derivation"),
          item("materiel-electrique", "Boite et prise au sol", "boite-prise-au-sol"),
          item("materiel-electrique", "Coffret electrique", "coffret-electrique"),
        ],
      },
      {
        title: "Protection & marques",
        items: [
          item(
            "materiel-electrique",
            "Disjoncteur et interrupteur",
            "disjoncteur-interrupteur",
          ),
          item("materiel-electrique", "Schneider", "schneider"),
          item("materiel-electrique", "Hager", "hager"),
          item("materiel-electrique", "Legrand", "legrand"),
          item("materiel-electrique", "Ingelec", "ingelec"),
          item("materiel-electrique", "CHINT", "chint"),
          item("materiel-electrique", "Sectionneur", "sectionneur"),
        ],
      },
      {
        title: "Commande & raccordement",
        items: [
          item("materiel-electrique", "Contacteur et relais", "contacteur-relais"),
          item("materiel-electrique", "Horloge", "horloge"),
          item(
            "materiel-electrique",
            "Minuterie et télérupteur",
            "minuterie-telerupteur",
          ),
          item("materiel-electrique", "Relais de tension", "relais-tension"),
          item("materiel-electrique", "Mise à la terre", "mise-a-la-terre"),
          item("materiel-electrique", "Bornes de connexion", "bornes-connexion"),
        ],
      },
    ],
  },
  {
    slug: "interrupteurs-prises",
    name: "Appareillage / Interrupteurs & prises",
    shortName: "Interrupteurs & prises",
    href: "/categorie/interrupteurs-prises",
    showInMainBar: true,
    groups: [
      {
        title: "Gammes Ingelec",
        items: [
          item("interrupteurs-prises", "Lap", "lap"),
          item("interrupteurs-prises", "Galaxy", "galaxy"),
          item("interrupteurs-prises", "Millenium", "millenium"),
          item("interrupteurs-prises", "Omega", "omega"),
          item("interrupteurs-prises", "Optimo", "optimo"),
          item("interrupteurs-prises", "Aqua", "aqua"),
          item("interrupteurs-prises", "Ingelec", "ingelec"),
          item("interrupteurs-prises", "Karla", "karla"),
          item("interrupteurs-prises", "Tropic", "tropic"),
          item("interrupteurs-prises", "Simon", "simon"),
          item("interrupteurs-prises", "Série 24", "serie-24"),
        ],
      },
      {
        title: "Schneider Electric",
        items: [
          item("interrupteurs-prises", "Schneider", "schneider"),
          item("interrupteurs-prises", "Mureva Style", "mureva-style"),
          item("interrupteurs-prises", "Asfora", "asfora"),
          item("interrupteurs-prises", "Odace", "odace"),
        ],
      },
      {
        title: "Legrand & Biticino",
        items: [
          item("interrupteurs-prises", "Legrand", "legrand"),
          item("interrupteurs-prises", "Mosaic", "mosaic"),
          item("interrupteurs-prises", "Céliane", "celiane"),
          item("interrupteurs-prises", "Dooxie", "dooxie"),
          item("interrupteurs-prises", "Biticino", "biticino"),
        ],
      },
    ],
  },
  {
    slug: "eclairage",
    name: "Éclairage",
    href: "/categorie/eclairage",
    showInMainBar: true,
    groups: [
      {
        title: "Intérieur",
        items: [
          item("eclairage", "Ampoule", "ampoule"),
          item("eclairage", "Réglette", "reglette"),
          item("eclairage", "Douille", "douille"),
          item("eclairage", "Cadre spot", "cadre-spot"),
          item("eclairage", "Panel", "panel"),
          item("eclairage", "Ruban LED", "ruban-led"),
          item("eclairage", "Hublot et plafonnier", "hublot-plafonnier"),
          item("eclairage", "Applique", "applique"),
          item("eclairage", "Magnétique", "magnetique"),
          item("eclairage", "Éclairage sur rail", "eclairage-sur-rail"),
          item("eclairage", "Profil LED", "profil-led"),
        ],
      },
      {
        title: "Extérieur",
        items: [
          item("eclairage", "Projecteur", "projecteur"),
          item("eclairage", "Piqué jardin", "pique-jardin"),
          item("eclairage", "Poteau jardin", "poteau-jardin"),
          item("eclairage", "Applique jardin", "applique-jardin"),
        ],
      },
      {
        title: "Applications",
        items: [
          item("eclairage", "Industriel", "industriel"),
          item("eclairage", "Éclairage solaire", "eclairage-solaire"),
        ],
      },
    ],
  },
  {
    slug: "cables-fils",
    name: "Câbles & fils",
    href: "/categorie/cables-fils",
    showInMainBar: true,
    groups: [
      {
        title: "Câbles d’énergie",
        items: [
          item("cables-fils", "Câble U500V", "cable-u500v"),
          item("cables-fils", "Câble U500SV", "cable-u500sv"),
          item("cables-fils", "Câble RO2V", "cable-ro2v"),
          item("cables-fils", "Câble RVFV", "cable-rvfv"),
          item("cables-fils", "Câble RVK", "cable-rvk"),
          item("cables-fils", "Câble souple", "cable-souple"),
          item("cables-fils", "Câble torsadé", "cable-torsade"),
        ],
      },
      {
        title: "Câbles spécifiques",
        items: [
          item("cables-fils", "Câble incendie", "cable-incendie"),
          item("cables-fils", "Câble informatique", "cable-informatique"),
          item("cables-fils", "Câble MTH", "cable-mth"),
          item("cables-fils", "Câble coaxial", "cable-coaxial"),
          item("cables-fils", "Câble Aqua immergé", "cable-aqua-immerge"),
        ],
      },
    ],
  },
  {
    slug: "gaines-conduits",
    name: "Gaines et conduits",
    href: "/categorie/gaines-conduits",
    showInMainBar: true,
    groups: [
      {
        title: "Gaines & tubes",
        items: [
          item("gaines-conduits", "Tube orange", "tube-orange"),
          item("gaines-conduits", "Flexible", "flexible"),
          item("gaines-conduits", "Isorange", "isorange"),
          item("gaines-conduits", "Goulotte", "goulotte"),
        ],
      },
      {
        title: "Distribution & pose",
        items: [
          item("gaines-conduits", "Plinthe", "plinthe"),
          item("gaines-conduits", "Plinthe au sol", "plinthe-au-sol"),
          item("gaines-conduits", "Chemin de câble", "chemin-de-cable"),
          item("gaines-conduits", "Fixation", "fixation"),
        ],
      },
    ],
  },
  {
    slug: "outillage",
    name: "Outillage",
    href: "/categorie/outillage",
    showInMainBar: true,
    groups: [
      {
        title: "Outillage",
        items: [
          item("outillage", "Perceuses & visseuses", "perceuses-visseuses"),
          item("outillage", "Outils à main", "outils-a-main"),
          item("outillage", "Appareils de mesure", "appareils-de-mesure"),
          item(
            "outillage",
            "Équipements de protection",
            "equipements-de-protection",
          ),
          item("outillage", "Consommables", "consommables"),
        ],
      },
    ],
  },
  {
    slug: "domotique",
    name: "Domotique",
    href: "/categorie/domotique",
    groups: [
      {
        title: "Maison connectée",
        items: [
          item("domotique", "Prises connectées", "prises-connectees"),
          item("domotique", "Commandes connectées", "commandes-connectees"),
          item("domotique", "Thermostats", "thermostats"),
          item("domotique", "Passerelles", "passerelles"),
          item("domotique", "Volets roulants", "volets-roulants"),
        ],
      },
    ],
  },
  {
    slug: "securite",
    name: "Sécurité",
    href: "/categorie/securite",
    groups: [
      {
        title: "Sécurité",
        items: [
          item("securite", "Caméras", "cameras"),
          item("securite", "Alarmes", "alarmes"),
          item("securite", "Interphones", "interphones"),
          item("securite", "Détecteurs", "detecteurs"),
          item("securite", "Contrôle d’accès", "controle-acces"),
        ],
      },
    ],
  },
  {
    slug: "photovoltaique",
    name: "Photovoltaïque",
    href: "/categorie/photovoltaique",
    groups: [
      {
        title: "Photovoltaïque",
        items: [
          item("photovoltaique", "Panneaux solaires", "panneaux-solaires"),
          item("photovoltaique", "Onduleurs", "onduleurs"),
          item("photovoltaique", "Batteries", "batteries"),
          item("photovoltaique", "Fixations", "fixations"),
          item(
            "photovoltaique",
            "Coffrets de protection",
            "coffrets-de-protection",
          ),
        ],
      },
    ],
  },
  {
    slug: "bornes-recharge",
    name: "Borne de recharge",
    href: "/categorie/bornes-recharge",
    groups: [
      {
        title: "Recharge de véhicules",
        items: [
          item("bornes-recharge", "Bornes résidentielles", "bornes-residentielles"),
          item(
            "bornes-recharge",
            "Bornes professionnelles",
            "bornes-professionnelles",
          ),
          item("bornes-recharge", "Câbles de recharge", "cables-de-recharge"),
          item(
            "bornes-recharge",
            "Protections électriques",
            "protections-electriques",
          ),
        ],
      },
    ],
  },
  {
    slug: "climatisation",
    name: "Climatisation",
    href: "/categorie/climatisation",
    groups: [
      {
        title: "Climatisation & ventilation",
        items: [
          item("climatisation", "Climatiseurs", "climatiseurs"),
          item("climatisation", "Ventilation", "ventilation"),
          item("climatisation", "Extracteurs", "extracteurs"),
          item("climatisation", "Accessoires de pose", "accessoires-de-pose"),
        ],
      },
    ],
  },
  {
    slug: "destockage",
    name: "Destockage",
    href: "/categorie/destockage",
    groups: [],
  },
  {
    slug: "offre-installateur",
    name: "Offre installateur",
    href: "/categorie/offre-installateur",
    groups: [],
  },
];
