import { Box, Heading, Link, Spinner, Text } from "@chakra-ui/react";
import { Page } from "../shared/components/layout";
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { loadHelpPages, type PageListItem } from "../api/pages";
import { CmsPage } from "./cms-page";

export const HelpOverviewPage = () => {
  const [pages, setPages] = useState<PageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHelpPages()
      .then(setPages)
      .catch((e: Error) => setError(e.message || "Failed to load help pages"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Page>
      <Page.Header>
        <Heading color={"gray.800"} size={"lg"} m={0}>
          <FormattedMessage id="help_page" defaultMessage="Help" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Heading color={"gray.800"} size={"lg"} m={0} mb={4}>
          <FormattedMessage id="help_page" defaultMessage="Help" />
        </Heading>
        <Box fontSize="16px" lineHeight="1.6">
          {loading && <Spinner />}
          {error && <Text color="red">{error}</Text>}
          {!loading && !error && pages.length === 0 && (
            <Text color="gray.600">No help pages available.</Text>
          )}
          {!loading && !error && pages.length > 0 && (
            <Box as="ul" listStyleType="none" p={0} m={0}>
              {pages.map((p) => (
                <Box as="li" key={p.id} mb={2}>
                  <Link asChild color="primary.500" textDecoration="underline" _hover={{ textDecoration: "underline", opacity: 0.85 }}>
                    <RouterLink to={`/help/${p.slug}`}>
                      {p.title}
                    </RouterLink>
                  </Link>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Page.Body>
    </Page>
  );
};

export const HelpPageDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) navigate("/help");
  }, [slug, navigate]);

  if (!slug) return null;

  return (
    <CmsPage
      slug={slug}
      showBackToHelp
      headerTitle={<FormattedMessage id="help_page" defaultMessage="Help" />}
    />
  );
};
