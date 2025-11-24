'use client'

import React, { useState } from 'react';
import { deleteProgram } from '@/supabase/deletions/deleteprogram';

type DeleteProgramDialogProps = {
  programId: string;
  programName: string;
  onDeleted?: () => void;
  children: React.ReactNode; // trigger element
};

export default function DeleteProgramDialog({
  programId,
  programName,
  onDeleted,
  children,
}: DeleteProgramDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteProgram(programId);
      setIsDialogOpen(false);
      if (onDeleted) onDeleted();
    } catch (error) {
      console.error('Error deleting program:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div onClick={() => setIsDialogOpen(true)}>
        {children}
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-[#1f1f1f] p-6 rounded-lg shadow-lg w-96 border border-[#2a2a2a]">
            <h2 className="text-xl font-bold text-white mb-4">Delete Program</h2>
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete <span className="font-semibold">{programName}</span>? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 bg-[#333333] text-white rounded-md hover:bg-[#404040] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
