import * as New from './demos-new';
import * as Existing from './demos-existing';

// ----------------------------------------------------------------------

/**
 * Registry of every component shown on the components page.
 * To show a new component: build it in src/components, add a demo, then add an entry here.
 */

const EXISTING = [
  {
    id: 'label',
    name: 'Label',
    category: 'Data display',
    description: 'Small status badge with soft, filled, outlined and inverted variants.',
    importPath: 'src/components/label',
    Demo: Existing.LabelDemo,
  },
  {
    id: 'iconify',
    name: 'Iconify',
    category: 'Data display',
    description: 'Render any of 200k+ icons from Iconify by name.',
    importPath: 'src/components/iconify',
    Demo: Existing.IconifyDemo,
  },
  {
    id: 'svg-color',
    name: 'SvgColor',
    category: 'Data display',
    description: 'Displays an SVG file as a mask so it can be tinted with any color.',
    importPath: 'src/components/svg-color',
    Demo: Existing.SvgColorDemo,
  },
  {
    id: 'flag-icon',
    name: 'FlagIcon',
    category: 'Data display',
    description: 'Country flag from an ISO 3166-1 alpha-2 code.',
    importPath: 'src/components/flag-icon',
    Demo: Existing.FlagIconDemo,
  },
  {
    id: 'file-thumbnail',
    name: 'FileThumbnail',
    category: 'Data display',
    description: 'Icon for a file based on its extension, with optional tooltip and actions.',
    importPath: 'src/components/file-thumbnail',
    Demo: Existing.FileThumbnailDemo,
  },
  {
    id: 'logo',
    name: 'Logo',
    category: 'Layout',
    description:
      'App logo in single (icon) or full (icon + wordmark) form, follows the theme color.',
    importPath: 'src/components/logo',
    Demo: Existing.LogoDemo,
  },
  {
    id: 'custom-tabs',
    name: 'CustomTabs',
    category: 'Navigation',
    description: 'Segmented-control style tabs built on MUI Tabs.',
    importPath: 'src/components/custom-tabs',
    Demo: Existing.CustomTabsDemo,
  },
  {
    id: 'custom-popover',
    name: 'CustomPopover',
    category: 'Navigation',
    description: 'Popover with an arrow and configurable placement, ideal for action menus.',
    importPath: 'src/components/custom-popover',
    Demo: Existing.CustomPopoverDemo,
  },
  {
    id: 'search-not-found',
    name: 'SearchNotFound',
    category: 'Feedback',
    description: 'Message shown when a search returns no results.',
    importPath: 'src/components/search-not-found',
    Demo: Existing.SearchNotFoundDemo,
  },
  {
    id: 'scrollbar',
    name: 'Scrollbar',
    category: 'Layout',
    description: 'Custom styled scroll container powered by SimpleBar.',
    importPath: 'src/components/scrollbar',
    Demo: Existing.ScrollbarDemo,
  },
  {
    id: 'loading-screen',
    name: 'LoadingScreen',
    category: 'Feedback',
    description: 'Centered progress bar used as the lazy-route fallback.',
    importPath: 'src/components/loading-screen',
    Demo: Existing.LoadingScreenDemo,
  },
  {
    id: 'animate-text',
    name: 'AnimateText',
    category: 'Animation',
    description: 'Animates text character by character when it scrolls into view.',
    importPath: 'src/components/animate',
    Demo: Existing.AnimateTextDemo,
  },
  {
    id: 'animate-count-up',
    name: 'AnimateCountUp',
    category: 'Animation',
    description: 'Counts a number up from zero, shortening to k / m / b automatically.',
    importPath: 'src/components/animate',
    Demo: Existing.AnimateCountUpDemo,
  },
  {
    id: 'animate-border',
    name: 'AnimateBorder',
    category: 'Animation',
    description: 'Glowing light that travels around the border of its child.',
    importPath: 'src/components/animate',
    Demo: Existing.AnimateBorderDemo,
  },
  {
    id: 'animate-logo',
    name: 'AnimateLogoZoom / Rotate',
    exportName: 'AnimateLogoZoom, AnimateLogoRotate',
    category: 'Animation',
    description: 'Animated logo variants used by the splash screen.',
    importPath: 'src/components/animate',
    Demo: Existing.AnimateLogoDemo,
  },
  {
    id: 'hook-form',
    name: 'Form & Field',
    exportName: 'Form, Field',
    category: 'Inputs',
    description:
      'react-hook-form wrappers with zod validation. Field.Select, Switch, Checkbox, Slider and Rating are new.',
    importPath: 'src/components/hook-form',
    Demo: Existing.HookFormDemo,
  },
];

