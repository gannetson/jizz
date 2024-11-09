import React, {useState} from "react";
import {FaStar} from "react-icons/fa";
import {Radio, HStack, Box, RadioGroup, Text} from "@chakra-ui/react";


type Props = {
  rating: number;
  setRating: (rating: number) => void;
  count?: number;
  size?: number;
};


export default function StarRating({rating, setRating, count, size}: Props) {

  const [hover, setHover] = useState<number | null>(null);

  return (
    <RadioGroup
      name="rating"
      value={rating.toString()}
      onChange={(value) => setRating(Number(value))}
    >
      <HStack spacing="4">
        {[...Array(count || 5)].map((_, index) => {
          const ratingValue = index + 1;
          return (
            <Box
              as="label"
              key={index}
              color={ratingValue <= (hover || rating) ? "orange.500" : "orange.100"}
              onMouseEnter={() => setHover(ratingValue)}
              onMouseLeave={() => setHover(null)}
            >
              <Radio
                value={ratingValue.toString()}
                display="none"
              />
              <FaStar
                cursor="pointer"
                size={size || 20}
              />
            </Box>
          )
        })}
      </HStack>
    </RadioGroup>

  );
}
