import React, { useMemo } from "react";
import ReactSelect, { StylesConfig } from "react-select";
import { Box } from "@chakra-ui/react";
import { useIntl } from "react-intl";
import type { TaxOrder } from "../user/use-tax-order";

interface OptionType {
  label: string;
  value: string;
  original: TaxOrder;
}

interface TaxOrderComboboxProps {
  taxOrders: TaxOrder[];
  value: TaxOrder | undefined;
  onChange: (order: TaxOrder | undefined) => void;
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

export const TaxOrderCombobox = ({
  taxOrders,
  value,
  onChange,
  placeholder,
}: TaxOrderComboboxProps) => {
  const intl = useIntl();

  const options = useMemo(() => {
    const list = Array.isArray(taxOrders) ? taxOrders : [];
    return list.map((t) => ({
      label: `${t.tax_order} (${t.count})`,
      value: t.tax_order,
      original: t,
    }));
  }, [taxOrders]);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value?.tax_order) ?? null,
    [options, value?.tax_order]
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
          intl.formatMessage({ id: "select order placeholder", defaultMessage: "Select order..." })
        }
        noOptionsMessage={() =>
          intl.formatMessage({ id: "no options found", defaultMessage: "No options found" })
        }
        styles={defaultStyles}
      />
    </Box>
  );
};

export default TaxOrderCombobox;
