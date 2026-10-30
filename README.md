# Interesting Reads

A one-page, slow-turning 3D shelf of essays, papers and speeches worth coming back to.
Built with three.js, plain static files, no build step.

- Hover a book: it lifts. Click it: it slides out, turns to face you and lands on a wooden table
  next to a card with the title, author, description and a Read button.
- Pick a topic and the unrelated books tumble off the front of the shelf with real physics;
  the rest close up. Switch back and they rise into place.
- Search, Surprise me, Previous / Next, a share link per book (#/mind-01), a heading typed
  letter by letter, keyboard support, reduced-motion support, and a plain-list fallback if 3D fails.

## Run it locally

    python3 -m http.server 8000
    # open http://localhost:8000

It must be served over http://, not opened as a file, because the shelf loads data/essays.json.

## Put your own list on the shelf

Edit data/essays.json - an array of items:

    {
      "id": "mind-01",           // unique, used in the share link
      "title": "This Is Water",
      "author": "David Foster Wallace",
      "publication": "Kenyon College",
      "year": "2005",
      "topic": "Mind",           // becomes a topic button
      "url": "https://...",      // where Read goes
      "desc": "One line about the piece.",
      "image": null,             // optional: a direct image URL for the cover
      "status": "working"        // working | paid (shows a paywall note)
    }

Covers are drawn at runtime on a canvas: the top band carries the site name and the issue
number, the title is set in a serif, an image sits in the middle if you supply one, and the
author sits at the foot. Spine and band colour come from a fixed palette picked by the item id,
so the shelf always looks like a shelf. No image, no problem - you get a clean typographic cover.

Topics are read from the data. To change their order, edit TOPICS_ORDER in js/app.js.

## Files

    index.html        the page
    css/style.css     all styling
    js/app.js         the 3D shelf, covers, physics, cards, keyboard
    data/essays.json  the reading list
    vendor/three.module.js  three.js r160, vendored so the site has no CDN dependency

## Credits

Cover images, where used, belong to the publications that made them - every book links back
to its own source. three.js is MIT licensed.
