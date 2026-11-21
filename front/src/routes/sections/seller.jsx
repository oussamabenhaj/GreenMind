import { Outlet } from 'react-router';
import { lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';

import { DashboardLayout } from 'src/layouts/dashboard';
import { useNavWithCounters } from 'src/layouts/nav-counters';
import { adminNavData, buyerNavData, sellerNavData, collectorNavData } from 'src/layouts/nav-config-seller';

import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard, RoleBasedGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

const view = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));

const V = {
  // seller
  SellerDashboard: view(() => import('src/sections/seller/dashboard/view'), 'SellerDashboardView'),
  Products: view(() => import('src/sections/seller/products/view'), 'ProductsView'),
  SellerPurchases: view(() => import('src/sections/seller/purchases/view'), 'PurchasesView'),
  Reports: view(() => import('src/sections/seller/reports/view'), 'ReportsView'),
  // shared
  ProductDetails: view(() => import('src/sections/seller/products/details-view'), 'ProductDetailsView'),
  Market: view(() => import('src/sections/market/view'), 'MarketView'),
  Marketplace: view(() => import('src/sections/seller/marketplace/view'), 'MarketplaceView'),
  RequestsReceived: view(() => import('src/sections/seller/requests/view'), 'RequestsView'),
  Offers: view(() => import('src/sections/seller/offers/view'), 'OffersView'),
  Buyers: view(() => import('src/sections/seller/buyers/view'), 'BuyersView'),
  Sellers: view(() => import('src/sections/seller/buyers/view'), 'SellersView'),
  Chat: view(() => import('src/sections/seller/chat/view'), 'ChatView'),
  Map: view(() => import('src/sections/seller/map/view'), 'MapView'),
  Notifications: view(() => import('src/sections/seller/notifications/view'), 'NotificationsView'),
  Profile: view(() => import('src/sections/seller/profile/view'), 'ProfileView'),
  // buyer
  BuyerDashboard: view(() => import('src/sections/buyer/dashboard/view'), 'BuyerDashboardView'),
  BuyerRequests: view(() => import('src/sections/buyer/requests/view'), 'BuyerRequestsView'),
  // collector
  CollectorDashboard: view(() => import('src/sections/collector/dashboard/view'), 'CollectorDashboardView'),
  Points: view(() => import('src/sections/collector/points/view'), 'PointsView'),
  Storage: view(() => import('src/sections/collector/storage/view'), 'StorageView'),
  CollectorPurchases: view(() => import('src/sections/collector/purchases/view'), 'CollectorPurchasesView'),
  CollectorOffers: view(() => import('src/sections/collector/offers/view'), 'CollectorOffersView'),
  // admin
  AdminDashboard: view(() => import('src/sections/admin/view'), 'AdminDashboardView'),
  AdminUsers: view(() => import('src/sections/admin/view'), 'AdminUsersView'),
  AdminPoints: view(() => import('src/sections/admin/view'), 'AdminPointsView'),
  AdminCatalog: view(() => import('src/sections/admin/view'), 'AdminCatalogView'),
};

const COMMON = [
  ['market', 'Market', V.Market],
  ['marketplace', 'Marché', V.Marketplace],
  ['products/:id', 'Produit', V.ProductDetails],
  ['chat', 'Messagerie', V.Chat],
  ['map', 'Carte', V.Map],
  ['notifications', 'Notifications', V.Notifications],
  ['profile', 'Mon profil', V.Profile],
];

/** One protected space per role: [path, page title, view]. */
const SPACES = [
  {
    role: 'seller',
    label: 'Vendeur',
    nav: sellerNavData,
    pages: [
      ['', 'Tableau de bord', V.SellerDashboard],
      ['products', 'Mes produits', V.Products],
      ['requests', 'Demandes reçues', V.RequestsReceived],
      ['offers', 'Offres à venir', V.Offers],
      ['purchases', 'Ventes', V.SellerPurchases],
      ['buyers', 'Acheteurs', V.Buyers],
      ['reports', 'Statistiques', V.Reports],
    ],
  },
  {
    role: 'buyer',
    label: 'Acheteur',
    nav: buyerNavData,
    pages: [
      ['', 'Tableau de bord', V.BuyerDashboard],
      ['requests', 'Mes demandes', V.BuyerRequests],
      ['offers', 'Offres', V.Offers],
      ['sellers', 'Vendeurs', V.Sellers],
    ],
  },
  {
    role: 'collector',
    label: 'Point de collecte',
    nav: collectorNavData,
    pages: [
      ['', 'Tableau de bord', V.CollectorDashboard],
      ['points', 'Points de collecte', V.Points],
      ['storage', 'Stockage', V.Storage],
      ['purchases', 'Opérations d’achat', V.CollectorPurchases],
      ['offers', 'Offres', V.CollectorOffers],
      ['requests', 'Demandes d’achat', V.RequestsReceived],
      ['sellers', 'Vendeurs', V.Sellers],
      ['buyers', 'Acheteurs', V.Buyers],
    ],
  },
  {
    role: 'admin',
    label: 'Admin',
    nav: adminNavData,
    pages: [
      ['', 'Administration', V.AdminDashboard],
      ['users', 'Utilisateurs', V.AdminUsers],
      ['points', 'Points à valider', V.AdminPoints],
      ['catalog', 'Référentiels', V.AdminCatalog],
    ],
  },
];

const page = (title, label, Component) => (
  <>
    <Helmet>
      <title>{`${title} · CLAC ${label}`}</title>
    </Helmet>
    <Component />
  </>
);

/** Dashboard layout whose sidebar items show live counters (my products 20, 99+…). */
function SpaceLayout({ nav, children }) {
  const data = useNavWithCounters(nav);
  return <DashboardLayout slotProps={{ nav: { data } }}>{children}</DashboardLayout>;
}

export const spaceRoutes = SPACES.map(({ role, label, nav, pages }) => ({
  path: role,
  element: (
    <AuthGuard>
      <SpaceLayout nav={nav}>
        <RoleBasedGuard acceptRoles={[role]}>
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </RoleBasedGuard>
      </SpaceLayout>
    </AuthGuard>
  ),
  children: [...pages, ...COMMON].map(([path, title, Component]) =>
    path === '' ? { index: true, element: page(title, label, Component) } : { path, element: page(title, label, Component) }
  ),
}));
