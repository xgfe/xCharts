/**
 * angular-xCharts
 */
angular.module("angular.xCharts", ["xCharts.pie"]);
/**
 * xcharts-pie
 * Discription: 饼图
 * Author: chenwubai.cx@gmail.com
 * Date: 2016-04-21
 */
angular.module('xCharts.pie', [])
.directive('xchartsPie', function() {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            config: '=',
            width: '@',
            height: '@'
        },
        template: '<div></div>',
        link: function(scope, ele, attrs) {
            var config = scope.config,
                width = scope.width,
                height = scope.height;
            if(config.series[0].type !== 'pie') {
                config.series[0].type = 'pie';
            }
            if(width) {
                ele[0].style.width = width + 'px';
            }
            if(height) {
                ele[0].style.height = height + 'px';
            }
            var chart = xCharts(ele[0]);
            chart.loadConfig(config);
        }
    };
});