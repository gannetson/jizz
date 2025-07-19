import {useEffect, useState} from "react";
import {Language} from "../core/app-context"


export const UseLanguages = () => {
  const [languages, setLanguages] = useState<Language[]>([])
  useEffect(() => {
    if (!languages || languages.length === 0) {
      fetch(`/api/languages/`)
        .then((res) => res.json())
        .then((data) => {
          setLanguages(data)
        });

    }
  }, [languages])


  return {
    languages,
  }
}

