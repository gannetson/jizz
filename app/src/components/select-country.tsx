import {Heading} from "@chakra-ui/react";
import {UseCountries} from "../user/use-countries";
import {Select} from "chakra-react-select";
import {useContext} from "react";
import AppContext from "../core/app-context";


const SelectCountry = () => {
  const {countries} = UseCountries()
  const { country, setCountry} = useContext(AppContext);

  const onChange = (value:string) => {
    const country = countries.find((c)=> c.name === value)
    setCountry && setCountry(country)
  }

  return (
    <>
      <Select
        options={countries}
        getOptionLabel={(c) => c ? c.name : '?'}
        getOptionValue={(c)=> c ? c.name : '?'}
        value={country}
        onChange={(val)=> val && onChange(val.name)}
      />
    </>
  )
};

export default SelectCountry;