/**
 * Created by liuyang on 15/9/16.
 */
(function () {

    var d3 = null;
    if (typeof window.define === 'function' && window.define.amd) {
        window.define('xCharts', ['d3'], function (d) {
            d3 = d;
            return xCharts;
        });
    }

    if (!window.xCharts) {
        d3 = window.d3;
        window.xCharts = xCharts;
    }


    // FIXME 去掉这个变量，不然代码看起来很繁琐
    var classPrex = 'xc-';

    var chartNum = 0;

    function xCharts(element) {
        return new xCharts.fn.init(element);
    }

    xCharts.fn = xCharts.prototype;

    xCharts.fn.init = function (element) {
        var width, height;
        var elementCss = getComputedStyle(element);
        width = parseFloat(elementCss.width);
        height = parseFloat(elementCss.height);
        if (elementCss.boxSizing == 'border-box') {
            //由于'border-box'计算的差异，所以宽度需要减去padding,border
            width = width - parseFloat(elementCss.borderLeftWidth)
                - parseFloat(elementCss.paddingLeft)
                - parseFloat(elementCss.paddingRight)
                - parseFloat(elementCss.borderRightWidth);

            height = height - parseFloat(elementCss.borderTopWidth)
                - parseFloat(elementCss.paddingTop)
                - parseFloat(elementCss.paddingBottom)
                - parseFloat(elementCss.borderBottomWidth);
        }
        this.chartNum = chartNum++; //多图表的唯一标识
        this.width = width
        this.height = height
        //在用户给予的容器下再创建一个属于自己的可控div，方便放入放入tooltip之类的div
        this.contain = d3.select(element).append('div').style({position: 'relative'});

        //按照用途存储<g>标签
        this.group = {};

        //和显示内容外边距相关，影响最终内容的宽高，不建议在这里改动
        this.margin = {top: 20, left: 50, right: 50, bottom: 20};
        this.svg = this.contain.append('svg');
        this.group['main'] = this.svg.append('g').attr('class', classPrex + 'group-main');

        this.series = [];

        /**
         * 进行tooltip相关的初始化工作
         */

        var tooltip = this.contain.append('div').classed(classPrex + 'tooltip', true)
        var tooltipText = tooltip.append('div').classed(classPrex + 'tooltip-text', true);
        this.group['tips'] = {
            tooltip: tooltip,
            tooltipText: tooltipText,
            getTextObserve: getObserver()
        }
        /**
         * 动画参数配置
         */
        this.durationTime = 500;
        this.transitionTime = 1000;
        this.transitionEase = 'circle';

        //loading效果

        var loading = this.contain.append('div').classed(classPrex + 'spinner', true);
        for (var i = 0; i < 3; i++) {
            loading.append('div').classed(classPrex + 'bounce' + i, true);
        }
        this.loading = loading;

        this.showLoading(); //等待loadconfig
        return this;
    }
    xCharts.fn.init.prototype = xCharts.fn;

    /**
     * TODO 每次调用次函数时需要清理结构
     * fixme 需要深复制一份config，不然会在多图表时可能会出现干扰
     * @param config
     */
    xCharts.fn.loadConfig = function (config) {
        this.showLoading();
        this.clearDom();
        var series = [];
        this.getColor = getColor(config.color);
        this.config = config;
        this.isInit = true;
        //对series根据type的不同进行分拣
        this.classPrex = classPrex;
        config.series.map(function (d, i) {

            var type = d.type;
            if (type == 'map') {
                type = 'xmap'; //没办法这里和方法map冲突了,后面还是使用type=map，xmap只是权宜之计
            }

            series[type] = series[type] || [];
            d.idx = i;
            d.yAxisIndex = d.yAxisIndex == null ? 0 : d.yAxisIndex;
            d.xAxisIndex = d.xAxisIndex == null ? 0 : d.xAxisIndex;
            d.show = d.show == null ? true : d.show;
            series[type].push(d);
        });

        if (config.animation) {
            var animation = config.animation;
            if (animation.show == true) {
                this.durationTime = animation.durantionTime == null ? this.durationTime : animation.durantionTime;
                this.transitionEase = animation.transitionEase == null ? this.transitionEase : animation.transitionEase;
            } else {
                this.durationTime = 0;
            }
        }

        if (config.title && config.title.show == true) {
            this.title(config.title);
        }

        if (config.legend && config.legend.show == true) {
            this.legend(config);
        }

        //如果tooltip.show==true,则开启tooltip
        if (config.tooltip && config.tooltip.show == true) {
            this.tooltip(config);
        }
        this.svg.attr('width', this.width).attr('height', this.height);
        this.group['main'].attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')')
        if (config.autoRefresh && config.autoRefresh.open === true) {
            this.autoRefresh();
        }
        this.drawCharts(config, series);

        this.isInit = false;
        this.hideLoading();
    }

    xCharts.fn.drawCharts = function (config, series) {
        //清理group-main里面的内容
        this.group.main.selectAll('*').remove();
        if (series['line'] || series['bar'] || series['scatter']) {
            if (config.xAxis)
                this.xAxisFn(series, config.xAxis);
            if (config.yAxis)
                this.yAxisFn(series, config.yAxis);

            if (series['line']) {
                this.line(series['line'], config);
            }

            if (series['scatter']) {
                this.scatter(series['scatter'], config);
            }

        } else {
            //地图
            if (series['xmap']) {
                this.map(series['xmap'], config);
            }
            // 画饼图
            if (series['pie']) {
                this.pie(series['pie'], config);
            }
            //漏斗图
            if(series['funnel']){
                //echarts调用方法
                new this.funnel(series['funnel'],config,this);
            }
        }
    }


    /**
     * done 计算边界
     * 处理一些样式上的问题
     * 当 trigger =='axis'时，考虑到多图混排的情况，所以统一在这里处理，当值为item时，将在各个图表函数内处理
     * @param config
     */
    xCharts.fn.tooltip = function (config) {
        var tips = this.group.tips;
        var contain = this.contain;
        var margin = this.margin;
        var tW = this.width, tH = this.height;
        var flatten = this.flatten;
        var width = tW - margin.left - margin.right;
        var formatter = config.tooltip.formatter || defaultFormatter;
        var showDelay = config.tooltip.showDelay || 20;
        var hideDelay = config.tooltip.hideDelay || 100;
        var durationTime = 400;
        var transitionEase = 'linear';
        var tooltipWidth = 0;
        var tooltipHeight = 0;
        var context = this;

        tips.getTextObserve.clear();//清理已经保存的函数
        if (config.tooltip.trigger == 'item')
            return;

        var areaNum = config.xAxis[0].data.length - 1; //得到需要划分多少个区域
        var areaSize = (width / areaNum);
        var preIdx = -1;
        var x = 0;
        var hiddenHandle = null;
        tips.tooltip.style({transform: 'translate(-1px,-1px)'});
        contain.on('mousemove.tooltip', function () {
            //绘图区域范围，进入坐标范围显示tooltip
            var x0 = margin.left;
            var x1 = tW - margin.right;
            var y0 = margin.top;
            var y1 = tH - margin.bottom;
            //获取mouse坐标
            var mouse = d3.mouse(this);

            if (hiddenHandle) {
                clearTimeout(hiddenHandle);
                hiddenHandle = null;
            }

            if (mouse[0] > x0 && mouse[0] < x1 && mouse[1] > y0 && mouse[1] < y1) {

                //进入显示区
                setTimeout(function () {
                    tips.tooltip.style({display: 'block'})
                }, showDelay)
                var nowIdx = getXAreaIdx(mouse[0] - margin.left)
                if (nowIdx != preIdx) {
                    var textData = tips.getTextObserve.pulish(null, nowIdx, preIdx);
                    preIdx = nowIdx;
                    x = nowIdx * areaSize + x0;
                    tips.tooltipText.html(formatter(flatten(textData)));

                    //获取tooltip的宽高
                    setTimeout(function () {
                        tooltipWidth = parseFloat(getComputedStyle(tips.tooltip[0][0]).width);
                        tooltipHeight = parseFloat(getComputedStyle(tips.tooltip[0][0]).height);
                    }, 100)

                }
                var y = mouse[1];

                //调整Y坐标，防止超出底边
                if (y + tooltipHeight > y1) {
                    y = y1 - tooltipHeight;
                }
                //调整X坐标,防止超出右边界
                if (x + tooltipWidth > x1) {
                    x -= tooltipWidth;
                }

                tips.tooltip.transition().duration(durationTime).ease(transitionEase).styleTween('transform', function () {
                    var xyReg = /(-?[\d.]+?)px\s*?\,\s*?(-?[\d.]+?)px/i
                    var point = this.style.transform.match(xyReg);
                    if (point[1] == -1 && point[2] == -1) {
                        point = [x, y];
                    } else {
                        point = [parseFloat(point[1]), parseFloat(point[2])];
                    }
                    var interpolate = d3.interpolate(point, [x, y]);
                    return function (t) {
                        var xy = interpolate(t);

                        return 'translate(' + xy[0] + 'px,' + xy[1] + 'px)';
                    }
                });
                //tips.tooltip.style({transform:'translate('+x+'px,'+y+'px)'});

            } else {
                //隐藏tooltip

                hiddenHandle = setTimeout(function () {
                    tips.getTextObserve.pulish(null, -1, preIdx);
                    preIdx = -1;
                    tips.tooltip.transition().duration(0).style({transform: 'translate(-1px,-1px)'})
                    tips.tooltip.style({display: 'none'});
                }, hideDelay);

            }

        });

        /**
         * 监听leave事件，是因为单纯通过mousemove来判断是否出界会存在鼠标滑动过快出界时不触发事件，所以需要作下防御措施
         */
        context.contain.on('mouseleave.tootip', function () {
            hiddenHandle = setTimeout(function () {
                tips.getTextObserve.pulish(null, -1, preIdx);
                preIdx = -1;
                tips.tooltip.transition().duration(0).style({transform: 'translate(-1px,-1px)'})
                tips.tooltip.style({display: 'none'});
            }, hideDelay);

        })


        /**
         *
         * @param x {xpoint}
         */
        function getXAreaIdx(x) {
            for (var i = 0; i < areaNum; i++)
                if (x < areaSize * (0.5 + i))break;

            return i;
        }

        /**
         * 默认文本格式化函数
         *
         * @param data {Array} [{type:xAxis,name:'title',value:'07/9'},{type:line,name:'橙子',value:'xxx'}]
         */
        function defaultFormatter(data) {
            var ret = [];
            for (var i = 0, len = data.length; i < len; i++) {
                if (data[i].type == 'xAxis')
                    ret.push('<p class="' + classPrex + 'tooltip-text-p">' + data[i].value + '</p>');
                else
                    ret.push('<p class="' + classPrex + 'tooltip-text-p">' + data[i].name + ' : ' + data[i].value + '</p>');
            }
            return ret.join(' ');
        }

    }

    xCharts.fn.title = function (config) {
        var x = config.x || 'center';
        var y = config.y || 'top';
        var cTextStyle = getNotUndefinedValue(config.textStyle, {});
        var cSubtextStyle = getNotUndefinedValue(config.subtextStyle, {});

        var textStyle = {
            fontFamily: cTextStyle.fontFamily || "'Source Sans Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif;",
            fontSize: cTextStyle.fontSize || 14,
            color: cTextStyle.color || '#000'
        }
        var subtextStyle = {
            fontFamily: cSubtextStyle.fontFamily || "'Source Sans Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif;",
            fontSize: cSubtextStyle.fontSize || 12,
            color: cSubtextStyle.color || '#000'
        }
        var text = getNotUndefinedValue(config.text, '');
        var subtext = getNotUndefinedValue(config.subtext, '');

        //计算标题高度宽度
        var textWidth = text.length * textStyle.fontSize,
            textHeight = textStyle.fontSize,
            subtextWidth = subtext.length * subtextStyle.fontSize,
            subtextHeight = subtextStyle.fontSize;
        var textOffsetX, textOffsetY;
        var subtextOffsetX, subtextOffsetY;
        var width = this.width - this.margin.left - this.margin.right;
        var height = this.height;
        var itemGap = config.itemGap == null ? 5 : config.itemGap;

        //计算起始x坐标
        if (x === 'center') {
            //水平居中
            textOffsetX = (width - textWidth) * 0.5;
            subtextOffsetX = (width - subtextWidth) * 0.5;

            //修正由于margin的原因，导致居中不正确
            textOffsetX += this.margin.left;
            subtextOffsetX += this.margin.left;
        } else if (x === 'right') {
            textOffsetX = width - textWidth + this.margin.left;
            subtextOffsetX = width - subtextWidth + this.margin.left;
        } else if (x === 'left') {
            subtextOffsetX = textOffsetX = this.margin.left;
        } else if (x.substr(-1) === '%') {
            //百分比
            textOffsetX = width * (parseFloat(x)) / 100 + this.margin.left;
            subtextOffsetX = textOffsetX;
        } else if (x.substr(-2) === 'px') {
            //像素
            textOffsetX = subtextOffsetX = parseFloat(x) + this.margin.left;
        }

        if (y === 'top') {
            this.margin.top = textHeight + subtextHeight + itemGap * 2 + 10;//最后的10是偏移量，不然会产生重叠
            textOffsetY = textStyle.fontSize;
            subtextOffsetY = textOffsetY + subtextStyle.fontSize + itemGap;
        } else if (y === 'middle') {
            textOffsetY = height / 2 - textHeight;
            subtextOffsetY = textOffsetY + subtextHeight + itemGap;
        } else if (y === 'bottom') {
            textOffsetY = height - textHeight - subtextHeight
            subtextOffsetY = textOffsetY + subtextHeight + itemGap;
        } else if (y.substr(-1) === '%') {
            //百分比
            textOffsetY = height * (parseFloat(y)) / 100 + textHeight;
            subtextOffsetY = textOffsetY + subtextHeight + itemGap;
        } else if (y.substr(-2) === 'px') {
            //像素
            textOffsetY = parseFloat(y) + textHeight;
            subtextOffsetY = textOffsetY + subtextHeight + itemGap;
        }


        //画标题
        var title_g = this.svg.selectAll('.' + classPrex + 'title-g').data([config]);
        title_g.enter().append('g').attr('class', classPrex + 'title-g');

        var textElement = title_g.selectAll('.' + classPrex + 'title-text').data([1]);
        textElement.enter().append('text').attr('class', classPrex + 'title-text');
        textElement.text(text).attr('transform', 'translate(' + textOffsetX + ',' + textOffsetY + ')').attr('font-size', textStyle.fontSize).attr('font-family', textStyle.fontFamily).attr('fill', textStyle.color).attr('stroke', 'none');

        var subgtextElement = title_g.selectAll('.' + classPrex + 'subtitle-text').data([1]);
        subgtextElement.enter().append('text').attr('class', classPrex + 'subtitle-text').attr('font-size', subtextStyle.fontSize).attr('font-family', subtextStyle.fontFamily).attr('fill', subtextStyle.color).attr('stroke', 'none');
        subgtextElement.text(subtext).attr('transform', 'translate(' + subtextOffsetX + ',' + subtextOffsetY + ')');
    }

    /*
     * 初始化时，需要清除一些冗余节点
     * TODO 不需要这种方式来清理，由模块自己控制
     */
    xCharts.fn.clearDom = function () {
        this.svg.selectAll('.' + classPrex + 'legend-group').remove();
        this.margin = {top: 20, left: 50, right: 50, bottom: 20};
    }


    // TODO 在refresh时，关掉动画效果
    //画Y轴
    xCharts.prototype.yAxisFn = function (series, config) {

        var yScale = {};
        var margin = this.margin;
        var width = this.width - margin.left - margin.right;
        var height = this.height - margin.top - margin.bottom;

        for (var i = 0, len = config.length; i < len; i++) {
            var d = config[i];
            yScale[i] = axis(d, [height, 0], series, 'yAxisIndex', i);
            //坐标轴参数初始化
            d.position = d.position || 'left';
            d.fontSize = d.fontSize || 12;
            d.color = d.color || '#000';

            var yAxis = d3.svg.axis()
                .scale(yScale[i])
                .orient(d.position);

            d.tickFormat && yAxis.tickFormat(d.tickFormat);
            d.ticks && yAxis.ticks(d.ticks);
            var axisGroup = this.group.main.selectAll('.axis.y.y_' + i).data([d]);
            axisGroup.enter().append('g')
                .attr("class", "y axis y_" + i)
                .attr('fill', 'none')
                .attr('stroke', '#000');

            axisGroup
                .attr('transform', function (d) {
                    if (d.position == 'left') {
                        return '';
                    } else {
                        return 'translate(' + width + ',0)';
                    }
                })
                .transition()
                .duration(this.transitionTime)
                .ease(this.transitionEase)
                .call(yAxis);
            axisGroup.selectAll('text')
                .attr('font-size', d.fontSize)
                .attr('stroke', 'none')
                .attr('fill', d.color);
        }
        this.yScale = yScale;

    }

    //画X轴
    xCharts.prototype.xAxisFn = function (series, config) {
        var xScale = {};
        var margin = this.margin;
        var width = this.width - margin.left - margin.right;
        var height = this.height - margin.top - margin.bottom;
        for (var i = 0, len = config.length; i < len; i++) {
            var d = config[i];
            xScale[i] = axis(d, [0, width], series, 'xAxisIndex', i);
            //坐标轴参数初始化
            d.position = d.position || 'bottom';
            d.fontSize = d.fontSize || 12;
            d.color = d.color || '#000';

            var xAxis = d3.svg.axis()
                .scale(xScale[i])
                .orient(d.position);
            d.tickFormat && xAxis.tickFormat(d.tickFormat);
            d.ticks && xAxis.ticks(d.ticks);
            var axisGroup = this.group.main.selectAll('.axis.x.x_' + i).data([d]);
            axisGroup.enter().append('g')
                .attr("class", "x axis x_" + i)
                .attr('fill', 'none')
                .attr('stroke', '#000');

            axisGroup
                .attr("transform", "translate(0," + height + ")")
                .transition()
                .duration(this.transitionTime)
                .ease(this.transitionEase)
            axisGroup.call(xAxis);
            axisGroup.selectAll('text')
                .attr('font-size', d.fontSize)
                .attr('stroke', 'none')
                .attr('fill', d.color);
        }

        if (this.config.tooltip && this.config.tooltip.trigger == 'axis' && this.isInit) {
            //注册tooltip事件

            this.group.tips.getTextObserve.subscribe(function (idx) {
                var value = config[0].tickFormat == null ? config[0].data[idx] : config[0].tickFormat(config[0].data[idx]);
                var ret = {type: 'xAxis', value: value};

                return ret;
            })

        }

        this.xScale = xScale;

    }

    function axis(d, range, series, idx, axisIdx) {
        //坐标类型
        var flatten = xCharts.fn.flatten;
        var scale = null;
        pseries = flatten([series.line || [], series.bar || []]);
        if (d.type == 'category') {
            scale = d3.scale.ordinal()
                .domain(d.data)
                .rangeRoundPoints(range);
        } else if (d.type == 'value') {

            var min = Number.MAX_VALUE, max = Number.MIN_VALUE;
            for (var j = 0, jLen = pseries.length; j < jLen; j++) {
                var data = pseries[j];
                if (data[idx] != axisIdx) continue;
                var domain = d3.extent(data.data, function (d) {
                    return parseFloat(d)
                });
                min = min > domain[0] ? domain[0] : min;
                max = max < domain[1] ? domain[1] : max;
            }
            //因为散点图的series特殊性，需要单独提取max，min
            if (series.scatter) {
                series.scatter.forEach(function (d) {
                    var dataIdx = 0;
                    if (idx == 'yAxisIndex') {
                        dataIdx = 1;
                    }
                    var domain = d3.extent(d.data, function (d) {
                        return parseFloat(d[dataIdx]);
                    })

                    min = min > domain[0] ? domain[0] : min;
                    max = max < domain[1] ? domain[1] : max;
                })
            }

            if (d.minValue != null) min = d.minValue;
            else {
                //防止曲线超出x轴
                var ext = linearTickRange([min, max]);
                min = min - ext[2];
            }
            if (d.maxValue != null) max = d.maxValue;

            scale = d3.scale.linear()
                .domain([min, max])
                .range(range);

        } else if (d.type == 'time') {
            scale = d3.time.scale()
                .domain(d3.extent(d.data))
                .range(range);
        }
        else {
            console.error('参数错误:axis.type=' + d.type + '暂不受支持')
        }
        return scale;
    }


    /**
     * 观察者模式
     * 生成一个包含观察者模式方法的对象
     */
    function getObserver() {

        var o = {};

        var topics = {}; //订阅函数合集
        var userId = -1; //唯一标示符

        //订阅方法
        o.subscribe = function (fn) {
            var id = ++userId;
            topics[id] = fn;
            return id;
        }
        //取消订阅
        o.unSubscribe = function (token) {
            for (var k in topics)
                if (topics.hasOwnProperty(k) && k == token) {
                    delete topics[k];
                    break;
                }
        }
        //推送方法
        o.pulish = function (context) {
            arguments = Array.prototype.slice.call(arguments, 1);
            var ret = [];
            for (var k in topics)
                if (topics.hasOwnProperty(k) && typeof topics[k] == 'function')
                    ret.push(topics[k].apply(context, arguments));

            return ret;
        }
        //清理所有已经注册的事件
        o.clear = function () {
            topics = {};
        }
        return o;
    }

    xCharts.fn.getObserver = getObserver;

    xCharts.fn.autoRefresh = function () {
        var context = this;
        d3.select(window).on('resize.showloading' + context.chartNum, context.debounce(function () {
            context.showLoading();
        }, context.config.autoRefresh.wait, {leading: true, trailing: false}));

        d3.select(window).on('resize.refresh' + context.chartNum, context.debounce(refreshFn, context.config.autoRefresh.wait, {
            leading: false,
            trailing: true
        }));
        function refreshFn() {
            var width, height;
            var elementCss = getComputedStyle(context.contain[0][0].parentElement);
            width = parseFloat(elementCss.width);
            height = parseFloat(elementCss.height);
            if (elementCss.boxSizing == 'border-box') {
                //由于'border-box'计算的差异，所以宽度需要减去padding,border
                width = width - parseFloat(elementCss.borderLeftWidth)
                    - parseFloat(elementCss.paddingLeft)
                    - parseFloat(elementCss.paddingRight)
                    - parseFloat(elementCss.borderRightWidth);

                height = height - parseFloat(elementCss.borderTopWidth)
                    - parseFloat(elementCss.paddingTop)
                    - parseFloat(elementCss.paddingBottom)
                    - parseFloat(elementCss.borderBottomWidth);
            }

            context.width = width
            context.height = height
            context.loadConfig(context.config);
            context.hideLoading();
        }
    }
    xCharts.fn.showLoading = function () {
        this.contain.classed(classPrex + 'vcenter', true);
        this.svg.style({'display': 'none'});
        this.loading.style({'display': 'inline-block'})
    }
    xCharts.fn.hideLoading = function () {
        var svg = this.svg;
        var loading = this.loading;
        this.contain.classed(classPrex + 'vcenter', false);
        this.svg.style({'display': 'block'});
        this.loading.style({'display': 'none'})

    }
    //局部绑定
    xCharts.fn.partial = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            arguments = Array.prototype.slice.call(arguments)
            for (var i = 0; i < args.length; i++) {
                arguments.unshift(args[i]);
            }
            return fn.apply(this, arguments);
        }
    }

    xCharts.fn.debounce = function (func, wait, options) {
        var last = 0;
        var res = undefined;
        var handle = null;
        if (!options)options = {};
        return function () {
            var now = +new Date();
            var context = this;
            var args = arguments;
            if (!last && options.leading !== true) last = now;

            if (now >= (last + wait)) {
                last = now;
                res = func.apply(context, args);
            } else {
                if (handle) clearTimeout(handle);
                handle = setTimeout(function () {
                    last = 0;
                    handle = null;
                    if (options.trailing !== false) res = func.apply(context, args);
                }, wait)
            }
            return res;
        }
    }


    xCharts.fn.flatten = function (array) {
        var output = [], idx = 0;
        ;
        for (var i = 0, len = array.length; i < len; i++) {
            if (Array.isArray(array[i])) {
                var ret = arguments.callee(array[i]);
                var j = 0, retLen = ret.length;
                output.length += retLen;
                while (j < retLen) {
                    output[idx++] = ret[j++];
                }
            } else {
                output[idx++] = array[i];
            }
        }
        return output
    }

    function linearTickRange(domain, m) {
        if (m == null) m = 10;
        var extent = (domain), span = extent[1] - extent[0], step = Math.pow(10, Math.floor(Math.log(span / m) / Math.LN10)), err = m / span * step;
        if (err <= .15) step *= 10; else if (err <= .35) step *= 5; else if (err <= .75) step *= 2;
        extent[0] = Math.ceil(extent[0] / step) * step;
        extent[1] = Math.floor(extent[1] / step) * step + step * .5;
        extent[2] = step;
        return extent;
    }

    function getColor(palette) {
        if (palette == undefined) {
            palette = [
                '#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80',
                '#8d98b3', '#e5cf0d', '#97b552', '#95706d', '#dc69aa',
                '#07a2a4', '#9a7fd1', '#588dd5', '#f5994e', '#c05050',
                '#59678c', '#c9ab00', '#7eb00a', '#6f5553', '#c14089'
            ]

        }

        return function (idx) {
            return palette[idx % palette.length];
        }
    }

    /**
     * 遍历传入的参数，返回第一个不为null|undefined的值
     * @returns {*}
     */
    function getNotUndefinedValue() {
        for (var i = 0, len = arguments.length; i < len; i++) {
            if (arguments[i] != null) {
                return arguments[i];
            }
        }
        return void 0;
    }

    xCharts.fn.getNotUndefinedValue = getNotUndefinedValue;

}())