yarn build
cp ./package.json dist/
cp ./README.md dist/
cp ./LICENSE dist/
cd dist
npm publish
