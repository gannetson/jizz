import {Box, Icon} from "@chakra-ui/react"
import {FaCertificate} from "react-icons/fa"
import {keyframes} from "@emotion/react";

const floatAnimation = keyframes`
    0% {
        transform: scale(1) rotate(0deg);
    }
    20% {
        transform: scale(1.1) rotate(5deg);
    }
    40% {
        transform: scale(1) rotate(0deg);
    }
    60% {
        transform: scale(1.1) rotate(-5deg);
    }
    80% {
        transform: scale(1.1) rotate(5deg);
    }
    100% {
        transform: scale(1) rotate(0deg);
    }
`;

export const ButtonBadge = ({text}: { text: string }) => {
  return (
    <Box
      position="absolute"
      top="-25px"
      right="-25px"
      width="100px"
      height="100px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={1}
    >
      <Box
        position="absolute"
        width="100px"
        height="100px"
        animation={`${floatAnimation} 3s ease-in-out infinite`}
      >
        <Icon
          as={FaCertificate}
          boxSize="100px"
          color="primary.700"
          position="absolute"
          top="0"
          left="0"
        />
        <Box
          position="absolute"
          color="white"
          fontSize="sm"
          fontWeight="bold"
          textAlign="center"
          width="100%"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
        >
          {text}
        </Box>
      </Box>
    </Box>
  )
}