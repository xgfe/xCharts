/**
 * angular-xCharts
 */
angular.module("angular.xCharts", ["xCharts.pie", 'xCharts.bar', 'xCharts.line']);
/**
 * xcharts-pie
 * Discription: 饼图
 * Author: chenwubai.cx@gmail.com
 * Date: 2016-04-21
 */
angular.module('xCharts.pie', [])
    .directive('xchartsPie', function () {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                config: '=',
                width: '@',
                height: '@'
            },
            template: '<div></div>',
            link: function (scope, ele) {
                var config = scope.config,
                    width = scope.width,
                    height = scope.height;
                if (config.series[0].type !== 'pie') {
                    config.series[0].type = 'pie';
                }
                if (width) {
                    ele.css('width', width);
                }
                if (height) {
                    ele.css('height', height);
                }
                var chart = xCharts(ele[0]);
                chart.loadConfig(config);
            }
        };
    });

/**
 * xcharts-pie
 * Discription: 饼图
 * Author: chenwubai.cx@gmail.com
 * Date: 2016-04-21
 */
angular.module('xCharts.bar', [])
    .directive('xchartsBar', function () {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                config: '=',
                width: '@',
                height: '@'
            },
            template: '<div></div>',
            link: function (scope, ele) {
                var config = scope.config,
                    width = scope.width,
                    height = scope.height;
                if (config.series[0].type !== 'bar') {
                    config.series[0].type = 'bar';
                }
                if (width) {
                    ele.css('width', width);
                }
                if (height) {
                    ele.css('height', height);
                }
                var chart = xCharts(ele[0]);
                chart.loadConfig(config);
            }
        };
    });

/**
 * xcharts-line
 * Discription: 折线图,面积图
 * Author: mzefibp@163.com
 * Date: 2016-04-21
 */
angular.module('xCharts.line', [])
    .directive('xchartsLine', function () {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                config: '=',
                width: '@',
                height: '@'
            },
            template: '<div></div>',
            link: function (scope, ele) {
                var config = scope.config,
                    width = scope.width,
                    height = scope.height;

                config.series = config.series.map(function (serie) {
                    if (!serie.type) {
                        serie.type = 'line';
                    }
                    return serie;
                });
                if (width) {
                    ele.css('width', width);
                }

                if (height) {
                    ele.css('height', height);
                }

                var chart = xCharts(ele[0]);
                chart.loadConfig(config);
            }
        };
    });