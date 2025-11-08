import React, { useMemo } from 'react';
import {
  Portal,
  Select,
  createListCollection,
  Spinner,
  Box,
} from '@chakra-ui/react';
import { Language } from '../core/app-context';

interface ChakraSelectProps<T = any> {
  options?: T[];
  getOptionLabel?: (option: T) => string;
  getOptionValue?: (option: T) => string;
  value?: T | null;
  onChange?: (value: T | null) => void;
  placeholder?: React.ReactNode;
  isClearable?: boolean;
  isLoading?: boolean;
  autoFocus?: boolean;
  chakraStyles?: {
    placeholder?: (provided: any) => any;
    input?: (provided: any) => any;
  };
}

export function ChakraSelect<T = any>({
  options = [],
  getOptionLabel = (option: any) => String(option?.label ?? option?.name ?? option),
  getOptionValue = (option: any) => String(option?.value ?? option?.code ?? option?.id ?? option),
  value,
  onChange,
  placeholder,
  isClearable = false,
  isLoading = false,
  autoFocus = false,
  chakraStyles,
}: ChakraSelectProps<T>) {
  // Convert options to collection format
  const collection = useMemo(() => {
    const items = options.map((option, index) => ({
      label: getOptionLabel(option),
      value: getOptionValue(option),
      original: option,
      index,
    }));
    return createListCollection({ items });
  }, [options, getOptionLabel, getOptionValue]);

  // Get selected value string
  const selectedValue = value ? getOptionValue(value) : undefined;

  const handleValueChange = (details: { value: string[] }) => {
    const selectedValue = details.value[0];
    const selectedItem = collection.items.find((item: any) => item.value === selectedValue);
    if (selectedItem) {
      onChange?.(selectedItem.original);
    } else if (selectedValue === undefined || selectedValue === '') {
      onChange?.(null);
    }
  };

  const placeholderText = typeof placeholder === 'string' 
    ? placeholder 
    : 'Select...';

  return (
    <Select.Root
      collection={collection}
      value={selectedValue ? [selectedValue] : []}
      onValueChange={handleValueChange}
      disabled={isLoading}
    >
      <Select.HiddenSelect />
      {/* @ts-expect-error - Select.Control accepts children in runtime */}
      <Select.Control>
        {/* @ts-expect-error - Select.Trigger accepts children and cursor in runtime */}
        <Select.Trigger cursor="pointer">
          {/* @ts-expect-error - Select.ValueText accepts placeholder in runtime */}
          <Select.ValueText placeholder={placeholderText} />
        </Select.Trigger>
        <Select.IndicatorGroup>
          {isLoading ? (
            <Box position="absolute" right="8px" top="50%" transform="translateY(-50%)" zIndex={1}>
              <Spinner size="sm" />
            </Box>
          ) : (
            <Select.Indicator />
          )}
          {isClearable && selectedValue && (
            // @ts-expect-error - Select.ClearTrigger accepts onClick in runtime
            <Select.ClearTrigger onClick={() => onChange?.(null)} />
          )}
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        {/* @ts-expect-error - Select.Positioner accepts children in runtime */}
        <Select.Positioner>
          {/* @ts-expect-error - Select.Content accepts children in runtime */}
          <Select.Content>
            {isLoading ? (
              <Box p={2} textAlign="center" color="gray.500">
                Loading...
              </Box>
            ) : collection.items.length === 0 ? (
              <Box p={2} textAlign="center" color="gray.500">
                No options found
              </Box>
            ) : (
              collection.items.map((item: {value: string, label: string, index: number}) => (
                // @ts-expect-error - Select.Item accepts item prop in runtime
                <Select.Item key={`${item.value}-${item.index}`} item={item} />
              ))
            )}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}

