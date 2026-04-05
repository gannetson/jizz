import {Box, Heading, RadioCard} from "@chakra-ui/react";
import {useContext, type ComponentType, type ReactNode} from "react";
import AppContext from "../core/app-context";
import {FormattedMessage} from "react-intl";

/** Chakra RadioCard slot typings omit `children` / conflict with Ark props; runtime is fine. */
const RcItem = RadioCard.Item as unknown as ComponentType<{
  value: string;
  w?: string;
  children?: ReactNode;
}>;
const RcItemText = RadioCard.ItemText as unknown as ComponentType<{
  children?: ReactNode;
}>;
const RcItemDescription = RadioCard.ItemDescription as unknown as ComponentType<{
  fontSize?: string;
  children?: ReactNode;
}>;

const SelectLevel = () => {
  const {level, setLevel} = useContext(AppContext);

  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'level'} defaultMessage={'Level'} />
      </Heading>
      <RadioCard.Root
        colorPalette="primary"
        variant="surface"
        size="md"
        value={level}
        onValueChange={(details: { value: string | null }) =>
          details.value && setLevel(details.value)}
        w="100%"
      >
        <Box display="flex" flexDirection="column" gap={4}>
          <RcItem value="beginner" w="100%">
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <RadioCard.ItemContent>
                <RcItemText>
                  <FormattedMessage id={'beginner'} defaultMessage={'Beginner'} />
                </RcItemText>
                <RcItemDescription fontSize="xs">
                  <FormattedMessage id={'simple multiple choice'} defaultMessage={'Very easy multiple choice'} />
                </RcItemDescription>
              </RadioCard.ItemContent>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
          </RcItem>
          <RcItem value="advanced" w="100%">
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <RadioCard.ItemContent>
                <RcItemText>
                  <FormattedMessage id={'advanced'} defaultMessage={'Advanced'} />
                </RcItemText>
                <RcItemDescription fontSize="xs">
                  <FormattedMessage id={'hard multiple choice'} defaultMessage={'Multiple choice with similar species'} />
                </RcItemDescription>
              </RadioCard.ItemContent>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
          </RcItem>
          <RcItem value="expert" w="100%">
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <RadioCard.ItemContent>
                <RcItemText>
                  <FormattedMessage id={'expert'} defaultMessage={'Expert'} />
                </RcItemText>
                <RcItemDescription fontSize="xs">
                  <FormattedMessage id={'text input'} defaultMessage={'Text input (with auto complete)'} />
                </RcItemDescription>
              </RadioCard.ItemContent>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
          </RcItem>
        </Box>
      </RadioCard.Root>
    </Box>
  );
};

export default SelectLevel;