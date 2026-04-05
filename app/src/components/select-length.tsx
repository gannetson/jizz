import {useContext, type ComponentType, type ReactNode} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading, RadioCard, Text} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import { getCountryDisplayName } from "../data/country-names-nl";

/** Chakra RadioCard slot typings omit `children` / conflict with Ark props; runtime is fine. */
const RcItem = RadioCard.Item as unknown as ComponentType<{
  value: string;
  w?: string;
  children?: ReactNode;
}>;
const RcItemText = RadioCard.ItemText as unknown as ComponentType<{
  children?: ReactNode;
}>;

function LengthRadioOption({ value }: { value: string }) {
  return (
    <RcItem value={value}>
      <RadioCard.ItemHiddenInput />
      <RadioCard.ItemControl>
        <RadioCard.ItemContent>
          <RcItemText>{value}</RcItemText>
        </RadioCard.ItemContent>
        <RadioCard.ItemIndicator />
      </RadioCard.ItemControl>
    </RcItem>
  );
}

export const SelectLength = () => {
  const { length, setLength, country, language } = useContext(AppContext);
  const locale = language === 'nl' ? 'nl' : 'en';

  const onChange = (value: string) => {
    setLength && setLength(value)
  }

  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'question'} defaultMessage={'Questions'}/>
      </Heading>
      {country && (
        <Text mb={4}>
          <FormattedMessage
            id={'how many questions'}
            defaultMessage={'How many questions do you want to answer?'}
            values={{ count: country.count, country: getCountryDisplayName(country, locale) }}
          />
        </Text>
      )}
      <RadioCard.Root
        colorPalette="primary"
        variant="surface"
        size="md"
        value={length || '10'}
        onValueChange={(details: { value: string | null }) =>
          details.value && onChange(details.value)}
      >
        <Flex direction="row" gap={4} flexWrap="wrap">
          {(['10', '20', '50', '100'] as const).map((v) => (
            <LengthRadioOption key={v} value={v} />
          ))}
        </Flex>
      </RadioCard.Root>
    </Box>
  )
};
