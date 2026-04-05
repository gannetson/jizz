import { Box, Heading } from "@chakra-ui/react";
import { useContext, useEffect } from "react";
import AppContext from "../core/app-context";
import { FormattedMessage, useIntl } from "react-intl";
import { type TaxOrder, UseTaxOrder } from "../user/use-tax-order";
import TaxOrderCombobox from "./tax-order-combobox";

const SelectTaxOrder = () => {
  const intl = useIntl();
  const { taxOrders } = UseTaxOrder();
  const { taxOrder, setTaxOrder, game } = useContext(AppContext);

  useEffect(() => {
    if (!taxOrder && game?.tax_order) {
      const orders = Array.isArray(taxOrders) ? taxOrders : [];
      const foundTaxOrder = orders.find((t) => t.tax_order === game.tax_order);
      if (foundTaxOrder && setTaxOrder) {
        setTaxOrder(foundTaxOrder);
      }
    }
  }, [game?.tax_order, taxOrder, taxOrders, setTaxOrder]);

  const onChange = (order: TaxOrder | undefined) => {
    setTaxOrder?.(order);
  };

  const placeholder = intl.formatMessage({
    id: "select order placeholder",
    defaultMessage: "Select order...",
  });

  return (
    <Box>
      <Heading size={"md"} mb={4}>
        <FormattedMessage id={"tax order"} defaultMessage={"Taxonomic order"} />
      </Heading>
      <TaxOrderCombobox
        taxOrders={Array.isArray(taxOrders) ? taxOrders : []}
        value={taxOrder}
        onChange={onChange}
        placeholder={placeholder}
      />
    </Box>
  );
};

export default SelectTaxOrder;
