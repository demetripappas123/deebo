import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash } from "lucide-react";
import { fetchExercises } from "@/supabase/fetches/fetchexlib";
import { fetchDayExercises, DayExerciseWithName } from "@/supabase/fetches/fetchdayexercises";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

type LocalDayExercise = {
  exercise_id?: string;
  day_id?: string;
  name: string;
  sets: number;
  reps: number;
  rir: number | null;
  rpe: number | null;
  weight: number | null;
  notes: string;
};

type AddDayDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { dayName: string; exercises: LocalDayExercise[]; dayId?: string }) => void;
  weekId: string;
  onAdded: () => void | Promise<void>;
  // Edit mode props
  dayId?: string; // If provided, dialog is in edit mode
  initialDayName?: string;
};

export default function AddDayDialog({ open, onClose, onSubmit, dayId, initialDayName }: AddDayDialogProps) {
  const [dayName, setDayName] = useState("");
  const [exercises, setExercises] = useState<LocalDayExercise[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<{ id: string; name: string }[]>([]);
  const [openCombobox, setOpenCombobox] = useState<{ [key: number]: boolean }>({});
  const [searchValue, setSearchValue] = useState<{ [key: number]: string }>({});

  // Reset form state when dialog opens, or load existing data if editing
  useEffect(() => {
    if (open) {
      if (dayId && initialDayName) {
        // Edit mode: load existing data
        setDayName(initialDayName);
        
        // Fetch existing exercises for this day
        const loadExistingExercises = async () => {
          try {
            const existingExercises = await fetchDayExercises(dayId);
            const mappedExercises: LocalDayExercise[] = existingExercises.map(ex => ({
              name: ex.exercise_name,
              sets: ex.sets,
              reps: ex.reps,
              rir: ex.rir,
              rpe: ex.rpe,
              weight: ex.weight_used,
              notes: ex.notes || '',
            }));
            setExercises(mappedExercises);
          } catch (err) {
            console.error("Failed to load existing exercises:", err);
            setExercises([]);
          }
        };
        loadExistingExercises();
      } else {
        // Add mode: reset all form state
        setDayName("");
        setExercises([]);
      }
      setOpenCombobox({});
      setSearchValue({});
    }
  }, [open, dayId, initialDayName]);

  // Fetch exercise library when dialog opens
  useEffect(() => {
    const loadLibrary = async () => {
      if (!open) return;
      try {
        const data = await fetchExercises();
        setExerciseLibrary(data);
      } catch (err) {
        console.error("Failed to fetch exercises:", err);
      }
    };
    loadLibrary();
  }, [open]);

  const addExercise = () => {
    setExercises(prev => [
      ...prev,
      {
        name: "",
        sets: 0,
        reps: 0,
        rir: null,
        rpe: null,
        weight: null,
        notes: "",
      },
    ]);
  };

  const removeExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index));
  };

  const updateExercise = <K extends keyof LocalDayExercise>(
    index: number,
    key: K,
    value: LocalDayExercise[K]
  ) => {
    setExercises(prev => prev.map((ex, i) => (i === index ? { ...ex, [key]: value } : ex)));
  };

  const handleSubmit = () => {
    onSubmit({
      dayName,
      exercises,
      dayId: dayId, // Include dayId if in edit mode
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-[#1f1f1f] border-[#2a2a2a] text-white custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-white">
            {dayId ? "Edit Training Day" : "Add Training Day"}
          </DialogTitle>
        </DialogHeader>

        {/* Day name */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-white">Day Name</label>
          <Input
            value={dayName}
            onChange={(e) => setDayName(e.target.value)}
            placeholder="e.g. Push Day, Legs, Upper, etc."
            className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400"
          />
        </div>

        {/* Exercises */}
        <div className="space-y-6">
          {exercises.map((ex, index) => (
            <div key={index} className="border border-[#2a2a2a] p-3 rounded-lg relative bg-[#111111]">
              {exercises.length > 0 && (
                <button
                  onClick={() => removeExercise(index)}
                  className="absolute right-2 top-2 text-red-500 hover:text-red-600 cursor-pointer"
                >
                  <Trash size={16} />
                </button>
              )}

              <div className="space-y-3">
                <div className="relative">
                  <label className="text-sm text-white">Exercise Name</label>
                  <div className="relative">
                    <Input
                      value={ex.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateExercise(index, "name", value);
                        setSearchValue(prev => ({ ...prev, [index]: value }));
                        setOpenCombobox(prev => ({ ...prev, [index]: value.length > 0 }));
                      }}
                      onFocus={() => {
                        if (ex.name.length > 0 || exerciseLibrary.length > 0) {
                          setOpenCombobox(prev => ({ ...prev, [index]: true }));
                        }
                      }}
                      onBlur={() => {
                        // Delay to allow click on item
                        setTimeout(() => {
                          setOpenCombobox(prev => ({ ...prev, [index]: false }));
                        }, 200);
                      }}
                      placeholder="Type to search exercises..."
                      className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400"
                    />
                    {openCombobox[index] && (
                      <div 
                        className="absolute z-50 w-full mt-1 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md shadow-lg"
                        onMouseDown={(e) => {
                          // Prevent blur when clicking inside the dropdown (including scrollbar)
                          e.preventDefault();
                        }}
                      >
                        <Command className="bg-[#1f1f1f] text-white">
                          <CommandInput
                            value={searchValue[index] || ex.name}
                            onValueChange={(value) => {
                              setSearchValue(prev => ({ ...prev, [index]: value }));
                              updateExercise(index, "name", value);
                            }}
                            placeholder="Search exercises..."
                            className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400"
                          />
                          <CommandList className="max-h-[200px] overflow-y-auto bg-[#1f1f1f] custom-scrollbar">
                            <CommandEmpty className="text-gray-400 py-4 text-center">
                              No exercises found.
                            </CommandEmpty>
                            <CommandGroup className="bg-[#1f1f1f]">
                              {exerciseLibrary
                                .filter((exercise) => {
                                  const search = (searchValue[index] || ex.name || "").toLowerCase();
                                  return exercise.name.toLowerCase().includes(search);
                                })
                                .map((exercise) => (
                                  <CommandItem
                                    key={exercise.id}
                                    value={exercise.name}
                                    onSelect={() => {
                                      updateExercise(index, "name", exercise.name);
                                      setSearchValue(prev => ({ ...prev, [index]: exercise.name }));
                                      setOpenCombobox(prev => ({ ...prev, [index]: false }));
                                    }}
                                    className="text-white hover:bg-[#333333] cursor-pointer data-[selected=true]:bg-[#333333] data-[selected=true]:text-white"
                                  >
                                    {exercise.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-gray-300 mb-1 block">Sets</label>
                    <Input
                      type="number"
                      value={ex.sets}
                      onChange={(e) => updateExercise(index, "sets", Number(e.target.value))}
                      className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400 h-9 text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-xs text-gray-300 mb-1 block">Reps</label>
                    <Input
                      type="number"
                      value={ex.reps}
                      onChange={(e) => updateExercise(index, "reps", Number(e.target.value))}
                      className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400 h-9 text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-xs text-gray-300 mb-1 block">RIR</label>
                    <Input
                      type="number"
                      value={ex.rir ?? ""}
                      onChange={(e) =>
                        updateExercise(index, "rir", e.target.value === "" ? null : Number(e.target.value))
                      }
                      placeholder="—"
                      className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400 h-9 text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-xs text-gray-300 mb-1 block">RPE</label>
                    <Input
                      type="number"
                      value={ex.rpe ?? ""}
                      onChange={(e) =>
                        updateExercise(index, "rpe", e.target.value === "" ? null : Number(e.target.value))
                      }
                      placeholder="—"
                      className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400 h-9 text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-xs text-gray-300 mb-1 block">Weight</label>
                    <Input
                      type="number"
                      value={ex.weight ?? ""}
                      onChange={(e) =>
                        updateExercise(index, "weight", e.target.value === "" ? null : Number(e.target.value))
                      }
                      placeholder="—"
                      className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400 h-9 text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white">Notes</label>
                  <Textarea
                    value={ex.notes}
                    onChange={(e) => updateExercise(index, "notes", e.target.value)}
                    placeholder="Cues, tempo, reminders..."
                    className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add exercise button */}
          <Button
            onClick={addExercise}
            variant="outline"
            className="w-full border-[#2a2a2a] bg-[#333333] text-white hover:bg-[#404040] hover:text-white flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} /> Add Exercise
          </Button>
        </div>

        <DialogFooter>
          <Button 
            className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white cursor-pointer" 
            onClick={handleSubmit} 
            variant="default"
          >
            Save Day
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
