import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const icon = (name) => <Iconify icon={name} width={24} />;

/**
 * `counter` = key of GET /api/users/me/counters shown as an info Label next to the item
 * (see layouts/nav-counters.jsx). `counterColor` overrides the default "info" color.
 */
const item = (title, path, iconName, counter, counterColor) => ({ title, path, icon: icon(iconName), counter, counterColor });

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
      item('Mes produits', s.products, 'solar:box-bold-duotone', 'products'),
      item('Ventes', s.purchases, 'solar:cart-large-4-bold-duotone', 'purchases', 'warning'),
    ],
  },
  {
    subheader: 'Opportunités',
    items: [
      item('Demandes reçues', s.requests, 'solar:inbox-in-bold-duotone', 'requests', 'success'),
      item('Offres à venir', s.offers, 'solar:calendar-mark-bold-duotone', 'offers'),
      item('Acheteurs', s.buyers, 'solar:users-group-rounded-bold-duotone', 'buyers'),
      item('Messagerie', s.chat, 'solar:chat-round-dots-bold-duotone', 'chat', 'error'),
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
      item('Mes demandes', b.requests, 'solar:inbox-out-bold-duotone', 'requests'),
      item('Offres des points', b.offers, 'solar:calendar-mark-bold-duotone', 'offers'),
    ],
  },
  {
    subheader: 'Réseau',
    items: [
      item('Vendeurs', b.sellers, 'solar:shop-2-bold-duotone', 'sellers'),
      item('Messagerie', b.chat, 'solar:chat-round-dots-bold-duotone', 'chat', 'error'),
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
      item('Points & horaires', c.points, 'solar:map-point-add-bold-duotone', 'points'),
      item('Stockage', c.storage, 'solar:box-bold-duotone', 'storage', 'warning'),
      item('Opérations d’achat', c.purchases, 'solar:cart-large-4-bold-duotone', 'purchases', 'warning'),
      item('Offres', c.offers, 'solar:calendar-mark-bold-duotone', 'offers'),
    ],
  },
  {
    subheader: 'Opportunités',
    items: [
      item('Demandes d’achat', c.requests, 'solar:inbox-in-bold-duotone', 'requests', 'success'),
      item('Vendeurs', c.sellers, 'solar:shop-2-bold-duotone', 'sellers'),
      item('Acheteurs', c.buyers, 'solar:users-group-rounded-bold-duotone', 'buyers'),
      item('Messagerie', c.chat, 'solar:chat-round-dots-bold-duotone', 'chat', 'error'),
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
      item('Utilisateurs', a.users, 'solar:users-group-two-rounded-bold-duotone', 'users'),
      item('Points à valider', a.points, 'solar:map-point-wave-bold-duotone', 'points', 'warning'),
      item('Référentiels', a.catalog, 'solar:widget-5-bold-duotone', 'catalog'),
    ],
  },
  {
    subheader: 'Plateforme',
    items: [
      item('Carte', a.map, 'solar:map-bold-duotone'),
      item('Messagerie', a.chat, 'solar:chat-round-dots-bold-duotone', 'chat', 'error'),
    ],
  },
];
