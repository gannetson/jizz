import {useContext, useEffect, useState} from "react";
import AppContext from "../core/app-context"
import { apiUrl } from "../api/baseUrl"

export interface TaxFamily {
  tax_family: string
  tax_family_en: string
  count: number
}

export const UseTaxFamily = () => {
  const [taxFamilies, setTaxFamilies] = useState<TaxFamily[]>([])
  const {country} = useContext(AppContext);

  useEffect(() => {
      const fetchTaxFamilies = async () => {
        setTaxFamilies([]) // Reset when country changes
        try {
          const url: string = country ? apiUrl(`/api/families/?country=${country.code}`) : apiUrl('/api/families/');
          const response: Response = await fetch(url);
          const data: any = await response.json();
          
          if (Array.isArray(data)) {
            setTaxFamilies(data);
          } else {
            console.error('Unexpected response format:', data);
            setTaxFamilies([]);
          }
        } catch (error) {
          console.error('Error fetching tax families:', error);
          setTaxFamilies([]);
        }
      };
    
      fetchTaxFamilies();
  }, [country?.code]) // Re-fetch when country changes


  return {
    taxFamilies,
  }
}

