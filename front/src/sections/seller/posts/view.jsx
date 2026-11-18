import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { RouterLink } from 'src/routes/components';

import { useApi } from 'src/hooks/use-api';
import { useSpace } from 'src/hooks/use-space';

import { fMoney, initials, fFromNow, ROLE_LABELS } from 'src/utils/clac';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { Empty, PageHeader, PagePagination } from '../components/ui';

// ----------------------------------------------------------------------

function Composer({ onPosted }) {
  const { user } = useAuthContext();
  const { data: products } = useApi(endpoints.products.mine, { limit: 100 });
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [productId, setProductId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const publish = async () => {
    setSending(true);
    setError('');
    try {
      await axios.post(endpoints.posts.list, {
        content,
        ...(image && { images: [image] }),
        ...(productId && { product_id: productId }),
      });
      setContent('');
      setImage('');
      setProductId('');
      onPosted();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card sx={{ p: 2.5, mb: 3 }}>
      <Stack direction="row" spacing={2}>
        <Avatar sx={{ bgcolor: 'primary.main' }}>{initials(user?.displayName)}</Avatar>
        <Box sx={{ flex: 1 }}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Partagez une nouvelle campagne, un lot disponible, une actualité… 🌿"
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1.5 }}>
            <TextField size="small" fullWidth label="Image (URL)" value={image} onChange={(e) => setImage(e.target.value)} />
            <TextField size="small" select fullWidth label="Lier un produit" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <MenuItem value="">Aucun</MenuItem>
              {(products ?? []).map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.title}
                </MenuItem>
              ))}
            </TextField>
            <LoadingButton variant="contained" loading={sending} disabled={!content.trim()} onClick={publish} startIcon={<Iconify icon="solar:plain-bold" />} sx={{ flexShrink: 0 }}>
              Publier
            </LoadingButton>
          </Stack>
          {!!error && (
            <Typography color="error" variant="caption">
              {error}
            </Typography>
          )}
        </Box>
      </Stack>
    </Card>
  );
}

function PostCard({ post, canDelete, onDelete }) {
  const sp = useSpace();
  return (
    <Card component={m.div} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} sx={{ mb: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 2.5, pb: 1.5 }}>
        <Avatar src={post.author.avatar_url ?? undefined} sx={{ bgcolor: 'primary.lighter', color: 'primary.dark' }}>
          {initials(post.author.company_name || post.author.name)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2">
            {post.author.company_name || post.author.name}
            {post.author.is_verified && <Iconify icon="solar:verified-check-bold" width={16} sx={{ color: 'info.main', ml: 0.5, verticalAlign: 'middle' }} />}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {ROLE_LABELS[post.author.role]} · {post.author.gouvernorat} · {fFromNow(post.created_at)}
          </Typography>
        </Box>
        {canDelete && (
          <IconButton color="error" onClick={() => onDelete(post)}>
            <Iconify icon="solar:trash-bin-trash-bold" />
          </IconButton>
        )}
      </Stack>
      <Typography sx={{ px: 2.5, pb: 2, whiteSpace: 'pre-line' }}>{post.content}</Typography>
      {post.images?.[0] && <Box component="img" src={post.images[0]} alt="" sx={{ width: 1, maxHeight: 420, objectFit: 'cover' }} />}
      {post.product && (
        <>
          <Divider sx={{ borderStyle: 'dashed' }} />
          <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 2, bgcolor: 'background.neutral' }}>
            <Iconify icon="solar:box-bold-duotone" width={28} sx={{ color: 'primary.main' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2">{post.product.title}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {post.product.price_per_unit != null ? `${fMoney(post.product.price_per_unit)} / ${post.product.unit}` : 'Sur devis'}
              </Typography>
            </Box>
            <Button component={RouterLink} href={sp.product(post.product.id)} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>
              Voir
            </Button>
          </Stack>
        </>
      )}
    </Card>
  );
}

export function PostsView() {
  const { user } = useAuthContext();
  const [tab, setTab] = useState('mine');
  const [page, setPage] = useState(1);
  const { data, meta, reload, setData } = useApi(tab === 'mine' ? endpoints.posts.mine : endpoints.posts.list, { page, limit: 10 });

  const remove = async (post) => {
    await axios.delete(endpoints.posts.details(post.id));
    setData((list) => list.filter((p) => p.id !== post.id));
  };

  return (
    <DashboardContent maxWidth="md">
      <PageHeader icon="solar:gallery-wide-bold-duotone" title="Publications" subtitle="Présentez vos produits et vos activités à la communauté" />
      <Composer onPosted={() => (tab === 'mine' && page === 1 ? reload() : (setTab('mine'), setPage(1)))} />
      <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(1); }} sx={{ mb: 3 }}>
        <Tab value="mine" label="Mes publications" />
        <Tab value="all" label="Fil de la communauté" />
      </Tabs>
      <AnimatePresence>
        {(data ?? []).map((post) => (
          <PostCard key={post.id} post={post} canDelete={post.author_id === user?.id} onDelete={remove} />
        ))}
      </AnimatePresence>
      {data?.length === 0 && <Empty title="Aucune publication" description="Lancez la conversation avec votre premier post." icon="solar:gallery-wide-bold-duotone" />}
      <PagePagination meta={meta} onChange={setPage} />
    </DashboardContent>
  );
}
