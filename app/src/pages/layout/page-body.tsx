import {ReactElement, ReactNode} from "react";
import {Container} from "@chakra-ui/react";


const PageBody = ({children}: {children: ReactElement | ReactNode[]} ) => {

  return (
    <Container mt={20}>
      {children}
    </Container>
  )
};

export default PageBody;