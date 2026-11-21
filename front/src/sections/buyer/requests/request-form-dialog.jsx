import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import {
  fQty, UNITS, fMoney, GOVERNORATES, quantityDiscountedPrice, quantityDiscountThreshold, quantityDiscountPercentage,
  QUANTITY_DISCOUNT_PERCENTAGE, FULL_QUANTITY_DISCOUNT_PERCENTAGE,
} from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import axios, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { TranslationNotice } from 'src/components/clac/translation-notice';

import { useAuthContext } from 'src/auth/hooks';

import { TierHint, useReferenceData } from '../../seller/components/ui';

// ----------------------------------------------------------------------

const optional = zod.union([zod.literal(''), zod.coerce.number().min(0)]).optional();

const Schema = zod.object({
  title: zod.string().min(3, { message: 'Décrivez votre besoin (3 caractères min.)' }),
  description: zod.string().optional(),
  category_id: zod.union([zod.literal(''), zod.coerce.number()]),
  market_id: zod.union([zod.literal(''), zod.coerce.number()]).optional(),
  quantity: zod.coerce.number().positive({ message: 'Quantité > 0' }),
  unit: zod.enum(['kg', 't', 'l', 'unit']),
  max_price_per_unit: optional,
  gouvernorat: zod.string().optional(),
  needed_by: zod.string().min(1, { message: 'Choisissez une date de besoin' }),
});

const toForm = (r, product, user) => ({
  title: r?.title ?? (product ? t('Achat : {{title}}', { title: product.title }) : ''),
  description: r?.description ?? '',
  category_id: r?.category_id ?? product?.category_id ?? '',
  market_id: r?.market_id ?? product?.market_id ?? '',
  quantity: r?.quantity ?? '',
  unit: r?.unit ?? product?.unit ?? 'kg',
  max_price_per_unit: r?.max_price_per_unit ?? product?.final_price_per_unit ?? '',
  gouvernorat: r?.gouvernorat ?? user?.gouvernorat ?? '',
  needed_by: r?.needed_by ? String(r.needed_by).slice(0, 10) : '',
});

/** US-B03 — create / edit a purchase request (optionally about one product). */
export function RequestFormDialog({ open, onClose, request, product, discountProduct, onSaved }) {
  const { user } = useAuthContext();
  const { categories, markets } = useReferenceData();
  const [error, setError] = useState('');

  const methods = useForm({ resolver: zodResolver(Schema), defaultValues: toForm(request, product, user) });
  const {
    reset,
    watch,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const quantity = watch('quantity');
  const unit = watch('unit');
  // The edited request has no product object: the listing it targets is fetched separately.
  const listing = product ?? discountProduct;
  const discountEnabled = !!listing?.quantity_discount_enabled;
  const discountThreshold = discountEnabled ? quantityDiscountThreshold(listing) : null;
  const discountPercentage = quantityDiscountPercentage(listing, quantity, unit);
  const discountedPrice = quantityDiscountedPrice(listing, discountPercentage || QUANTITY_DISCOUNT_PERCENTAGE);

  useEffect(() => {
    if (open) {
      reset(toForm(request, product, user));
      setError('');
    }
  }, [open, request, product, user, reset]);


  const onSubmit = handleSubmit(async (v) => {
    const nullable = (x) => (x === '' || x === undefined ? null : x);
    const payload = {
      title: v.title,
      description: v.description || undefined,
      quantity: v.quantity,
      unit: v.unit,
      max_price_per_unit: nullable(v.max_price_per_unit),
      market_id: nullable(v.market_id),
      needed_by: v.needed_by,
      ...(v.category_id !== '' && { category_id: v.category_id }),
      ...(v.gouvernorat && { gouvernorat: v.gouvernorat }),
    };
    try {
      if (!request && !product && v.category_id === '') throw new Error(t('Choisissez une catégorie'));
      const res = request
        ? await axios.patch(endpoints.requests.details(request.id), payload)
        : await axios.post(endpoints.requests.list, { ...payload, ...(product && { product_id: product.id }) });
      onSaved?.(res.data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  });

  return (
    <Dialog fullWidth maxWidth="md" open={open} onClose={onClose}>
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Iconify icon="solar:inbox-out-bold-duotone" width={28} sx={{ color: 'primary.main' }} />
          {request ? t('Modifier ma demande') : t('Nouvelle demande d’achat')}
        </DialogTitle>
        <DialogContent>
        <TranslationNotice item={request} fields={['title', 'description']} />
          {product && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('Demande adressée directement à')} <b>{product.seller?.company_name || product.seller?.name}</b> {t('pour «')} {product.title} ».
            </Alert>
          )}
          {!product && !request && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {t('Tous les vendeurs et points de collecte de la catégorie choisie seront notifiés en temps réel.')}
            </Typography>
          )}
          {!!error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <Field.Text name="title" label={t('Votre besoin')} placeholder={t('Ex : 2 tonnes de grignons par mois pour compostage')} />
            <Field.Text name="description" label={t('Détails (qualité, fréquence, conditionnement…)')} multiline rows={3} />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' } }}>
              <Field.Select
                name="category_id"
                label={t('Catégorie')}
                disabled={!!product}
                options={[{ value: '', label: '—' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
              />
              <Field.Text name="quantity" label={t('Quantité')} type="number" />
              <Field.Select name="unit" label={t('Unité')} options={UNITS.map((u) => ({ ...u, label: t(u.label) }))} />
              <Field.Text name="max_price_per_unit" label={t('Prix max / unité (TND)')} type="number" inputProps={{ step: '0.001' }} />
              <Field.Select name="gouvernorat" label={t('Livraison à')} options={[{ value: '', label: '—' }, ...GOVERNORATES.map((g) => ({ value: g, label: t(g) }))]} />
              <Field.Select name="market_id" label={t('Marché')} options={[{ value: '', label: t('Aucun') }, ...markets.map((mk) => ({ value: mk.id, label: mk.name }))]} />
              <Field.Text required name="needed_by" label={t('Besoin pour le')} type="date" slotProps={{ inputLabel: { shrink: true } }} />
            </Box>
            {discountEnabled && discountThreshold != null && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: discountPercentage ? 'success.light' : 'divider',
                  bgcolor: discountPercentage ? 'success.lighter' : 'background.neutral',
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Iconify
                    icon="solar:tag-price-bold-duotone"
                    width={26}
                    sx={{ color: discountPercentage ? 'success.dark' : 'text.disabled' }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2">{t('Remise quantité du vendeur')}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {discountPercentage
                        ? t('Remise de {{discountPercentage}} % appliquée automatiquement : prix maximum {{amount}} / {{unit}}.', { discountPercentage, amount: fMoney(discountedPrice), unit })
                        : t('-{{QUANTITY_DISCOUNT_PERCENTAGE}} % pour toute commande au-delà de {{qty}}, -{{FULL_QUANTITY_DISCOUNT_PERCENTAGE}} % pour la quantité totale.', { QUANTITY_DISCOUNT_PERCENTAGE, qty: fQty(discountThreshold, listing.unit), FULL_QUANTITY_DISCOUNT_PERCENTAGE })}
                    </Typography>
                  </Box>
                  {!!discountPercentage && (
                    <Typography variant="h6" sx={{ color: 'success.dark' }}>
                      -{discountPercentage} %
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}
            <TierHint product={product} quantity={quantity} unit={unit} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            {t('Annuler')}
          </Button>
          <LoadingButton type="submit" variant="contained" loading={isSubmitting} startIcon={<Iconify icon="solar:plain-bold" />}>
            {request ? t('Enregistrer') : t('Envoyer la demande')}
          </LoadingButton>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
