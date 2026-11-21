import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { fNum, fQty, fDate, fMoney, priceOf, initials, fFromNow, unitLabel, ROLE_LABELS, quantityDiscountThreshold } from 'src/utils/clac';

import { t } from 'src/locales/i18n';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { ImageCarousel } from './image-carousel';
import { visualFor } from '../seller/components/product-card';
// ----------------------------------------------------------------------

export const KINDS = {
  product: { label: 'À vendre', color: 'primary', icon: 'solar:tag-price-bold' },
  request: { label: 'Demande d’achat', color: 'info', icon: 'solar:inbox-out-bold' },
  exchange: { label: 'Échange', color: 'warning', icon: 'solar:refresh-square-bold' },
};

export function Description({ text, max = 180 }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const long = text.length > max;
  return (
    <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
      {long && !open ? `${text.slice(0, max)}… ` : `${text} `}
      {long && (
        <Box component="span" onClick={() => setOpen((o) => !o)} sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer' }}>
          {open ? t('voir moins') : t('voir plus')}
        </Box>
      )}
    </Typography>
  );
}

function PostShell({ kind, person, place, date, badges, fresh, index, children, actions }) {
  const k = KINDS[kind];
  return (
    <Card
      component={m.article}
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 4) * 0.05 }}
      sx={{ overflow: 'hidden', ...(fresh && { outline: (theme) => `2px solid ${theme.vars.palette.primary.main}` }) }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2.5, py: 2 }}>
        <Avatar src={person?.avatar_url ?? undefined} sx={{ width: 46, height: 46, bgcolor: `${k.color}.main`, fontWeight: 700 }}>
          {initials(person?.company_name || person?.name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="subtitle1" noWrap>
              {person?.company_name || person?.name}
            </Typography>
            {person?.is_verified && <Iconify icon="solar:verified-check-bold" width={18} sx={{ color: 'info.main', flexShrink: 0 }} />}
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {person?.role && `${t(ROLE_LABELS[person.role])} · `}
            <Iconify icon="solar:map-point-bold" width={13} sx={{ mr: 0.25, verticalAlign: '-2px' }} />
            {place ? t(place) : '—'} · {fFromNow(date)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75}>
          {fresh && <Label color="primary" variant="filled">{t('Nouveau')}</Label>}
          {badges}
          <Label color={k.color} startIcon={<Iconify icon={k.icon} width={14} />}>
            {t(k.label)}
          </Label>
        </Stack>
      </Stack>
      {children}
      <Divider sx={{ borderStyle: 'dashed' }} />
      <Stack direction="row" spacing={1} sx={{ p: 1.5 }}>
        {actions}
      </Stack>
    </Card>
  );
}

const Action = ({ icon, children, primary, ...other }) => (
  <Button fullWidth color={primary ? 'primary' : 'inherit'} variant={primary ? 'contained' : 'text'} startIcon={<Iconify icon={icon} />} {...other}>
    {children}
  </Button>
);

function Stat({ label, value, sub, color }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>{label}</Typography>
      <Typography variant="subtitle1" sx={{ color }}>{value}</Typography>
      {sub}
    </Box>
  );
}

// ----------------------------------------------------------------------

