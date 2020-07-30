# Changelog

### v0.14.0

- Renamed `isAuthenticated` to `initialise`
- `initialise` will return an instance of the file system (can be disabled in case you use web workers)
- Adds `loadFileSystem` to load a file system (called automatically from `initialise` unless disabled). This function is responsible for caching the file system locally and making a file system if the user hasn't got one yet.
- Adds the `fs.appPath.private` and `fs.appPath.public` function to build paths.
- Adds the `fs.exists`, `fs.read` and `fs.write` file system methods
