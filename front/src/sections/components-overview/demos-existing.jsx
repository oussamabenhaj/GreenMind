import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { varAlpha } from 'minimal-shared/utils';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

import { Logo } from 'src/components/logo';
import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { FlagIcon } from 'src/components/flag-icon';
import { SvgColor } from 'src/components/svg-color';
import { Scrollbar } from 'src/components/scrollbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomTabs } from 'src/components/custom-tabs';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomPopover } from 'src/components/custom-popover';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { SearchNotFound } from 'src/components/search-not-found';
import {
  varFade,
  AnimateText,
  AnimateBorder,
  AnimateCountUp,
  AnimateLogoZoom,
  AnimateLogoRotate,
} from 'src/components/animate';

// ----------------------------------------------------------------------

const COLORS = ['default', 'primary', 'secondary', 'info', 'success', 'warning', 'error'];

const rowSx = { gap: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center' };

// ----------------------------------------------------------------------

export function LabelDemo() {
  return (
    <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
      {['soft', 'filled', 'outlined', 'inverted'].map((variant) => (
        <Box key={variant} sx={rowSx}>
          {COLORS.map((color) => (
            <Label key={color} variant={variant} color={color}>
              {color}
            </Label>
          ))}
        </Box>
      ))}
      <Box sx={rowSx}>
        <Label color="success" startIcon={<Iconify icon="eva:checkmark-fill" />}>
          Paid
        </Label>
        <Label color="error" endIcon={<Iconify icon="mingcute:close-line" />}>
          Overdue
        </Label>
        <Label disabled>Disabled</Label>
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

const ICONS = [
  'solar:home-2-bold-duotone',
  'solar:user-rounded-bold-duotone',
  'solar:bell-bing-bold-duotone',
  'solar:settings-bold-duotone',
  'solar:cart-large-2-bold-duotone',
  'solar:chat-round-dots-bold-duotone',
  'solar:calendar-bold-duotone',
  'solar:heart-bold-duotone',
];

export function IconifyDemo() {
  return (
    <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
      <Box sx={rowSx}>
        {ICONS.map((icon) => (
          <Iconify key={icon} icon={icon} width={32} />
        ))}
      </Box>
      <Box sx={rowSx}>
        {COLORS.slice(1).map((color, index) => (
          <Iconify key={color} icon={ICONS[index]} width={24} sx={{ color: `${color}.main` }} />
        ))}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

const NAV_ICONS = [
  'ic-dashboard',
  'ic-analytics',
  'ic-banking',
  'ic-booking',
  'ic-mail',
  'ic-chat',
];

export function SvgColorDemo() {
  return (
    <Box sx={rowSx}>
      {NAV_ICONS.map((name, index) => (
        <SvgColor
          key={name}
          src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`}
          sx={{ width: 32, height: 32, color: `${COLORS[index + 1]}.main` }}
        />
      ))}
    </Box>
  );
}

// ----------------------------------------------------------------------

const FLAGS = ['US', 'FR', 'TN', 'DE', 'GB', 'JP', 'BR', 'CA', 'IT', 'ES', 'MA', 'SA'];

export function FlagIconDemo() {
  return (
    <Box sx={rowSx}>
      {FLAGS.map((code) => (
        <FlagIcon key={code} code={code} sx={{ width: 36, height: 26 }} />
      ))}
    </Box>
  );
}

// ----------------------------------------------------------------------

const FILES = [
  'report.pdf',
  'notes.docx',
  'budget.xlsx',
  'slides.pptx',
  'photo.png',
  'clip.mp4',
  'song.mp3',
  'archive.zip',
  'readme.txt',
  'design.ai',
  'folder',
];

export function FileThumbnailDemo() {
  return (
    <Box sx={rowSx}>
      {FILES.map((file) => (
        <FileThumbnail key={file} file={file} tooltip sx={{ width: 40, height: 40 }} />
      ))}
    </Box>
  );
}

// ----------------------------------------------------------------------

export function LogoDemo() {
  return (
    <Box sx={{ ...rowSx, gap: 4 }}>
      <Logo disabled />
      <Logo disabled isSingle={false} />
    </Box>
  );
}

// ----------------------------------------------------------------------

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'activity', label: 'Activity' },
  { value: 'settings', label: 'Settings' },
];

export function CustomTabsDemo() {
  const [tab, setTab] = useState('overview');

  return (
    <Box>
      <CustomTabs
        value={tab}
        onChange={(event, newValue) => setTab(newValue)}
        sx={{ borderRadius: 1 }}
      >
        {TABS.map((item) => (
          <Tab key={item.value} value={item.value} label={item.label} />
        ))}
      </CustomTabs>
      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
        Selected tab: <strong>{tab}</strong>
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function CustomPopoverDemo() {
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <Box>
      <Button
        variant="outlined"
        color="inherit"
        endIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        Open popover
      </Button>

      <CustomPopover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        slotProps={{ arrow: { placement: 'top-left' } }}
      >
        <MenuList>
          <MenuItem onClick={() => setAnchorEl(null)}>
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)} sx={{ color: 'error.main' }}>
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function SearchNotFoundDemo() {
  return <SearchNotFound query="unicorn" />;
}

// ----------------------------------------------------------------------

export function ScrollbarDemo() {
  return (
    <Box
      sx={(theme) => ({
        height: 160,
        borderRadius: 1,
        border: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
      })}
    >
      <Scrollbar sx={{ p: 2 }}>
        {Array.from({ length: 20 }, (_, index) => (
          <Typography key={index} variant="body2" sx={{ py: 0.5 }}>
            Scrollable item #{index + 1}
          </Typography>
        ))}
      </Scrollbar>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function AnimateTextDemo() {
  return (
    <AnimateText
      component="h3"
      variants={varFade('inUp', { distance: 24 })}
      textContent={['Build beautiful', 'interfaces faster']}
      sx={{ typography: 'h3', textAlign: 'center' }}
    />
  );
}

// ----------------------------------------------------------------------

export function AnimateCountUpDemo() {
  return (
    <Box sx={{ gap: 4, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
      {[
        { label: 'Users', to: 12500 },
        { label: 'Orders', to: 840 },
        { label: 'Revenue', to: 2400000 },
      ].map((item) => (
        <Box key={item.label}>
          <AnimateCountUp to={item.to} sx={{ typography: 'h3' }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ----------------------------------------------------------------------

export function AnimateBorderDemo() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <AnimateBorder
        sx={{ p: '2px', borderRadius: 1.5 }}
        slotProps={{
          primaryBorder: { size: 80, sx: { color: 'primary.main' } },
          secondaryBorder: { sx: { color: 'warning.main' } },
          svgSettings: { rx: '12px', ry: '12px' },
          outlineColor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.08),
        }}
      >
        <Button size="large" variant="text" sx={{ px: 3 }}>
          Animated border
        </Button>
      </AnimateBorder>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function AnimateLogoDemo() {
  return (
    <Box sx={{ gap: 6, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <AnimateLogoZoom sx={{ position: 'relative' }} />
      <AnimateLogoRotate sx={{ position: 'relative' }} />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function LoadingScreenDemo() {
  return <LoadingScreen sx={{ height: 80 }} />;
}

// ----------------------------------------------------------------------

const DemoSchema = zod.object({
  fullName: zod.string().min(1, { message: 'Full name is required!' }),
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  role: zod.string().min(1, { message: 'Role is required!' }),
  experience: zod.number(),
  rating: zod.number().min(1, { message: 'Please rate us!' }),
  notifications: zod.boolean(),
  terms: zod.boolean().refine((value) => value, { message: 'You must accept the terms!' }),
});

const ROLE_OPTIONS = [
  { value: 'developer', label: 'Developer' },
  { value: 'designer', label: 'Designer' },
  { value: 'manager', label: 'Manager' },
];

export function HookFormDemo() {
  const [submitted, setSubmitted] = useState(null);

  const methods = useForm({
    resolver: zodResolver(DemoSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: '',
      experience: 3,
      rating: 0,
      notifications: true,
      terms: false,
    },
  });

  const onSubmit = methods.handleSubmit((data) => setSubmitted(data));

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Box sx={{ gap: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <Field.Text name="fullName" label="Full name" />
        <Field.Text name="email" label="Email address" />
        <Field.Select name="role" label="Role" options={ROLE_OPTIONS} />
        <Field.Slider name="experience" label="Years of experience" min={0} max={20} />
        <Field.Rating name="rating" label="Rate this template" />
        <Box>
          <Field.Switch name="notifications" label="Email notifications" />
          <Field.Checkbox name="terms" label="I accept the terms" />
        </Box>
      </Box>

      <Box sx={{ mt: 3, gap: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          color="inherit"
          variant="outlined"
          onClick={() => {
            methods.reset();
            setSubmitted(null);
          }}
        >
          Reset
        </Button>
        <Button type="submit" variant="contained">
          Submit
        </Button>
      </Box>

      {submitted && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Submitted: {JSON.stringify(submitted)}
        </Alert>
      )}
    </Form>
  );
}
