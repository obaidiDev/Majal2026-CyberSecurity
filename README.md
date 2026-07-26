# Majal — Cyber Course

A five-day, offline Reveal.js course. Every day runs straight from `file://`
(no server, no build) by opening its `index.html`.

## Layout

```
.
├── shared/              # framework + brand, shared by every day
│   ├── dist/            #   Reveal.js core (vendored, committed for offline use)
│   ├── plugin/          #   Reveal plugins (notes, highlight, …)
│   └── css/course.css   #   Majal brand theme (light PDF identity)
├── day1/                # one folder per day = that day's content only
│   ├── index.html       #   links ../shared/… for framework + theme
│   ├── data/            #   content.js, logs.js
│   ├── js/              #   state.js engine + widgets/ (day-specific)
│   ├── lab1-linux.md    #   lab handout, source of truth
│   ├── lab1-linux.html  #   … rendered by tools/md2lab.py (committed)
│   └── assets/
├── day2/ … day5/        # same shape (added as they're built)
├── tools/md2lab.py      # lab markdown → standalone offline HTML page
└── MajalEducationalDeckTemplate.pdf   # brand reference
```

## Labs

Lab handouts are written in markdown and rendered to a self-contained,
brand-matched page linked from the course index:

```
python3 tools/md2lab.py day1/lab1-linux.md day1/lab1-linux.html "Day 1 · Lab 1"
```

Edit the `.md`, re-run, commit both. (Needs `mistune`; the output has no
runtime dependencies and opens from `file://` like the decks.)

## Adding a new day

Copy `day1/` to `dayN/`, keep the `../shared/…` links in its `index.html`,
and replace `data/` + `js/widgets/` with that day's content. Theme changes go
once into `shared/css/course.css` and apply to every day.

> Note: `js/state.js` is currently day-coupled (localStorage key, export
> filename, day flag). Once day2 exists, the day-agnostic engine parts can be
> lifted into `shared/js/` — deferred until the real seam is visible.
