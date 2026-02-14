import React, { useState } from "react";
import { Button, HStack } from "@chakra-ui/react";
import { BsImages } from "react-icons/bs";
import { Species } from "../core/app-context";
import { SpeciesModal } from "./species-modal";

type SpeciesButtonProps = {
  species: Species;
  colorPalette?: string;
  size?: "sm" | "md" | "lg";
};

export const SpeciesButton = ({ 
  species, 
  colorPalette = "primary", 
  size
}: SpeciesButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get the display name for the species
  const getSpeciesName = () => {
    if (species.name_translated) {
      return species.name_translated;
    }
    if (species.name_nl) {
      return species.name_nl;
    }
    if (species.name_latin) {
      return species.name_latin;
    }
    return species.name;
  };

  const speciesName = getSpeciesName();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        colorPalette={colorPalette}
        variant="outline"
        size={size}
      >
        <HStack gap={2}>
          <BsImages />
          {speciesName}
        </HStack>
      </Button>
      <SpeciesModal
        species={species}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

