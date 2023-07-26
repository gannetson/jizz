import {Heading, Link} from "@chakra-ui/react";
import Page from "./layout/page";

const HomePage = () => {
  return (
    <Page>
      <Page.Header>
        <Heading size={'lg'} m={0} noOfLines={1}>
          Welcome!
        </Heading>
      </Page.Header>
      <Page.Body>
        <Link href={'/countries'}>Country list</Link>
      </Page.Body>
    </Page>

  )
};

export default HomePage;