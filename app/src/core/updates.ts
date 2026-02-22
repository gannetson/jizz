import {Update} from "./app-context"
import { apiUrl } from "../api/baseUrl"

export const loadUpdates = async () => {
    const url = apiUrl('/api/updates/')
    const response = await fetch(url, {
      cache: 'no-cache',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    if (response.status === 200) {
      const data = await response.json()
      return data.results as Update[]
    } else {
      console.log('Could not load updates.')
    }
    return []
  }
