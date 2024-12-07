import {Heading} from "@chakra-ui/react";
import Page from "./layout/page";
import {FormattedMessage} from "react-intl";
import {useContext, useEffect, useState} from "react"
import AppContext, {Update} from "../core/app-context"
import {Loading} from "../components/loading"
import {UpdateLine} from "../components/updates/update-line"

const UpdatesPage = () => {
  const {loading, setLoading} = useContext(AppContext)
  const [updates, setUpdates] = useState<Update[]>([])

  const loadUpdates = async () => {
    setLoading(true)
    const url = `/api/updates/`
    const response = await fetch(url, {
      cache: 'no-cache',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    if (response.status === 200) {
      const data = await response.json()
      setUpdates(data.results)
    } else {
      console.log('Could not load updates.')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUpdates()
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