#!/bin/sh

rm -rf dist/ && mkdir -p dist/ &&
browserify js/xCharts.js js/utils/*.js js/components/*.js js/charts/*.js  -o dist/xCharts.js &&
cat js/css/*.css > dist/xCharts.css