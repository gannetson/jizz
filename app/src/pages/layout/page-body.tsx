import {ReactElement, ReactNode} from "react";
import {Container, Flex} from "@chakra-ui/react";


const PageBody = ({children}: {children: ReactElement | ReactNode[]} ) => {

  return (
    <Container maxW={['full', '800px']} mt={20}>
      <Flex direction={'column'} gap={4}>
        {children}
      </Flex>
    </Container>
  )
};

export default PageBody;