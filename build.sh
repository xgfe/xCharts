#!/bin/sh

rm -rf dist/ && mkdir -p dist/ &&
browserify src/xCharts.js src/utils/*.js src/components/*.js src/charts/*.js  -o dist/xCharts.js &&
cat src/css/*.css > dist/xCharts.css