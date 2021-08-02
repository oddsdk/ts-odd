# Webnative API Reference

[version](./modules/common_version.html#VERSION)

This is the source-derived, auto-generated API reference for [webnative](https://github.com/fission-suite/webnative).

If you need an introduction to webnative, we recommend reading the [fission guide](https://guide.fission.codes/developers/webnative) instead. This document is meant to be used as an API reference.


## Which Docs to Look At

When you import webnative like this:
```js
import * as webnative from "webnative"
```

or like this:

```js
const webnative = require("webnative")
```

or using a script tag:
```html
<script src="https://unpkg.com/webnative@latest/dist/index.umd.min.js">
```

Then you'll have a `webnative` variable at disposal which contains the [`index` module](./modules/index.html).

Once you've loaded a filesystem, you'll have an instance of the [`FileSystem` class](./classes/fs_filesystem.FileSystem.html). Read its docs to see what filesystem operations are supported.


## These Docs for another Webnative Version

The docs at [webnative.fission.app](https://webnative.fission.app) will always be the docs for the most recent webnative version.

If you want to look at the docs for an older webnative version, keep in mind that webnative's npm package ships with these docs at`node_modules/webnative/docs/`. So if you want to take a look at them, just open these docs' html files (at `./node_modules/webnative/docs/index.html`) in your browser.
