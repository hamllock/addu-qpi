import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QPICalculator } from "@/components/QPICalculator";
import { CumulativeQPI } from "@/components/CumulativeQPI";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";

type Tab = "qpi" | "cumulative";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("qpi");
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const tabs = [
    { id: "qpi", label: "Semester", component: QPICalculator },
    { id: "cumulative", label: "Cumulative", component: CumulativeQPI },
  ] as const;

  const ActiveComponent =
    tabs.find((t) => t.id === activeTab)?.component || QPICalculator;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-4 md:p-8 selection:bg-primary/30 selection:text-primary-foreground relative">
      {/* Ambient glow */}
      <div className="fixed top-1/4 right-1/4 w-[40vw] h-[40vw] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse-glow" />
      <div className="fixed bottom-1/4 left-1/4 w-[30vw] h-[30vw] bg-accent/8 rounded-full blur-[100px] -z-10" />

      {/* Theme Toggle */}
      <button
        onClick={() => setDark(!dark)}
        className="fixed top-4 md:top-6 right-4 md:right-6 z-50 w-10 h-10 rounded-xl flex items-center justify-center bg-background border border-border hover:bg-muted/50 transition-all shadow-sm"
        aria-label="Toggle theme"
      >
        {dark ? (
          <Sun className="w-4 h-4 text-foreground" />
        ) : (
          <Moon className="w-4 h-4 text-foreground" />
        )}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-lg md:max-w-5xl lg:max-w-[92vw] xl:max-w-[88vw] min-h-0 md:min-h-0 md:h-[90vh] flex flex-col md:flex-row bg-card/80 backdrop-blur-xl border border-border rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl"
      >
        {/* Navigation */}
        <nav className="w-full md:w-[220px] flex-shrink-0 border-b md:border-b-0 md:border-r border-border bg-muted/20 flex flex-row md:flex-col items-stretch p-3 md:p-5 gap-1">
          {/* Seal + Brand - desktop only */}
          <div className="hidden md:flex flex-col items-center gap-3 pb-5 mb-3 border-b border-border">
            <img
              src="/University Seal (Small).png"
              alt="AdDU"
              className="w-14 h-14 object-contain"
            />
            <div className="text-center">
              <div className="font-display text-sm text-foreground leading-tight">AdDU</div>
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
                QPI Calculator
              </div>
            </div>
          </div>

          <div className="flex flex-row md:flex-col items-stretch gap-1 flex-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  "relative flex items-center justify-center md:justify-start px-5 md:px-6 py-4 md:py-5 rounded-xl font-medium transition-all duration-300 outline-none",
                  isActive
                    ? "text-primary bg-primary/10 shadow-sm"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/30",
                )}
              >
                <span className={cn(
                  "tracking-wider uppercase text-xs md:text-sm font-bold transition-all",
                  isActive ? "opacity-100" : "opacity-70",
                )}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 rounded-xl ring-1 ring-primary/20"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
              </button>
            );
          })}
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-muted/5">
          <div className="h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="p-10 md:p-14 h-full"
              >
                <ActiveComponent />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </motion.div>
    </div>
  );
}

export default App;
