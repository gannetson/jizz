import { useIntl } from "react-intl";
import CountryCombobox from "./country-combobox";

interface CountrySelectProps {
  countries: { code: string; name: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
}

/** Thin adapter for profile forms that store country as a code string. */
export const ProfileCountrySelect = ({ countries, value, onChange }: CountrySelectProps) => {
  const intl = useIntl();
  const countriesArray = Array.isArray(countries) ? countries : [];
  const selectedCountry = countriesArray.find((c) => c.code === value) ?? null;

  return (
    <CountryCombobox
      countries={countriesArray}
      value={selectedCountry}
      onChange={(c) => onChange(c?.code ?? null)}
      allowEmpty
      emptyLabel={intl.formatMessage({ id: "none", defaultMessage: "None" })}
      excludeRegionCodes
    />
  );
};
