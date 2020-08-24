@build-and-clean:
  yarn build
  cp ./package.json dist/
  cp ./README.md dist/
  cp ./LICENSE dist/

@publish:
  just publish-latest

@publish-latest:
  just build-and-clean
  cd dist && npm publish --tag latest

@publish-alpha:
  just build-and-clean
  cd dist && npm publish --tag alpha
