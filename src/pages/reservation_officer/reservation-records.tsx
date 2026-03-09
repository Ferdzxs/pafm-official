import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

interface Reservation {
  id: string
  facility_name: string
  reservation_date: string
  purpose: string
  status: string
}

export default function ReservationRecords() {
  const [records, setRecords] = useState<Reservation[]>([])

  useEffect(() => {
    let ignore = false

    const fetchRecords = async () => {
      const { data } = await supabase
        .from("barangay_reservation_record")
        .select("*")
        .eq("status", "pending")

      if (!ignore && data) {
        setRecords(data)
      }
    }

    fetchRecords()

    return () => { ignore = true }
  }, [])

  return (
    <div>
      <h1>Reservation Records</h1>

      {records.map((rec) => (
        <div key={rec.id}>
          <p>Facility: {rec.facility_name}</p>
          <p>Date: {rec.reservation_date}</p>
          <p>Purpose: {rec.purpose}</p>
          <p>Status: {rec.status}</p>
        </div>
      ))}
    </div>
  )
}
