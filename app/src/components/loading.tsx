import {Flex, Spinner} from "@chakra-ui/react"

export const Loading = () => {
  return (
    <Flex justifyContent={'center'}>
      <Spinner
        color='primary.400'
        size='xl'
      />
    </Flex>
  )
}