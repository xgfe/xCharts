/**
 * Author liuyang46@meituan.com
 * Date 16/4/21
 * Describe
 */
'use strict"'
var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');
var config = require('./package.json');
var header = require('gulp-header');

var uglifyOptions = {}

var banner=['/**',
    ' * <%= pkg.name %> - <%= pkg.description %>',
    ' * @version v<%= pkg.version %>',
    '*/',
''].join('\n');

var production = process.env.NODE_ENV === 'production';

gulp.task('build-js', function () {
    var pipe = gulp.src([
        './src/xCharts.js',
        './src/utils/utils.js',
        './src/components/Component.js',
        './src/components/*.js',
        './src/charts/Chart.js',
        './src/charts/*.js'
    ]).pipe(concat('xCharts.js'))

    if (!production) {
        pipe.pipe(sourcemaps.init())
    }

    pipe.pipe(uglify(uglifyOptions))
    if (!production) {
        pipe.pipe(sourcemaps.write('./maps'))
    }
    pipe.pipe(rename({
            suffix: '.min'
        }))
        .pipe(header(banner,{pkg:config}))
        .pipe(gulp.dest('./dist/'));
});

gulp.task('build-css', function () {
    return gulp.src('./src/css/xCharts.css')
        .pipe(gulp.dest('./dist/'));
});

gulp.task('build',['build-js','build-css']);