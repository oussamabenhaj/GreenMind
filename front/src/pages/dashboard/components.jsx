import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/global-config';

import { ComponentsOverviewView } from 'src/sections/components-overview';

// ----------------------------------------------------------------------

const metadata = { title: `Components | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <ComponentsOverviewView />
    </>
  );
}
