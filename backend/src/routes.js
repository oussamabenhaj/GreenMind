/** Mounts every module router under /api. */
import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import categoriesRoutes from './modules/categories/categories.routes.js';
import marketsRoutes from './modules/markets/markets.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import postsRoutes from './modules/posts/posts.routes.js';
import discountsRoutes from './modules/discounts/discounts.routes.js';
import requestsRoutes from './modules/requests/requests.routes.js';
import offersRoutes from './modules/offers/offers.routes.js';
import collectionPointsRoutes from './modules/collection-points/collection-points.routes.js';
import purchasesRoutes from './modules/purchases/purchases.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import mapRoutes from './modules/map/map.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import printRoutes from './modules/print/print.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import uploadsRoutes from './modules/uploads/uploads.routes.js';
import exchangesRoutes from './modules/exchanges/exchanges.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/categories', categoriesRoutes);
router.use('/markets', marketsRoutes);
router.use('/products', productsRoutes);
router.use('/posts', postsRoutes);
router.use('/discounts', discountsRoutes);
router.use('/requests', requestsRoutes);
router.use('/offers', offersRoutes);
router.use('/collection-points', collectionPointsRoutes); // + /:pointId/storage
router.use('/purchases', purchasesRoutes);
router.use('/conversations', chatRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/reports', reportsRoutes);
router.use('/map', mapRoutes);
router.use('/search', searchRoutes);
router.use('/print', printRoutes);
router.use('/admin', adminRoutes);
router.use('/uploads', uploadsRoutes);
router.use('/exchanges', exchangesRoutes);

export default router;
