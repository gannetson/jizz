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
      const fetchAllTaxOrders = async () => {
        setTaxOrders([]) // Reset when country changes
        try {
          let allTaxOrders: TaxOrder[] = [];
          let url: string | null = country ? `/api/orders/?country=${country.code}` : `/api/orders/`;
          
          // Fetch all pages
          while (url) {
            const response: Response = await fetch(url);
            const data: any = await response.json();
            
            if (Array.isArray(data)) {
              // Non-paginated response
              allTaxOrders = data;
              url = null;
            } else if (data && Array.isArray(data.results)) {
              // Paginated response
              allTaxOrders = [...allTaxOrders, ...data.results];
              url = data.next || null; // Get next page URL
            } else {
              // Unexpected format
              break;
            }
          }
        
        setTaxOrders(allTaxOrders);
      } catch (error) {
        console.error('Error fetching tax orders:', error);
        setTaxOrders([]);
      }
    };
    
    fetchAllTaxOrders();
  }, [country?.code]) // Re-fetch when country changes


  return {
    taxOrders,
  }
}

