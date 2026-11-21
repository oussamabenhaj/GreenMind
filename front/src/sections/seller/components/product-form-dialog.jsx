import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useRef, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { fQty, UNITS, unitLabel } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import axios, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { TranslationNotice } from 'src/components/clac/translation-notice';

import { useAuthContext } from 'src/auth/hooks';

import { useReferenceData } from './ui';
import { ImageUploader } from './image-uploader';
import { LocationPicker } from './location-picker';
// ----------------------------------------------------------------------

const optionalNumber = zod.union([zod.literal(''), zod.coerce.number().min(0)]).optional();

const Schema = zod
  .object({
    title: zod.string().min(2, { message: 'Titre requis (2 caractères min.)' }),
    description: zod.string().optional(),
    category_id: zod.coerce.number({ invalid_type_error: 'Catégorie requise' }).min(1, { message: 'Catégorie requise' }),
    market_id: zod.union([zod.literal(''), zod.coerce.number()]).optional(),
    unit: zod.enum(['kg', 't', 'l', 'unit']),
    quantity_available: zod.coerce.number().min(0, { message: 'Quantité ≥ 0' }),
    price_per_unit: optionalNumber,
    quantity_discount_enabled: zod.boolean(),
    gouvernorat: zod.string().min(1, { message: 'Choisissez une localisation' }),
    address: zod.string().optional(),
    lat: zod.number().nullable(),
    lng: zod.number().nullable(),
    available_from: zod.any().nullable(),
    available_until: zod.any().nullable(),
    images: zod.array(zod.string()).max(3),
    is_active: zod.boolean(),
  })
  .refine((d) => !d.available_from || !d.available_until || !dayjs(d.available_until).isBefore(dayjs(d.available_from), 'day'), {
    message: 'La fin doit être après le début',
    path: ['available_until'],
  });

const toForm = (p, user) => ({
  title: p?.title ?? '',
  description: p?.description ?? '',
  category_id: p?.category_id ?? '',
  market_id: p?.market_id ?? '',
  unit: p?.unit ?? 'kg',
  quantity_available: p?.quantity_available ?? '',
  price_per_unit: p?.price_per_unit ?? '',
  quantity_discount_enabled: p?.quantity_discount_enabled ?? false,
  gouvernorat: p?.gouvernorat ?? user?.gouvernorat ?? '',
  address: p?.address ?? user?.address ?? '',
  lat: p?.lat ?? user?.lat ?? null,
  lng: p?.lng ?? user?.lng ?? null,
  available_from: p?.available_from ? dayjs(p.available_from) : null,
  available_until: p?.available_until ? dayjs(p.available_until) : null,
  images: p?.images ?? [],
  is_active: p?.is_active ?? true,
});

function toPayload(v) {
  const nullable = (x) => (x === '' || x === undefined ? null : x);
  return {
    title: v.title,
    description: v.description || undefined,
    category_id: v.category_id,
    market_id: nullable(v.market_id),
    unit: v.unit,
    quantity_available: v.quantity_available,
    price_per_unit: nullable(v.price_per_unit),
    quantity_discount_enabled: v.quantity_discount_enabled,
    gouvernorat: v.gouvernorat,
    address: v.address || undefined,
    ...(v.lat != null && v.lng != null && { lat: v.lat, lng: v.lng }),
    available_from: v.available_from ? dayjs(v.available_from).format('YYYY-MM-DD') : null,
    available_until: v.available_until ? dayjs(v.available_until).format('YYYY-MM-DD') : null,
    images: v.images,
    is_active: v.is_active,
  };
}

const fileOf = (url) => url.split('/').pop();
const deleteUploads = (urls) => Promise.allSettled(urls.map((u) => axios.delete(endpoints.uploads.remove(fileOf(u)))));

function Section({ icon, title, subtitle, children }) {
  return (
    <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.lighter', color: 'primary.dark' }}>
          <Iconify icon={icon} width={20} />
        </Box>
        <Box>
          <Typography variant="subtitle1">{title}</Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      {children}
    </Card>
  );
}

const SHORTCUTS = [
  { label: '+ 1 mois', getValue: () => dayjs().add(1, 'month') },
  { label: '+ 3 mois', getValue: () => dayjs().add(3, 'month') },
  { label: '+ 6 mois', getValue: () => dayjs().add(6, 'month') },
  { label: 'Fin de campagne (31 mars)', getValue: () => (dayjs().month() > 2 ? dayjs().add(1, 'year') : dayjs()).month(2).date(31) },
  { label: 'Fin d’année', getValue: () => dayjs().endOf('year') },
];

// ----------------------------------------------------------------------

