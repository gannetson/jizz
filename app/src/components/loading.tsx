import {Flex, Spinner} from "@chakra-ui/react"

export const Loading = () => {
  return (
    <Flex justifyContent={'center'}>
      <Spinner
        thickness='8px'
        speed='1s'
        emptyColor='orange.200'
        color='orange.400'
        size='xl'
      />
    </Flex>
  )
}