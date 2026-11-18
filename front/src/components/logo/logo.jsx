import { forwardRef } from 'react';
import { mergeClasses } from 'minimal-shared/utils';

import Link from '@mui/material/Link';
import { styled } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/global-config';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export const LOGO_URL = `${CONFIG.assetsDir}/logo/CLAC_Nature_Eco_Logo-removebg-preview.png`;

/**
 * CLAC logo (image). `isSingle` renders a compact version (nav mini, mobile).
 */
export const Logo = forwardRef((props, ref) => {
  const { className, href = '/', isSingle = false, disabled, sx, ...other } = props;

  return (
    <LogoRoot
      ref={ref}
      component={RouterLink}
      href={href}
      aria-label="CLAC"
      underline="none"
      className={mergeClasses([logoClasses.root, className])}
      sx={[
        () => ({
          width: isSingle ? 56 : 132,
          height: isSingle ? 28 : 64,
          ...(disabled && { pointerEvents: 'none' }),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <img
        alt="CLAC — Nature & Économie circulaire"
        src={LOGO_URL}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </LogoRoot>
  );
});

// ----------------------------------------------------------------------

const LogoRoot = styled(Link)(() => ({
  flexShrink: 0,
  color: 'transparent',
  display: 'inline-flex',
  verticalAlign: 'middle',
}));
