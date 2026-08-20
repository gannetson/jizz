import {useEffect, useState} from "react";
import {Language} from "../core/app-context"
import { apiUrl } from "../api/baseUrl"
import { withScientificLanguage } from "../data/language-names-nl"

export const UseLanguages = () => {
  const [languages, setLanguages] = useState<Language[]>([])
  useEffect(() => {
    if (languages.length === 0) {
      const fetchLanguages = async () => {
        try {
          const response: Response = await fetch(apiUrl('/api/languages/'));
          const data: any = await response.json();
          
          if (Array.isArray(data)) {
            setLanguages(withScientificLanguage(data));
          } else {
            console.error('Unexpected response format:', data);
            setLanguages(withScientificLanguage([]));
          }
        } catch (error) {
          console.error('Error fetching languages:', error);
          setLanguages(withScientificLanguage([]));
        }
      };
      
      fetchLanguages();
    }
  }, []) // Only run once on mount


  return {
    languages,
  }
}

