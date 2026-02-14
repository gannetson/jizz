import { Link } from "@chakra-ui/react";
import { FormattedMessage } from "react-intl";
import { useState } from "react";
import { FlagMedia } from "../pages/mpg/play/flag-media";
import { SpeciesImage, SpeciesVideo, SpeciesSound } from "../core/app-context";

type MediaItem = SpeciesImage | SpeciesVideo | SpeciesSound;

type FlagMediaButtonProps = {
  media: MediaItem;
  fontSize?: string;
  color?: string;
  onClick?: (e: React.MouseEvent) => void;
};

/**
 * Reusable component for flagging media items.
 * Handles all flagging logic internally, including modal state management.
 * Works with any media type (image, video, audio) since media is polymorphic.
 */
export function FlagMediaButton({ 
  media, 
  fontSize = "sm", 
  color = "error.700",
  onClick 
}: FlagMediaButtonProps) {
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up and closing parent modals
    if (onClick) {
      onClick(e);
    }
    if (media.id) {
      setIsFlagModalOpen(true);
    }
  };

  const handleClose = () => {
    setIsFlagModalOpen(false);
  };

  // Don't render if media doesn't have an ID
  if (!media.id) {
    return null;
  }

  return (
    <>
      <Link
        onClick={handleClick}
        fontSize={fontSize}
        color={color}
        cursor="pointer"
      >
        🚩 <FormattedMessage id={"flag"} defaultMessage={"Flag"} />
      </Link>
      <FlagMedia
        isOpen={isFlagModalOpen}
        onClose={handleClose}
        media={{
          id: media.id,
          url: media.url,
          link: media.link,
          contributor: media.contributor,
        }}
      />
    </>
  );
}

