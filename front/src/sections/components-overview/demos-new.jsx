import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';
import { PlanFreeIcon, PlanStarterIcon, PlanPremiumIcon } from 'src/assets/icons';

import { Image } from 'src/components/image';
import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { StatCard } from 'src/components/stat-card';
import { UserCard } from 'src/components/user-card';
import { DataTable } from 'src/components/data-table';
import { UploadBox } from 'src/components/upload-box';
import { CopyButton } from 'src/components/copy-button';
import { SearchInput } from 'src/components/search-input';
import { NumberInput } from 'src/components/number-input';
import { ColorPicker } from 'src/components/color-picker';
import { PricingCard } from 'src/components/pricing-card';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { PasswordField } from 'src/components/password-field';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const avatar = (index) => `${CONFIG.assetsDir}/assets/images/mock/avatar/avatar-${index}.webp`;

// ----------------------------------------------------------------------

export function StatCardDemo() {
  return (
    <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      <StatCard
        title="Total users"
        total={18765}
        percent={2.6}
        icon="solar:users-group-rounded-bold-duotone"
      />
      <StatCard
        title="Refunds"
        total={312}
        percent={-1.4}
        color="error"
        icon="solar:wallet-money-bold-duotone"
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function EmptyContentDemo() {
  return (
    <EmptyContent
      filled
      title="No messages yet"
      description="When you receive messages they will appear here."
      imgUrl={`${CONFIG.assetsDir}/assets/icons/empty/ic-chat-empty.svg`}
      action={
        <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />}>
          New message
        </Button>
      }
    />
  );
}

// ----------------------------------------------------------------------

export function ConfirmDialogDemo() {
  const [open, setOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  return (
    <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
      <Button
        variant="contained"
        color="error"
        startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
        onClick={() => setOpen(true)}
      >
        Delete item
      </Button>

      {deleted && <Label color="error">Item deleted</Label>}

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete"
        content="Are you sure you want to delete this item? This action cannot be undone."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setDeleted(true);
              setOpen(false);
            }}
          >
            Delete
          </Button>
        }
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function CustomBreadcrumbsDemo() {
  return (
    <CustomBreadcrumbs
      sx={{ mb: 0 }}
      heading="Edit user"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'User', href: paths.dashboard.root },
        { name: 'Jayvion Simon' },
      ]}
      action={
        <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />}>
          New user
        </Button>
      }
    />
  );
}

// ----------------------------------------------------------------------

