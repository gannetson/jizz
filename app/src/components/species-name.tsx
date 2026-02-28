import {Species} from "../core/app-context"
import {useContext} from "react"
import AppContext from "../core/app-context"

export const SpeciesName = ({species}: { species?: Species }) => {

  const {speciesLanguage, species: names} = useContext(AppContext)

  if (!species) {
    return <></>
  }

  // Ensure names is an array before calling .find()
  const name = Array.isArray(names) ? names.find(s => s.id === species.id) : null

  const displayName = name?.name_translated ?? species.name_translated ?? (speciesLanguage === 'nl' ? species.name_nl : speciesLanguage === 'la' ? species.name_latin : species.name)
  return (
    <>
      {displayName}
    </>
  )

}