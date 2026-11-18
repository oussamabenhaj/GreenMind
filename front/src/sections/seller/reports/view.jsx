import dayjs from 'dayjs';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useApi } from 'src/hooks/use-api';

import { fNum, fQty, fMoney } from 'src/utils/clac';

import { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { Ring, KpiCard, EcoChart, PageHeader } from '../components/ui';

// ----------------------------------------------------------------------

export function ReportsView() {
  const [months, setMonths] = useState(12);
  const from = dayjs().subtract(months, 'month').startOf('month').toISOString();
  const { data: o, loading } = useApi(endpoints.reports.overview, { from });
  const { data: timeline } = useApi(endpoints.reports.timeline, { months });

  const label = (ym) => dayjs(`${ym}-01`).format(months > 12 ? 'MMM YY' : 'MMM');
  const revenue = (timeline ?? []).map((t) => ({ label: label(t.month), value: t.amount }));
  const volume = (timeline ?? []).map((t) => ({ label: label(t.month), value: t.quantity_kg }));
  const maxCat = Math.max(1, ...(o?.sales_by_category ?? []).map((c) => c.revenue));

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        icon="solar:chart-2-bold-duotone"
        title="Rapports & statistiques"
        subtitle="Suivez vos performances commerciales"
        action={
          <Stack direction="row" spacing={1.5}>
            <ToggleButtonGroup exclusive size="small" value={months} onChange={(_, v) => v && setMonths(v)}>
              {[3, 6, 12, 24].map((mo) => (
                <ToggleButton key={mo} value={mo} sx={{ px: 2 }}>
                  {mo} mois
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Button variant="outlined" color="inherit" startIcon={<Iconify icon="solar:printer-minimalistic-bold" />} onClick={() => window.print()}>
              Imprimer
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={3}>
        {[
          ['Revenus', fMoney(o?.sales.revenue), 'solar:wallet-money-bold-duotone', 'primary'],
          ['Quantité vendue', `${fNum(o?.sales.sold_kg)} kg`, 'solar:box-bold-duotone', 'secondary'],
          ['Ventes réceptionnées', `${o?.sales.purchases_received ?? 0} / ${o?.sales.purchases_total ?? 0}`, 'solar:delivery-bold-duotone', 'info'],
          ['Propositions envoyées', o?.requests.responses_sent ?? 0, 'solar:plain-bold-duotone', 'warning'],
        ].map(([title, value, icon, color], i) => (
          <Grid key={title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard title={title} value={value} icon={icon} color={color} loading={loading} delay={i * 0.05} />
          </Grid>
        ))}

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader title="Revenus (TND)" subheader="Par mois" />
            <Box sx={{ p: 3 }}>
              <EcoChart series={revenue} type="bar" format={fNum} />
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader title="Volume vendu (kg)" subheader="Par mois" />
            <Box sx={{ p: 3 }}>
              <EcoChart series={volume} color="info" format={fNum} />
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title="Ventes par catégorie" />
            <Stack spacing={2.5} sx={{ p: 3 }}>
              {(o?.sales_by_category ?? []).length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Pas encore de ventes réceptionnées sur la période.
                </Typography>
              )}
              {(o?.sales_by_category ?? []).map((c) => (
                <Box key={c.category_id ?? 'none'}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                    <Typography variant="subtitle2">{c.category_name ?? 'Non classé'}</Typography>
                    <Typography variant="body2">
                      {fMoney(c.revenue)} · {fNum(c.sold_kg)} kg
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(c.revenue / maxCat) * 100} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
              ))}
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: 1, p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Réponses aux demandes
            </Typography>
            <Stack direction="row" spacing={3} alignItems="center">
              <Ring value={o?.requests.acceptance_rate_percent ?? 0} size={150} label="acceptation" />
              <Stack spacing={1.5} sx={{ flex: 1 }}>
                {[
                  ['Acceptées', o?.requests.responses_accepted, 'success.main'],
                  ['En attente', o?.requests.responses_pending, 'warning.main'],
                  ['Refusées', o?.requests.responses_rejected, 'error.main'],
                ].map(([text, value, color]) => (
                  <Stack key={text} direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {text}
                    </Typography>
                    <Typography variant="subtitle2">{value ?? 0}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardHeader title="Produits les plus consultés" />
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Produit</TableCell>
                  <TableCell align="right">Vues</TableCell>
                  <TableCell align="right">Stock</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(o?.top_products ?? []).map((p, i) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{p.title}</TableCell>
                    <TableCell align="right">{fNum(p.views_count)}</TableCell>
                    <TableCell align="right">{fQty(p.quantity_available, p.unit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
