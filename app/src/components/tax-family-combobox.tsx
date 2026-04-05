import React, { useMemo } from "react";
import ReactSelect, { StylesConfig } from "react-select";
import { Box } from "@chakra-ui/react";
import { useIntl } from "react-intl";
import type { TaxFamily } from "../user/use-tax-family";

interface OptionType {
  label: string;
  value: string;
  original: TaxFamily;
}

interface TaxFamilyComboboxProps {
  taxFamilies: TaxFamily[];
  value: TaxFamily | undefined;
  onChange: (family: TaxFamily | undefined) => void;
  placeholder?: string;
}

const defaultStyles: StylesConfig<OptionType, false> = {
  control: (provided, state) => ({
    ...provided,
    minHeight: "40px",
    borderColor: state.isFocused ? "var(--chakra-colors-primary-500)" : provided.borderColor,
    boxShadow: state.isFocused ? "0 0 0 1px var(--chakra-colors-primary-500)" : provided.boxShadow,
    "&:hover": { borderColor: "var(--chakra-colors-primary-500)" },
  }),
  input: (provided) => ({ ...provided, padding: "0" }),
  menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
};

export const TaxFamilyCombobox = ({
  taxFamilies,
  value,
  onChange,
  placeholder,
}: TaxFamilyComboboxProps) => {
  const intl = useIntl();

  const options = useMemo(() => {
    const list = Array.isArray(taxFamilies) ? taxFamilies : [];
    return list.map((t) => ({
      label: `${t.tax_family} - ${t.tax_family_en} (${t.count})`,
      value: t.tax_family,
      original: t,
    }));
  }, [taxFamilies]);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value?.tax_family) ?? null,
    [options, value?.tax_family]
  );

  const handleChange = (option: OptionType | null) => {
    onChange(option?.original);
  };

  return (
    <Box>
      <ReactSelect<OptionType>
        options={options}
        value={selectedOption}
        onChange={handleChange}
        isSearchable
        isClearable
        placeholder={
          placeholder ??
          intl.formatMessage({ id: "select family placeholder", defaultMessage: "Select family..." })
        }
        noOptionsMessage={() =>
          intl.formatMessage({ id: "no options found", defaultMessage: "No options found" })
        }
        styles={defaultStyles}
      />
    </Box>
  );
};

export default TaxFamilyCombobox;
