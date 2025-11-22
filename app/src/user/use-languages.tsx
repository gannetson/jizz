import {useEffect, useState} from "react";
import {Language} from "../core/app-context"


export const UseLanguages = () => {
  const [languages, setLanguages] = useState<Language[]>([])
  useEffect(() => {
    if (languages.length === 0) {
      const fetchLanguages = async () => {
        try {
          const response: Response = await fetch(`/api/languages/`);
          const data: any = await response.json();
          
          if (Array.isArray(data)) {
            setLanguages(data);
          } else {
            console.error('Unexpected response format:', data);
            setLanguages([]);
          }
        } catch (error) {
          console.error('Error fetching languages:', error);
          setLanguages([]);
        }
      };
      
      fetchLanguages();
    }
  }, []) // Only run once on mount


  return {
    languages,
  }
}

