import {ReactElement, ReactNode} from "react";
import {Flex} from "@chakra-ui/react";


const PageHeader = ({children}: {children: ReactElement | ReactNode[]} ) => {

  return (
    <Flex
      direction={'row'}
      justifyContent='space-between'
      alignContent={'center'}
      pl={16} pr={8} py={2}
      backgroundColor={'gray.100'}
      position={'fixed'}
      width={'full'}
      shadow={'md'}
    >
      {children}
    </Flex>
  )
};

export default PageHeader;