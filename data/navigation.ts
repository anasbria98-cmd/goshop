export interface NavigationNode {
  name: string;
  href: string;
  children?: NavigationNode[];
}

export interface NavigationCategory {
  slug: string;
  name: string;
  shortName?: string;
  href: string;
  columns: NavigationNode[][];
  showInMainBar?: boolean;
}

const link = (path: string, name: string): NavigationNode => ({
  name,
  href: `/categorie/${path}`,
});

const parent = (
  path: string,
  name: string,
  children: Array<[name: string, slug: string]>,
): NavigationNode => ({
  ...link(path, name),
  children: children.map(([childName, childSlug]) =>
    link(`${path}/${childSlug}`, childName),
  ),
});

export const navigationCategories: NavigationCategory[] = [
  {
    slug: "materiel-electrique",
    name: "Matériel électrique",
    href: "/categorie/materiel-electrique",
    showInMainBar: true,
    columns: [
      [
        link("materiel-electrique/boite-encastrement", "Boite encastrement"),
        link("materiel-electrique/boite-derivation", "Boite dérivation"),
        link(
          "materiel-electrique/boite-prise-au-sol",
          "Boite et prise au sol",
        ),
        link("materiel-electrique/coffret-electrique", "Coffret electrique"),
      ],
      [
        parent(
          "materiel-electrique/disjoncteur-interrupteur",
          "Disjoncteur et interrupteur",
          [
            ["Schneider", "schneider"],
            ["Hager", "hager"],
            ["Legrand", "legrand"],
            ["Ingelec", "ingelec"],
            ["CHINT", "chint"],
          ],
        ),
        parent("materiel-electrique/sectionneur", "Sectionneur", [
          ["Schneider", "schneider"],
          ["Hager", "hager"],
          ["Legrand", "legrand"],
        ]),
      ],
      [
        link(
          "materiel-electrique/contacteur-relais",
          "Contacteur et relais",
        ),
        link("materiel-electrique/horloge", "Horloge"),
        link(
          "materiel-electrique/minuterie-telerupteur",
          "Minuterie et télérupteur",
        ),
        link("materiel-electrique/relais-tension", "Relais de tension"),
        link("materiel-electrique/mise-a-la-terre", "Mise à la terre"),
        link(
          "materiel-electrique/bornes-connexion",
          "Bornes de connexion",
        ),
      ],
    ],
  },
  {
    slug: "appareillage",
    name: "Appareillage / Interrupteurs & prises",
    shortName: "Interrupteurs & prises",
    href: "/categorie/appareillage",
    showInMainBar: true,
    columns: [
      [
        parent("appareillage/lap", "Lap", [
          ["Galaxy", "galaxy"],
          ["Millenium", "millenium"],
          ["Omega", "omega"],
          ["Optimo", "optimo"],
          ["Aqua", "aqua"],
        ]),
        parent("appareillage/ingelec", "Ingelec", [
          ["Karla", "karla"],
          ["Tropic", "tropic"],
        ]),
      ],
      [
        parent("appareillage/simon", "Simon", [["Série 24", "serie-24"]]),
        parent("appareillage/schneider", "Schneider", [
          ["Mureva Style", "mureva-style"],
          ["Asfora", "asfora"],
          ["Odace", "odace"],
        ]),
      ],
      [
        parent("appareillage/legrand", "Legrand", [
          ["Mosaic", "mosaic"],
          ["Céliane", "celiane"],
          ["Dooxie", "dooxie"],
          ["Biticino", "biticino"],
        ]),
      ],
    ],
  },
  {
    slug: "eclairage",
    name: "Éclairage",
    href: "/categorie/eclairage",
    showInMainBar: true,
    columns: [
      [
        parent("eclairage/interieur", "Intérieur", [
          ["Ampoule", "ampoule"],
          ["Réglette", "reglette"],
          ["Douille", "douille"],
          ["Cadre spot", "cadre-spot"],
          ["Panel", "panel"],
          ["Ruban LED", "ruban-led"],
          ["Hublot et plafonnier", "hublot-plafonnier"],
          ["Applique", "applique"],
          ["Magnétique", "magnetique"],
          ["Éclairage sur rail", "eclairage-sur-rail"],
          ["Profil LED", "profil-led"],
        ]),
      ],
      [
        parent("eclairage/exterieur", "Extérieur", [
          ["Projecteur", "projecteur"],
          ["Piqué jardin", "pique-jardin"],
          ["Poteau jardin", "poteau-jardin"],
          ["Applique jardin", "applique-jardin"],
        ]),
      ],
      [
        link("eclairage/industriel", "Industriel"),
        link("eclairage/eclairage-solaire", "Éclairage solaire"),
      ],
    ],
  },
  {
    slug: "cables-fils",
    name: "Câbles & fils",
    href: "/categorie/cables-fils",
    showInMainBar: true,
    columns: [
      [
        link("cables-fils/cable-u500v", "Câble U500V"),
        link("cables-fils/cable-u500sv", "Câble U500SV"),
        link("cables-fils/cable-ro2v", "Câble RO2V"),
        link("cables-fils/cable-rvfv", "Câble RVFV"),
        link("cables-fils/cable-rvk", "Câble RVK"),
        link("cables-fils/cable-souple", "Câble souple"),
      ],
      [
        link("cables-fils/cable-torsade", "Câble torsadé"),
        link("cables-fils/cable-incendie", "Câble incendie"),
        link("cables-fils/cable-informatique", "Câble informatique"),
        link("cables-fils/cable-mth", "Câble MTH"),
        link("cables-fils/cable-coaxial", "Câble coaxial"),
        link("cables-fils/cable-aqua-immerge", "Câble Aqua immergé"),
      ],
    ],
  },
  {
    slug: "gaines-conduits",
    name: "Gaines et conduits",
    href: "/categorie/gaines-conduits",
    showInMainBar: true,
    columns: [
      [
        link("gaines-conduits/tube-orange", "Tube orange"),
        link("gaines-conduits/flexible", "Flexible"),
        link("gaines-conduits/isorange", "Isorange"),
        link("gaines-conduits/goulotte", "Goulotte"),
      ],
      [
        link("gaines-conduits/plinthe", "Plinthe"),
        link("gaines-conduits/plinthe-au-sol", "Plinthe au sol"),
        link("gaines-conduits/chemin-de-cable", "Chemin de câble"),
        link("gaines-conduits/fixation", "Fixation"),
      ],
    ],
  },
  {
    slug: "outillage",
    name: "Outillage",
    href: "/categorie/outillage",
    showInMainBar: true,
    columns: [
      [
        link("outillage/perceuses-visseuses", "Perceuses & visseuses"),
        link("outillage/outils-a-main", "Outils à main"),
        link("outillage/appareils-de-mesure", "Appareils de mesure"),
        link(
          "outillage/equipements-de-protection",
          "Équipements de protection",
        ),
        link("outillage/consommables", "Consommables"),
      ],
    ],
  },
  {
    slug: "domotique",
    name: "Domotique",
    href: "/categorie/domotique",
    columns: [
      [
        link("domotique/prises-connectees", "Prises connectées"),
        link("domotique/commandes-connectees", "Commandes connectées"),
        link("domotique/thermostats", "Thermostats"),
        link("domotique/passerelles", "Passerelles"),
        link("domotique/volets-roulants", "Volets roulants"),
      ],
    ],
  },
  {
    slug: "securite",
    name: "Sécurité",
    href: "/categorie/securite",
    columns: [
      [
        link("securite/cameras", "Caméras"),
        link("securite/alarmes", "Alarmes"),
        link("securite/interphones", "Interphones"),
        link("securite/detecteurs", "Détecteurs"),
        link("securite/controle-acces", "Contrôle d’accès"),
      ],
    ],
  },
  {
    slug: "photovoltaique",
    name: "Photovoltaïque",
    href: "/categorie/photovoltaique",
    columns: [
      [
        link("photovoltaique/panneaux-solaires", "Panneaux solaires"),
        link("photovoltaique/onduleurs", "Onduleurs"),
        link("photovoltaique/batteries", "Batteries"),
        link("photovoltaique/fixations", "Fixations"),
        link(
          "photovoltaique/coffrets-de-protection",
          "Coffrets de protection",
        ),
      ],
    ],
  },
  {
    slug: "bornes-recharge",
    name: "Borne de recharge",
    href: "/categorie/bornes-recharge",
    columns: [],
  },
  {
    slug: "climatisation",
    name: "Climatisation",
    href: "/categorie/climatisation",
    columns: [],
  },
  {
    slug: "destockage",
    name: "Destockage",
    href: "/categorie/destockage",
    columns: [],
  },
  {
    slug: "offre-installateur",
    name: "Offre installateur",
    href: "/categorie/offre-installateur",
    columns: [],
  },
];