export function ImageDemo() {
  return (
    <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
      <Image
        ratio="1/1"
        alt="About hero"
        src={`${CONFIG.assetsDir}/assets/images/about/hero.webp`}
        sx={{ borderRadius: 1.5 }}
      />
      <Image
        ratio="1/1"
        alt="Vision"
        src={`${CONFIG.assetsDir}/assets/images/about/vision.webp`}
        overlay="linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6))"
        sx={{ borderRadius: 1.5 }}
      />
      <Image ratio="1/1" alt="Broken" src="/does-not-exist.webp" sx={{ borderRadius: 1.5 }} />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function UserCardDemo() {
  return (
    <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      <UserCard
        user={{
          name: 'Jayvion Simon',
          role: 'Software engineer',
          avatarUrl: avatar(1),
          socials: { facebook: '#', linkedin: '#', twitter: '#' },
          stats: [
            { label: 'Followers', value: '9.9k' },
            { label: 'Following', value: '1.9k' },
            { label: 'Posts', value: 128 },
          ],
        }}
      />
      <UserCard
        user={{
          name: 'Lucian Obrien',
          role: 'UI/UX designer',
          avatarUrl: avatar(2),
          socials: { instagram: '#', linkedin: '#' },
          stats: [
            { label: 'Projects', value: 42 },
            { label: 'Reviews', value: 310 },
          ],
        }}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function UploadBoxDemo() {
  const [files, setFiles] = useState([]);

  return (
    <UploadBox value={files} onChange={setFiles} helperText="Any file type, multiple allowed." />
  );
}

// ----------------------------------------------------------------------

export function NumberInputDemo() {
  const [quantity, setQuantity] = useState(1);

  return (
    <Box sx={{ gap: 3, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
      <NumberInput value={quantity} onChange={setQuantity} min={1} max={10} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Quantity: <strong>{quantity}</strong> (min 1, max 10)
      </Typography>
      <NumberInput value={5} disabled />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function CopyButtonDemo() {
  const apiKey = 'demo-api-key-0000-not-a-real-secret';

  return (
    <Box
      sx={{
        pl: 2,
        pr: 1,
        py: 1,
        gap: 1,
        display: 'flex',
        borderRadius: 1,
        alignItems: 'center',
        bgcolor: 'background.neutral',
      }}
    >
      <Box component="code" sx={{ flexGrow: 1, typography: 'body2', fontFamily: 'monospace' }}>
        {apiKey}
      </Box>
      <CopyButton value={apiKey} title="Copy API key" />
    </Box>
  );
}

// ----------------------------------------------------------------------

const FRUITS = ['Apple', 'Banana', 'Cherry', 'Grape', 'Mango', 'Orange', 'Peach', 'Strawberry'];

export function SearchInputDemo() {
  const [query, setQuery] = useState('');

  const results = FRUITS.filter((fruit) => fruit.toLowerCase().includes(query.toLowerCase()));

  return (
    <Box>
      <SearchInput fullWidth value={query} onSearch={setQuery} placeholder="Search fruits..." />
      <Box sx={{ mt: 2, gap: 1, display: 'flex', flexWrap: 'wrap' }}>
        {results.length ? (
          results.map((fruit) => <Label key={fruit}>{fruit}</Label>)
        ) : (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            No fruit matches “{query}”
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

const PLANS = [
  {
    name: 'Basic',
    price: 0,
    caption: 'Forever free',
    icon: <PlanFreeIcon sx={{ width: 48, height: 48 }} />,
    features: [
      { text: '3 prototypes' },
      { text: '3 boards' },
      { text: 'Up to 5 team members', disabled: true },
    ],
  },
  {
    name: 'Starter',
    price: 9.99,
    caption: 'Billed monthly',
    highlighted: true,
    icon: <PlanStarterIcon sx={{ width: 48, height: 48 }} />,
    features: [
      { text: 'Unlimited prototypes' },
      { text: 'Unlimited boards' },
      { text: 'Up to 5 team members' },
    ],
  },
  {
    name: 'Premium',
    price: 24.99,
    caption: 'Billed monthly',
    icon: <PlanPremiumIcon sx={{ width: 48, height: 48 }} />,
    features: [
      { text: 'Everything in Starter' },
      { text: 'Advanced permissions' },
      { text: 'Unlimited team members' },
    ],
  },
];

export function PricingCardDemo() {
  const [selected, setSelected] = useState(null);

  return (
    <Box>
      <Box
        sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}
      >
        {PLANS.map(({ icon, highlighted, ...plan }) => (
          <PricingCard
            key={plan.name}
            plan={plan}
            icon={icon}
            highlighted={highlighted}
            onSelect={(item) => setSelected(item.name)}
          />
        ))}
      </Box>
      {selected && (
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          You selected the <strong>{selected}</strong> plan.
        </Typography>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

export function PasswordFieldDemo() {
  const [password, setPassword] = useState('');

  return (
    <PasswordField
      showStrength
      label="Password"
      value={password}
      onChange={(event) => setPassword(event.target.value)}
      helperText="Use 8+ characters with upper & lower case, a number and a symbol."
    />
  );
}

// ----------------------------------------------------------------------

const STATUS_COLOR = { active: 'success', pending: 'warning', banned: 'error' };

const USERS = [
  {
    id: 1,
    name: 'Jayvion Simon',
    email: 'jayvion@example.com',
    role: 'Admin',
    status: 'active',
    orders: 34,
  },
  {
    id: 2,
    name: 'Lucian Obrien',
    email: 'lucian@example.com',
    role: 'Editor',
    status: 'pending',
    orders: 12,
  },
  {
    id: 3,
    name: 'Deja Brady',
    email: 'deja@example.com',
    role: 'Viewer',
    status: 'active',
    orders: 7,
  },
  {
    id: 4,
    name: 'Harrison Stein',
    email: 'harrison@example.com',
    role: 'Editor',
    status: 'banned',
    orders: 0,
  },
  {
    id: 5,
    name: 'Reece Chung',
    email: 'reece@example.com',
    role: 'Viewer',
    status: 'active',
    orders: 21,
  },
  {
    id: 6,
    name: 'Lainey Davidson',
    email: 'lainey@example.com',
    role: 'Admin',
    status: 'pending',
    orders: 45,
  },
  {
    id: 7,
    name: 'Cristopher Cardenas',
    email: 'cristopher@example.com',
    role: 'Viewer',
    status: 'active',
    orders: 3,
  },
];

const USER_COLUMNS = [
  { id: 'name', label: 'Name', sortable: true },
  { id: 'email', label: 'Email', sortable: true },
  { id: 'role', label: 'Role', sortable: true },
  { id: 'orders', label: 'Orders', align: 'right', sortable: true },
  {
    id: 'status',
    label: 'Status',
    render: (row) => <Label color={STATUS_COLOR[row.status]}>{row.status}</Label>,
  },
];

export function DataTableDemo() {
  return <DataTable dense rows={USERS} columns={USER_COLUMNS} defaultOrderBy="name" />;
}

// ----------------------------------------------------------------------

const PALETTE = ['#00A76F', '#8E33FF', '#00B8D9', '#22C55E', '#FFAB00', '#FF5630', '#1C252E'];

export function ColorPickerDemo() {
  const [color, setColor] = useState(PALETTE[0]);
  const [colors, setColors] = useState([PALETTE[1], PALETTE[3]]);

  return (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Single —{' '}
          <Box component="span" sx={{ color }}>
            {color}
          </Box>
        </Typography>
        <ColorPicker options={PALETTE} value={color} onChange={setColor} />
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Multiple — {colors.length} selected
        </Typography>
        <ColorPicker options={PALETTE} value={colors} onChange={setColors} size={28} />
      </Box>
    </Box>
  );
}
