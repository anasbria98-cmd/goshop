begin;

insert into public.categories(name, slug, sort_order, is_active, show_in_navigation)
values
  ('Matériel électrique', 'materiel-electrique', 10, true, true),
  ('Appareillage / Interrupteurs & prises', 'appareillage', 20, true, true),
  ('Éclairage', 'eclairage', 30, true, true),
  ('Câbles & fils', 'cables-fils', 40, true, true),
  ('Gaines et conduits', 'gaines-conduits', 50, true, true),
  ('Outillage', 'outillage', 60, true, true),
  ('Domotique', 'domotique', 70, true, true),
  ('Sécurité', 'securite', 80, true, true),
  ('Photovoltaïque', 'photovoltaique', 90, true, true),
  ('Borne de recharge', 'bornes-recharge', 100, true, true),
  ('Climatisation', 'climatisation', 110, true, true),
  ('Destockage', 'destockage', 120, true, true),
  ('Offre installateur', 'offre-installateur', 130, true, true)
on conflict (slug) where parent_id is null do update
set name = excluded.name, sort_order = excluded.sort_order, is_active = true, show_in_navigation = true;

with entries(parent_slug, name, slug, sort_order) as (values
  ('materiel-electrique','Boite encastrement','boite-encastrement',10),
  ('materiel-electrique','Boite dérivation','boite-derivation',20),
  ('materiel-electrique','Boite et prise au sol','boite-prise-au-sol',30),
  ('materiel-electrique','Coffret electrique','coffret-electrique',40),
  ('materiel-electrique','Disjoncteur et interrupteur','disjoncteur-interrupteur',50),
  ('materiel-electrique','Sectionneur','sectionneur',60),
  ('materiel-electrique','Contacteur et relais','contacteur-relais',70),
  ('materiel-electrique','Horloge','horloge',80),
  ('materiel-electrique','Minuterie et télérupteur','minuterie-telerupteur',90),
  ('materiel-electrique','Relais de tension','relais-tension',100),
  ('materiel-electrique','Mise à la terre','mise-a-la-terre',110),
  ('materiel-electrique','Bornes de connexion','bornes-connexion',120),
  ('appareillage','Lap','lap',10),
  ('appareillage','Ingelec','ingelec',20),
  ('appareillage','Simon','simon',30),
  ('appareillage','Schneider','schneider',40),
  ('appareillage','Legrand','legrand',50),
  ('eclairage','Intérieur','interieur',10),
  ('eclairage','Extérieur','exterieur',20),
  ('eclairage','Industriel','industriel',30),
  ('eclairage','Éclairage solaire','eclairage-solaire',40),
  ('cables-fils','Câble U500V','cable-u500v',10),
  ('cables-fils','Câble U500SV','cable-u500sv',20),
  ('cables-fils','Câble RO2V','cable-ro2v',30),
  ('cables-fils','Câble RVFV','cable-rvfv',40),
  ('cables-fils','Câble RVK','cable-rvk',50),
  ('cables-fils','Câble souple','cable-souple',60),
  ('cables-fils','Câble torsadé','cable-torsade',70),
  ('cables-fils','Câble incendie','cable-incendie',80),
  ('cables-fils','Câble informatique','cable-informatique',90),
  ('cables-fils','Câble MTH','cable-mth',100),
  ('cables-fils','Câble coaxial','cable-coaxial',110),
  ('cables-fils','Câble Aqua immergé','cable-aqua-immerge',120),
  ('gaines-conduits','Tube orange','tube-orange',10),
  ('gaines-conduits','Flexible','flexible',20),
  ('gaines-conduits','Isorange','isorange',30),
  ('gaines-conduits','Goulotte','goulotte',40),
  ('gaines-conduits','Plinthe','plinthe',50),
  ('gaines-conduits','Plinthe au sol','plinthe-au-sol',60),
  ('gaines-conduits','Chemin de câble','chemin-de-cable',70),
  ('gaines-conduits','Fixation','fixation',80),
  ('outillage','Perceuses & visseuses','perceuses-visseuses',10),
  ('outillage','Outils à main','outils-a-main',20),
  ('outillage','Appareils de mesure','appareils-de-mesure',30),
  ('outillage','Équipements de protection','equipements-de-protection',40),
  ('outillage','Consommables','consommables',50),
  ('domotique','Prises connectées','prises-connectees',10),
  ('domotique','Commandes connectées','commandes-connectees',20),
  ('domotique','Thermostats','thermostats',30),
  ('domotique','Passerelles','passerelles',40),
  ('domotique','Volets roulants','volets-roulants',50),
  ('securite','Caméras','cameras',10),
  ('securite','Alarmes','alarmes',20),
  ('securite','Interphones','interphones',30),
  ('securite','Détecteurs','detecteurs',40),
  ('securite','Contrôle d’accès','controle-acces',50),
  ('photovoltaique','Panneaux solaires','panneaux-solaires',10),
  ('photovoltaique','Onduleurs','onduleurs',20),
  ('photovoltaique','Batteries','batteries',30),
  ('photovoltaique','Fixations','fixations',40),
  ('photovoltaique','Coffrets de protection','coffrets-de-protection',50)
)
insert into public.categories(name, slug, parent_id, sort_order, is_active, show_in_navigation)
select e.name, e.slug, p.id, e.sort_order, true, true
from entries e join public.categories p on p.slug = e.parent_slug and p.parent_id is null
on conflict (parent_id, slug) where parent_id is not null do update
set name = excluded.name, sort_order = excluded.sort_order, is_active = true, show_in_navigation = true;

