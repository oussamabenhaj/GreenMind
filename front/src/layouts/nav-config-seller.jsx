import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const icon = (name) => <Iconify icon={name} width={24} />;

const item = (title, path, iconName) => ({ title, path, icon: icon(iconName) });

// ----------------------------------------------------------------------

const s = paths.seller;
export const sellerNavData = [
  {
    subheader: 'Vue d’ensemble',
    items: [
      item('Tableau de bord', s.root, 'solar:home-smile-bold-duotone'),
      item('Statistiques', s.reports, 'solar:chart-2-bold-duotone'),
      item('Carte', s.map, 'solar:map-point-wave-bold-duotone'),
    ],
  },
  {
    subheader: 'Ma boutique',
    items: [
      item('Mes produits', s.products, 'solar:box-bold-duotone'),
      item('Remises', s.discounts, 'solar:tag-price-bold-duotone'),
      item('Ventes', s.purchases, 'solar:cart-large-4-bold-duotone'),
    ],
  },
  {
    subheader: 'Opportunités',
    items: [
      item('Demandes reçues', s.requests, 'solar:inbox-in-bold-duotone'),
      item('Offres à venir', s.offers, 'solar:calendar-mark-bold-duotone'),
      item('Marché & recherche IA', s.marketplace, 'solar:magic-stick-3-bold-duotone'),
      item('Acheteurs', s.buyers, 'solar:users-group-rounded-bold-duotone'),
      item('Messagerie', s.chat, 'solar:chat-round-dots-bold-duotone'),
    ],
  },
];

// ----------------------------------------------------------------------

const b = paths.buyer;
export const buyerNavData = [
  {
    subheader: 'Vue d’ensemble',
    items: [
      item('Tableau de bord', b.root, 'solar:home-smile-bold-duotone'),
      item('Carte', b.map, 'solar:map-point-wave-bold-duotone'),
    ],
  },
  {
    subheader: 'Acheter',
    items: [
      item('Marché & recherche IA', b.marketplace, 'solar:magic-stick-3-bold-duotone'),
      item('Mes demandes', b.requests, 'solar:inbox-out-bold-duotone'),
      item('Bons plans', b.discounts, 'solar:tag-price-bold-duotone'),
      item('Offres des points', b.offers, 'solar:calendar-mark-bold-duotone'),
    ],
  },
  {
    subheader: 'Réseau',
    items: [
      item('Vendeurs', b.sellers, 'solar:shop-2-bold-duotone'),
      item('Messagerie', b.chat, 'solar:chat-round-dots-bold-duotone'),
    ],
  },
];

// ----------------------------------------------------------------------

const c = paths.collector;
export const collectorNavData = [
  {
    subheader: 'Vue d’ensemble',
    items: [
      item('Tableau de bord', c.root, 'solar:home-smile-bold-duotone'),
      item('Carte', c.map, 'solar:map-point-wave-bold-duotone'),
    ],
  },
  {
    subheader: 'Mon point de collecte',
    items: [
      item('Points & horaires', c.points, 'solar:map-point-add-bold-duotone'),
      item('Stockage', c.storage, 'solar:box-bold-duotone'),
      item('Opérations d’achat', c.purchases, 'solar:cart-large-4-bold-duotone'),
      item('Offres', c.offers, 'solar:calendar-mark-bold-duotone'),
    ],
  },
  {
    subheader: 'Opportunités',
    items: [
      item('Demandes d’achat', c.requests, 'solar:inbox-in-bold-duotone'),
      item('Marché & recherche IA', c.marketplace, 'solar:magic-stick-3-bold-duotone'),
      item('Vendeurs', c.sellers, 'solar:shop-2-bold-duotone'),
      item('Acheteurs', c.buyers, 'solar:users-group-rounded-bold-duotone'),
      item('Messagerie', c.chat, 'solar:chat-round-dots-bold-duotone'),
    ],
  },
];

// ----------------------------------------------------------------------

const a = paths.admin;
export const adminNavData = [
  {
    subheader: 'Administration',
    items: [
      item('Tableau de bord', a.root, 'solar:home-smile-bold-duotone'),
      item('Utilisateurs', a.users, 'solar:users-group-two-rounded-bold-duotone'),
      item('Points à valider', a.points, 'solar:map-point-wave-bold-duotone'),
      item('Référentiels', a.catalog, 'solar:widget-5-bold-duotone'),
    ],
  },
  {
    subheader: 'Plateforme',
    items: [
      item('Carte', a.map, 'solar:map-bold-duotone'),
      item('Marché', a.marketplace, 'solar:shop-2-bold-duotone'),
      item('Messagerie', a.chat, 'solar:chat-round-dots-bold-duotone'),
    ],
  },
];
