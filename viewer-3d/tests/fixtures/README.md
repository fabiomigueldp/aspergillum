# Studio rollback fixtures

`studio-main-schema2.txt` and `studio-schema2.html` are unchanged snapshots of
`viewer-3d/src/render-studio/main.js` and `viewer-3d/render-studio.html` from commit
`3658ed5ce175a1f749700ef86172b64fac9c5f57`, the schema-2 baseline.

The persistence flow test executes this old controller and the current controller
against the same storage. Only rendering is stubbed. Keep these fixtures unchanged
so a future update cannot silently redefine the previous version's save behavior.
