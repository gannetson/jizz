import { Button, useDisclosure } from "@chakra-ui/react";
import { BsImages } from "react-icons/all";
import AppContext, { Species } from "../core/app-context";
import { useContext } from "react";
import { SpeciesModal } from "./species-modal";

export function ViewSpecies({ species }: { species?: Species }) {
  const { speciesLanguage } = useContext(AppContext);
  const { open: isOpen, onOpen, onClose } = useDisclosure();

  if (!species) return <></>;

  const displayName =
    species.name_translated ||
    (speciesLanguage === "nl"
      ? species.name_nl
      : speciesLanguage === "la"
        ? species.name_latin
        : species.name);

  return (
    <>
      <Button variant={"outline"} size="sm" onClick={onOpen}>
        {displayName}
        <BsImages style={{ marginLeft: "8px" }} />
      </Button>
      <SpeciesModal species={species} isOpen={isOpen} onClose={onClose} />
    </>
  );
}
