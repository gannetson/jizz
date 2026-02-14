import {useContext, useEffect, useState} from "react";
import AppContext from "../core/app-context"


export interface TaxOrder {
  tax_order: string
  count: number
}

export const UseTaxOrder = () => {
  const [taxOrders, setTaxOrders] = useState<TaxOrder[]>([])
  const {country} = useContext(AppContext);

  useEffect(() => {
      const fetchTaxOrders = async () => {
        setTaxOrders([]) // Reset when country changes
        try {
          const url: string = country ? `/api/orders/?country=${country.code}` : `/api/orders/`;
          const response: Response = await fetch(url);
          const data: any = await response.json();
          
          if (Array.isArray(data)) {
            setTaxOrders(data);
          } else {
            console.error('Unexpected response format:', data);
            setTaxOrders([]);
          }
        } catch (error) {
          console.error('Error fetching tax orders:', error);
          setTaxOrders([]);
        }
      };
    
      fetchTaxOrders();
  }, [country?.code]) // Re-fetch when country changes


  return {
    taxOrders,
  }
}

