import {Flex, Spinner} from "@chakra-ui/react"

export const Loading = () => {
  return (
    <Flex justifyContent={'center'}>
      <Spinner
        borderWidth='8px'
        animationDuration='1s'
        css={{ "--spinner-track-color": "colors.orange.200" }}
        color='orange.400'
        size='xl'
      />
    </Flex>
  )
}