const NEW = [
  {
    id: 'stat-card',
    name: 'StatCard',
    category: 'Data display',
    description: 'KPI card with icon, animated total and a trend indicator.',
    importPath: 'src/components/stat-card',
    Demo: New.StatCardDemo,
  },
  {
    id: 'user-card',
    name: 'UserCard',
    category: 'Data display',
    description: 'Profile card with cover, avatar, social links and stats.',
    importPath: 'src/components/user-card',
    Demo: New.UserCardDemo,
  },
  {
    id: 'pricing-card',
    name: 'PricingCard',
    category: 'Data display',
    description: 'Subscription plan card with features list and highlighted state.',
    importPath: 'src/components/pricing-card',
    Demo: New.PricingCardDemo,
  },
  {
    id: 'data-table',
    name: 'DataTable',
    category: 'Data display',
    description: 'Client-side table with sortable columns, pagination and custom cell renderers.',
    importPath: 'src/components/data-table',
    Demo: New.DataTableDemo,
  },
  {
    id: 'image',
    name: 'Image',
    category: 'Data display',
    description: 'Lazy image with aspect ratio, loading skeleton, overlay and error fallback.',
    importPath: 'src/components/image',
    Demo: New.ImageDemo,
  },
  {
    id: 'empty-content',
    name: 'EmptyContent',
    category: 'Feedback',
    description: 'Placeholder for empty lists and tables, with optional action.',
    importPath: 'src/components/empty-content',
    Demo: New.EmptyContentDemo,
  },
  {
    id: 'confirm-dialog',
    name: 'ConfirmDialog',
    category: 'Feedback',
    description: 'Ready-made confirmation dialog for destructive actions.',
    importPath: 'src/components/confirm-dialog',
    Demo: New.ConfirmDialogDemo,
  },
  {
    id: 'custom-breadcrumbs',
    name: 'CustomBreadcrumbs',
    category: 'Navigation',
    description: 'Page heading with breadcrumbs and an action slot.',
    importPath: 'src/components/custom-breadcrumbs',
    Demo: New.CustomBreadcrumbsDemo,
  },
  {
    id: 'search-input',
    name: 'SearchInput',
    category: 'Inputs',
    description: 'Debounced search field with a clear button.',
    importPath: 'src/components/search-input',
    Demo: New.SearchInputDemo,
  },
  {
    id: 'password-field',
    name: 'PasswordField',
    category: 'Inputs',
    description: 'Password input with show/hide toggle and strength meter.',
    importPath: 'src/components/password-field',
    Demo: New.PasswordFieldDemo,
  },
  {
    id: 'number-input',
    name: 'NumberInput',
    category: 'Inputs',
    description: 'Quantity stepper with min, max and step.',
    importPath: 'src/components/number-input',
    Demo: New.NumberInputDemo,
  },
  {
    id: 'color-picker',
    name: 'ColorPicker',
    category: 'Inputs',
    description: 'Swatch picker supporting single or multiple selection.',
    importPath: 'src/components/color-picker',
    Demo: New.ColorPickerDemo,
  },
  {
    id: 'upload-box',
    name: 'UploadBox',
    category: 'Inputs',
    description: 'Drag & drop file zone with file list and remove buttons.',
    importPath: 'src/components/upload-box',
    Demo: New.UploadBoxDemo,
  },
  {
    id: 'copy-button',
    name: 'CopyButton',
    category: 'Inputs',
    description: 'Copies a value to the clipboard with "Copied!" feedback.',
    importPath: 'src/components/copy-button',
    Demo: New.CopyButtonDemo,
  },
];

export const COMPONENTS = [
  ...EXISTING.map((item) => ({ ...item, isNew: false })),
  ...NEW.map((item) => ({ ...item, isNew: true })),
];

// Components that need the full row width.
export const WIDE_COMPONENTS = ['hook-form', 'data-table', 'pricing-card', 'label'];
