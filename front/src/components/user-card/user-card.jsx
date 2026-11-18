import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

const SOCIALS = [
  { key: 'facebook', icon: 'eva:facebook-fill', color: '#1877F2' },
  { key: 'instagram', icon: 'ant-design:instagram-filled', color: '#E02D69' },
  { key: 'linkedin', icon: 'eva:linkedin-fill', color: '#0A66C2' },
  { key: 'twitter', icon: 'ri:twitter-x-fill', color: 'text.primary' },
];

export function UserCard({ user, sx, ...other }) {
  const { name, role, avatarUrl, stats = [], socials = {} } = user;

  return (
    <Card sx={[{ textAlign: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <Box
        sx={(theme) => ({
          height: 96,
          background: `linear-gradient(135deg, ${varAlpha(
            theme.vars.palette.primary.lightChannel,
            0.8
          )}, ${varAlpha(theme.vars.palette.primary.darkChannel, 0.8)})`,
        })}
      />

      <Avatar
        alt={name}
        src={avatarUrl}
        sx={(theme) => ({
          mx: 'auto',
          mt: -5,
          width: 80,
          height: 80,
          border: `solid 4px ${theme.vars.palette.background.paper}`,
        })}
      >
        {name?.charAt(0)}
      </Avatar>

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        {name}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {role}
      </Typography>

      <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
        {SOCIALS.filter((social) => socials[social.key]).map((social) => (
          <IconButton
            key={social.key}
            component="a"
            href={socials[social.key]}
            target="_blank"
            rel="noopener"
            sx={{ color: social.color }}
          >
            <Iconify icon={social.icon} />
          </IconButton>
        ))}
      </Box>

      {!!stats.length && (
        <>
          <Divider sx={{ borderStyle: 'dashed' }} />

          <Box
            sx={{
              py: 2.5,
              display: 'grid',
              gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
            }}
          >
            {stats.map((stat) => (
              <Box key={stat.label}>
                <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                  {stat.label}
                </Typography>
                <Typography variant="subtitle1">{stat.value}</Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Card>
  );
}
