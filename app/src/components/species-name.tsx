import {Species} from "../core/app-context"
import {useContext} from "react"
import AppContext from "../core/app-context"

export const SpeciesName = ({species}: { species?: Species }) => {

  const {language} = useContext(AppContext)

  if (!species) {
    return <></>
  }

  return (
    <>
      {language === 'nl' ? species.name_nl :  language === 'la' ? species.name_latin : species.name}
    </>
  )

}