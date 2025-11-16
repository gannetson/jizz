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
      const fetchAllTaxFamilies = async () => {
        setTaxFamilies([]) // Reset when country changes
        try {
          let allTaxFamilies: TaxFamily[] = [];
          let url: string | null = country ? `/api/families/?country=${country.code}` : `/api/families/`;
          
          // Fetch all pages
          while (url) {
            const response: Response = await fetch(url);
            const data: any = await response.json();
            
            if (Array.isArray(data)) {
              // Non-paginated response
              allTaxFamilies = data;
              url = null;
            } else if (data && Array.isArray(data.results)) {
              // Paginated response
              allTaxFamilies = [...allTaxFamilies, ...data.results];
              url = data.next || null; // Get next page URL
            } else {
              // Unexpected format
              break;
            }
          }
        
        setTaxFamilies(allTaxFamilies);
      } catch (error) {
        console.error('Error fetching tax families:', error);
        setTaxFamilies([]);
      }
    };
    
    fetchAllTaxFamilies();
  }, [country?.code]) // Re-fetch when country changes


  return {
    taxFamilies,
  }
}

