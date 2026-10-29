# Draft registry: pages

| Query | Meaning |
| --- | --- |
| `resource` | Registry key → `load` + `view` |
| `id` | Collection document id when needed |
| `locale` | Optional locale |
| `frame` | Optional nested page key (`componentPreview.defaultFrame`) as inner `load` + `view` |
| `resource=layout` | No registry row — app draft layout supplies chrome; `frame` selects the body page (default `home-page`) |

`DraftPage` resolves both entries from `pages`; host only registers `load` / `view`.

Producer: `custom.draft.componentPreview.defaultFrame` → `frame=` on the bootstrap URL.
