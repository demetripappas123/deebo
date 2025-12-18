'use client'

import { useRef } from 'react'
import AddClientDialog from '@/modules/clients/addclient'
import DisplayClients, { DisplayClientsRef } from '@/modules/clients/displayclients'

export default function ClientsPage() {
  const displayClientsRef = useRef<DisplayClientsRef>(null)

  return (
    <div className="w-full h-full bg-[#111111] text-white p-6">
      <h1 className="text-3xl font-bold mb-4">Clients</h1>
      <DisplayClients ref={displayClientsRef} />
      <AddClientDialog onClientAdded={() => displayClientsRef.current?.refresh()} />
    </div>
  )
}
