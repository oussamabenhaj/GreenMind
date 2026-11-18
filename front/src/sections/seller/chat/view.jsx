import dayjs from 'dayjs';
import { m, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { useApi } from 'src/hooks/use-api';

import { initials, fFromNow, ROLE_LABELS } from 'src/utils/clac';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';
import { useSocket, useSocketEvent } from 'src/lib/socket';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useAuthContext } from 'src/auth/hooks';

import { Empty, PageHeader } from '../components/ui';

// ----------------------------------------------------------------------

function PersonAvatar({ person, online, size = 44 }) {
  return (
    <Badge
      overlap="circular"
      variant="dot"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      invisible={!online}
      sx={{ '& .MuiBadge-dot': { width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main', border: '2px solid white' } }}
    >
      <Avatar src={person?.avatar_url ?? undefined} sx={{ width: size, height: size, bgcolor: 'primary.lighter', color: 'primary.dark' }}>
        {initials(person?.company_name || person?.name)}
      </Avatar>
    </Badge>
  );
}

function TypingDots() {
  return (
    <Stack direction="row" spacing={0.5} sx={{ px: 2, py: 1.5, borderRadius: 2, bgcolor: 'background.neutral', width: 'fit-content' }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          component={m.span}
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
          sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'text.disabled', display: 'block' }}
        />
      ))}
    </Stack>
  );
}

// ----------------------------------------------------------------------

