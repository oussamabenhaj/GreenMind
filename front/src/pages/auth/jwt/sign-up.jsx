import { Helmet } from 'react-helmet-async';

import { t } from 'src/locales/i18n';
import { CONFIG } from 'src/global-config';

import { JwtSignUpView } from 'src/auth/view/jwt';
// ----------------------------------------------------------------------


export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`${t('Inscription')} · ${CONFIG.appName}`}</title>
      </Helmet>

      <JwtSignUpView />
    </>
  );
}
