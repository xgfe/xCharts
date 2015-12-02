/**
 * Created by chenxuan03 on 15/11/4.
 * 雷达图
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
            // 提出type为radar的series的子元素对象
            this.radarConfig = {};
            for(var i=0;i<series.length;i++) {
                if(series[i].type == 'radar') {
                    this.radarConfig = series[i];
                    break;
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
            var radar = this.main.append('g')
                .classed('xc-radar', true)
                .attr('transform', 'translate(' + this.radarConfig.center[0] + ',' + this.radarConfig.center[1] + ')');
            return radar;
        },
        __renderWebs: function() {
            var webs = this.radar.append('g')
                .classed('xc-radar-webs', true);
            var webList = webs.selectAll('.xc-radar-web')
                .data(this.polygonWebs)
                .enter()
                .append('polygon')
                .classed('xc-radar-web', true)
                .attr('points', function(d) { return d.webString; });
            return webList;
        },
        __renderLines: function() {
            var lines = this.radar.append('g')
                .classed('xc-radar-lines', true);
            var lineList = lines.selectAll('.xc-radar-line')
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
            return lineList;
        },
        __renderAreas: function() {
            var _self = this;
            var areas = this.radar.append('g')
                .classed('xc-radar-areas', true);
            var areaList = areas.selectAll('.xc-radar-area')
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
            return areaList;
        },
        __renderText: function() {
            var _self = this;
            var texts = this.radar.append('g')
                .classed('xc-radar-texts', true);
            var textList = texts.selectAll('.xc-radar-text')
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
            return textList;
        },
        __renderCoverPolygons: function() {
            var coverPolygons = this.radar.append('g')
                .classed('xc-radar-coverPolygons', true);
            var coverPolygonList = coverPolygons.selectAll('xc-radar-coverPolygon')
                .data(this.coverPolygons)
                .enter()
                .append('polygon')
                .classed('xc-radar-coverPolygon', true)
                .attr('points', function(d) {
                    return d.pointsStr;
                });
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
            this.on('legendClick', function(nameList) {
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
            console.log(_self);
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
                tooltip.html(formatter(indicator, valueList));
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
}(window))