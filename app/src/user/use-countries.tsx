import {useEffect, useState} from "react";


export interface Country {
  code: string
  name: string
}

export const UseCountries = () => {
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


  return {
    countries,
  }
}

