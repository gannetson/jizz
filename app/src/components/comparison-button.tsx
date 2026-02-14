import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Box,
  Button,
  ButtonProps,
  Dialog,
  VStack,
  Spinner,
  Text,
  Heading,
  Alert,
  AlertIndicator,
  IconButton,
} from "@chakra-ui/react";
import { format } from "date-fns";
import { compareService, SpeciesComparison } from "../api/services/compare.service";

// Add global styles for nested modal z-index
// This ensures the comparison dialog appears above the game detail modal
if (typeof document !== 'undefined') {
  const styleId = 'comparison-dialog-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Target Chakra UI Dialog backdrop and content */
      .comparison-dialog-wrapper [role="dialog"],
      .comparison-dialog-wrapper [data-part="backdrop"],
      .comparison-dialog-wrapper [data-part="positioner"],
      .comparison-dialog-wrapper [data-part="content"] {
        z-index: 1400 !important;
      }
      /* Ensure backdrop is below content but above parent modal */
      .comparison-dialog-wrapper [data-part="backdrop"] {
        z-index: 1399 !important;
      }
      .comparison-dialog-wrapper [data-part="positioner"],
      .comparison-dialog-wrapper [data-part="content"] {
        z-index: 1401 !important;
      }
    `;
    document.head.appendChild(style);
  }
}

const DialogPositionerComponent = Dialog.Positioner as React.FC<any>;
const DialogContentComponent = Dialog.Content as React.FC<any>;
const DialogCloseTriggerComponent = Dialog.CloseTrigger as React.FC<any>;

type ComparisonButtonProps = {
  species1Id?: number;
  species2Id?: number;
  buttonLabel?: React.ReactNode;
  buttonProps?: ButtonProps;
  stopPropagation?: boolean;
};

export const ComparisonButton = ({
  species1Id,
  species2Id,
  buttonLabel = "Comparison",
  buttonProps,
  stopPropagation = false,
}: ComparisonButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [comparison, setComparison] = useState<SpeciesComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    if (!species1Id || !species2Id) {
      return;
    }
    setIsOpen(true);
    setLoading(true);
    setError(null);
    try {
      const comparisonData = await compareService.getComparison(species1Id, species2Id);
      setComparison(comparisonData);
    } catch (err: any) {
      setError(err?.message || "Failed to generate comparison");
      setComparison(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (openState: boolean | { open: boolean }) => {
    const openValue = typeof openState === "boolean" ? openState : openState.open;
    if (!openValue) {
      setIsOpen(false);
      setError(null);
    } else {
      setIsOpen(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={!species1Id || !species2Id || loading}
        colorPalette="info"
        variant="outline"
        size="sm"
        {...buttonProps}
      >
        {loading ? (
          <VStack gap={1}>
            <Spinner size="sm" />
            <Text fontSize="xs">Loading...</Text>
          </VStack>
        ) : (
          buttonLabel
        )}
      </Button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <Box className="comparison-dialog-wrapper">
          <Dialog.Root open={isOpen} onOpenChange={handleClose} modal={true}>
            <Dialog.Backdrop />
            <DialogPositionerComponent>
              <DialogContentComponent maxW="4xl" maxH="90vh" overflowY="auto">
                <Dialog.Header pr={10}>
                  {comparison
                    ? `Comparison: ${comparison.species_1_name} vs ${comparison.species_2_name}`
                    : "Species Comparison"}
                </Dialog.Header>
                <DialogCloseTriggerComponent 
                  position="absolute" 
                  top={3} 
                  right={3}
                  onClick={() => handleClose(false)}
                />
              <Dialog.Body>
                {loading ? (
                  <VStack gap={4} py={8}>
                    <Spinner size="lg" />
                    <Text>Generating comparison... This may take a moment.</Text>
                    <Text fontSize="sm" color="gray.600">
                      Scraping species data and generating AI comparison...
                    </Text>
                  </VStack>
                ) : error ? (
                  <Alert.Root status="error">
                    <AlertIndicator />
                    <Box>
                      <Text fontWeight="bold">Error</Text>
                      <Text>{error}</Text>
                    </Box>
                  </Alert.Root>
                ) : comparison ? (
                  <>
                    <style>{`
                      .comparison-html p { margin-bottom: 0.5rem; }
                      .comparison-html ul, .comparison-html ol { margin-left: 1rem; margin-bottom: 0.5rem; }
                      .comparison-html li { margin-bottom: 0.25rem; }
                      .comparison-html strong { font-weight: bold; }
                      .comparison-html em { font-style: italic; }
                      .comparison-html h1, .comparison-html h2, .comparison-html h3 { 
                        font-weight: bold; 
                        margin-top: 0.75rem; 
                        margin-bottom: 0.5rem; 
                      }
                    `}</style>
                    <VStack align="stretch" gap={4}>
                      {comparison.summary_html && (
                        <Box>
                          <Heading size="md" mb={2}>
                            Summary
                          </Heading>
                          <Box
                            dangerouslySetInnerHTML={{ __html: comparison.summary_html }}
                            className="comparison-html"
                          />
                        </Box>
                      )}
                      {comparison.identification_tips_html && (
                        <Box bg="blue.50" p={4} borderRadius="md" borderWidth="1px" borderColor="blue.200">
                          <Heading size="sm" mb={2} color="blue.800">
                            Identification Tips
                          </Heading>
                          <Box
                            dangerouslySetInnerHTML={{ __html: comparison.identification_tips_html }}
                            className="comparison-html"
                            color="blue.900"
                          />
                        </Box>
                      )}

                      {comparison.size_comparison_html && (
                        <Box>
                          <Heading size="sm" mb={2}>
                            Size
                          </Heading>
                          <Box
                            dangerouslySetInnerHTML={{ __html: comparison.size_comparison_html }}
                            className="comparison-html"
                          />
                        </Box>
                      )}

                      {comparison.plumage_comparison_html && (
                        <Box>
                          <Heading size="sm" mb={2}>
                            Plumage
                          </Heading>
                          <Box
                            dangerouslySetInnerHTML={{ __html: comparison.plumage_comparison_html }}
                            className="comparison-html"
                          />
                        </Box>
                      )}

                      {comparison.behavior_comparison_html && (
                        <Box>
                          <Heading size="sm" mb={2}>
                            Behavior
                          </Heading>
                          <Box
                            dangerouslySetInnerHTML={{ __html: comparison.behavior_comparison_html }}
                            className="comparison-html"
                          />
                        </Box>
                      )}

                      {comparison.habitat_comparison_html && (
                        <Box>
                          <Heading size="sm" mb={2}>
                            Habitat
                          </Heading>
                          <Box
                            dangerouslySetInnerHTML={{ __html: comparison.habitat_comparison_html }}
                            className="comparison-html"
                          />
                        </Box>
                      )}

                      {comparison.vocalization_comparison_html && (
                        <Box>
                          <Heading size="sm" mb={2}>
                            Vocalization
                          </Heading>
                          <Box
                            dangerouslySetInnerHTML={{ __html: comparison.vocalization_comparison_html }}
                            className="comparison-html"
                          />
                        </Box>
                      )}

                      <Box pt={2} borderTopWidth="1px">
                        <Text fontSize="xs" color="gray.600">
                          Generated using {comparison.ai_model} on {format(new Date(comparison.generated_at), "PPpp")}
                        </Text>
                      </Box>
                    </VStack>
                  </>
                ) : null}
              </Dialog.Body>
              <Dialog.Footer>
                <Button onClick={() => handleClose(false)} colorPalette="primary">
                  Close
                </Button>
              </Dialog.Footer>
            </DialogContentComponent>
          </DialogPositionerComponent>
        </Dialog.Root>
        </Box>,
        document.body
      )}
    </>
  );
};

