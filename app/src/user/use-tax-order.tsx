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
    const url = country ? `/api/orders/?country=${country.code}` : `/api/orders/`;
    setTaxOrders([]) // Reset when country changes
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setTaxOrders(data)
      });
  }, [country?.code]) // Re-fetch when country changes


  return {
    taxOrders,
  }
}

