import {Box, Heading, Select, Portal, createListCollection} from "@chakra-ui/react";
import {useContext, useEffect, useMemo} from "react";
import AppContext from "../core/app-context";
import { FormattedMessage, useIntl } from "react-intl"
import {UseTaxOrder} from "../user/use-tax-order";

interface TaxOrder {
  tax_order: string
  count: number
}

const SelectTaxOrder = () => {
  const intl = useIntl();
  const {taxOrders} = UseTaxOrder()
  const {taxOrder, setTaxOrder, game} = useContext(AppContext);

  const collection = useMemo(() => {
    // Ensure taxOrders is always an array
    const orders = Array.isArray(taxOrders) ? taxOrders : [];
    const items = orders.map((t, index) => ({
      label: `${t.tax_order} (${t.count})`,
      value: t.tax_order,
      original: t,
      index,
    }));
    return createListCollection({ items });
  }, [taxOrders]);

  const selectedValue = taxOrder ? taxOrder.tax_order : undefined;

  const handleValueChange = (details: { value: string[] }) => {
    const selectedValue = details.value[0];
    const orders = Array.isArray(taxOrders) ? taxOrders : [];
    if (selectedValue) {
      const selectedOrder = orders.find((t) => t.tax_order === selectedValue);
      if (selectedOrder && setTaxOrder) {
        setTaxOrder(selectedOrder);
      }
    } else {
      if (setTaxOrder) {
        setTaxOrder(undefined);
      }
    }
  };

  useEffect(() => {
    if (!taxOrder && game?.tax_order) {
      if (game?.tax_order) {
        const orders = Array.isArray(taxOrders) ? taxOrders : [];
        const foundTaxOrder = orders.filter((t => t.tax_order === game.tax_order))[0];
        if (foundTaxOrder && setTaxOrder) {
          setTaxOrder(foundTaxOrder);
        }
      }
    }
  }, [game?.tax_order, taxOrder, taxOrders, setTaxOrder]);


  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'tax order'} defaultMessage={'Taxonomic order'} />

      </Heading>
      <Select.Root
        collection={collection}
        value={selectedValue ? [selectedValue] : []}
        onValueChange={handleValueChange}
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder={intl.formatMessage({ id: 'select order placeholder', defaultMessage: 'Select order...' })} />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
            {selectedValue && setTaxOrder && (
              <Select.ClearTrigger onClick={() => setTaxOrder(undefined)} />
            )}
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content bg="white" borderRadius="md" borderWidth="2px" borderColor="primary.300" boxShadow="xl" p={1}>
              {collection.items.map((item: any) => (
                <Select.Item key={item.value} item={item}>
                  <Select.ItemIndicator />
                  <Select.ItemText>{item.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
    </Box>
  )
};

export default SelectTaxOrder;