with entries(root_slug, parent_slug, name, slug, sort_order) as (values
  ('materiel-electrique','disjoncteur-interrupteur','Schneider','schneider',10),
  ('materiel-electrique','disjoncteur-interrupteur','Hager','hager',20),
  ('materiel-electrique','disjoncteur-interrupteur','Legrand','legrand',30),
  ('materiel-electrique','disjoncteur-interrupteur','Ingelec','ingelec',40),
  ('materiel-electrique','disjoncteur-interrupteur','CHINT','chint',50),
  ('materiel-electrique','sectionneur','Schneider','schneider',10),
  ('materiel-electrique','sectionneur','Hager','hager',20),
  ('materiel-electrique','sectionneur','Legrand','legrand',30),
  ('appareillage','lap','Galaxy','galaxy',10),
  ('appareillage','lap','Millenium','millenium',20),
  ('appareillage','lap','Omega','omega',30),
  ('appareillage','lap','Optimo','optimo',40),
  ('appareillage','lap','Aqua','aqua',50),
  ('appareillage','ingelec','Karla','karla',10),
  ('appareillage','ingelec','Tropic','tropic',20),
  ('appareillage','simon','Série 24','serie-24',10),
  ('appareillage','schneider','Mureva Style','mureva-style',10),
  ('appareillage','schneider','Asfora','asfora',20),
  ('appareillage','schneider','Odace','odace',30),
  ('appareillage','legrand','Mosaic','mosaic',10),
  ('appareillage','legrand','Céliane','celiane',20),
  ('appareillage','legrand','Dooxie','dooxie',30),
  ('appareillage','legrand','Biticino','biticino',40),
  ('eclairage','interieur','Ampoule','ampoule',10),
  ('eclairage','interieur','Réglette','reglette',20),
  ('eclairage','interieur','Douille','douille',30),
  ('eclairage','interieur','Cadre spot','cadre-spot',40),
  ('eclairage','interieur','Panel','panel',50),
  ('eclairage','interieur','Ruban LED','ruban-led',60),
  ('eclairage','interieur','Hublot et plafonnier','hublot-plafonnier',70),
  ('eclairage','interieur','Applique','applique',80),
  ('eclairage','interieur','Magnétique','magnetique',90),
  ('eclairage','interieur','Éclairage sur rail','eclairage-sur-rail',100),
  ('eclairage','interieur','Profil LED','profil-led',110),
  ('eclairage','exterieur','Projecteur','projecteur',10),
  ('eclairage','exterieur','Piqué jardin','pique-jardin',20),
  ('eclairage','exterieur','Poteau jardin','poteau-jardin',30),
  ('eclairage','exterieur','Applique jardin','applique-jardin',40)
), parents as (
  select child.id, child.slug, root.slug as root_slug
  from public.categories child
  join public.categories root on root.id = child.parent_id
  where root.parent_id is null
)
insert into public.categories(name, slug, parent_id, sort_order, is_active, show_in_navigation)
select e.name, e.slug, p.id, e.sort_order, true, true
from entries e join parents p on p.root_slug = e.root_slug and p.slug = e.parent_slug
on conflict (parent_id, slug) where parent_id is not null do update
set name = excluded.name, sort_order = excluded.sort_order, is_active = true, show_in_navigation = true;

