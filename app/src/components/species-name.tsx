import {Species} from "../core/app-context"
import {useContext} from "react"
import AppContext from "../core/app-context"

export const SpeciesName = ({species}: { species?: Species }) => {

  const {player} = useContext(AppContext)

  if (!species) {
    return <></>
  }

  return (
    <>
      {player?.language === 'nl' ? species.name_nl : species.name}
    </>
  )

}