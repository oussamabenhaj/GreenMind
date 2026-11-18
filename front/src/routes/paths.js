// ----------------------------------------------------------------------

const ROOTS = {
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  SELLER: '/seller',
};

// ----------------------------------------------------------------------

/** Page paths of one role space. */
export function space(root) {
  return {
    root,
    market: `${root}/market`,
    marketplace: `${root}/marketplace`,
    products: `${root}/products`,
    product: (id) => `${root}/products/${id}`,
    requests: `${root}/requests`,
    discounts: `${root}/discounts`,
    offers: `${root}/offers`,
    purchases: `${root}/purchases`,
    buyers: `${root}/buyers`,
    sellers: `${root}/sellers`,
    chat: `${root}/chat`,
    map: `${root}/map`,
    reports: `${root}/reports`,
    notifications: `${root}/notifications`,
    profile: `${root}/profile`,
    points: `${root}/points`,
    storage: `${root}/storage`,
    users: `${root}/users`,
    catalog: `${root}/catalog`,
  };
}

export const paths = {
  faqs: '/faqs',
  comingSoon: '/coming-soon',
  // ROLE SPACES (same page keys under /seller, /buyer, /collector, /admin)
  seller: space('/seller'),
  buyer: space('/buyer'),
  collector: space('/collector'),
  admin: space('/admin'),

  minimalStore: 'https://mui.com/store/items/minimal-dashboard/',
  // AUTH
  auth: {
    amplify: {
      signIn: `${ROOTS.AUTH}/amplify/sign-in`,
      verify: `${ROOTS.AUTH}/amplify/verify`,
      signUp: `${ROOTS.AUTH}/amplify/sign-up`,
      updatePassword: `${ROOTS.AUTH}/amplify/update-password`,
      resetPassword: `${ROOTS.AUTH}/amplify/reset-password`,
    },
    jwt: {
      signIn: `${ROOTS.AUTH}/jwt/sign-in`,
      signUp: `${ROOTS.AUTH}/jwt/sign-up`,
    },
    firebase: {
      signIn: `${ROOTS.AUTH}/firebase/sign-in`,
      verify: `${ROOTS.AUTH}/firebase/verify`,
      signUp: `${ROOTS.AUTH}/firebase/sign-up`,
      resetPassword: `${ROOTS.AUTH}/firebase/reset-password`,
    },
    auth0: {
      signIn: `${ROOTS.AUTH}/auth0/sign-in`,
    },
    supabase: {
      signIn: `${ROOTS.AUTH}/supabase/sign-in`,
      verify: `${ROOTS.AUTH}/supabase/verify`,
      signUp: `${ROOTS.AUTH}/supabase/sign-up`,
      updatePassword: `${ROOTS.AUTH}/supabase/update-password`,
      resetPassword: `${ROOTS.AUTH}/supabase/reset-password`,
    },
  },
  // DASHBOARD
  dashboard: {
    root: ROOTS.DASHBOARD,
    two: `${ROOTS.DASHBOARD}/two`,
    three: `${ROOTS.DASHBOARD}/three`,
    components: `${ROOTS.DASHBOARD}/components`,
    group: {
      root: `${ROOTS.DASHBOARD}/group`,
      five: `${ROOTS.DASHBOARD}/group/five`,
      six: `${ROOTS.DASHBOARD}/group/six`,
    },
  },
};