export function ProductFormDialog({ open, onClose, product, onSaved }) {
  const { user } = useAuthContext();
  const { categories, markets } = useReferenceData();
  const [error, setError] = useState('');
  const sessionUploads = useRef([]);

  const methods = useForm({ resolver: zodResolver(Schema), defaultValues: toForm(product, user) });
  const {
    reset,
    watch,
    control,
    setValue,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = methods;

  useEffect(() => {
    if (open) {
      reset(toForm(product, user));
      setError('');
      sessionUploads.current = [];
    }
  }, [open, product, user, reset]);

  const values = watch();
  const discountThreshold = Number(values.quantity_available) > 0
    ? Number((Number(values.quantity_available) / 2).toFixed(2))
    : null;

  /** Closing without saving removes the files uploaded during this session. */
  const cancel = () => {
    deleteUploads(sessionUploads.current);
    sessionUploads.current = [];
    onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    try {
      const payload = toPayload(v);
      const res = product
        ? await axios.patch(endpoints.products.details(product.id), payload)
        : await axios.post(endpoints.products.list, payload);
      // uploaded then removed before saving → delete from the server
      // + images removed from an existing product (only files hosted in /upload/)
      const previous = (product?.images ?? []).filter((u) => u.includes('/upload/'));
      deleteUploads([...sessionUploads.current, ...previous].filter((u) => !v.images.includes(u)));
      sessionUploads.current = [];
      onSaved?.(res.data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  });

  return (
    <Dialog fullWidth maxWidth="lg" open={open} onClose={cancel} PaperProps={{ sx: { borderRadius: 2.5 } }}>
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 2 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'common.white', background: (theme) => `linear-gradient(135deg, ${theme.vars.palette.primary.light}, ${theme.vars.palette.primary.dark})` }}>
            <Iconify icon="solar:box-bold-duotone" width={26} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">{product ? t('Modifier le produit') : t('Publier une nouvelle matière')}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('Les acheteurs intéressés par la catégorie sont notifiés en temps réel.')}
            </Typography>
          </Box>

          {/* visibility switch — top right */}
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                onClick={() => field.onChange(!field.value)}
                sx={{
                  pl: 1.5,
                  pr: 0.5,
                  py: 0.5,
                  borderRadius: 5,
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all .2s',
                  border: (theme) => `1px solid ${field.value ? theme.vars.palette.success.main : theme.vars.palette.divider}`,
                  bgcolor: field.value ? 'success.lighter' : 'background.neutral',
                }}
              >
                <Iconify icon={field.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} sx={{ color: field.value ? 'success.dark' : 'text.disabled' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ color: field.value ? 'success.darker' : 'text.secondary', lineHeight: 1.2 }}>
                    {field.value ? t('Visible sur le marché') : t('Masqué')}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled', display: { xs: 'none', sm: 'block' }, lineHeight: 1.2 }}>
                    {field.value ? t('Les acheteurs le voient') : t('Brouillon privé')}
                  </Typography>
                </Box>
                <Switch checked={field.value} color="success" onClick={(e) => e.stopPropagation()} onChange={(e) => field.onChange(e.target.checked)} />
              </Stack>
            )}
          />
          <IconButton onClick={cancel}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ bgcolor: 'background.neutral', pt: '20px !important' }}>
        <TranslationNotice item={product} fields={['title', 'description']} />
          {!!error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, alignItems: 'start' }}>
            {/* ---------- left column ---------- */}
            <Stack spacing={2.5}>
              <Section icon="solar:document-text-bold-duotone" title={t('Informations')}>
                <Stack spacing={2}>
                  <Field.Text name="title" label={t('Titre')} placeholder={t('Ex : Grignons d’olive frais — campagne 2026')} />
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                    <Field.Select name="category_id" label={t('Catégorie')} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
                    <Field.Select name="market_id" label={t('Marché')} options={[{ value: '', label: t('Aucun') }, ...markets.map((mk) => ({ value: mk.id, label: mk.name }))]} />
                  </Box>
                  <Field.Text name="description" label={t('Description')} multiline rows={3} placeholder={t('État, humidité, conditionnement, fréquence de disponibilité…')} />
                </Stack>
              </Section>

              <Section icon="solar:wallet-money-bold-duotone" title={t('Quantité & prix')}>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                  <Field.Text
                    name="quantity_available"
                    label={t('Quantité disponible')}
                    type="number"
                    slotProps={{ input: { endAdornment: <InputAdornment position="end">{unitLabel(values.unit)}</InputAdornment> } }}
                  />
                  <Field.Select name="unit" label={t('Unité')} options={UNITS.map((u) => ({ ...u, label: t(u.label) }))} />
                  <Field.Text
                    name="price_per_unit"
                    label={t('Prix / unité')}
                    type="number"
                    inputProps={{ step: '0.001' }}
                    slotProps={{ input: { endAdornment: <InputAdornment position="end">{t('TND')}</InputAdornment> } }}
                  />
                </Box>
                <Controller
                  name="quantity_discount_enabled"
                  control={control}
                  render={({ field }) => (
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      onClick={() => field.onChange(!field.value)}
                      sx={{
                        mt: 2,
                        p: 1.5,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        userSelect: 'none',
                        border: (theme) => `1px solid ${field.value ? theme.vars.palette.success.main : theme.vars.palette.divider}`,
                        bgcolor: field.value ? 'success.lighter' : 'background.paper',
                      }}
                    >
                      <Iconify
                        icon="solar:tag-price-bold-duotone"
                        width={24}
                        sx={{ color: field.value ? 'success.dark' : 'text.disabled' }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2">{t('Remise quantité')}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {discountThreshold != null
                            ? t('-10 % dès {{qty}} (plus de la moitié du stock), -15 % pour toute la quantité.', { qty: fQty(discountThreshold, values.unit) })
                            : t('Remise automatique sur les grosses commandes : -10 % au-delà de la moitié du stock, -15 % pour tout.')}
                        </Typography>
                      </Box>
                      <Switch
                        checked={!!field.value}
                        color="success"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => field.onChange(e.target.checked)}
                        inputProps={{ 'aria-label': t('Activer la remise quantité') }}
                      />
                    </Stack>
                  )}
                />
              </Section>

              <Section icon="solar:calendar-bold-duotone" title={t('Disponibilité')} subtitle={t('Période pendant laquelle la matière peut être enlevée')}>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                  <Controller
                    name="available_from"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label={t('Disponible à partir du')}
                        value={field.value}
                        onChange={field.onChange}
                        format="DD MMM YYYY"
                        slotProps={{ textField: { fullWidth: true }, field: { clearable: true } }}
                      />
                    )}
                  />
                  <Controller
                    name="available_until"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label={t('Disponible jusqu’au')}
                        value={field.value}
                        onChange={field.onChange}
                        format="DD MMM YYYY"
                        disablePast
                        minDate={values.available_from ?? undefined}
                        slotProps={{
                          textField: { fullWidth: true, error: !!errors.available_until, helperText: t(errors.available_until?.message) },
                          field: { clearable: true },
                          shortcuts: {
                            items: SHORTCUTS.map((s) => ({ ...s, label: t(s.label) })),
                            changeImportance: 'accept',
                            sx: { '& .MuiChip-root': { bgcolor: 'primary.lighter', color: 'primary.darker', fontWeight: 600, '&:hover': { bgcolor: 'primary.light', color: 'common.white' } } },
                          },
                          layout: { sx: { '& .MuiPickersDay-root.Mui-selected': { bgcolor: 'primary.main' } } },
                          actionBar: { actions: ['clear', 'today', 'accept'] },
                        }}
                      />
                    )}
                  />
                </Box>
                {values.available_until && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                    {t('⏳ Visible encore')} {Math.max(dayjs(values.available_until).diff(dayjs(), 'day'), 0)} {t('jour(s)')}
                  </Typography>
                )}
              </Section>
            </Stack>

            {/* ---------- right column ---------- */}
            <Stack spacing={2.5}>
              <Section icon="solar:gallery-bold-duotone" title={t('Photos')} subtitle={t('Jusqu’à 3 images — stockées sur le serveur CLAC')}>
                <ImageUploader
                  value={values.images}
                  max={3}
                  onUploaded={(urls) => sessionUploads.current.push(...urls)}
                  onChange={(urls) => setValue('images', urls, { shouldDirty: true })}
                />
              </Section>

              <Section icon="solar:map-point-wave-bold-duotone" title={t('Localisation')} subtitle={t('Recherchez une adresse ou cliquez sur la carte')}>
                <LocationPicker
                  value={{ lat: values.lat, lng: values.lng, address: values.address, gouvernorat: values.gouvernorat }}
                  onChange={(patch) => Object.entries(patch).forEach(([k, val]) => val !== undefined && setValue(k, val, { shouldValidate: k === 'gouvernorat' }))}
                />
                {errors.gouvernorat && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                    {t(errors.gouvernorat.message)}
                  </Typography>
                )}
              </Section>
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="outlined" color="inherit" onClick={cancel}>
            {t('Annuler')}
          </Button>
          <LoadingButton type="submit" size="large" variant="contained" loading={isSubmitting} startIcon={<Iconify icon="solar:check-circle-bold" />}>
            {product ? t('Enregistrer') : t('Publier')}
          </LoadingButton>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
