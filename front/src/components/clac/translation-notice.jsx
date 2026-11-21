import Alert from '@mui/material/Alert';

import { t, useLang, langMeta } from 'src/locales';

// ----------------------------------------------------------------------

/**
 * Multilingual editing helper shown at the top of entity forms.
 *
 * Forms have a single input per field: what is typed is saved for the current
 * interface language, the other language is kept untouched (see backend
 * src/i18n/write.js). This notice tells the editor which language they are
 * editing and warns when the text shown is a fallback from the other language.
 *
 * `item` = the entity being edited (null when creating), `fields` = translatable fields.
 */
export function TranslationNotice({ item, fields = ['title', 'description'], sx }) {
  const { lang } = useLang();
  const language = langMeta(lang).label;
  const missing = (item?.i18n_missing ?? []).filter((f) => fields.includes(f));

  if (missing.length) {
    return (
      <Alert severity="warning" sx={{ mb: 2, ...sx }}>
        {t('Traduction manquante en {{language}} : le texte affiché vient de l’autre langue. Saisissez la traduction puis enregistrez.', { language })}
      </Alert>
    );
  }
  return (
    <Alert severity="info" variant="outlined" sx={{ mb: 2, py: 0.25, ...sx }}>
      {item
        ? t('Vous modifiez la version {{language}} — l’autre langue est conservée.', { language })
        : t('Saisie en {{language}} — changez de langue pour ajouter la traduction.', { language })}
    </Alert>
  );
}
