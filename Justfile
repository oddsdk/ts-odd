@build-and-clean:
  yarn build
  cp ./package.json dist/
  cp ./README.md dist/
  cp ./LICENSE dist/
  cd dist

@publish:
  just publish-latest

@publish-latest:
  just build-and-clean
  npm publish --tag latest

@publish-alpha:
  just build-and-clean
  npm publish --tag alpha
