import type { StylesConfig } from 'react-select';

const PRIMARY_500 = 'var(--chakra-colors-primary-500)';
const PRIMARY_50 = 'var(--chakra-colors-primary-50)';

/** Larger react-select styling for checklist country / order pickers. */
export function checklistSelectStyles<Option>(): StylesConfig<Option, false> {
  return {
    control: (provided, state) => ({
      ...provided,
      minHeight: '48px',
      fontSize: '16px',
      borderColor: state.isFocused ? PRIMARY_500 : provided.borderColor,
      borderWidth: state.isFocused ? '2px' : provided.borderWidth,
      boxShadow: state.isFocused ? `0 0 0 1px ${PRIMARY_500}` : provided.boxShadow,
      '&:hover': { borderColor: PRIMARY_500 },
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '8px 12px',
    }),
    input: (provided) => ({ ...provided, margin: 0, padding: 0 }),
    singleValue: (provided) => ({
      ...provided,
      fontSize: '16px',
      fontWeight: 600,
      color: 'var(--chakra-colors-primary-800)',
    }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: '16px',
    }),
    option: (provided, state) => ({
      ...provided,
      fontSize: '15px',
      padding: '12px 14px',
      backgroundColor: state.isSelected
        ? PRIMARY_500
        : state.isFocused
          ? PRIMARY_50
          : provided.backgroundColor,
      color: state.isSelected ? '#fff' : 'var(--chakra-colors-primary-800)',
      fontWeight: state.isSelected ? 600 : 400,
      cursor: 'pointer',
    }),
    menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
  };
}
