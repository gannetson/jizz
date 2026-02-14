import {Species} from "../core/app-context"
import {useContext} from "react"
import AppContext from "../core/app-context"

export const SpeciesName = ({species}: { species?: Species }) => {

  const {language, species: names} = useContext(AppContext)

  if (!species) {
    return <></>
  }

  // Ensure names is an array before calling .find()
  const name = Array.isArray(names) ? names.find(s => s.id === species.id) : null

  return (
    <>
      {name ?  name.name_translated : language === 'nl' ? species.name_nl :  language === 'la' ? species.name_latin : species.name}
    </>
  )

}