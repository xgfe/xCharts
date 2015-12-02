/**
 * Created by liuyang on 15/9/24.
 */
(function (window) {
    if (window.xCharts) {
        window.xCharts.fn.map = map;
    }
    var d3 = window.d3;

    var mapSrcName = [
        'china',
        'guang_dong', 'qing_hai', 'si_chuan', 'hai_nan', 'shan_xi_1',
        'gan_su', 'yun_nan', 'hu_nan', 'hu_bei', 'hei_long_jiang',
        'gui_zhou', 'shan_dong', 'jiang_xi', 'he_nan', 'he_bei',
        'shan_xi_2', 'an_hui', 'fu_jian', 'zhe_jiang', 'jiang_su',
        'ji_lin', 'liao_ning', 'tai_wan',
        'xin_jiang', 'guang_xi', 'ning_xia', 'nei_meng_gu', 'xi_zang',
        'bei_jing', 'tian_jin', 'shang_hai', 'chong_qing',
        'xiang_gang', 'ao_men'
    ]

    var mapName = [
        '中国',
        // 23个省
        '广东', '青海', '四川', '海南', '陕西',
        '甘肃', '云南', '湖南', '湖北', '黑龙江',
        '贵州', '山东', '江西', '河南', '河北',
        '山西', '安徽', '福建', '浙江', '江苏',
        '吉林', '辽宁', '台湾',
        // 5个自治区
        '新疆', '广西', '宁夏', '内蒙古', '西藏',
        // 4个直辖市
        '北京', '天津', '上海', '重庆',
        // 2个特别行政区
        '香港', '澳门'
    ];
    var centerPoint = [
        [96.2402, 35.4117],
        [104.28225, 35.8374], [113.4943, 22.78835], [108.36915, 35.6451], [96.2402, 35.4117], [101.8597, 25.191650000000003],
        [109.945, 19.18215], [102.9419, 30.176699999999997], [100.5139, 37.694050000000004], [111.5222, 27.380650000000003], [128.13905, 48.4964],
        [112.25280000000001, 31.15175], [118.7787, 36.41965], [116.0321, 27.281799999999997], [106.59485000000001, 26.919249999999998], [116.66380000000001, 39.3338],
        [112.3956, 37.6639], [117.26805, 32.0224], [113.50524999999999, 33.87355], [118.30075, 25.930500000000002], [120.509, 29.0973],
        [126.4856, 43.582750000000004], [119.18520000000001, 32.939750000000004], [121.0295, 23.6079],
        [122.3218, 41.0834], [105.97409999999999, 37.31505], [84.9353, 41.756299999999996], [111.6156, 45.37075], [108.25375, 23.6261],
        [88.75305, 31.6681], [116.46535, 40.2501], [117.38895, 39.40415], [114.21455, 22.3448], [121.42779999999999, 31.2688],
        [113.5715, 22.15835], [107.74845, 30.182199999999998]
    ]
    var classPrex;
    var chartNum;
    var context;
    var width;
    var height;

    function map(series, config) {
        context = this;
        width = context.width - context.margin.left - context.margin.right;
        height = context.height - context.margin.top - context.margin.bottom;
        classPrex = this.classPrex;
        chartNum = context.chartNum;

        for (var i = 0; i < series.length; i++) {
            var mapSeries = series[i];
            var valueData = {};
            mapSeries.data.map(function (d, i) {
                var name = getSrcName(d.name);
                valueData[name] = d;
            });

            getMapSrc(mapSeries['map'], callback, context, valueData);
        }


        function callback(data, valueData) {

            var features = data.features;
            context.features=features;

            var multiple = (width > height ? height : width);

            var projection = d3.geo.mercator()
                .center(data.chartData.center)
                .scale(multiple * data.chartData.multiple)
                .translate([width / 2, height / 2]);

            var path = d3.geo.path()
                .projection(projection);

            var colorFn = rangeColor(config, valueData);

            var mapGroup = context.group.main.append('g').attr('class',classPrex+'map-group');

            var pathGroup =mapGroup.selectAll("."+classPrex + 'path-group')
                .data(features)
                .enter()
                .append('g').attr('class', classPrex + 'path-group')
                .attr('fill', 'transparent');
            pathGroup.append("path")
                .attr("stroke", "#000")
                .attr("stroke-width", 1)
                .attr('fill', function (d) {
                    return colorFn(d.id,false)
                })
                .attr("d", path);   //使用地理路径生成器

            pathGroup.on("mouseenter", function (d, i) {
                if (config.event && config.event.mouseenter && typeof config.event.mouseenter == 'function') {
                    var event = d3.event;
                    var name = d.properties.name;
                    config.event.mouseenter.call(this, event, name);
                }

                if(config.tooltip && config.tooltip.show &&typeof config.tooltip.formatter =='function'){
                    context.group.tips.tooltipText.html(function(){
                        var data =valueData[d.id];
                        return config.tooltip.formatter(data);
                    })
                }

                if(config.dataRange){
                    colorFn(d.id,true);
                }

            })
                .on("mouseleave", function (d, i) {
                    if (config.event && config.event.mouseleave && typeof config.event.mouseleave == 'function') {
                        var event = d3.event;
                        var name = d.properties.name;
                        config.event.mouseleave.call(this, event, name);
                    }
                })
                .on('click', function (d) {
                    if (config.event && config.event.mouseclick && typeof config.event.mouseclick == 'function') {
                        var event = d3.event;
                        var name = d.properties.name;
                        config.event.mouseclick.call(this, event, name);
                    }
                });

            if(config.tooltip && config.tooltip.show){
                mapTooltip(context,mapGroup,config.tooltip.formatter);
            }

        }

    }

    function mapTooltip(context,group,formatter){
        var tips=context.group.tips;
        group.on('mousemove.tooltip',function(d){
            var coordinate=d3.mouse(this);
            coordinate[0]=coordinate[0]+context.margin.left+10;
            coordinate[1]=coordinate[1]+context.margin.top+10;
            tips.tooltip.style({transform:'translate('+coordinate[0]+'px,'+coordinate[1]+'px)'})
        })
            .on('mouseenter.tooltip',function(){
                tips.tooltip.style({display:'block'});
            })
            .on('mouseleave.tooltip',function(){
                tips.tooltip.style({display:'none'});
            })
    }

    function rangeColor(config, valueData) {

        if (config.dataRange) {
            var maxColor = d3.rgb(config.dataRange.maxColor);
            var minColor = d3.rgb(config.dataRange.minColor)
            var rectWidth = 30;
            var rextHeight = 200;
            var features=context.features;


            features.map(function(d){
                if(valueData[d.id]==null){
                    valueData[d.id]={name: d.properties.name,value:config.dataRange.minvalue};
                }
            })

            var defs = context.group.main.append("defs");

            var linearGradient = defs.append("linearGradient")
                .attr("id", classPrex + 'map-linear-' + chartNum) //因为要引用，如果多图表不加以分辨会出现重叠
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "0%")
                .attr("y2", "100%");

            linearGradient.append("stop")
                .attr("offset", "0%")
                .style("stop-color", maxColor.toString());

            linearGradient.append("stop")
                .attr("offset", "100%")
                .style("stop-color", minColor.toString());

            var rangeGroup = context.group.main.append('g').attr('class', classPrex + 'datarange-group')
                .attr('transform', 'translate(' + 0 + ',' + (height - 200) + ')');
            ;

            var colorRect = rangeGroup.append("rect")
                .attr("width", rectWidth)
                .attr("height", rextHeight)
                .style("fill", "url(#" + linearGradient.attr("id") + ")")


            //var maxRT =getTriangle(rangeGroup,10);
            //var minRT =getTriangle(rangeGroup,10);
            var nowRT = getTriangle(rangeGroup, 15);
            var text = rangeGroup.append('text').attr('font-size',13);

            return (function () {
                var valueScale = d3.scale.linear();
                valueScale.domain([config.dataRange.minvalue, config.dataRange.maxValue]);
                valueScale.range([0, 1]);
                var colorInterpolate = d3.interpolate(minColor, maxColor);

                return function (name, showRT) {

                    var value = valueData[name].value;
                    var t = valueScale(value);
                    var color = colorInterpolate(t);
                    if (showRT) { //控制是否显示小三角
                        nowRT.attr('fill', color)
                            .attr('transform', function (d) {
                                var coordinate = [rectWidth, (1 - t) * rextHeight-8];
                                return 'translate(' + coordinate + ')'
                            })
                            .style({display: 'block'});

                        text.attr('transform',function (d) {
                            var coordinate = [rectWidth+20, (1 - t) * rextHeight+5];
                            return 'translate(' + coordinate + ')'
                        })
                            .text(value);
                    }
                    else{
                        nowRT.style({display:'none'});
                    }

                    return color;
                }

            }())

        } else {
            return function () {
                return 'transparent';
            }
        }

    }


    function getTriangle(parent, width) {
        var triangle = parent.append('polygon');
        var points = width + ',0';
        points += ' ' + width + ',' + width;
        points += ' ' + width / 2 + ',' + width / 2;
        triangle.attr('points', points);
        return triangle;
    }


    function getMapSrc(name, cb, context) {
        var srcName = getSrcName(name);
        var args = Array.prototype.slice.call(arguments, 3);
        var url = '../geojson/';
        url += srcName + '_geo.json';
        d3.json(url, function (err, data) {
            if (err) {
                console.error(err);
                return false;
            }
            args.unshift(data);
            cb.apply(context, args);
        });
    }

    function getSrcName(name) {
        for (var i = 0, len = mapName.length; i < len; i++) {
            if (mapName[i] === name)
                break;
        }
        return mapSrcName[i];
    }


}(window))