import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Heading, Slider, SliderTrack, SliderFilledTrack, SliderThumb, SliderMark, Text} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import { useSliderStyles } from "../base/slider.styling";

export const SelectLength = () => {
  const {length, setLength, country} = useContext(AppContext);
  const styles = useSliderStyles();

  const marks = [
    { value: 10, label: '10' },
    { value: 100, label: '100' }
  ];

  return (
    <Box>
      <Heading size={'md'} mb={2}>
        <FormattedMessage id={'question'} defaultMessage={'Questions'}/>
      </Heading>
      {country && (
        <Text mb={3}>
          <FormattedMessage
            id={'how many questions'}
            defaultMessage={'How many questions do you want to answer?'}
            values={{count: country.count, country: country.name}}
          />
        </Text>
      )}
      <Box px={4} py={2}>
        <Slider
          aria-label="question-slider"
          value={parseInt(length || '10')}
          min={10}
          max={100}
          step={5}
          onChange={(val) => setLength && setLength(val.toString())}
          colorScheme="orange"
        >
          {marks.map((mark) => (
            <SliderMark
              key={mark.value}
              value={mark.value}
              {...styles.mark}
            >
              {mark.label}
            </SliderMark>
          ))}
          <SliderTrack {...styles.track}>
            <SliderFilledTrack {...styles.filledTrack} />
          </SliderTrack>
          <SliderThumb {...styles.thumb}>
            <Text fontSize="sm" fontWeight="bold">
              {length}
            </Text>
          </SliderThumb>
        </Slider>
      </Box>
    </Box>
  )
};
