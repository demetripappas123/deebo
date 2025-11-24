// app/programs/page.tsx
import React from 'react'
import AddProgramDialog from '@/modules/programs/addprogram'
import ShowPrograms from '@/modules/programs/showprograms'

export default function ProgramsPage() {
  return (
    <div className="w-full h-full bg-[#111111] text-white p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-white">
          Programs
        </h1>
        <AddProgramDialog />
      </div>
      <ShowPrograms />
    </div>
  )
}