export function ProductPost({ item: p, mine, canBuy, onContact, onDetail, onBuy, fresh, index }) {
  const { base, price, best, percent, bestPercent } = priceOf(p);
  const discountThreshold = p.quantity_discount_enabled ? quantityDiscountThreshold(p) : null;
  return (
    <PostShell kind="product" person={p.seller} place={p.gouvernorat} date={p.created_at} fresh={fresh} index={index} badges={mine && <Label color="info">{t('Votre produit')}</Label>}
      actions={
        <>
          {!mine && onContact && <Action icon="solar:chat-round-dots-bold-duotone" onClick={onContact}>{t('Contacter')}</Action>}
          <Action icon="solar:eye-bold-duotone" onClick={onDetail}>{t('Voir détail')}</Action>
          {!mine && canBuy && <Action primary icon="solar:cart-large-2-bold" onClick={onBuy}>{t('Acheter')}</Action>}
        </>
      }
    >
      <Box sx={{ position: 'relative' }}>
        <ImageCarousel product={p} height={440} onOpen={onDetail} />
        {percent > 0 && (
          <Box sx={{ position: 'absolute', top: 12, left: 12, px: 1.5, py: 0.5, borderRadius: 1, bgcolor: 'error.main', color: 'common.white', typography: 'subtitle1', boxShadow: 3 }}>
            -{percent}%
          </Box>
        )}
      </Box>
      <Stack spacing={1.5} sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
        <Stack direction="row" flexWrap="wrap" gap={0.75}>
          {p.category_name && <Chip size="small" color="primary" variant="soft" label={p.category_name} />}
          {p.market_name && <Chip size="small" variant="outlined" label={p.market_name} />}
          {p.available_until && <Chip size="small" variant="outlined" icon={<Iconify icon="solar:calendar-bold" width={14} />} label={t('Jusqu’au {{date}}', { date: fDate(p.available_until) })} />}
        </Stack>
        <Typography variant="h6">{p.title}</Typography>
        <Description text={p.description} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, p: 1.5, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
          <Stat
            label={t('Prix')}
            color="primary.dark"
            value={base != null ? `${fMoney(price)} / ${p.unit}` : t('Sur devis')}
            sub={percent > 0 && (
              <>
                <Typography variant="caption" sx={{ color: 'text.disabled', textDecoration: 'line-through', mr: 0.5 }}>
                  {fMoney(base)}
                </Typography>
                {bestPercent > percent && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {t('jusqu’à')} {fMoney(best)}
                  </Typography>
                )}
              </>
            )}
          />
          <Stat label={t('Disponible')} value={fQty(p.quantity_available, p.unit)} />
        </Box>
        {discountThreshold != null && (
          <Label color="success" startIcon={<Iconify icon="solar:tag-price-bold" width={14} />}>
            {t('Remise vendeur : -10 % au-delà de')} {fQty(discountThreshold, p.unit)} {t('· -15 % pour tout')}
          </Label>
        )}
      </Stack>
    </PostShell>
  );
}

// ----------------------------------------------------------------------

export function RequestPost({ item: r, mine, onContact, onDetail, fresh, index }) {
  return (
    <PostShell kind="request" person={r.buyer && { ...r.buyer, role: 'buyer' }} place={r.gouvernorat} date={r.created_at} fresh={fresh} index={index} badges={mine && <Label color="info">{t('Votre demande')}</Label>}
      actions={
        <>
          {!mine && onContact && <Action icon="solar:chat-round-dots-bold-duotone" onClick={onContact}>{t('Contacter')}</Action>}
          <Action icon="solar:eye-bold-duotone" onClick={onDetail}>{t('Voir détail')}</Action>
        </>
      }
    >
      <Box
        sx={{
          mx: 2.5,
          p: 3,
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
          color: 'common.white',
          background: (theme) => `linear-gradient(135deg, ${theme.vars.palette.info.dark}, ${theme.vars.palette.info.main})`,
        }}
      >
        <Iconify icon="solar:inbox-out-bold-duotone" width={120} sx={{ position: 'absolute', right: -16, bottom: -20, opacity: 0.18 }} />
        <Typography variant="overline" sx={{ opacity: 0.85 }}>{t('Je recherche')}</Typography>
        <Typography variant="h3" sx={{ lineHeight: 1.1 }}>{fQty(r.quantity, r.unit)}</Typography>
        <Typography variant="subtitle1" sx={{ opacity: 0.95 }}>{r.category_name ?? r.title}</Typography>
        {r.max_price_per_unit != null && (
          <Chip size="small" label={t('Prix max {{amount}} / {{unit}}', { amount: fMoney(r.max_price_per_unit), unit: r.unit })} sx={{ mt: 1.5, bgcolor: 'rgba(255,255,255,0.2)', color: 'common.white' }} />
        )}
      </Box>
      <Stack spacing={1.25} sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
        <Typography variant="h6">{r.title}</Typography>
        <Description text={r.description} />
        <Stack direction="row" flexWrap="wrap" gap={0.75}>
          {r.needed_by && <Chip size="small" variant="outlined" icon={<Iconify icon="solar:calendar-bold" width={14} />} label={t('Pour le {{date}}', { date: fDate(r.needed_by) })} />}
        </Stack>
      </Stack>
    </PostShell>
  );
}

// ----------------------------------------------------------------------

