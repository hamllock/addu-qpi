# AdDU QPI Calculator

A lightweight, client-side QPI (Quality Point Index) calculator for Ateneo de Davao University students. Calculate semester and cumulative QPI, project future grades, and see what you need for Cum Laude / Magna / Summa.

## Features

- **Semester QPI** — manually add subjects, units, and grades to compute your term QPI
- **Cumulative QPI** — paste your SIS curriculum (tab-separated) or upload a saved `.html` page to auto-parse all subjects across years and semesters
- **Grade projection** — uncheck completed subjects, assign projected grades to pending ones, and see your projected overall QPI
- **Cum Laude thresholds** — visual progress bars for CL (3.0), MCL (3.4), and SCL (3.7)
- **Extra subjects** — add overload or out-of-curriculum subjects in the projection panel
- **Dark mode** — toggle at the top-right, preference saved to localStorage

## Tech

React + TypeScript + Vite + Tailwind CSS + Framer Motion

## Usage

```
npm install
npm run dev      # development server
npm run build    # production build → dist/
```

## License

MIT
