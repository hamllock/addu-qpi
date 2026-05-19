import { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { parseCurriculumText, calculateQPI, GRADE_POINTS } from "@/lib/qpi";
import type { Grade, SubjectRecord } from "@/lib/qpi";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Plus,
  RotateCcw,
  AlertTriangle,
  X,
  Target,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CUM_LAUDE_THRESHOLDS = [
  { label: "Cum Laude", value: 3.4, short: "CL" },
  { label: "Magna Cum Laude", value: 3.6, short: "MCL" },
  { label: "Summa Cum Laude", value: 3.8, short: "SCL" },
] as const;

export function CumulativeQPI() {
  const [inputText, setInputText] = useState("");
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [projectedGrades, setProjectedGrades] = useState<Record<number, Grade>>(
    {},
  );
  const [excludedFromProjection, setExcludedFromProjection] = useState<
    Record<number, true>
  >({});
  const [extraSubjects, setExtraSubjects] = useState<SubjectRecord[]>([]);
  const [showProjection, setShowProjection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [parseError, setParseError] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    units: 3,
    grade: "A" as Grade,
    year: "1st Year",
    semester: "1st Semester",
    outOfCurriculum: false,
  });

  const handleGo = () => {
    const parsed = parseCurriculumText(inputText);
    if (parsed.length === 0) {
      setParseError(true);
      return;
    }
    setParseError(false);
    setSubjects(parsed);
    setIsParsed(true);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const html = e.target?.result as string;
      const doc = new DOMParser().parseFromString(html, "text/html");
      const tables = doc.querySelectorAll("table");
      let extracted = "";
      tables.forEach((table) => {
        const rows = table.querySelectorAll("tr");
        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, th");
          const rowText = Array.from(cells)
            .map((c) => c.textContent?.trim() || "")
            .join("\t");
          if (rowText) extracted += rowText + "\n";
        });
      });
      if (extracted.trim()) {
        setInputText(extracted);
        setParseError(false);
      }
    };
    reader.readAsText(file);
  };

  const updateSubject = (
    index: number,
    field: keyof SubjectRecord,
    value: any,
  ) => {
    const newSubjects = [...subjects];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setSubjects(newSubjects);
    setProjectedGrades((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
    setProjectedGrades((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const openAddModal = () => {
    setAddForm({
      name: "",
      units: 3,
      grade: "A",
      year: "1st Year",
      semester: "1st Semester",
      outOfCurriculum: false,
    });
    setShowAddModal(true);
  };

  const handleAddSubject = () => {
    const entry: SubjectRecord = {
      name: addForm.name || "Untitled",
      units: addForm.units,
      grade: addForm.grade,
      year: addForm.outOfCurriculum ? "Out of Curriculum" : addForm.year,
      semester: addForm.outOfCurriculum ? "—" : addForm.semester,
      included: true,
    };
    setSubjects([...subjects, entry]);
    setShowAddModal(false);
  };

  const addExtraSubject = () => {
    setExtraSubjects([...extraSubjects, { name: "", units: 3, grade: "A" }]);
  };

  const updateExtraSubject = (
    index: number,
    field: keyof SubjectRecord,
    value: any,
  ) => {
    const next = [...extraSubjects];
    next[index] = { ...next[index], [field]: value };
    setExtraSubjects(next);
  };

  const removeExtraSubject = (index: number) => {
    setExtraSubjects(extraSubjects.filter((_, i) => i !== index));
  };

  const qpi = calculateQPI(subjects);

  const missingSubjects = useMemo(
    () =>
      subjects.reduce(
        (acc, s, i) => {
          if (s.included === false) acc.push({ ...s, _index: i });
          return acc;
        },
        [] as (SubjectRecord & { _index: number })[],
      ),
    [subjects],
  );

  const projectedQPI = useMemo(() => {
    const withProjections = subjects.map((s, i) => {
      if (excludedFromProjection[i]) return { ...s, included: false };
      if (s.included === false && projectedGrades[i]) {
        return { ...s, grade: projectedGrades[i], included: true };
      }
      return s;
    });
    return calculateQPI([...withProjections, ...extraSubjects]);
  }, [subjects, projectedGrades, extraSubjects, excludedFromProjection]);

  const gradedUnits = useMemo(
    () =>
      subjects
        .filter((s) => s.included !== false && s.grade !== "N/A")
        .reduce((sum, s) => sum + s.units, 0),
    [subjects],
  );

  const hasProjectionInputs =
    Object.keys(projectedGrades).length > 0 ||
    extraSubjects.length > 0 ||
    Object.keys(excludedFromProjection).length > 0;

  const gradeColor = (grade: Grade) => {
    const p = GRADE_POINTS[grade];
    if (p >= 3.5) return "text-primary";
    if (p >= 2.5) return "text-yellow-400";
    if (p >= 1.0) return "text-orange-400";
    return "text-red-400";
  };

  const grouped = useMemo(() => {
    return subjects.reduce(
      (acc, s, idx) => {
        const key = `${s.year || "Unknown Year"} - ${s.semester || "Unknown Semester"}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push({ ...s, _index: idx });
        return acc;
      },
      {} as Record<string, (SubjectRecord & { _index: number })[]>,
    );
  }, [subjects]);

  const sortedGroupEntries = useMemo(() => {
    return Object.entries(grouped).sort(([aKey], [bKey]) => {
      const aMatches = aKey.match(/^(\d+)/);
      const bMatches = bKey.match(/^(\d+)/);

      // Non-year keys (OOC, Other, Unknown) go to bottom
      if (!aMatches && !bMatches) return aKey.localeCompare(bKey);
      if (!aMatches) return 1;
      if (!bMatches) return -1;

      const aYear = parseInt(aMatches[1]);
      const bYear = parseInt(bMatches[1]);
      if (aYear !== bYear) return aYear - bYear;

      // Same year: 1st Sem → 0, 2nd Sem → 1, Summer → 2, rest → 99
      const aSem = (aKey.split(" - ")[1] || "").trim();
      const bSem = (bKey.split(" - ")[1] || "").trim();
      const rank = (s: string) =>
        /^1/i.test(s) ? 0 : /^2/i.test(s) ? 1 : /^s/i.test(s) ? 2 : 99;
      return rank(aSem) - rank(bSem);
    });
  }, [grouped]);

  if (!isParsed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col justify-center max-w-2xl mx-auto space-y-12"
      >
        <div className="text-center space-y-3">
          <h2 className="font-display text-6xl md:text-7xl tracking-tight text-foreground leading-none">
            Cumulative QPI
          </h2>
          <p className="text-base text-muted-foreground font-mono">
            paste your SIS curriculum to begin
          </p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-primary/8 via-primary/5 to-accent/8 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <textarea
            className="relative w-full h-72 p-8 text-base font-mono leading-relaxed bg-muted/30 border border-input rounded-[1.5rem] focus:border-primary/30 focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all placeholder:text-muted-foreground/60"
            placeholder={`Ctrl+A, Ctrl+C your SIS curriculum and paste here…

The parser reads tab-separated or space-aligned columns:
Subject Name  Units  Grade`}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setParseError(false);
            }}
            spellCheck={false}
          />
        </div>

        {parseError && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-mono text-red-400 text-center -mt-4"
          >
            No subjects parsed! Make sure you pasted in the right format
            (tab‑separated or space‑aligned columns) or saved the correct SIS
            page.
          </motion.p>
        )}

        {/* Upload HTML */}
        <div className="flex items-center gap-3 justify-center">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-mono text-muted-foreground/70 uppercase tracking-wider flex-shrink-0">
            or
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="text-center space-y-1.5">
          <p className="text-sm font-mono text-muted-foreground/70">
            Save your SIS Curriculum page as{" "}
            <span className="text-foreground/80">Webpage, HTML Only</span>
          </p>
          <p className="text-xs font-mono text-muted-foreground/50">
            <a href="https://sis.addu.edu.ph/" target="_blank" rel="noopener noreferrer">
              <u>sis.addu.edu.ph</u>
            </a>{" "}
            → My Curriculum → Right‑click → Save as →{" "}
            <span className="text-foreground/60">Webpage, HTML Only</span>
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = "";
          }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/[0.02] text-muted-foreground/70 hover:text-primary transition-all cursor-pointer"
        >
          <Upload className="w-5 h-5" />
          <span className="font-mono text-sm tracking-wider">
            Upload .html file
          </span>
        </button>

        <Button
          onClick={handleGo}
          disabled={!inputText.trim()}
          className="h-16 rounded-2xl text-lg font-bold gap-3 bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg shadow-primary/15 hover:shadow-primary/25 transition-all active:scale-[0.97] disabled:opacity-30"
        >
          <RotateCcw className="w-5 h-5" />
          <span className="font-mono tracking-wider uppercase text-sm">
            Parse &amp; Calculate
          </span>
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-12 pb-28 relative">
      {/* Sticky Header - full width */}
      <div className="sticky top-0 z-10 -mx-10 md:-mx-14 px-10 md:px-14 pt-10 md:pt-14 -mt-10 md:-mt-14 bg-card/85 backdrop-blur-xl border-b border-border pb-8">
        <div className="flex justify-between items-end gap-6">
          <div className="space-y-2">
            <h2 className="font-display text-5xl md:text-6xl tracking-tight text-foreground leading-none">
              Cumulative QPI
            </h2>
            <p className="text-base text-muted-foreground font-mono">
              {subjects.length} subject{subjects.length !== 1 ? "s" : ""} loaded
            </p>
          </div>
          <motion.div
            key={qpi.toFixed(2)}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-right flex-shrink-0"
          >
            <div className="text-xs font-mono text-muted-foreground/70 uppercase tracking-[0.2em] mb-1">
              Overall
            </div>
            <div className="text-7xl md:text-8xl font-sans text-primary leading-none tabular-nums tracking-tight">
              {qpi.toFixed(2)}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Grouped Subjects */}
      <div className="space-y-12">
        {sortedGroupEntries.map(([groupKey, groupSubjects]) => (
          <motion.div
            key={groupKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 px-1 pb-3">
              <span className="text-sm font-mono uppercase tracking-[0.25em] text-muted-foreground/70 font-bold">
                {groupKey}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {groupSubjects.map((s) => (
                  <motion.div
                    key={s._index}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex gap-3 items-center p-3 rounded-xl transition-all",
                      s.included !== false
                        ? "hover:bg-muted/20"
                        : "opacity-30 grayscale",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-muted-foreground/30 bg-transparent checked:bg-primary checked:border-primary focus:ring-primary/30 focus:ring-offset-0 cursor-pointer accent-primary flex-shrink-0"
                      checked={s.included !== false}
                      onChange={(e) =>
                        updateSubject(s._index, "included", e.target.checked)
                      }
                    />
                    <input
                      type="text"
                      className="flex-1 bg-transparent border-none px-3 py-2 text-base md:text-lg font-mono outline-none focus:text-primary transition-colors min-w-0"
                      value={s.name}
                      onChange={(e) =>
                        updateSubject(s._index, "name", e.target.value)
                      }
                    />
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input
                        type="number"
                        className="w-20 bg-muted/30 border border-input rounded-xl px-3 py-2.5 text-center text-base font-mono outline-none focus:border-primary/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={s.units}
                        onChange={(e) =>
                          updateSubject(
                            s._index,
                            "units",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                      <select
                        className={cn(
                          "w-24 border border-input rounded-xl px-2.5 py-2.5 text-center text-base font-mono font-bold outline-none transition-all cursor-pointer",
                          gradeColor(s.grade),
                          s.grade === "N/A"
                            ? "bg-muted/30 text-muted-foreground"
                            : "bg-primary/[0.08]",
                          "focus:border-primary/30",
                        )}
                        value={s.grade}
                        onChange={(e) =>
                          updateSubject(
                            s._index,
                            "grade",
                            e.target.value as Grade,
                          )
                        }
                      >
                        {Object.keys(GRADE_POINTS).map((g) => (
                          <option key={g} value={g} className="bg-card">
                            {g}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                        onClick={() => removeSubject(s._index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Floating Projection Button - half in/out */}
      {(missingSubjects.length > 0 ||
        extraSubjects.length > 0 ||
        hasProjectionInputs) && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, x: showProjection ? 0 : 44 }}
          whileHover={{ x: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          onClick={() => setShowProjection(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-3 bg-primary text-primary-foreground py-3.5 pl-3.5 pr-5 rounded-l-xl shadow-2xl hover:bg-primary/90 cursor-pointer"
        >
          <span className="font-mono text-xs font-bold uppercase tracking-wider whitespace-nowrap">
            Predictor Tool
          </span>
        </motion.button>
      )}

      {/* Projection Modal */}
      {createPortal(
        <AnimatePresence>
          {showProjection && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowProjection(false)}
            >
              <div
                className="w-full max-w-xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-border flex-shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-display text-xl text-foreground">
                        Projection
                      </div>
                      <div className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wider">
                        {missingSubjects.length -
                          Object.keys(excludedFromProjection).length}{" "}
                        pending &middot;{" "}
                        {Object.keys(excludedFromProjection).length} excluded
                        &middot; {extraSubjects.length} extra
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProjection(false)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto min-h-0 px-8 py-6 space-y-8">
                  {/* Cum Laude Thresholds */}
                  <div className="space-y-4">
                    <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground/70 font-bold">
                      Cum Laude Thresholds
                    </div>
                    {CUM_LAUDE_THRESHOLDS.map((t) => {
                      const currentDelta = qpi - t.value;
                      const projectedDelta = projectedQPI - t.value;
                      const met = currentDelta >= 0;
                      const willMeet = projectedDelta >= 0 && !met;

                      const needed = t.value - qpi;
                      const aUnitsNeeded =
                        needed > 0 && gradedUnits > 0
                          ? Math.ceil(
                              (t.value * gradedUnits - qpi * gradedUnits) /
                                (4.0 - t.value) /
                                3,
                            )
                          : 0;

                      return (
                        <div key={t.value} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "font-mono text-sm font-bold",
                                  met
                                    ? "text-primary"
                                    : willMeet
                                      ? "text-yellow-400"
                                      : "text-muted-foreground/50",
                                )}
                              >
                                {t.short}
                              </span>
                              <span className="text-xs font-mono text-muted-foreground/40">
                                {t.label}
                              </span>
                            </div>
                            <span
                              className={cn(
                                "font-mono text-xs font-bold",
                                met
                                  ? "text-primary"
                                  : willMeet
                                    ? "text-yellow-400"
                                    : "text-muted-foreground/40",
                              )}
                            >
                              {met
                                ? "ACHIEVED"
                                : `need ${(t.value - qpi).toFixed(3)}${
                                    aUnitsNeeded > 0
                                      ? ` · ${aUnitsNeeded} A${aUnitsNeeded > 1 ? "'s" : ""} (3 units)`
                                      : ""
                                  }`}
                            </span>
                          </div>
                          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, (projectedQPI / t.value) * 100)}%`,
                              }}
                              transition={{
                                duration: 0.6,
                                ease: [0.23, 1, 0.32, 1],
                              }}
                              className={cn(
                                "h-full rounded-full",
                                met
                                  ? "bg-primary"
                                  : willMeet
                                    ? "bg-yellow-400"
                                    : "bg-red-400/50",
                              )}
                            />
                          </div>
                          <div className="flex justify-between text-xs font-mono text-muted-foreground/50">
                            <span>{qpi.toFixed(2)}</span>
                            <span>{projectedQPI.toFixed(2)}</span>
                            <span>{t.value.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="h-px bg-border" />

                  {/* Missing Subjects */}
                  {missingSubjects.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        <span className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground/70 font-bold">
                          Pending Subjects
                        </span>
                      </div>
                      <div className="space-y-2">
                        {missingSubjects.map((s) => {
                          const isExcluded = !!excludedFromProjection[s._index];
                          return (
                            <div
                              key={s._index}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border",
                                isExcluded
                                  ? "bg-muted/5 border-border/30 opacity-50"
                                  : "bg-muted/20 border-border",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex-1 text-sm md:text-base font-mono truncate",
                                  isExcluded
                                    ? "text-muted-foreground/40 line-through"
                                    : "text-muted-foreground",
                                )}
                              >
                                {s.name || "Untitled"}
                              </span>
                              <span
                                className={cn(
                                  "text-sm font-mono w-10 text-right",
                                  isExcluded
                                    ? "text-muted-foreground/20"
                                    : "text-muted-foreground/60",
                                )}
                              >
                                {s.units}un
                              </span>
                              {isExcluded ? (
                                <button
                                  onClick={() => {
                                    const next = { ...excludedFromProjection };
                                    delete next[s._index];
                                    setExcludedFromProjection(next);
                                  }}
                                  className="text-muted-foreground/30 hover:text-primary transition-colors"
                                  title="Restore to projection"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              ) : (
                                <>
                                  <select
                                    className={cn(
                                      "w-24 border border-input rounded-xl px-2.5 py-2.5 text-center text-sm font-mono font-bold outline-none transition-all cursor-pointer bg-muted/30",
                                      projectedGrades[s._index]
                                        ? gradeColor(projectedGrades[s._index])
                                        : "text-muted-foreground/40",
                                    )}
                                    value={projectedGrades[s._index] || ""}
                                    onChange={(e) => {
                                      const val = e.target.value as Grade | "";
                                      setProjectedGrades((prev) => {
                                        const next = { ...prev };
                                        if (val) next[s._index] = val;
                                        else delete next[s._index];
                                        return next;
                                      });
                                    }}
                                  >
                                    <option
                                      value=""
                                      className="bg-card text-muted-foreground/60"
                                    >
                                      —
                                    </option>
                                    {Object.keys(GRADE_POINTS).map((g) => (
                                      <option
                                        key={g}
                                        value={g}
                                        className="bg-card"
                                      >
                                        {g}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() =>
                                      setExcludedFromProjection((prev) => ({
                                        ...prev,
                                        [s._index]: true,
                                      }))
                                    }
                                    className="text-muted-foreground/20 hover:text-destructive transition-colors flex-shrink-0"
                                    title="Exclude from projection"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Extra Subjects */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-primary" />
                      <span className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground/70 font-bold">
                        Extra Subjects
                      </span>
                    </div>
                    {extraSubjects.length === 0 ? (
                      <p className="text-sm font-mono text-muted-foreground/60 px-1">
                        Add subjects outside your curriculum or overload here.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
                          {extraSubjects.map((s, i) => (
                            <motion.div
                              key={`extra-${i}`}
                              layout
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{
                                opacity: 0,
                                x: 12,
                                height: 0,
                                marginBottom: 0,
                              }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/20 border border-border"
                            >
                              <input
                                type="text"
                                placeholder="Subject"
                                className="flex-1 bg-transparent border-none text-sm md:text-base font-mono outline-none placeholder:text-muted-foreground/60 min-w-0"
                                value={s.name}
                                onChange={(e) =>
                                  updateExtraSubject(i, "name", e.target.value)
                                }
                              />
                              <input
                                type="number"
                                className="w-20 bg-muted/30 border border-input rounded-xl px-3 py-2.5 text-center text-base font-mono outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={s.units}
                                onChange={(e) =>
                                  updateExtraSubject(
                                    i,
                                    "units",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                              />
                              <select
                                className={cn(
                                  "w-24 border border-input rounded-xl px-2.5 py-2.5 text-center text-sm font-mono font-bold outline-none transition-all cursor-pointer bg-muted/30",
                                  gradeColor(s.grade),
                                )}
                                value={s.grade}
                                onChange={(e) =>
                                  updateExtraSubject(
                                    i,
                                    "grade",
                                    e.target.value as Grade,
                                  )
                                }
                              >
                                {Object.keys(GRADE_POINTS).map((g) => (
                                  <option key={g} value={g} className="bg-card">
                                    {g}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => removeExtraSubject(i)}
                                className="text-muted-foreground/20 hover:text-destructive transition-colors flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                    <button
                      onClick={addExtraSubject}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/[0.02] text-muted-foreground/70 hover:text-primary text-sm font-mono transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add Extra Subject
                    </button>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex-shrink-0 px-8 py-5 border-t border-border bg-muted/10">
                  {hasProjectionInputs ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs font-mono text-muted-foreground/70 uppercase tracking-wider">
                        Projected Overall
                      </span>
                      <span className="text-3xl font-sans text-primary tabular-nums tracking-tight">
                        {projectedQPI.toFixed(2)}
                      </span>
                    </motion.div>
                  ) : (
                    <span className="text-xs font-mono text-muted-foreground/60">
                      Assign grades to pending or extra subjects to see your
                      projected QPI.
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Add Subject Modal */}
      {createPortal(
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            >
              <div
                className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-mono font-bold text-muted-foreground/70">
                      Out of Curriculum
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-5 space-y-5">
                  {/* Subject Name */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground/70 font-bold">
                      Subject Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mathematics 101"
                      className="w-full bg-muted/30 border border-input rounded-xl px-4 py-4 text-base font-mono outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/60"
                      value={addForm.name}
                      onChange={(e) =>
                        setAddForm({ ...addForm, name: e.target.value })
                      }
                      autoFocus
                    />
                  </div>

                  {/* Units & Grade */}
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground/70 font-bold">
                        Units
                      </label>
                      <input
                        type="number"
                        className="w-full bg-muted/30 border border-input rounded-xl px-4 py-4 text-base font-mono text-center outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={addForm.units}
                        onChange={(e) =>
                          setAddForm({
                            ...addForm,
                            units: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground/70 font-bold">
                        Grade
                      </label>
                      <select
                        className="w-full bg-muted/30 border border-input rounded-xl px-4 py-4 text-base font-mono text-center outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                        value={addForm.grade}
                        onChange={(e) =>
                          setAddForm({
                            ...addForm,
                            grade: e.target.value as Grade,
                          })
                        }
                      >
                        {Object.keys(GRADE_POINTS).map((g) => (
                          <option key={g} value={g} className="bg-card">
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Out of Curriculum Toggle */}
                  <label className="flex items-center gap-3 py-1 cursor-pointer group">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        addForm.outOfCurriculum
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30 group-hover:border-muted-foreground/50",
                      )}
                    >
                      {addForm.outOfCurriculum && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-3 h-3 text-primary-foreground"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </motion.svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={addForm.outOfCurriculum}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          outOfCurriculum: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-mono text-foreground/80">
                      Out of Curriculum
                    </span>
                  </label>

                  {/* Year & Semester */}
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label
                        className={cn(
                          "text-sm font-mono uppercase tracking-wider font-bold",
                          addForm.outOfCurriculum
                            ? "text-muted-foreground/20"
                            : "text-muted-foreground/70",
                        )}
                      >
                        Year Level
                      </label>
                      <select
                        disabled={addForm.outOfCurriculum}
                        className={cn(
                          "w-full rounded-xl px-4 py-4 text-base font-mono text-center outline-none transition-all cursor-pointer",
                          addForm.outOfCurriculum
                            ? "bg-muted/10 border border-muted/20 text-muted-foreground/20"
                            : "bg-muted/30 border border-input focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
                        )}
                        value={addForm.year}
                        onChange={(e) =>
                          setAddForm({ ...addForm, year: e.target.value })
                        }
                      >
                        {[
                          "1st Year",
                          "2nd Year",
                          "3rd Year",
                          "4th Year",
                          "5th Year",
                        ].map((y) => (
                          <option key={y} value={y} className="bg-card">
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label
                        className={cn(
                          "text-sm font-mono uppercase tracking-wider font-bold",
                          addForm.outOfCurriculum
                            ? "text-muted-foreground/20"
                            : "text-muted-foreground/70",
                        )}
                      >
                        Semester
                      </label>
                      <select
                        disabled={addForm.outOfCurriculum}
                        className={cn(
                          "w-full rounded-xl px-4 py-4 text-base font-mono text-center outline-none transition-all cursor-pointer",
                          addForm.outOfCurriculum
                            ? "bg-muted/10 border border-muted/20 text-muted-foreground/20"
                            : "bg-muted/30 border border-input focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
                        )}
                        value={addForm.semester}
                        onChange={(e) =>
                          setAddForm({
                            ...addForm,
                            semester: e.target.value,
                          })
                        }
                      >
                        {["1st Semester", "2nd Semester", "Summer"].map(
                          (sm) => (
                            <option key={sm} value={sm} className="bg-card">
                              {sm}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-muted/10">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-xl px-5 py-3 text-sm font-mono"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddSubject}
                    className="rounded-xl px-5 py-3 text-sm font-mono font-bold gap-2 bg-primary/90 hover:bg-primary text-primary-foreground"
                  >
                    <Plus className="w-4 h-4" />
                    Add Subject
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Floating Action Bar */}
      <motion.div
        layout
        className="fixed bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 flex gap-3 md:gap-4 z-30 px-4 w-full max-w-lg md:max-w-none justify-center"
      >
        <Button
          onClick={openAddModal}
          className="rounded-2xl px-5 md:px-8 py-5 md:py-6 shadow-2xl gap-3 bg-primary/90 hover:bg-primary text-primary-foreground text-sm md:text-base transition-all active:scale-[0.97] flex-1 md:flex-initial"
        >
          <Plus className="w-5 h-5" />
          <span className="font-mono text-sm tracking-wider uppercase">
            Add Subject
          </span>
        </Button>
        <Button
          onClick={() => setIsParsed(false)}
          variant="outline"
          className="rounded-2xl px-5 md:px-8 py-5 md:py-6 shadow-2xl bg-card/80 backdrop-blur-xl border-border hover:bg-card text-sm md:text-base transition-all active:scale-[0.97] gap-3 flex-1 md:flex-initial"
        >
          <RotateCcw className="w-5 h-5" />
          <span className="font-mono text-sm tracking-wider uppercase">
            New Paste
          </span>
        </Button>
      </motion.div>
    </div>
  );
}
