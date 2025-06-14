import {useContext, useEffect, useState} from "react";
import AppContext from "../core/app-context"


export interface TaxFamily {
  tax_family: string
  tax_family_en: string
  count: number
}

export const UseTaxFamily = () => {
  const [taxFamilies, setTaxFamilies] = useState<TaxFamily[]>([])
  const {country} = useContext(AppContext);

  useEffect(() => {
    const url = country ? `/api/families/?country=${country.code}` : `/api/families/`;
    if (!taxFamilies || taxFamilies.length === 0) {
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          setTaxFamilies(data)
        });

    }
  }, [taxFamilies, country])


  return {
    taxFamilies,
  }
}

