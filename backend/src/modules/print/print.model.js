/**
 * Print has no table of its own: it reads documents through the services of
 * the owning modules, which also enforce access rights ("selon les droits").
 */
export { getById as getProduct } from '../products/products.service.js';
export { getById as getOffer } from '../offers/offers.service.js';
export { getById as getRequest } from '../requests/requests.service.js';
export { getById as getPurchase } from '../purchases/purchases.service.js';
export { getOverview as getStorage } from '../storage/storage.service.js';
export { getById as getCollectionPoint } from '../collection-points/collection-points.service.js';
