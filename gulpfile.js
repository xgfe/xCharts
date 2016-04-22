/**
 * Author liuyang46@meituan.com
 * Date 16/4/21
 * Describe
 */
'use strict"'
var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var config = require('./package.json');
var header = require('gulp-header');
var umd = require("gulp-umd");
livereload = require('gulp-livereload');

var uglifyOptions = {}

var banner = ['/**',
    ' * <%= pkg.name %> - <%= pkg.description %>',
    ' * @version v<%= pkg.version %>',
    '*/',
    ''].join('\n');

var production = process.env.NODE_ENV === 'production';

gulp.task('build-js', function () {
    return gulp.src([
            './src/xCharts.js',
            './src/utils/utils.js',
            './src/components/Component.js',
            './src/components/*.js',
            './src/charts/Chart.js',
            './src/charts/*.js'
        ])
        .pipe(concat('./xCharts.js'))
        .pipe(umd({
            exports: function () {
                return 'xCharts';
            },
            namespace: function () {
                return 'xCharts';
            },

        }))
        .pipe(gulp.dest('./dist/'))
        .pipe(uglify(uglifyOptions))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(header(banner, {pkg: config}))
        .pipe(gulp.dest('./dist/'));
});

gulp.task('build-css', function () {
    return gulp.src('./src/css/xCharts.css')
        .pipe(gulp.dest('./dist/'));
});

gulp.task('watch-reload', function () {
    var server = livereload({start: true});
    gulp.watch(['src/**/*.*', 'kaifa/*.*'], function (file) {
        return gulp.src(file.path)
            .pipe(livereload())
    });
});

gulp.task('watch',function(){
    gulp.watch(['src/**/*.js'],['build-js']);
    gulp.watch(['src/**/*.css'],['build-css']);
})

gulp.task('build', ['build-js', 'build-css']);