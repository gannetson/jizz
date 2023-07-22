import {Link} from "@chakra-ui/react";

const HomePage = () => {
  return <>
    <h1>Welcome</h1>
    <Link href={'/countries'}>Country list</Link>
  </>

};

export default HomePage;