import { APP_LOCALES, APP_LOCALE_LABELS, type AppLocale } from "../i18n/app-locales";

type AppLanguageSelectProps = {
  value: string;
  onChange: (locale: AppLocale) => void;
  id?: string;
};

export function AppLanguageSelect({ value, onChange, id }: AppLanguageSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as AppLocale)}
      style={{
        width: "100%",
        minHeight: 40,
        paddingLeft: 12,
        paddingRight: 12,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--chakra-colors-gray-200, #e2e8f0)",
        borderRadius: 6,
        background: "white",
        fontSize: 16,
      }}
    >
      {APP_LOCALES.map((locale) => (
        <option key={locale} value={locale}>
          {APP_LOCALE_LABELS[locale]}
        </option>
      ))}
    </select>
  );
}
