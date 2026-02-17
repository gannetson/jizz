import { Box, Heading, Link, Spinner, Text } from "@chakra-ui/react";
import { Page } from "../shared/components/layout";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QuillContentViewer } from "../components/quill-content-viewer";
import { FormattedMessage } from "react-intl";

type PageListItem = { id: number; title: string; slug: string };
type PageDetail = { id: number; title: string; slug: string; content: string; show: boolean };

const API_BASE = "/api/pages";

function isQuillContent(content: string): boolean {
  if (!content || typeof content !== "string") return false;
  const t = content.trim();
  return t.startsWith("{") && t.includes("delta");
}

export const HelpOverviewPage = () => {
  const [pages, setPages] = useState<PageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(API_BASE)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load"))))
      .then((data) => {
        setPages(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Failed to load help pages");
        setLoading(false);
      });
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
                  <Link
                    href={`/help/${p.slug}`}
                    color="primary.500"
                    textDecoration="underline"
                    _hover={{ textDecoration: "underline", opacity: 0.85 }}
                  >
                    {p.title}
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
  const [page, setPage] = useState<PageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/${encodeURIComponent(slug)}/`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Not found"))))
      .then((data) => {
        setPage(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Page not found");
        setLoading(false);
      });
  }, [slug]);

  if (!slug) {
    navigate("/help");
    return null;
  }

  return (
    <Page>
      <Page.Header>
        <Heading color={"gray.800"} size={"lg"} m={0}>
          <FormattedMessage id="help_page" defaultMessage="Help" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Link href="/help" color="primary.500" fontSize="sm" mb={2} display="inline-block">
          ← <FormattedMessage id={'back to help'} defaultMessage={'Back to overview'}/>
        </Link>
        <Heading color={"gray.800"} size={"lg"} m={0} mb={4}>
          {page?.title ?? slug}
        </Heading>
        <Box fontSize="16px" lineHeight="1.6">
          {loading && <Spinner />}
          {error && <Text color="red">{error}</Text>}
          {!loading && !error && page && (
            <Box>
              {isQuillContent(page.content) ? (
                <QuillContentViewer content={page.content} className="help-page-content" />
              ) : (
                <>
                  <style>{`
                    .help-page-content.help-page-html { font-size: 16px; line-height: 1.6; }
                    .help-page-content.help-page-html p { margin-bottom: 12px; }
                    .help-page-content.help-page-html h2 { font-size: 1.125rem; font-weight: bold; margin-top: 16px; margin-bottom: 8px; }
                    .help-page-content.help-page-html h3 { font-size: 1rem; font-weight: bold; margin-top: 12px; margin-bottom: 8px; }
                    .help-page-content.help-page-html ul { padding-left: 24px; margin-bottom: 12px; }
                    .help-page-content.help-page-html a { color: var(--chakra-colors-primary-500, #3182ce); text-decoration: underline; }
                    .help-page-content.help-page-html img {
                      max-width: 100%; height: auto; border: 1px dashed #e2e8f0; border-radius: 8px;
                      padding: 8px; background: #f7fafc; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                      margin: 12px 0; display: block;
                    }
                  `}</style>
                  <div
                    className="help-page-content help-page-html"
                    dangerouslySetInnerHTML={{ __html: page.content || "" }}
                  />
                </>
              )}
            </Box>
          )}
        </Box>
      </Page.Body>
    </Page>
  );
};
