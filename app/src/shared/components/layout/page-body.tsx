import {ReactElement, ReactNode} from "react";
import {Container, Flex} from "@chakra-ui/react";

const PageBody = ({
  children,
  maxW = ['full', '800px'],
}: {
  children: ReactElement | ReactNode[];
  maxW?: React.ComponentProps<typeof Container>['maxW'];
}) => {
  return (
    <Container maxW={maxW} mt={20}>
      <Flex direction={'column'} gap={4}>
        {children}
      </Flex>
    </Container>
  )
};

export default PageBody;

