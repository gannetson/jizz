import {Flex, Heading, Link} from "@chakra-ui/react";
import {useEffect, useState} from "react";


export interface Country {
  code: string
  name: string
}

export interface SelectCountryProperties {
  country?: Country
  setCountry?: (country: Country) => void
}


const SelectCountry = ({country, setCountry}: SelectCountryProperties) => {
  const [countries, setCountries] = useState<Country[]>([])

  useEffect(() => {
    if (!countries || countries.length === 0) {
      fetch(`/api/countries/`)
        .then((res) => res.json())
        .then((data) => {
          setCountries(data)
        });

    }
  }, [countries])

  return (
    <>
      <Heading py={6} size={'md'}>Country</Heading>
      <Flex direction={'column'} gap={4}>
        {countries && countries.map((c, key) => (
            <Link
              key={key} color={country === c ? 'blue' : 'black'}
              onClick={() => setCountry && setCountry(c)}
            >
              {c.name}
            </Link>
          )
        )}
      </Flex>

    </>
  )
};

export default SelectCountry;