# Code organisation

## Modules

The root level exports various objects, these are the "modules" which live in their own directories. For example, `import { paths } from "webnative"`, this paths object is exported from `src/paths/index.ts`

You also have modules that contain functions that will be mixed in with the other top-level functions. For example, `webnative.loadFileSystem()` which lives in `src/fileSystem.ts`


## Emojis

There's various emojis in comments through the code base that serve to "categorise" various parts of the code. This mainly helps to organise things per file. The emoji you'll see most is ㊙️ the Japanese sign meaning "secret", which we use here for private code (eg. functions that aren't exposed)