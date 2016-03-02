/**
 * @file 雷达图
 * @author chenwubai.cx@gmail.com
 */
(function(window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;

    // 创建radar构造函数
    function radar(messageCenter, config) {
        // 调用这一步的原因是为了继承属性
        Chart.call(this, messageCenter, config, 'radar');
    }

    // 在xCharts中注册radar构造函数
    xCharts.charts.extend({ radar: radar });
    // 从父类Chart里继承一系列的方法
    utils.inherits(radar, Chart);

    radar.prototype.extend = xCharts.extend;
    radar.prototype.extend({
        init: function(messageCenter, config, type, series) {
            if(!this.radarConfig) {
                // 提出type为radar的series的子元素对象
                this.radarConfig = {};
                for(var i=0;i<series.length;i++) {
                    if(series[i].type == 'radar') {
                        this.radarConfig = utils.copy(series[i], true);
                        break;
                    }
                }
            } else {
                for(var i=0;i<series.length;i++) {
                    if(series[i].type == 'radar') {
                        this.radarConfig.center = utils.copy(series[i].center, true);
                        this.radarConfig.radius = series[i].radius;
                        break;
                    }
                }
            }

            // 用临时变量存储messageCenter里的一些信息(如宽高等)，方便后面使用
            this.margin = messageCenter.margin;
            this.width = messageCenter.width;
            this.height = messageCenter.height;
            this.main = messageCenter.main;
            this.getColor = messageCenter.getColor;

            // 计算网轴点坐标
            this.polygonWebs = this.__getPolygonWebs();
            // 计算雷达图形的点坐标
            this.areas = this.__getAreas();
            // 计算文字标签的点
            this.textPoints = this.__getTextPoints();
            // 计算覆盖整个网轴的多边形的点坐标
            this.coverPolygons = this.__getCoverPolygons();
        },
        render: function(ease, durationTime) {
            // 添加雷达图的g容器
            this.radar = this.__renderRadarWrapper();
            // 添加网轴
            this.webList = this.__renderWebs();
            // 添加网轴线
            this.lineList = this.__renderLines();
            // 添加雷达图形
            this.areaList = this.__renderAreas();
            // 添加文字标签
            this.textList = this.__renderText();
            // 添加覆盖的多边形
            this.coverPolygonList = this.__renderCoverPolygons();
        },
        ready: function() {
            this.__legendReady();
            this.__tooltipReady();
        },
        __getPolygonWebs: function() {
            // 计算图的中心坐标
            if(typeof this.radarConfig.center[0] == 'string') {
                this.radarConfig.center[0] = parseFloat(this.radarConfig.center[0]) * 0.01 * this.width;
            }
            if(typeof this.radarConfig.center[1] == 'string') {
                this.radarConfig.center[1] = parseFloat(this.radarConfig.center[1]) * 0.01 * this.height;
            }
            // 计算最大的多边形的半径
            if(typeof this.radarConfig.radius == 'string') {
                this.radarConfig.radius = parseFloat(this.radarConfig.radius) * 0.01 * this.width;
            }

            // 计算网轴多边形的点
            this.radarConfig.total = this.radarConfig.data[0].value.length;
            var onePiece = 2 * Math.PI/this.radarConfig.total;
            var polygonWebs = new Array();
            for(var k=this.radarConfig.levels;k>0;k--) {
                var web = '',
                    points = [];
                var r = this.radarConfig.radius/this.radarConfig.levels * k;
                for(var i=0;i<this.radarConfig.total;i++) {
                    var x = r * Math.sin(i * onePiece),
                        y = r * Math.cos(i * onePiece);
                    web += x + ',' + y + ' ';
                    points.push({ x: x, y: y });
                }
                polygonWebs.push({
                    webString: web,
                    webPoints: points
                });
            }
            return polygonWebs;
        },
        __getAreas: function() {
            // 计算雷达图形的点
            var areas = new Array();
            for(var i=0; i<this.radarConfig.data.length;i++) {
                var d = this.radarConfig.data[i],
                    max = this.radarConfig.indicator[i].max,
                    min = this.radarConfig.indicator[i].min,
                    area = '',
                    points = [];
                for(var k=0;k< d.value.length;k++) {
                    var x = this.polygonWebs[0].webPoints[k].x * d.value[k]/(max - min),
                        y = this.polygonWebs[0].webPoints[k].y * d.value[k]/(max - min);
                    area += x + ',' + y + ' ';
                    points.push({ x: x, y: y });
                }
                areas.push({
                    areaString: area,
                    areaPoints: points,
                    originalData: d,
                    isShow: true
                });
            }
            return areas;
        },
        __getTextPoints: function() {
            // 计算文字标签的点
            // TODO 优化文字标签分布
            var textPoints = new Array();
            var textRadius = this.radarConfig.radius + 20;
            for(var i=0;i<this.radarConfig.total;i++) {
                textPoints.push({
                    x: textRadius/this.radarConfig.radius * this.polygonWebs[0].webPoints[i].x,
                    y: textRadius/this.radarConfig.radius * this.polygonWebs[0].webPoints[i].y + 8
                });
            }
            return textPoints;
        },
        __getCoverPolygons: function() {
            // 计算覆盖整个多边形网轴的多边形的坐标
            var webPoints = this.polygonWebs[0].webPoints;
            var coverPolygons = new Array();
            var length = webPoints.length;
            for(var i=0;i<length;i++) {
                var lastPoint = i==0 ? webPoints[length-1] : webPoints[i-1],
                    currentPoint = webPoints[i],
                    nextPoint = webPoints[(i+1)%length];
                var pointsStr = '0,0',
                    points = [ {x:0, y:0} ];
                pointsStr += ' ' + (lastPoint.x+currentPoint.x)/2 + ',' + (lastPoint.y+currentPoint.y)/2;
                points.push({
                    x: (lastPoint.x+currentPoint.x)/2,
                    y: (lastPoint.y+currentPoint.y)/2
                });
                pointsStr += ' ' + currentPoint.x + ',' + currentPoint.y;
                points.push({
                    x: currentPoint.x,
                    y: currentPoint.y
                });
                pointsStr += ' ' + (currentPoint.x+nextPoint.x)/2 + ',' + (currentPoint.y+nextPoint.y)/2;
                points.push({
                    x: (currentPoint.x+nextPoint.x)/2,
                    y: (currentPoint.y+nextPoint.y)/2
                });
                coverPolygons.push({
                    pointsStr: pointsStr,
                    points: points,
                    index: i
                });
            }
            return coverPolygons;
        },
        __renderRadarWrapper: function() {
            var radar;
            if(!this.main.select('.xc-radar').node()) {
                radar = this.main.append('g')
                    .classed('xc-radar', true);
            } else {
                radar = this.main.select('.xc-radar');
            }
            radar.attr('transform', 'translate(' + this.radarConfig.center[0] + ',' + this.radarConfig.center[1] + ')');
            return radar;
        },
        __renderWebs: function() {
            var webs, webList;
            if(!this.radar.select('.xc-radar-webs').node()) {
                // 初始化加载
                webs = this.radar.append('g')
                    .classed('xc-radar-webs', true);
                webList = webs.selectAll('.xc-radar-web')
                    .data(this.polygonWebs)
                    .enter()
                    .append('polygon')
                    .classed('xc-radar-web', true)
                    .attr('points', function(d) { return d.webString; });
            } else {
                // 重绘
                webs = this.radar.select('.xc-radar-webs');
                webList = webs.selectAll('.xc-radar-web')
                    .data(this.polygonWebs)
                    .attr('points', function(d) { return d.webString; });
            }
            return webList;
        },
        __renderLines: function() {
            var lines, lineList;
            if(!this.radar.select('.xc-radar-lines').node()) {
                // 初始化加载
                lines = this.radar.append('g')
                    .classed('xc-radar-lines', true);
                lineList = lines.selectAll('.xc-radar-line')
                    .data(this.polygonWebs[0].webPoints)
                    .enter()
                    .append('line')
                    .classed('xc-radar-line', true)
                    .attr({
                        x1: 0,
                        y1: 0,
                        x2: function(d) {
                            return d.x;
                        },
                        y2: function(d) {
                            return d.y;
                        }
                    });
            } else {
                lines = this.radar.select('.xc-radar-lines');
                lineList = lines.selectAll('.xc-radar-line')
                    .data(this.polygonWebs[0].webPoints)
                    .attr({
                        x1: 0,
                        y1: 0,
                        x2: function(d) {
                            return d.x;
                        },
                        y2: function(d) {
                            return d.y;
                        }
                    });
            }
            return lineList;
        },
        __renderAreas: function() {
            var _self = this;
            var areas, areaList;
            if(!this.radar.select('.xc-radar-areas').node()) {
                // 初始化加载
                areas = this.radar.append('g')
                    .classed('xc-radar-areas', true);
                areaList = areas.selectAll('.xc-radar-area')
                    .data(this.areas)
                    .enter()
                    .append('g')
                    .attr('class', function(d) {
                        return 'xc-radar-area xc-radar-area' + d.originalData.idx;
                    });
                areaList.append('polygon')
                    .attr('points', function(d) { return d.areaString; })
                    .style({
                        stroke: function(d) {
                            return d.originalData.color;
                        },
                        fill: !this.radarConfig.fill ? '' : function(d) {
                            return d.originalData.color;
                        }
                    });
                // 添加雷达图形的点
                for(var i=0;i<this.areas.length;i++) {
                    var area = areas.select('.xc-radar-area' + this.areas[i].originalData.idx);
                    area.selectAll('.xc-radar-area-point')
                        .data(this.areas[i].areaPoints)
                        .enter()
                        .append('circle')
                        .classed('xc-radar-area-point', true)
                        .attr({
                            cx: function(d) { return d.x; },
                            cy: function(d) { return d.y; }
                        })
                        .style('stroke', _self.areas[i].originalData.color);
                }
            } else {
                // 重绘
                areas = this.radar.select('.xc-radar-areas');
                areaList = areas.selectAll('.xc-radar-area')
                    .data(this.areas);
                for(var i=0;i<this.areas.length;i++) {
                    var area = areas.select('.xc-radar-area' + this.areas[i].originalData.idx);
                    area.select('polygon')
                        .attr('points', this.areas[i].areaString);
                    area.selectAll('.xc-radar-area-point')
                        .data(this.areas[i].areaPoints)
                        .attr({
                            cx: function(d) { return d.x; },
                            cy: function(d) { return d.y; }
                        });
                }
            }
            return areaList;
        },
        __renderText: function() {
            var _self = this;
            var texts, textList;
            if(!this.radar.select('.xc-radar-texts').node()) {
                // 初始化加载
                texts = this.radar.append('g')
                    .classed('xc-radar-texts', true);
                textList = texts.selectAll('.xc-radar-text')
                    .data(this.textPoints)
                    .enter()
                    .append('text')
                    .classed('xc-radar-text', true)
                    .attr({
                        x: function(d) { return d.x; },
                        y: function(d) { return d.y; }
                    })
                    .text(function(d, i) {
                        return _self.radarConfig.indicator[i].text;
                    })
                    .attr('text-anchor', 'middle');
            } else {
                // 重绘
                texts = this.radar.select('.xc-radar-texts');
                textList = texts.selectAll('.xc-radar-text')
                    .data(this.textPoints)
                    .attr({
                        x: function(d) { return d.x; },
                        y: function(d) { return d.y; }
                    });
            }
            return textList;
        },
        __renderCoverPolygons: function() {
            var coverPolygons, coverPolygonList;
            if(!this.radar.select('.xc-radar-coverPolygons').node()) {
                // 初始化加载
                coverPolygons = this.radar.append('g')
                    .classed('xc-radar-coverPolygons', true);
                coverPolygonList = coverPolygons.selectAll('xc-radar-coverPolygon')
                    .data(this.coverPolygons)
                    .enter()
                    .append('polygon')
                    .classed('xc-radar-coverPolygon', true)
                    .attr('points', function(d) {
                        return d.pointsStr;
                    });
            } else {
                // 重绘
                coverPolygons = this.radar.select('.xc-radar-coverPolygons');
                coverPolygonList = coverPolygons.selectAll('xc-radar-coverPolygon')
                    .data(this.coverPolygons)
                    .attr('points', function(d) {
                        return d.pointsStr;
                    });
            }
            return coverPolygonList;
        },
        __legendReady: function() {
            var _self = this,
                areas = _self.areas;
            // TODO 去掉mouseenter和mouseleave的重复代码
            this.on('legendMouseenter.radar', function (name) {
                var areaData = {};
                for(var i=0;i<areas.length;i++) {
                    if(name == areas[i].originalData.name) {
                        areaData = areas[i];
                        break;
                    }
                }
                for(var i=0;i<_self.areaList[0].length;i++) {
                    var areaEle = d3.select(_self.areaList[0][i]);
                    if(areaEle.datum() == areaData) {
                        areaEle.selectAll('.xc-radar-area-point')
                            .style('stroke-width', 5);
                        break;
                    }
                }
            });
            this.on('legendMouseleave.radar', function(name) {
                var areaData = {};
                for(var i=0;i<areas.length;i++) {
                    if(name == areas[i].originalData.name) {
                        areaData = areas[i];
                        break;
                    }
                }
                for(var i=0;i<_self.areaList[0].length;i++) {
                    var areaEle = d3.select(_self.areaList[0][i]);
                    if(areaEle.datum() == areaData) {
                        areaEle.selectAll('.xc-radar-area-point')
                            .style('stroke-width', 3);
                        break;
                    }
                }
            });
            this.on('legendClick.radar', function(nameList) {
                for(var i=0;i<_self.areas.length;i++) {
                    _self.areas[i].isShow = false;
                }
                for(var i=0;i<nameList.length;i++) {
                    for(var k=0;k<_self.areas.length;k++) {
                        if(nameList[i] == _self.areas[k].originalData.name) {
                            _self.areas[k].isShow = true;
                            break;
                        }
                    }
                }
                for(var i=0;i<_self.areas.length;i++) {
                    d3.select(_self.areaList[0][i]).classed('hidden', !_self.areas[i].isShow);
                }
            });
        },
        __tooltipReady: function() {
            var _self = this;
            var tooltip = _self.messageCenter.components.tooltip;
            this.coverPolygonList.on('mousemove.radar', function() {
                var index = d3.select(this).datum().index;
                var event = d3.event;
                var x = event.layerX || event.offsetX,
                    y = event.layerY || event.offsetY;
                var tooltipFormatter = tooltip.tooltipConfig.formatter,
                    radarFormatter = _self.radarConfig.formatter;
                var formatter = radarFormatter || tooltipFormatter || defaultFormatter;
                var indicator = _self.radarConfig.indicator[index].text;
                var valueList = new Array();
                for(var i=0;i<_self.radarConfig.data.length;i++) {
                    if(_self.areas[i].isShow) {
                        valueList.push({
                            name: _self.radarConfig.data[i].name,
                            value: _self.radarConfig.data[i].value[index]
                        });
                    }
                }
                tooltip.setTooltipHtml(formatter(indicator, valueList));
                tooltip.setPosition([x,y], 10, 10);
                tooltip.show();
                var areaPointsList = _self.areaList.selectAll('.xc-radar-area-point');
                for(var i=0;i<areaPointsList.length;i++) {
                    var areaPoints = areaPointsList[i];
                    d3.select(areaPoints[index]).style('stroke-width', 5);
                }
            });
            this.coverPolygonList.on('mouseout.radar', function() {
                tooltip.hidden();
                var index = d3.select(this).datum().index;
                var areaPointsList = _self.areaList.selectAll('.xc-radar-area-point');
                for(var i=0;i<areaPointsList.length;i++) {
                    var areaPoints = areaPointsList[i];
                    d3.select(areaPoints[index]).style('stroke-width', 3);
                }
            });
        }
    });
    function defaultFormatter(indicator, valueList) {
        var htmlStr = '';
        htmlStr += "<h3>" + indicator + "</h3>";
        for(var i=0;i<valueList.length;i++) {
            htmlStr += "<div>" + valueList[i].name + "：" + valueList[i].value + "</div>";
        }
        return htmlStr;
    }

    function defaultConfig() {
        /**
         * @var radar
         * @type Object
         * @extends xCharts.series
         * @description 雷达图配置项
         */
        var config = {
            /**
             * @var type
             * @type String
             * @description 指定图表类型
             * @values 'radar'
             * @extends xCharts.series.radar
             */
            type: 'radar',
            /**
             * @var levels
             * @type Number
             * @description 标记雷达图网轴有几层，取值必须为大于0的整数
             * @default 4
             * @extends xCharts.series.radar
             */
            levels: 4,
            /**
             * @var radius
             * @type Number|String
             * @description 定义雷达图的半径
             * @default '15%'
             * @extends xCharts.series.radar
             */
            radius: '15%',
            /**
             * @var fill
             * @type Boolean
             * @description 定义雷达图的区域是否填充，true为填充，false为不填充
             * @default false
             * @extends xCharts.series.radar
             */
            fill: false,
            /**
             * @var center
             * @type Array
             * @description 雷达图中心位置，可为百分比或数值。若为百分比则center[0]（中心x坐标）参照容器宽度，center[1]（中心y坐标）参照容器高度。
             * @default ['50%','50%']
             * @extends xCharts.series.radar
             */
            center: ['50%', '50%'],
            /**
             * @var indicator
             * @type Array
             * @description 雷达图各项指标
             * @extends xCharts.series.radar
             */
            indicator: [
                {
                    /**
                     * @var text
                     * @type String
                     * @description 指标名称
                     * @extends xCharts.series.radar.indicator
                     */
                    text: '',
                    /**
                     * @var max
                     * @type Number
                     * @description 指标取值范围的最大值
                     * @extends xCharts.series.radar.indicator
                     */
                    max: 100,
                    /**
                     * @var min
                     * @type Number
                     * @description 指标取值范围的最大值
                     * @extends xCharts.series.radar.indicator
                     */
                    min: 0
                }
            ],
            /**
             * @var data
             * @type Array
             * @description 雷达图数据
             * @extends xCharts.series.radar
             */
            data: [
                {
                    /**
                     * @var name
                     * @type String
                     * @description 数据项名称
                     * @extends xCharts.series.radar.data
                     */
                    name: '',
                    /**
                     * @var value
                     * @type Array
                     * @description 数据项对应所有指标的值的集合，其中的顺序必须和indicator中指标的顺序相对应。
                     * @extends xCharts.series.radar.data
                     */
                    value: []
                }
            ]
        }
        return config;
    }
}(window))