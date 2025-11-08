import React, {useState} from "react";
import {FaStar} from "react-icons/fa";
import {RadioGroupRoot, RadioGroupItem, RadioGroupItemControl, RadioGroupItemHiddenInput, HStack, Box, Text} from "@chakra-ui/react";


type Props = {
  rating: number;
  setRating: (rating: number) => void;
  count?: number;
  size?: number;
};


export default function StarRating({rating, setRating, count, size}: Props) {

  const [hover, setHover] = useState<number | null>(null);

  return (
    <RadioGroupRoot
      name="rating"
      value={rating.toString()}
      onValueChange={(e: { value?: string }) => e.value && setRating(Number(e.value))}
    >
      <HStack gap="4">
        {[...Array(count || 5)].map((_, index) => {
          const ratingValue = index + 1;
          return (
            <Box
              as="label"
              key={index}
              cursor="pointer"
              color={ratingValue <= (hover || rating) ? "orange.500" : "orange.100"}
              onMouseEnter={() => setHover(ratingValue)}
              onMouseLeave={() => setHover(null)}
            >
              <RadioGroupItem value={ratingValue.toString()}>
                <RadioGroupItemHiddenInput />
                <RadioGroupItemControl display="none" />
                <FaStar
                  cursor="pointer"
                  size={size || 20}
                />
              </RadioGroupItem>
            </Box>
          )
        })}
      </HStack>
    </RadioGroupRoot>

  );
}
