import {Box, Heading} from "@chakra-ui/react";
import {ChakraSelect} from "./chakra-select";
import {useContext, useEffect} from "react";
import AppContext from "../core/app-context";
import {FormattedMessage} from "react-intl"
import {TaxFamily, UseTaxFamily} from "../user/use-tax-family";


const SelectTaxFamily = () => {
  const {taxFamilies} = UseTaxFamily()
  const {taxFamily, setTaxFamily, game} = useContext(AppContext);

  const onChange = (value?: TaxFamily) => {
    setTaxFamily && setTaxFamily(value)
  }

  useEffect(() => {
    if (!taxFamily && game?.tax_family) {
      if (game?.tax_family) {
      const taxFamily = taxFamilies.filter((t => t.tax_family === game.tax_family))[0]
      setTaxFamily && setTaxFamily(taxFamily)

      }
    }

  }, [game?.tax_family, setTaxFamily]);


  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'tax family'} defaultMessage={'Taxonomic family'} />

      </Heading>
      <ChakraSelect<TaxFamily>
        isClearable={true}
        options={taxFamilies}
        getOptionLabel={(c) => c ? `${c.tax_family} - ${c.tax_family_en} (${c.count})` : '?'}
        getOptionValue={(c) => c ? c.tax_family : '?'}
        value={taxFamily || null}
        onChange={(val) => onChange(val || undefined)}
      />
    </Box>
  )
};

export default SelectTaxFamily;