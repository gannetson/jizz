import {Box, Heading} from "@chakra-ui/react";
import {Select} from "chakra-react-select";
import {useContext, useEffect} from "react";
import AppContext from "../core/app-context";
import {FormattedMessage} from "react-intl"
import {UseTaxOrder} from "../user/use-tax-order";

interface TaxOrder {
  tax_order: string
  count: number
}

const SelectTaxOrder = () => {
  const {taxOrders} = UseTaxOrder()
  const {taxOrder, setTaxOrder, game} = useContext(AppContext);

  const onChange = (value?: TaxOrder) => {
    setTaxOrder && setTaxOrder(value)
  }

  useEffect(() => {
    if (!taxOrder && game?.tax_order) {
      if (game?.tax_order) {
      const taxOrder = taxOrders.filter((t => t.tax_order === game.tax_order))[0]
      setTaxOrder && setTaxOrder(taxOrder)

      }
    }

  }, [game?.tax_order, setTaxOrder]);


  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'tax order'} defaultMessage={'Taxonomic order'} />

      </Heading>
      <Select<TaxOrder>
        isClearable={true}
        options={taxOrders}
        getOptionLabel={(c) => c ? `${c.tax_order} (${c.count})` : '?'}
        getOptionValue={(c) => c ? c.tax_order : '?'}
        value={taxOrder}
        onChange={(val) => onChange(val || undefined)}
      />
    </Box>
  )
};

export default SelectTaxOrder;