import {Species} from "../core/app-context"
import {useContext} from "react"
import AppContext from "../core/app-context"

export const SpeciesName = ({species}: { species?: Species }) => {

  const {language, species: names} = useContext(AppContext)

  if (!species) {
    return <></>
  }

  const name = names && names.find(s => s.id === species.id)

  return (
    <>
      {name ?  name.name_translated : language === 'nl' ? species.name_nl :  language === 'la' ? species.name_latin : species.name}
    </>
  )

}