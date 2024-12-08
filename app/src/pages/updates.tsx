import {Heading} from "@chakra-ui/react";
import Page from "./layout/page";
import {FormattedMessage} from "react-intl";
import {useContext, useEffect, useState} from "react"
import AppContext, {Update} from "../core/app-context"
import {Loading} from "../components/loading"
import {UpdateLine} from "../components/updates/update-line"
import {loadUpdates} from "../core/updates"

const UpdatesPage = () => {
  const {loading, setLoading} = useContext(AppContext)
  const [updates, setUpdates] = useState<Update[]>([])

  useEffect(() => {
    setLoading(true)
    loadUpdates().then(updates => {
      setUpdates(updates)
      setLoading(false)
    })
  }, []);

  return (
    <Page>
      <Page.Header>
        <Heading textColor={'gray.800'} size={'lg'} m={0} noOfLines={1}>
          <FormattedMessage id='updates' defaultMessage={'Updates'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <>
          {loading ? (
            <Loading/>
          ) : (
            updates && updates.map((update, index) => <UpdateLine key={index} update={update}/>)
          )}
        </>
      </Page.Body>
    </Page>

  )
};

export default UpdatesPage;