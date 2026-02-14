import { Text, Link } from "@chakra-ui/react";
import { SpeciesImage, SpeciesVideo, SpeciesSound } from "../core/app-context";

type MediaItem = SpeciesImage | SpeciesVideo | SpeciesSound;

type MediaCreditsProps = {
  // Either pass a media object, or individual props
  media?: MediaItem;
  contributor?: string | null;
  source?: string | null;
  link?: string | null;
  fontSize?: string;
  color?: string;
  mt?: number | string;
  onClick?: () => void;
};

/**
 * Reusable component for displaying media credits (contributor and source link).
 * Used throughout the app to display consistent credit information for images, videos, and sounds.
 * 
 * Usage:
 *   <MediaCredits media={video} mt={2} />
 *   or
 *   <MediaCredits contributor={contributor} source={source} link={link} />
 */
export function MediaCredits({
  media,
  contributor: contributorProp,
  source: sourceProp,
  link: linkProp,
  fontSize = "sm",
  color = "gray.600",
  mt,
  onClick,
}: MediaCreditsProps) {
  // Extract values from media object if provided, otherwise use individual props
  const contributor = media?.contributor ?? contributorProp;
  const source = media?.source ?? sourceProp;
  const link = media?.link ?? linkProp;
  // If no contributor and no link, don't render anything
  if (!contributor && !link) {
    return null;
  }

  // If there's a link but no contributor, just show the source link
  if (!contributor && link) {
    return (
      <Text fontSize={fontSize} color={color} mt={mt}>
        <Link 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer" 
          color="primary.600"
          onClick={onClick}
        >
          {source || 'Source'}
        </Link>
      </Text>
    );
  }

  // Standard case: contributor with optional link
  return (
    <Text fontSize={fontSize} color={color} mt={mt}>
      {contributor}
      {link && (
        <>
          {' / '}
          <Link 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer" 
            color="primary.600"
            onClick={onClick}
          >
            {source || 'Source'}
          </Link>
        </>
      )}
    </Text>
  );
}

