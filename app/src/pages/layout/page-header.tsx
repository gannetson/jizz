import {ReactElement, ReactNode} from "react";
import {Flex} from "@chakra-ui/react";


const PageHeader = ({children}: {children: ReactElement | ReactNode[]} ) => {

  return (
    <Flex
      direction={'row'}
      justifyContent='space-between'
      alignContent={'center'}
      pl={16} pr={8} py={2}
      backgroundColor={'orange.200'}
      position={'fixed'}
      width={'full'}
      zIndex={10}
      shadow={'md'}
    >
      {children}
    </Flex>
  )
};

export default PageHeader;