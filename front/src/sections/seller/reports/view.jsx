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

import { t } from 'src/locales/i18n';
import { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { KpiCard, EcoChart, PageHeader } from '../components/ui';

// ----------------------------------------------------------------------

export function ReportsView() {
  const [months, setMonths] = useState(12);
  const from = dayjs().subtract(months, 'month').startOf('month').toISOString();
  const { data: o, loading } = useApi(endpoints.reports.overview, { from });
  const { data: timeline } = useApi(endpoints.reports.timeline, { months });

  const label = (ym) => dayjs(`${ym}-01`).format(months > 12 ? 'MMM YY' : 'MMM');
  const revenue = (timeline ?? []).map((tt) => ({ label: label(tt.month), value: tt.amount }));
  const volume = (timeline ?? []).map((tt) => ({ label: label(tt.month), value: tt.quantity_kg }));
  const maxCat = Math.max(1, ...(o?.sales_by_category ?? []).map((c) => c.revenue));

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        icon="solar:chart-2-bold-duotone"
        title={t('Rapports & statistiques')}
        subtitle={t('Suivez vos performances commerciales')}
        action={
          <Stack direction="row" spacing={1.5}>
            <ToggleButtonGroup exclusive size="small" value={months} onChange={(_, v) => v && setMonths(v)}>
              {[3, 6, 12, 24].map((mo) => (
                <ToggleButton key={mo} value={mo} sx={{ px: 2 }}>
                  {mo} {t('mois')}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Button variant="outlined" color="inherit" startIcon={<Iconify icon="solar:printer-minimalistic-bold" />} onClick={() => window.print()}>
              {t('Imprimer')}
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={3}>
        {[
          [t('Revenus'), fMoney(o?.sales.revenue), 'solar:wallet-money-bold-duotone', 'primary'],
          [t('Quantité vendue'), `${fNum(o?.sales.sold_kg)} kg`, 'solar:box-bold-duotone', 'secondary'],
          [t('Ventes réceptionnées'), `${o?.sales.purchases_received ?? 0} / ${o?.sales.purchases_total ?? 0}`, 'solar:delivery-bold-duotone', 'info'],
        ].map(([title, value, icon, color], i) => (
          <Grid key={title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard title={title} value={value} icon={icon} color={color} loading={loading} delay={i * 0.05} />
          </Grid>
        ))}

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader title={t('Revenus (TND)')} subheader={t('Par mois')} />
            <Box sx={{ p: 3 }}>
              <EcoChart series={revenue} type="bar" format={fNum} />
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader title={t('Volume vendu (kg)')} subheader={t('Par mois')} />
            <Box sx={{ p: 3 }}>
              <EcoChart series={volume} color="info" format={fNum} />
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title={t('Ventes par catégorie')} />
            <Stack spacing={2.5} sx={{ p: 3 }}>
              {(o?.sales_by_category ?? []).length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('Pas encore de ventes réceptionnées sur la période.')}
                </Typography>
              )}
              {(o?.sales_by_category ?? []).map((c) => (
                <Box key={c.category_id ?? 'none'}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                    <Typography variant="subtitle2">{c.category_name ?? t('Non classé')}</Typography>
                    <Typography variant="body2">
                      {fMoney(c.revenue)} · {fNum(c.sold_kg)} {t('kg')}
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(c.revenue / maxCat) * 100} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
              ))}
            </Stack>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardHeader title={t('Produits les plus consultés')} />
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>{t('Produit')}</TableCell>
                  <TableCell align="right">{t('Vues')}</TableCell>
                  <TableCell align="right">{t('Stock')}</TableCell>
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
