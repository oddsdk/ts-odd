@build-and-clean:
  yarn build
  yarn docs
  cp ./package.json dist/
  cp ./README.md dist/
  cp ./LICENSE dist/
  cp -r ./docs dist/

@publish:
  just publish-latest

@publish-latest:
  just build-and-clean
  cd dist && npm publish --tag latest

@publish-alpha:
  just build-and-clean
  cd dist && npm publish --tag alpha