/** Visual "you bring X → you get Y". */
export function ExchangeRatio({ e, compact }) {
  const v = visualFor(e.wanted_category_slug);
  const Side = ({ title, qty, unit, label, icon, bg }) => (
    <Box sx={{ flex: 1, p: compact ? 1.5 : 2.5, borderRadius: 2, textAlign: 'center', bgcolor: bg, minWidth: 0 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>{title}</Typography>
      <Iconify icon={icon} width={compact ? 28 : 40} sx={{ display: 'block', mx: 'auto', my: 0.5, color: 'text.primary' }} />
      <Typography variant={compact ? 'h6' : 'h4'}>{fNum(qty)} {unitLabel(unit)}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
    </Box>
  );
  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Side title={t('Vous apportez')} qty={e.wanted_quantity} unit={e.wanted_unit} label={e.wanted_label} icon={v.icon} bg="warning.lighter" />
      <Box
        component={m.div}
        animate={{ rotate: [0, 180, 360] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        sx={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'warning.main', color: 'common.white', boxShadow: 3 }}
      >
        <Iconify icon="solar:refresh-bold" width={24} />
      </Box>
      <Side title={t('Vous recevez')} qty={e.given_quantity} unit={e.given_unit} label={e.given_label} icon="solar:gift-bold-duotone" bg="success.lighter" />
    </Stack>
  );
}

export function ExchangePost({ item: e, mine, canContact, onContact, onDetail, fresh, index }) {
  const progress = e.max_total_wanted ? Math.min((e.accepted_quantity / e.max_total_wanted) * 100, 100) : null;
  return (
    <PostShell kind="exchange" person={e.author} place={e.gouvernorat} date={e.created_at} fresh={fresh} index={index} badges={mine && <Label color="info">{t('Votre échange')}</Label>}
      actions={
        <>
          {!mine && canContact && <Action icon="solar:chat-round-dots-bold-duotone" onClick={onContact}>{t('Contacter')}</Action>}
          <Action icon="solar:eye-bold-duotone" onClick={onDetail}>{t('Voir détail')}</Action>
          {mine ? (
            <Action primary icon="solar:settings-bold" onClick={onDetail}>{t('Gérer ·')} {e.responses_count}</Action>
          ) : (
            <Action primary icon="solar:hand-shake-bold" onClick={onDetail} disabled={e.status !== 'active'}>
              {e.my_response_status ? t('Ma proposition') : t('Proposer')}
            </Action>
          )}
        </>
      }
    >
      {e.image_url && <Box component="img" src={e.image_url} alt="" onClick={onDetail} sx={{ width: 1, maxHeight: 360, objectFit: 'cover', cursor: 'pointer', display: 'block' }} />}
      <Box sx={{ px: 2.5, pt: e.image_url ? 2 : 0 }}>
        <ExchangeRatio e={e} />
      </Box>
      <Stack spacing={1.25} sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
        <Typography variant="h6">
          {fNum(e.wanted_quantity)} {unitLabel(e.wanted_unit)} {t('de')} {e.wanted_label.toLowerCase()} = {fNum(e.given_quantity)} {unitLabel(e.given_unit)} {e.given_label.toLowerCase()}
        </Typography>
        <Description text={e.description} />
        <Stack direction="row" flexWrap="wrap" gap={0.75}>
          {e.wanted_category_name && <Chip size="small" color="warning" variant="soft" label={e.wanted_category_name} />}
          {e.expires_at && <Chip size="small" variant="outlined" icon={<Iconify icon="solar:calendar-bold" width={14} />} label={t('Jusqu’au {{date}}', { date: fDate(e.expires_at) })} />}
          <Chip size="small" variant="outlined" icon={<Iconify icon="solar:users-group-rounded-bold" width={14} />} label={t('{{responses_count}} participant(s)', { responses_count: e.responses_count })} />
          {e.my_response_status && <Chip size="small" color="success" variant="soft" label={t('Vous participez')} />}
        </Stack>
        {progress !== null && (
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ typography: 'caption', color: 'text.secondary', mb: 0.5 }}>
              <span>{t('Collecté :')} {fNum(e.accepted_quantity)} / {fNum(e.max_total_wanted)} {unitLabel(e.wanted_unit)}</span>
              <span>{Math.round(progress)} %</span>
            </Stack>
            <LinearProgress variant="determinate" value={progress} color="warning" sx={{ height: 8, borderRadius: 4 }} />
          </Box>
        )}
      </Stack>
    </PostShell>
  );
}
