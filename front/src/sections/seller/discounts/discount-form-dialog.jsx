import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { useApi } from 'src/hooks/use-api';

import axios, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const Schema = zod
  .object({
    product_id: zod.string().min(1, { message: 'Choisissez un produit' }),
    title: zod.string().min(2, { message: 'Titre requis' }),
    description: zod.string().optional(),
    percentage: zod.coerce.number().gt(0, { message: '> 0' }).max(100, { message: '≤ 100' }),
    min_quantity: zod.union([zod.literal(''), zod.coerce.number().positive()]).optional(),
    starts_at: zod.string().min(1),
    ends_at: zod.string().min(1, { message: 'Date de fin requise' }),
    is_active: zod.boolean(),
  })
  .refine((d) => dayjs(d.ends_at).isAfter(dayjs(d.starts_at)), { message: 'La fin doit suivre le début', path: ['ends_at'] });

const fmt = (d) => dayjs(d).format('YYYY-MM-DDTHH:mm');

const toForm = (d, productId) => ({
  product_id: d?.product_id ?? productId ?? '',
  title: d?.title ?? '',
  description: d?.description ?? '',
  percentage: d?.percentage ?? 10,
  min_quantity: d?.min_quantity ?? '',
  starts_at: fmt(d?.starts_at ?? new Date()),
  ends_at: fmt(d?.ends_at ?? dayjs().add(30, 'day')),
  is_active: d?.is_active ?? true,
});

export function DiscountFormDialog({ open, onClose, discount, productId, onSaved }) {
  const [error, setError] = useState('');
  const { data: products } = useApi(endpoints.products.mine, { limit: 100 }, { skip: !open });

  const methods = useForm({ resolver: zodResolver(Schema), defaultValues: toForm(discount, productId) });
  const {
    reset,
    watch,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (open) {
      reset(toForm(discount, productId));
      setError('');
    }
  }, [open, discount, productId, reset]);

  const percentage = watch('percentage');
  const selected = (products ?? []).find((p) => p.id === watch('product_id'));

  const onSubmit = handleSubmit(async ({ product_id, min_quantity, starts_at, ends_at, ...rest }) => {
    try {
      const payload = {
        ...rest,
        min_quantity: min_quantity === '' ? null : min_quantity,
        starts_at: new Date(starts_at).toISOString(),
        ends_at: new Date(ends_at).toISOString(),
      };
      if (!rest.description) delete payload.description;
      const res = discount
        ? await axios.patch(endpoints.discounts.details(discount.id), payload)
        : await axios.post(endpoints.discounts.list, { ...payload, product_id });
      onSaved?.(res.data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  });

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Iconify icon="solar:tag-price-bold-duotone" width={28} sx={{ color: 'error.main' }} />
          {discount ? 'Modifier la remise' : 'Nouvelle remise'}
        </DialogTitle>
        <DialogContent>
          {!!error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <Field.Select
              name="product_id"
              label="Produit"
              disabled={!!discount}
              options={(products ?? []).map((p) => ({ value: p.id, label: p.title }))}
            />
            <Field.Text name="title" label="Titre de l’offre" placeholder="Ex : Remise volume campagne" />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <Field.Text name="percentage" label="Remise (%)" type="number" />
              <Field.Text name="min_quantity" label="Quantité minimum (optionnel)" type="number" />
              <Field.Text name="starts_at" label="Début" type="datetime-local" slotProps={{ inputLabel: { shrink: true } }} />
              <Field.Text name="ends_at" label="Fin" type="datetime-local" slotProps={{ inputLabel: { shrink: true } }} />
            </Box>
            <Field.Text name="description" label="Conditions (optionnel)" multiline rows={2} />
            <Field.Switch name="is_active" label="Remise active" />

            {selected?.price_per_unit != null && (
              <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'primary.lighter', color: 'primary.darker' }}>
                <Typography variant="subtitle2">Aperçu prix acheteur</Typography>
                <Typography variant="h5">
                  {(selected.price_per_unit * (1 - (Number(percentage) || 0) / 100)).toFixed(3)} TND
                  <Typography component="span" variant="body2" sx={{ ml: 1, textDecoration: 'line-through', opacity: 0.6 }}>
                    {selected.price_per_unit} TND
                  </Typography>
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Annuler
          </Button>
          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
            {discount ? 'Enregistrer' : 'Publier la remise'}
          </LoadingButton>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
