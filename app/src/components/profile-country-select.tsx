import { useContext } from "react";
import { useIntl } from "react-intl";
import AppContext from "../core/app-context";
import { getCountryDisplayName } from "../data/country-names-nl";
import CountryCombobox from "./country-combobox";

interface CountrySelectProps {
  countries: { code: string; name: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
}

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
    />
  );
};