insert into public.store_settings(key, value, group_name, is_public, description)
values
  ('store_name', '"GO ELEC"'::jsonb, 'general', true, 'Nom public de la boutique'),
  ('currency', '"MAD"'::jsonb, 'general', true, 'Devise principale'),
  ('support_email', '"contact@goelec.ma"'::jsonb, 'contact', true, 'Adresse de support'),
  ('support_phone', '""'::jsonb, 'contact', true, 'Téléphone de support'),
  ('whatsapp', '""'::jsonb, 'contact', true, 'Numéro WhatsApp'),
  ('default_tax_rate', '20'::jsonb, 'orders', false, 'TVA par défaut'),
  ('order_prefix', '"GO"'::jsonb, 'orders', false, 'Préfixe des commandes'),
  ('business_address', 'null'::jsonb, 'contact', true, 'Adresse commerciale'),
  ('social_links', '{}'::jsonb, 'social', true, 'Liens sociaux'),
  ('maintenance_mode', 'false'::jsonb, 'general', false, 'Mode maintenance')
on conflict (key) do update set value = excluded.value, group_name = excluded.group_name, is_public = excluded.is_public, description = excluded.description;

insert into public.attributes(name, slug, type, unit, is_filterable, is_searchable, sort_order)
values
  ('Intensité', 'amperage', 'number', 'A', true, true, 10),
  ('Nombre de pôles', 'nombre-poles', 'number', null, true, true, 20),
  ('Courbe', 'courbe', 'text', null, true, true, 30),
  ('Tension', 'tension', 'number', 'V', true, true, 40),
  ('Puissance', 'puissance', 'number', 'W', true, true, 10),
  ('Température de couleur', 'temperature-couleur', 'number', 'K', true, true, 20),
  ('Flux lumineux', 'lumens', 'number', 'lm', true, true, 30),
  ('Culot', 'culot', 'text', null, true, true, 40),
  ('Section', 'section', 'number', 'mm²', true, true, 10),
  ('Nombre de conducteurs', 'nombre-conducteurs', 'number', null, true, true, 20),
  ('Type de câble', 'type-cable', 'text', null, true, true, 30),
  ('Longueur', 'longueur', 'number', 'm', true, true, 40)
on conflict (slug) do update set name = excluded.name, type = excluded.type, unit = excluded.unit, is_filterable = excluded.is_filterable, is_searchable = excluded.is_searchable, sort_order = excluded.sort_order;

insert into public.category_attributes(category_id, attribute_id, sort_order)
select category.id, attribute.id, attribute.sort_order
from public.categories category
join public.attributes attribute on (
  category.parent_id is null and (
    (category.slug = 'materiel-electrique' and attribute.slug in ('amperage','nombre-poles','courbe','tension')) or
    (category.slug = 'eclairage' and attribute.slug in ('puissance','temperature-couleur','lumens','culot')) or
    (category.slug = 'cables-fils' and attribute.slug in ('section','nombre-conducteurs','type-cable','longueur'))
  )
)
on conflict (category_id, attribute_id) do update set sort_order = excluded.sort_order;

commit;
