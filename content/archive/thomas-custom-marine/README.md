# Thomas Custom Marine (the SeaDek project), archived

Taken off the site on 2 October 2026. It is kept here in case it is wanted again.

- `project.json` is the full Sanity document as it stood (`project-thomas-custom-marine`).
- `poster.jpg` is the video poster that lived at `public/posters/thomas-custom-marine.jpg`.
- The thumbnail video and image are remote files, linked from `project.json`.

The Sanity document itself has not been deleted. The site hides it through
`HIDDEN_WORK_SLUGS` in `sanity/lib/queries.ts`.

To bring it back: remove the slug from `HIDDEN_WORK_SLUGS` and move `poster.jpg`
back to `public/posters/thomas-custom-marine.jpg`. If the Sanity document has
been deleted in the meantime, recreate it from `project.json`.
