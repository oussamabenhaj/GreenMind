import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { useApi, cleanParams } from 'src/hooks/use-api';

import { fQty, fDate, fMoney, initials, fFromNow, ROLE_LABELS, REQUEST_STATUS, RESPONSE_STATUS } from 'src/utils/clac';

import { useSocketEvent } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { RequestFormDialog } from './request-form-dialog';
import { openConversation } from '../../seller/components/contact';
import { printDocument } from '../../seller/components/print-button';
import { Empty, PageHeader, StatusLabel, ListSkeleton, PagePagination } from '../../seller/components/ui';

// ----------------------------------------------------------------------

function ResponseCard({ res, request, onDecide }) {
  const router = useRouter();
  const open = ['open', 'in_progress'].includes(request.status);
  return (
    <Card variant="outlined" sx={{ p: 2, ...(res.status === 'accepted' && { borderColor: 'success.main', bgcolor: 'success.lighter' }) }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.dark' }}>{initials(res.responder.company_name || res.responder.name)}</Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {res.responder.company_name || res.responder.name}
            {res.responder.is_verified && <Iconify icon="solar:verified-check-bold" width={16} sx={{ color: 'info.main', ml: 0.5, verticalAlign: 'middle' }} />}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {ROLE_LABELS[res.responder.role]} · {fFromNow(res.created_at)}
          </Typography>
        </Box>
        <StatusLabel map={RESPONSE_STATUS} value={res.status} />
      </Stack>
      <Stack direction="row" spacing={3} sx={{ my: 1.5 }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Quantité proposée
          </Typography>
          <Typography variant="subtitle2">{res.proposed_quantity != null ? fQty(res.proposed_quantity, request.unit) : '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Prix / {request.unit}
          </Typography>
          <Typography variant="subtitle2">{fMoney(res.proposed_price_per_unit)}</Typography>
        </Box>
        {res.product_title && (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Produit
            </Typography>
            <Typography variant="subtitle2" noWrap>
              {res.product_title}
            </Typography>
          </Box>
        )}
      </Stack>
      {res.message && (
        <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line', mb: 1.5 }}>
          « {res.message} »
        </Typography>
      )}
      <Stack direction="row" spacing={1}>
        {open && res.status === 'pending' && (
          <>
            <Button size="small" variant="contained" color="success" onClick={() => onDecide(res, 'accepted')} startIcon={<Iconify icon="eva:checkmark-fill" />}>
              Accepter
            </Button>
            <Button size="small" variant="soft" color="error" onClick={() => onDecide(res, 'rejected')}>
              Refuser
            </Button>
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          startIcon={<Iconify icon="solar:chat-round-dots-bold" />}
          onClick={async () => router.push(await openConversation(res.responder_id, { body: `Bonjour, au sujet de votre proposition pour « ${request.title} ».`, context_type: 'request', context_id: request.id }))}
        >
          Discuter
        </Button>
      </Stack>
    </Card>
  );
}

function RequestDrawer({ id, onClose, onChanged }) {
  const { data: r, reload } = useApi(id ? endpoints.requests.details(id) : null);
  const [edit, setEdit] = useState(false);

  useSocketEvent('notification:new', (n) => n.data?.request_id === id && reload());

  const decide = async (res, status) => {
    await axios.patch(endpoints.requests.response(r.id, res.id), { status });
    await reload();
    onChanged();
  };
  const setStatus = async (status) => {
    await axios.patch(`${endpoints.requests.details(r.id)}/status`, { status });
    await reload();
    onChanged();
  };

  const open = r && ['open', 'in_progress'].includes(r.status);

  return (
    <Drawer anchor="right" open={!!id} onClose={onClose} PaperProps={{ sx: { width: 1, maxWidth: 560 } }}>
      {r && (
        <>
          <Stack direction="row" alignItems="center" sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Ma demande
            </Typography>
            <IconButton onClick={() => printDocument('requests', r.id)}>
              <Iconify icon="solar:printer-minimalistic-bold" />
            </IconButton>
            <IconButton onClick={onClose}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
          <Divider />
          <Scrollbar sx={{ p: 2.5 }}>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1}>
                <StatusLabel map={REQUEST_STATUS} value={r.status} />
                {r.category_name && <Label color="primary">{r.category_name}</Label>}
                {r.product_title && <Label color="info">Produit ciblé</Label>}
              </Stack>
              <Typography variant="h5">{r.title}</Typography>
              {r.description && (
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
                  {r.description}
                </Typography>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
                {[
                  ['Quantité', fQty(r.quantity, r.unit)],
                  ['Prix max', fMoney(r.max_price_per_unit)],
                  ['Pour le', fDate(r.needed_by)],
                ].map(([label, value]) => (
                  <Box key={label}>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {label}
                    </Typography>
                    <Typography variant="subtitle2">{value}</Typography>
                  </Box>
                ))}
              </Box>

              <Stack direction="row" flexWrap="wrap" gap={1}>
                {open && (
                  <>
                    <Button size="small" variant="soft" startIcon={<Iconify icon="solar:pen-bold" />} onClick={() => setEdit(true)}>
                      Modifier
                    </Button>
                    <Button size="small" variant="soft" color="success" onClick={() => setStatus('fulfilled')}>
                      Marquer satisfaite
                    </Button>
                    <Button size="small" variant="soft" color="inherit" onClick={() => setStatus('closed')}>
                      Clôturer
                    </Button>
                    <Button size="small" variant="soft" color="error" onClick={() => setStatus('cancelled')}>
                      Annuler
                    </Button>
                  </>
                )}
                {!open && (
                  <Button size="small" variant="soft" onClick={() => setStatus('open')} startIcon={<Iconify icon="solar:restart-bold" />}>
                    Rouvrir
                  </Button>
                )}
              </Stack>

              <Divider sx={{ borderStyle: 'dashed' }} />
              <Typography variant="h6">
                Propositions reçues <Label sx={{ ml: 1 }}>{r.responses.length}</Label>
              </Typography>
              {r.responses.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Aucune proposition pour l’instant. Les vendeurs concernés ont été notifiés — les réponses arrivent ici en temps réel.
                </Typography>
              )}
              {r.responses.map((res) => (
                <ResponseCard key={res.id} res={res} request={r} onDecide={decide} />
              ))}
            </Stack>
          </Scrollbar>
          <RequestFormDialog open={edit} request={r} onClose={() => setEdit(false)} onSaved={() => { reload(); onChanged(); }} />
        </>
      )}
    </Drawer>
  );
}

// ----------------------------------------------------------------------

export function BuyerRequestsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get('r');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [create, setCreate] = useState(false);
  const { data, meta, loading, reload } = useApi(`${endpoints.requests.list}/mine`, cleanParams({ status, page, limit: 12 }));

  useSocketEvent('notification:new', (n) => n.type?.startsWith('request.') && reload());

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        icon="solar:inbox-out-bold-duotone"
        title="Mes demandes"
        subtitle="Exprimez vos besoins : les vendeurs et points de collecte vous font des propositions"
        action={
          <Button variant="contained" size="large" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setCreate(true)}>
            Nouvelle demande
          </Button>
        }
      />
      <Tabs value={status} onChange={(_, v) => { setStatus(v); setPage(1); }} sx={{ mb: 3 }}>
        <Tab value="" label="Toutes" />
        {Object.entries(REQUEST_STATUS).map(([value, meta_]) => (
          <Tab key={value} value={value} label={meta_.label} />
        ))}
      </Tabs>

      {loading && !data ? (
        <ListSkeleton height={200} />
      ) : data?.length ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: 'repeat(3, 1fr)' } }}>
          {data.map((r, i) => (
            <Card
              key={r.id}
              component={m.div}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => router.push(`?r=${r.id}`)}
              sx={{ p: 2.5, cursor: 'pointer', '&:hover': { boxShadow: (theme) => theme.customShadows.z16 } }}
            >
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <StatusLabel map={REQUEST_STATUS} value={r.status} />
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {fFromNow(r.created_at)}
                </Typography>
              </Stack>
              <Typography variant="subtitle1">{r.title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {r.category_name ?? '—'} · {fQty(r.quantity, r.unit)} · {r.gouvernorat ?? '—'}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2, p: 1.5, borderRadius: 1.5, bgcolor: r.responses_count ? 'primary.lighter' : 'background.neutral' }}>
                <Iconify icon="solar:chat-round-check-bold-duotone" sx={{ color: r.responses_count ? 'primary.dark' : 'text.disabled' }} />
                <Typography variant="subtitle2" sx={{ color: r.responses_count ? 'primary.darker' : 'text.secondary' }}>
                  {r.responses_count} proposition(s)
                </Typography>
              </Stack>
            </Card>
          ))}
        </Box>
      ) : (
        <Empty
          title="Aucune demande"
          description="Publiez votre premier besoin : quantité, prix et délai. Les vendeurs vous répondent."
          icon="solar:inbox-out-bold-duotone"
          action={<Button variant="contained" onClick={() => setCreate(true)}>Créer une demande</Button>}
        />
      )}
      <PagePagination meta={meta} onChange={setPage} />

      <RequestFormDialog open={create} onClose={() => setCreate(false)} onSaved={(r) => { reload(); router.push(`?r=${r.id}`); }} />
      <RequestDrawer id={openId} onClose={() => router.push('?')} onChanged={reload} />
    </DashboardContent>
  );
}
