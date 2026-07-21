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
│   └── assets/
├── day2/ … day5/        # same shape (added as they're built)
└── MajalEducationalDeckTemplate.pdf   # brand reference
```

## Adding a new day

Copy `day1/` to `dayN/`, keep the `../shared/…` links in its `index.html`,
and replace `data/` + `js/widgets/` with that day's content. Theme changes go
once into `shared/css/course.css` and apply to every day.

> Note: `js/state.js` is currently day-coupled (localStorage key, export
> filename, day flag). Once day2 exists, the day-agnostic engine parts can be
> lifted into `shared/js/` — deferred until the real seam is visible.
