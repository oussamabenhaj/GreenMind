// ----------------------------------------------------------------------

export const themeConfig = {
  /** **************************************
   * Base
   *************************************** */
  direction: 'ltr',
  defaultMode: 'light',
  modeStorageKey: 'theme-mode',
  classesPrefix: 'minimal',
  /** **************************************
   * Typography
   *************************************** */
  fontFamily: {
    primary: 'Public Sans Variable',
    secondary: 'Barlow',
  },
  /** **************************************
   * Palette
   *************************************** */
  palette: {
    // CLAC leaf green (logo)
    primary: {
      lighter: '#E3F6D3',
      light: '#8BD35A',
      main: '#3E9F2E',
      dark: '#2A7A23',
      darker: '#17481A',
      contrastText: '#FFFFFF',
    },
    // Fresh lime (young leaves)
    secondary: {
      lighter: '#F1FAD2',
      light: '#C5E86C',
      main: '#8CC63F',
      dark: '#5F9424',
      darker: '#355D10',
      contrastText: '#FFFFFF',
    },
    // River blue (logo)
    info: {
      lighter: '#D8F3FB',
      light: '#7FD3EE',
      main: '#2DA8D8',
      dark: '#18719C',
      darker: '#0B3D5C',
      contrastText: '#FFFFFF',
    },
    success: {
      lighter: '#D3FCD2',
      light: '#77ED8B',
      main: '#22C55E',
      dark: '#118D57',
      darker: '#065E49',
      contrastText: '#ffffff',
    },
    warning: {
      lighter: '#FFF5CC',
      light: '#FFD666',
      main: '#FFAB00',
      dark: '#B76E00',
      darker: '#7A4100',
      contrastText: '#1C252E',
    },
    error: {
      lighter: '#FFE9D5',
      light: '#FFAC82',
      main: '#FF5630',
      dark: '#B71D18',
      darker: '#7A0916',
      contrastText: '#FFFFFF',
    },
    grey: {
      50: '#FCFDFD',
      100: '#F9FAFB',
      200: '#F4F6F8',
      300: '#DFE3E8',
      400: '#C4CDD5',
      500: '#919EAB',
      600: '#637381',
      700: '#454F5B',
      800: '#1C252E',
      900: '#141A21',
    },
    common: { black: '#000000', white: '#FFFFFF' },
  },
  /** **************************************
   * Css variables
   *************************************** */
  cssVariables: {
    cssVarPrefix: '',
    colorSchemeSelector: 'data-color-scheme',
  },
};
