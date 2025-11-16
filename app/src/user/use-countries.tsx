import {useEffect, useState} from "react";


export interface Country {
  code: string
  name: string
}

export const UseCountries = () => {
  const [countries, setCountries] = useState<Country[]>([])
  useEffect(() => {
    if (countries.length === 0) {
      const fetchAllCountries = async () => {
        try {
          let allCountries: Country[] = [];
          let url: string | null = `/api/countries/`;
          
          // Fetch all pages
          while (url) {
            const response: Response = await fetch(url);
            const data: any = await response.json();
            
            if (Array.isArray(data)) {
              // Non-paginated response
              allCountries = data;
              url = null;
            } else if (data && Array.isArray(data.results)) {
              // Paginated response
              allCountries = [...allCountries, ...data.results];
              url = data.next || null; // Get next page URL
            } else {
              // Unexpected format
              break;
            }
          }
          
          setCountries(allCountries);
        } catch (error) {
          console.error('Error fetching countries:', error);
          setCountries([]);
        }
      };
      
      fetchAllCountries();
    }
  }, []) // Only run once on mount


  return {
    countries,
  }
}

