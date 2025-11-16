import {useEffect, useState} from "react";
import {Language} from "../core/app-context"


export const UseLanguages = () => {
  const [languages, setLanguages] = useState<Language[]>([])
  useEffect(() => {
    if (languages.length === 0) {
      const fetchAllLanguages = async () => {
        try {
          let allLanguages: Language[] = [];
          let url: string | null = `/api/languages/`;
          
          // Fetch all pages
          while (url) {
            const response: Response = await fetch(url);
            const data: any = await response.json();
            
            if (Array.isArray(data)) {
              // Non-paginated response
              allLanguages = data;
              url = null;
            } else if (data && Array.isArray(data.results)) {
              // Paginated response
              allLanguages = [...allLanguages, ...data.results];
              url = data.next || null; // Get next page URL
            } else {
              // Unexpected format
              break;
            }
          }
          
          setLanguages(allLanguages);
        } catch (error) {
          console.error('Error fetching languages:', error);
          setLanguages([]);
        }
      };
      
      fetchAllLanguages();
    }
  }, []) // Only run once on mount


  return {
    languages,
  }
}

