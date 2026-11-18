import dayjs from 'dayjs';
import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { useRouter } from 'src/routes/hooks';

import { fNum, UNITS, initials, fFromNow, unitLabel, ROLE_LABELS, RESPONSE_STATUS } from 'src/utils/clac';

import axios, { endpoints } from 'src/lib/axios';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { Description, ExchangeRatio } from './feed-cards';
import { openConversation } from '../seller/components/contact';
import { ImageUploader } from '../seller/components/image-uploader';
import { StatusLabel, useReferenceData } from '../seller/components/ui';

// ----------------------------------------------------------------------

const EMPTY = {
  wanted_category_id: '',
  wanted_label: '',
  wanted_quantity: 5,
  wanted_unit: 'l',
  given_label: '',
  given_quantity: 1,
  given_unit: 'unit',
  description: '',
  max_total_wanted: '',
  expires_at: dayjs().add(2, 'month'),
  images: [],
};

/** Buyer: "for every X of A you bring, I give Y of B" (optional photo). */
export function ExchangeFormDialog({ open, onClose, onSaved }) {
  const { categories } = useReferenceData();
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const uploads = useRef([]);

  useEffect(() => {
    if (open) {
      setF(EMPTY);
      setError('');
      uploads.current = [];
    }
  }, [open]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const cancel = () => {
    uploads.current.forEach((u) => axios.delete(endpoints.uploads.remove(u.split('/').pop())).catch(() => {}));
    onClose();
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await axios.post(endpoints.exchanges.list, {
        ...(f.wanted_category_id && { wanted_category_id: f.wanted_category_id }),
        wanted_label: f.wanted_label,
        wanted_quantity: Number(f.wanted_quantity),
        wanted_unit: f.wanted_unit,
        given_label: f.given_label,
        given_quantity: Number(f.given_quantity),
        given_unit: f.given_unit,
        ...(f.description && { description: f.description }),
        ...(f.max_total_wanted && { max_total_wanted: Number(f.max_total_wanted) }),
        ...(f.expires_at && { expires_at: dayjs(f.expires_at).format('YYYY-MM-DD') }),
        ...(f.images[0] && { image_url: f.images[0] }),
      });
      uploads.current = [];
      onSaved?.(res.data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const preview = { ...f, wanted_category_slug: categories.find((c) => c.id === f.wanted_category_id)?.slug, wanted_label: f.wanted_label || 'Matière', given_label: f.given_label || 'Produit offert' };

  return (
    <Dialog fullWidth maxWidth="md" open={open} onClose={cancel} PaperProps={{ sx: { borderRadius: 2.5 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'common.white', background: (theme) => `linear-gradient(135deg, ${theme.vars.palette.warning.main}, ${theme.vars.palette.warning.dark})` }}>
          <Iconify icon="solar:refresh-square-bold-duotone" width={26} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">Proposer un échange</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Ex : « Pour chaque 5 L d’huile usagée apportée, je donne 1 savon »
          </Typography>
        </Box>
        <IconButton onClick={cancel}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ bgcolor: 'background.neutral', pt: '20px !important' }}>
        {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Card variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'warning.dark' }}>① Ce que je veux recevoir</Typography>
            <Stack spacing={2}>
              <TextField select label="Catégorie" value={f.wanted_category_id} onChange={set('wanted_category_id')}>
                <MenuItem value="">—</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>
              <TextField label="Matière demandée" placeholder="Ex : Huile de friture usagée" value={f.wanted_label} onChange={set('wanted_label')} />
              <Stack direction="row" spacing={1.5}>
                <TextField fullWidth type="number" label="Quantité" value={f.wanted_quantity} onChange={set('wanted_quantity')} />
                <TextField select label="Unité" value={f.wanted_unit} onChange={set('wanted_unit')} sx={{ minWidth: 110 }}>
                  {UNITS.map((u) => <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>)}
                </TextField>
              </Stack>
            </Stack>
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1.5, color: 'success.dark' }}>② Ce que je donne en échange</Typography>
            <Stack spacing={2}>
              <TextField label="Produit offert" placeholder="Ex : Savon artisanal à l’huile d’olive" value={f.given_label} onChange={set('given_label')} />
              <Stack direction="row" spacing={1.5}>
                <TextField fullWidth type="number" label="Quantité" value={f.given_quantity} onChange={set('given_quantity')} />
                <TextField select label="Unité" value={f.given_unit} onChange={set('given_unit')} sx={{ minWidth: 110 }}>
                  {UNITS.map((u) => <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>)}
                </TextField>
              </Stack>
            </Stack>
          </Card>

          <Stack spacing={2.5}>
            <Card variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Aperçu</Typography>
              <ExchangeRatio e={preview} compact />
            </Card>
            <Card variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Photo (optionnelle)</Typography>
              <ImageUploader max={1} value={f.images} onUploaded={(urls) => uploads.current.push(...urls)} onChange={(images) => setF((s) => ({ ...s, images }))} />
            </Card>
            <Card variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={2}>
                <TextField label="Détails (optionnel)" multiline rows={2} value={f.description} onChange={set('description')} placeholder="Lieu de dépôt, horaires, conditions…" />
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Quantité totale max"
                    value={f.max_total_wanted}
                    onChange={set('max_total_wanted')}
                    slotProps={{ input: { endAdornment: <InputAdornment position="end">{unitLabel(f.wanted_unit)}</InputAdornment> } }}
                  />
                  <DatePicker label="Valable jusqu’au" value={f.expires_at} onChange={(v) => setF((s) => ({ ...s, expires_at: v }))} disablePast format="DD MMM YYYY" slotProps={{ textField: { fullWidth: true } }} />
                </Stack>
              </Stack>
            </Card>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" color="inherit" onClick={cancel}>Annuler</Button>
        <LoadingButton size="large" variant="contained" color="warning" loading={saving} disabled={!f.wanted_label || !f.given_label || !(f.wanted_quantity > 0) || !(f.given_quantity > 0)} onClick={save} startIcon={<Iconify icon="solar:plain-bold" />}>
          Publier l’échange
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

/** View an exchange: participants propose; the author accepts / refuses and closes it. */
export function ExchangeDetailDialog({ id, onClose, onChanged }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const [e, setE] = useState(null);
  const [qty, setQty] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await axios.get(endpoints.exchanges.details(id));
    setE(res.data.data);
    const mine = res.data.data.responses.find((r) => r.responder_id === user?.id);
    setQty(mine?.quantity_offered ?? res.data.data.wanted_quantity * 2);
    setMsg(mine?.message ?? '');
  };

  useEffect(() => {
    setE(null);
    setError('');
    if (id) load().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isAuthor = e && e.author_id === user?.id;
  const mine = e?.responses.find((r) => r.responder_id === user?.id);
  const pending = mine?.status === 'pending';
  const canPropose = e?.status === 'active' && (!mine || ['pending', 'withdrawn', 'rejected'].includes(mine.status));
  const units = e ? Math.floor(Number(qty || 0) / Number(e.wanted_quantity)) : 0;

  return (
    <Dialog fullWidth maxWidth="sm" open={!!id} onClose={onClose} PaperProps={{ sx: { borderRadius: 2.5 } }}>
      {e && (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'warning.main' }}>{initials(e.author.company_name || e.author.name)}</Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap>{e.author.company_name || e.author.name}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {ROLE_LABELS[e.author.role]} · {e.gouvernorat} · {fFromNow(e.created_at)}
              </Typography>
            </Box>
            <Label color={e.status === 'active' ? 'success' : 'default'}>{e.status === 'active' ? 'Active' : 'Clôturée'}</Label>
            <IconButton onClick={onClose}><Iconify icon="mingcute:close-line" /></IconButton>
          </DialogTitle>
          <DialogContent>
            {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {e.image_url && <Box component="img" src={e.image_url} alt="" sx={{ width: 1, maxHeight: 280, objectFit: 'cover', borderRadius: 2, mb: 2 }} />}
            <ExchangeRatio e={e} />
            <Box sx={{ mt: 2 }}><Description text={e.description} max={400} /></Box>
            {e.max_total_wanted && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                Objectif : {fNum(e.max_total_wanted)} {unitLabel(e.wanted_unit)} · déjà accepté : {fNum(e.accepted_quantity)} {unitLabel(e.wanted_unit)}
              </Typography>
            )}
            <Divider sx={{ my: 2.5, borderStyle: 'dashed' }} />

            {isAuthor ? (
              <Stack spacing={1.5}>
                <Typography variant="h6">Propositions reçues <Label sx={{ ml: 1 }}>{e.responses.length}</Label></Typography>
                {e.responses.length === 0 && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Pas encore de proposition — les vendeurs concernés ont été notifiés.</Typography>}
                {e.responses.map((r) => (
                  <Card key={r.id} variant="outlined" sx={{ p: 2, ...(r.status === 'accepted' && { borderColor: 'success.main', bgcolor: 'success.lighter' }) }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.lighter', color: 'primary.dark' }}>{initials(r.responder.company_name || r.responder.name)}</Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>{r.responder.company_name || r.responder.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          apporte <b>{fNum(r.quantity_offered)} {unitLabel(e.wanted_unit)}</b> → reçoit <b>{fNum(Math.floor(r.quantity_offered / e.wanted_quantity) * e.given_quantity)} {unitLabel(e.given_unit)}</b>
                        </Typography>
                      </Box>
                      <StatusLabel map={RESPONSE_STATUS} value={r.status} />
                    </Stack>
                    {r.message && <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>« {r.message} »</Typography>}
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      {r.status === 'pending' && (
                        <>
                          <Button size="small" variant="contained" color="success" disabled={busy} onClick={() => run(() => axios.patch(endpoints.exchanges.response(e.id, r.id), { status: 'accepted' }))}>Accepter</Button>
                          <Button size="small" variant="soft" color="error" disabled={busy} onClick={() => run(() => axios.patch(endpoints.exchanges.response(e.id, r.id), { status: 'rejected' }))}>Refuser</Button>
                        </>
                      )}
                      <Box sx={{ flexGrow: 1 }} />
                      <Button size="small" startIcon={<Iconify icon="solar:chat-round-dots-bold" />} onClick={async () => router.push(await openConversation(r.responder_id))}>Discuter</Button>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">{pending || mine?.status === 'accepted' ? 'Ma proposition' : 'Participer à l’échange'}</Typography>
                  {mine && <StatusLabel map={RESPONSE_STATUS} value={mine.status} />}
                </Stack>
                {mine?.status === 'accepted' && <Alert severity="success">Votre proposition est acceptée 🤝 — contactez l’auteur pour organiser le dépôt.</Alert>}
                {canPropose && (
                  <>
                    <TextField
                      type="number"
                      label="Quantité que j’apporte"
                      value={qty}
                      onChange={(ev) => setQty(ev.target.value)}
                      slotProps={{ input: { endAdornment: <InputAdornment position="end">{unitLabel(e.wanted_unit)}</InputAdornment> } }}
                      helperText={units > 0 ? `Vous recevrez ${fNum(units * e.given_quantity)} ${unitLabel(e.given_unit)} de ${e.given_label}` : `Minimum ${fNum(e.wanted_quantity)} ${unitLabel(e.wanted_unit)}`}
                    />
                    <TextField label="Message (optionnel)" multiline rows={2} value={msg} onChange={(ev) => setMsg(ev.target.value)} placeholder="Disponibilité, conditionnement…" />
                  </>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            {isAuthor ? (
              <>
                <Button color="error" onClick={() => run(async () => { await axios.delete(endpoints.exchanges.details(e.id)); onClose(); })}>Supprimer</Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button variant="soft" onClick={() => run(() => axios.patch(endpoints.exchanges.details(e.id), { status: e.status === 'active' ? 'closed' : 'active' }))}>
                  {e.status === 'active' ? 'Clôturer l’échange' : 'Réouvrir'}
                </Button>
              </>
            ) : (
              <>
                {user?.role !== 'buyer' && (
                  <Button startIcon={<Iconify icon="solar:chat-round-dots-bold" />} onClick={async () => router.push(await openConversation(e.author_id, { body: `Bonjour, je suis intéressé(e) par votre échange « ${e.wanted_label} → ${e.given_label} ».` }))}>
                    Contacter
                  </Button>
                )}
                <Box sx={{ flexGrow: 1 }} />
                {pending && (
                  <Button color="error" disabled={busy} onClick={() => run(() => axios.patch(endpoints.exchanges.response(e.id, mine.id), { status: 'withdrawn' }))}>Retirer</Button>
                )}
                {canPropose && (
                  <LoadingButton
                    variant="contained"
                    color="warning"
                    loading={busy}
                    disabled={!(Number(qty) > 0)}
                    startIcon={<Iconify icon="solar:hand-shake-bold" />}
                    onClick={() =>
                      run(() =>
                        pending
                          ? axios.patch(endpoints.exchanges.response(e.id, mine.id), { quantity_offered: Number(qty), message: msg || undefined })
                          : axios.post(endpoints.exchanges.responses(e.id), { quantity_offered: Number(qty), ...(msg && { message: msg }) })
                      )
                    }
                  >
                    {pending ? 'Mettre à jour' : 'Envoyer ma proposition'}
                  </LoadingButton>
                )}
              </>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
