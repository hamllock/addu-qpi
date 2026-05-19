import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GRADE_POINTS, calculateQPI } from "@/lib/qpi";
import type { Grade, SubjectRecord } from "@/lib/qpi";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QPICalculator() {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([
    { name: "", units: 3, grade: "A" },
  ]);

  const addRow = () => {
    setSubjects([...subjects, { name: "", units: 3, grade: "A" }]);
  };

  const removeRow = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const updateSubject = (
    index: number,
    field: keyof SubjectRecord,
    value: any,
  ) => {
    const newSubjects = [...subjects];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setSubjects(newSubjects);
  };

  const qpi = calculateQPI(subjects);

  return (
    <div className="space-y-12 w-full">
      {/* Hero QPI Display */}
      <div className="text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-10">
        <div className="space-y-2">
          <h2 className="font-display text-5xl md:text-6xl tracking-tight text-foreground leading-none">
            Semester QPI
          </h2>
        </div>
        <motion.div
          key={qpi.toFixed(2)}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
          className="relative"
        >
          <div className="text-8xl md:text-9xl font-sans text-primary leading-none tabular-nums tracking-tight">
            {qpi.toFixed(2)}
          </div>
          <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </motion.div>
      </div>

      {/* Subject Rows */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {subjects.map((s, i) => (
            <motion.div
              key={`${i}`}
              layout
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="flex gap-3 items-center"
            >
              <input
                type="text"
                placeholder="Subject"
                className="flex-1 bg-muted/30 border border-input rounded-xl px-5 py-4 text-base md:text-lg font-mono placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                value={s.name}
                onChange={(e) => updateSubject(i, "name", e.target.value)}
              />
              <div className="relative">
                <input
                  type="number"
                  className="w-24 bg-muted/30 border border-input rounded-xl px-4 py-4 text-base md:text-lg font-mono text-center focus:border-primary/40 focus:ring-2 focus:ring-primary/10 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={s.units}
                  onChange={(e) =>
                    updateSubject(i, "units", parseInt(e.target.value) || 0)
                  }
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/60 font-mono pointer-events-none">
                  un
                </span>
              </div>
              <select
                className={cn(
                  "w-28 bg-muted/30 border border-input rounded-xl px-3 py-4 text-base md:text-lg font-mono text-center outline-none transition-all cursor-pointer",
                  s.grade === "A" || s.grade === "B+"
                    ? "text-primary"
                    : "text-foreground",
                  "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
                )}
                value={s.grade}
                onChange={(e) =>
                  updateSubject(i, "grade", e.target.value as Grade)
                }
              >
                {Object.keys(GRADE_POINTS).map((g) => (
                  <option key={g} value={g} className="bg-card text-foreground">
                    {g}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 rounded-xl h-14 w-14 flex-shrink-0 transition-all"
                onClick={() => removeRow(i)}
                disabled={subjects.length === 1}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div layout transition={{ duration: 0.25 }}>
        <Button
          onClick={addRow}
          variant="outline"
          className="w-full gap-2 border-dashed border-border hover:border-primary/30 hover:bg-primary/[0.03] rounded-xl py-7 text-muted-foreground hover:text-primary text-base transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="font-mono text-sm tracking-wider uppercase">
            Add Subject
          </span>
        </Button>
      </motion.div>
    </div>
  );
}