function Thread({ conversation, onActivity }) {
  const { user } = useAuthContext();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(conversation.participant.online);
  const [peerReadAt, setPeerReadAt] = useState(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const id = conversation.id;

  const markRead = useCallback(() => {
    axios.post(endpoints.conversations.read(id)).then(onActivity).catch(() => {});
  }, [id, onActivity]);

  useEffect(() => {
    let alive = true;
    setMessages([]);
    setPeerReadAt(null);
    setOnline(conversation.participant.online);
    axios.get(endpoints.conversations.messages(id), { params: { limit: 100 } }).then((res) => {
      if (alive) setMessages(res.data.data);
    });
    markRead();
    return () => {
      alive = false;
    };
  }, [id, conversation.participant.online, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useSocketEvent('message:new', (msg) => {
    if (msg.conversation_id !== id) return;
    setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
    if (msg.sender_id !== user.id) {
      setTyping(false);
      markRead();
    }
  });
  useSocketEvent('typing:start', (e) => e.conversation_id === id && setTyping(true));
  useSocketEvent('typing:stop', (e) => e.conversation_id === id && setTyping(false));
  useSocketEvent('conversation:read', (e) => e.conversation_id === id && setPeerReadAt(e.read_at));
  useSocketEvent('presence:update', (e) => e.user_id === conversation.participant.id && setOnline(e.online));

  const onType = (value) => {
    setText(value);
    socket?.emit('typing:start', { conversation_id: id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket?.emit('typing:stop', { conversation_id: id }), 1500);
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    socket?.emit('typing:stop', { conversation_id: id });
    const res = await axios.post(endpoints.conversations.messages(id), { body });
    setMessages((list) => (list.some((x) => x.id === res.data.data.id) ? list : [...list, res.data.data]));
    onActivity();
  };

  const lastMine = [...messages].reverse().find((msg) => msg.sender_id === user.id);
  const seen = lastMine && peerReadAt && dayjs(peerReadAt).isAfter(dayjs(lastMine.created_at).subtract(1, 'second'));

  return (
    <Stack sx={{ height: 1, minWidth: 0, flex: 1 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ px: 2.5, py: 2 }}>
        <PersonAvatar person={conversation.participant} online={online} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>
            {conversation.participant.company_name || conversation.participant.name}
          </Typography>
          <Typography variant="caption" sx={{ color: typing ? 'primary.main' : 'text.secondary' }}>
            {typing ? 'écrit…' : online ? 'En ligne' : 'Hors ligne'} · {ROLE_LABELS[conversation.participant.role]}
          </Typography>
        </Box>
      </Stack>
      <Divider />

      <Scrollbar sx={{ flex: 1, px: 2.5, py: 2, bgcolor: 'background.neutral' }}>
        <Stack spacing={1.25}>
          {messages.map((msg, i) => {
            const me = msg.sender_id === user.id;
            const showDay = i === 0 || !dayjs(msg.created_at).isSame(messages[i - 1].created_at, 'day');
            return (
              <Box key={msg.id}>
                {showDay && (
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.disabled', my: 1.5 }}>
                    {dayjs(msg.created_at).format('dddd D MMMM')}
                  </Typography>
                )}
                <Stack
                  component={m.div}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  alignItems={me ? 'flex-end' : 'flex-start'}
                >
                  <Box
                    sx={{
                      px: 2,
                      py: 1.25,
                      maxWidth: '72%',
                      borderRadius: 2.5,
                      whiteSpace: 'pre-wrap',
                      typography: 'body2',
                      ...(me
                        ? { bgcolor: 'primary.main', color: 'common.white', borderBottomRightRadius: 6 }
                        : { bgcolor: 'background.paper', borderBottomLeftRadius: 6, boxShadow: (theme) => theme.customShadows.z1 }),
                    }}
                  >
                    {msg.context_type && (
                      <Label sx={{ mb: 0.75, display: 'inline-flex' }} color={me ? 'default' : 'primary'}>
                        À propos d’une {msg.context_type === 'request' ? 'demande' : msg.context_type === 'product' ? 'fiche produit' : 'offre'}
                      </Label>
                    )}
                    <div>{msg.body}</div>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.25, px: 0.5 }}>
                    {dayjs(msg.created_at).format('HH:mm')}
                    {me && lastMine?.id === msg.id && seen && ' · Vu ✓✓'}
                  </Typography>
                </Stack>
              </Box>
            );
          })}
          <AnimatePresence>{typing && <TypingDots />}</AnimatePresence>
          <div ref={bottomRef} />
        </Stack>
      </Scrollbar>

      <Divider />
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={text}
          placeholder="Écrire un message…"
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton color="primary" onClick={send} disabled={!text.trim()}>
                    <Iconify icon="solar:plain-bold" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function ChatView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentId = searchParams.get('c');
  const [q, setQ] = useState('');
  const { user } = useAuthContext();
  const { data: conversations, reload, setData } = useApi(endpoints.conversations.list, { limit: 50, ...(q && { q }) });

  useSocketEvent('message:new', (msg) => {
    const known = (conversations ?? []).some((c) => c.id === msg.conversation_id);
    if (!known) {
      reload();
      return;
    }
    setData((list) =>
      [...list]
        .map((c) =>
          c.id === msg.conversation_id
            ? {
                ...c,
                last_message: msg,
                last_message_at: msg.created_at,
                unread_count: msg.sender_id !== user.id && c.id !== currentId ? c.unread_count + 1 : c.unread_count,
              }
            : c
        )
        .sort((a, b) => new Date(b.last_message_at ?? b.created_at) - new Date(a.last_message_at ?? a.created_at))
    );
  });
  useSocketEvent('presence:update', (e) =>
    setData((list) => list?.map((c) => (c.participant.id === e.user_id ? { ...c, participant: { ...c.participant, online: e.online } } : c)))
  );

  const current = (conversations ?? []).find((c) => c.id === currentId);
  const onActivity = useCallback(
    () => setData((list) => list?.map((c) => (c.id === currentId ? { ...c, unread_count: 0 } : c))),
    [currentId, setData]
  );

  return (
    <DashboardContent maxWidth="xl" sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <PageHeader icon="solar:chat-round-dots-bold-duotone" title="Messagerie" subtitle="Échangez en direct avec acheteurs et points de collecte" />

      <Card sx={{ flex: 1, minHeight: 560, height: 'calc(100vh - 280px)', display: 'flex', overflow: 'hidden' }}>
        <Stack sx={{ width: { xs: currentId ? 0 : 1, md: 340 }, display: { xs: currentId ? 'none' : 'flex', md: 'flex' }, borderRight: 1, borderColor: 'divider' }}>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Rechercher un contact…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" /></InputAdornment> } }}
            />
          </Box>
          <Scrollbar sx={{ px: 1 }}>
            {(conversations ?? []).map((c) => (
              <ListItemButton
                key={c.id}
                selected={c.id === currentId}
                onClick={() => router.push(`?c=${c.id}`)}
                sx={{ borderRadius: 1.5, gap: 1.5, py: 1.5, mb: 0.5, flex: '0 0 auto' }}
              >
                <PersonAvatar person={c.participant} online={c.participant.online} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="subtitle2" noWrap>
                      {c.participant.company_name || c.participant.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0, ml: 1 }}>
                      {fFromNow(c.last_message_at)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{ flex: 1, color: c.unread_count ? 'text.primary' : 'text.secondary', fontWeight: c.unread_count ? 600 : 400 }}
                    >
                      {c.last_message ? `${c.last_message.sender_id === user.id ? 'Vous : ' : ''}${c.last_message.body}` : 'Nouvelle conversation'}
                    </Typography>
                    {!!c.unread_count && (
                      <Box sx={{ minWidth: 20, height: 20, px: 0.75, borderRadius: 10, bgcolor: 'primary.main', color: 'common.white', typography: 'caption', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {c.unread_count}
                      </Box>
                    )}
                  </Stack>
                </Box>
              </ListItemButton>
            ))}
            {conversations?.length === 0 && (
              <Typography variant="body2" sx={{ p: 3, color: 'text.secondary', textAlign: 'center' }}>
                Aucune conversation. Contactez un acheteur depuis une demande ou l’annuaire.
              </Typography>
            )}
          </Scrollbar>
        </Stack>

        {current ? (
          <Box sx={{ flex: 1, display: 'flex', minWidth: 0, position: 'relative' }}>
            <IconButton onClick={() => router.push('?')} sx={{ display: { md: 'none' }, position: 'absolute', top: 20, right: 12, zIndex: 2 }}>
              <Iconify icon="eva:arrow-ios-back-fill" />
            </IconButton>
            <Thread key={current.id} conversation={current} onActivity={onActivity} />
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center', p: 4 }}>
            <Empty title="Sélectionnez une conversation" description="Les nouveaux messages arrivent en temps réel." icon="solar:chat-square-like-bold-duotone" />
          </Box>
        )}
      </Card>
    </DashboardContent>
  );
}
