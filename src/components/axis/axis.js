/**
 * xCharts.axis
 * 坐标系绘制函数
 * TODO brush时间刷
 * TODO formatter函数被调用了三次
 * done 用户可以控制哪些ticks显示
 * DONE 用户控制网格显示
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    utils.inherits(axis, components['Component']);
    components.extend({axis: axis});

    function axis(messageCenter, config, type) {
        /**
         * 这里跟其他组件不一样，即使用户不愿意显示坐标轴，也必须初始化(init)，不然其他图表会拿不到比例尺导致绘图失败
         */
        this._show = true;
        components['Component'].call(this, messageCenter, config, type);

    }
    axis.prototype.extend = xCharts.extend;
    axis.prototype.extend({
        //一些初始化参数的计算
        init: function (messageCenter, config, type, series) {
            this.isXAxis = type === 'xAxis';
            this.axisConfig = config[type];
            this.series = series;
            this.mergeConfig = [];
            var scales = [];
            for (var i = 0; i < this.axisConfig.length; i++) {

                // 合并默认config
                var config = utils.merage(defaultConfig(type), this.axisConfig[i]);
                this.mergeConfig[i] = config;
                // 计算需要显示的文字的宽高，y轴是宽，x轴是高

                // 计算比例尺scale
                var scale = axisScale(config, i, this);

                // 这里判断，如果domain是NAN证明是legend取消了所有显示或者传入的数据为空
                var domain = scale.domain();
                if (isNaN(domain[0]) && isNaN(domain[1]) && scale.scaleType === 'value') {
                    if (series.length !== 0) {
                        scale = this.scales[i];
                    } else {
                        return;
                    }
                }

                if (!this.legendRefresh) {
                    calcAxisMargin(this, this.isXAxis, config, scale);
                }

                scales[i] = scale;

                this.axisConfig[i] = config;
            }

            this.width = messageCenter.originalWidth - messageCenter.margin.left - messageCenter.margin.right; //计算剩余容器宽
            this.height = messageCenter.originalHeight - messageCenter.margin.top - messageCenter.margin.bottom;//计算剩余容器高
            this.range = this.isXAxis ? [0, this.width] : [this.height, 0];

            //设置比例尺的值域
            setScaleRange(scales, this.range);

            // 判断x轴上面的文字是否重合
            // 如果重合则返回需要显示的ticks
            if (this.isXAxis) {

                // done 每个tick按照最长的情况来算
                this.showDomainList = xAxisShowTicks(scales, this.axisConfig);

                // 抛出这个数组,让折线图之类的图表可以使用
                messageCenter.showDomainList = getDataIndex(this.showDomainList, this.axisConfig);
            }

            this.messageCenter[this.type + 'Scale'] = scales;
            this.scales = scales;

        },
        render: function (animationEase, animationTime) {
            if (this.isXAxis) {
                this.__drawAxis(animationEase, animationTime);
                this.fire("xAxisRender");
                return true;
            }

            // Y轴等待X轴画完,因为网格线不等待X轴计算margin完毕的话,可能会出现超出边界的情况
            this.on("xAxisRender.yAxis", function () {
                this.width = this.messageCenter.originalWidth - this.margin.left - this.margin.right; //计算剩余容器宽
                this.__drawAxis(animationEase, animationTime);
            }.bind(this));
        },
        __drawAxis: function (animationEase, animationTime) {
            var type = this.type;
            var scales = this.scales;

            for (var i = 0, config; config = this.axisConfig[i]; i++) {

                if (!config.show) break; //不显示坐标

                var scale = scales[i];

                var axis;

                switch (config.position) {
                    case 'left':
                        axis = d3.axisLeft(scale);
                        break;
                    case 'right':
                        axis = d3.axisRight(scale);
                        break;
                    case 'bottom':
                        axis = d3.axisBottom(scale);
                        break;
                    default :
                        axis = d3.axisTop(scale);
                }

                // d3内置函数,生成axis
                axis.tickSizeOuter(0)
                    .tickFormat(config.tickFormat);

                if (scale.scaleType !== 'time') {
                    axis.ticks(config.ticks)
                }

                // 画网格
                // i===0 表示只画一个,不然多Y轴情况会很难看
                var innerTickWidth = 0;
                if (!this.isXAxis && i === 0) {
                    innerTickWidth = config.grid.show ? -this.width : 0;
                    axis.tickSizeInner(innerTickWidth);
                } else if (i === 0) {
                    innerTickWidth = config.grid.show ? -this.height : 0;
                    axis.tickSizeInner(innerTickWidth);
                    axis.tickPadding(10);
                    axis.tickValues(this.showDomainList[i]);
                } else {
                    // 第二个根Y轴
                    axis.tickSizeInner(0);
                }

                //添加<g>
                var axisGroup = this.main.selectAll(".xc-axis." + type + '-' + i).data([config]);


                axisGroup = axisGroup.enter().append('g')
                    .attr('class', 'xc-axis ' + type + ' ' + type + '-' + i)
                    .attr('fill', 'none')
                    .attr('stroke', '#000')
                    .merge(axisGroup);

                // 柱状图的网格要特殊处理
                if (scale.scaleType === "barCategory") {
                    axisGroup.classed("xc-bar-axis", true);
                }

                axisGroup.attr('transform', translate.call(this, config))
                    .transition()
                    .ease(animationEase)
                    .duration(animationTime)
                    .call(axis);

                // =======处理网格样式======
                axisGroup.selectAll(".tick>line")
                    .attr('opacity', function (line, index) {
                        if (index !== 0 && config.grid.controlSingleLineShow(line)) {
                            return config.grid.opacity;
                        }
                        return 0;
                    })
                    .attr('stroke', function (line, index) {
                        if (index !== 0) {
                            return config.grid.color;
                        }
                    });
            }

        },
        ready: function () {

            this._tooltipReady();
            this._lengendReady();
            this.isXAxis && this._brushReady();
            this.isXAxis && this.fire("xAxisReady");

        },
        _tooltipReady: function () {

            //有些情况不需要加载tooltip事件
            if (!this.config.tooltip || this.config.tooltip.show === false || this.config.tooltip.trigger !== 'axis' || this.type == 'yAxis') return;

            //默认已经是单x轴,且type！=value
            var axis = this.axisConfig[0];
            this.on('tooltipSectionChange.axis', function (sectionNumber, callback) {
                var data = axis.data[sectionNumber];
                var html = axis.formatter(data);

                callback(html);
            });

        },
        _lengendReady: function () {
            var _this = this;
            this.on('legendClick.' + _this.type, function (nameList) {
                var series = _this.series;
                series.forEach(function (serie) {
                    var serieName = serie.name;
                    serie.show = false;
                    for (var i = 0, n; n = nameList[i++];) {
                        if (n == serieName) {
                            serie.show = true;
                            break;
                        }
                    }

                });

                // 给个标识，这样就不用去计算margin的值
                _this.legendRefresh = true;
                _this.init(_this.messageCenter, _this.config, _this.type, series);
                _this.render(_this.config.animation.animationEase, _this.config.animation.animationTime);
                _this.legendRefresh = false;
            });
        },
        _brushReady: function () {

            var scale = this.scales[0].copy();
            scale.range([0, 1]);
            this.on('brushChange.axis', function (selection) {
                var domain = [scale.invert(selection[0]), scale.invert(selection[1])];

                this.scales[0].domain(domain);

                // scale.domain(domain);
                this.__drawAxis(d3.easeLinear, 0);
            }.bind(this));
        },
        // 给散点图格式化值用
        tickFormat: function (value, i) {
            i = i === undefined ? 0 : i;
            return this.mergeConfig[i].tickFormat(value);
        }
    });

    /**
     * 设置scale
     * @param scales
     */
    function setScaleRange(scales, range) {

        scales.forEach(function (scale) {
            if (scale.scaleType === "value" || scale.scaleType === "time") scale.range(range);
            else if (scale.scaleType === "barCategory" || scale.scaleType === 'middleCategory') {
                scale.range(range);
                scale.paddingOuter(0.1);
                /*scale.rangeRoundBands(range, 0, 0.1);*/
            }
            else if (scale.scaleType === "category")  scale.range(range);

        });
    }

    /**
     * 计算y轴时，需要偏移的margin值
     * 计算X轴时,margin.right偏移值,根据显示文字长度决定
     * @param ctx
     * @param isXAxis
     * @param config
     * @param scale
     */
    function calcAxisMargin(ctx, isXAxis, config, scale, zeroOffset) {


        if (isXAxis) {

            var ticksTextList = scale.domain().map(function (tickText) {
                return config.tickFormat(tickText);
            });
            var widthList = utils.calcTextWidth(ticksTextList, 14).widthList;

            var lastTickWidth = widthList[widthList.length - 1];
            var marginRight = ctx.margin.right;
            if (lastTickWidth / 2 > marginRight) {

                // 加法是为了防止意外覆盖到legend
                ctx.margin.right += Math.round(lastTickWidth / 2) - marginRight;
            }

            var firstTickWidth = widthList[0];
            var marginLeft = ctx.margin.left;
            if (firstTickWidth / 2 > marginLeft) {
                ctx.margin.left += Math.round(firstTickWidth / 2) - marginLeft;
            }
            // ctx.margin.bottom = zeroOffset;

        } else {

            var ticksTextList = scale.ticks().map(function (tickText) {
                return config.tickFormat(tickText);
            });

            // 这里默认14的字体大小，也不知道有没有影响，囧
            var widthList = utils.calcTextWidth(ticksTextList, 14).widthList;

            var maxWidth = d3.max(widthList);

            maxWidth = maxWidth == undefined ? 0 : maxWidth;

            if (config.position === 'right') {
                ctx.margin.right += maxWidth;
            } else {
                ctx.margin.left += maxWidth;
            }
        }
    }

    /**
     * 包含坐标轴类型
     */
    var axisCategory = {
        value: valueAxis,
        time: timeAxis,
        category: categoryAxis
    }

    /**
     * 入口
     * @param singleConfig
     * @param idx
     * @param ctx
     * @returns {*}
     */
    function axisScale(singleConfig, idx, ctx) {
        var axisClass = axisCategory[singleConfig.type];
        if (!axisClass) {
            console.error('axis[%d].type = "%s" is not supported', idx, singleConfig.type);
            return;
        }

        return axisClass.call(ctx, singleConfig, idx);

    }

    /**
     * category类型
     * @param singleConfig
     * @param idx
     * @returns {*}
     */
    function categoryAxis(singleConfig, idx) {

        if (!singleConfig.data) {
            console.error('axis[%d].data is not defined!', idx);
            return;
        }

        if (isBar(this.config.series) || this.config.xAxis[idx].middleBand) {
            var scale = d3.scaleBand()
                .domain(singleConfig.data);


            scale.scaleType = isBar(this.config.series) ? 'barCategory' : 'middleCategory';

        } else {
            var scale = d3.scalePoint()
                .domain(singleConfig.data);


            scale.scaleType = "category";
        }

        return scale;

    }

    /**
     * value类型
     * @param singleConfig
     * @param idx
     * @returns {*}
     */
    function valueAxis(singleConfig, idx) {

        var series = this.series;
        var type = this.type;
        //默认指向index=0的坐标轴
        series.map(function (serie) {
            if (serie[type + 'Index'] == null) {
                serie[type + 'Index'] = 0;
            }
        });

        var values = [], domain = [];
        for (var k in axisSeries) {
            if (axisSeries.hasOwnProperty(k)) {
                var value = axisSeries[k](series, type, idx);
                if (value) {
                    values.push(value);
                }
            }

        }
        domain[0] = d3.min(values, function (value) {
            return value[0]
        });
        domain[1] = d3.max(values, function (value) {
            return value[1]
        });


        // 如果最大最小值是相等的,手动将domain的一个值设为0，如果两者都为零，设置最大值为1
        if (domain[0] === domain[1] && domain[0] != null && domain[1] != null) {
            if (!domain[0]) {
                domain[1] = 1;
            } else {
                domain[0] > 0 ? domain[0] = 0 : domain[1] = 0;
            }
        }

        // 如果最大最小值超过可显示的范围,手动设置
        if (domain[0] === -Infinity) {
            if (domain[1] > 0) {
                domain[0] = 0;
            } else {
                domain[1] = 0;
                domain[0] = -10;
            }
        }
        if (domain[1] === Infinity) {
            if (domain[0] < 0) {
                domain[1] = 0;
            } else {
                domain[0] = 0;
                domain[1] = 10;
            }
        }

        // domain 上下添加0.1的偏移，参考至c3
        // var valueLength = domain[1] - domain[0];
        // domain[0] -= valueLength * 0.1;
        // domain[1] += valueLength * 0.1;


        //用户手动控制最大最小值
        if (domain[0] > singleConfig.minValue || domain[0] === undefined) {
            domain[0] = singleConfig.minValue;
        }
        if (domain[1] < singleConfig.maxValue || domain[1] === undefined) {
            domain[1] = singleConfig.maxValue;
        }


        var scale = d3.scaleLinear()
            .domain(domain);
        scale.scaleType = "value";

        // 动态计算ticks,2以下就会报错咯
        // 将默认10个情况下的长度拿出然后/2并且向上取整
        // 经测试这样得出的结果会符合分布要求,并且也不会像默认一样显得过于密集
        if (singleConfig.ticks < 2 || this.legendRefresh) {
            var ticksLength = scale.ticks().length;
            var ticks = Math.ceil(ticksLength / 2);
            if (ticks >= 2) {
                singleConfig.ticks = ticks;
            }
        }

        var ticks = scale.ticks(singleConfig.ticks);

        // 当所有值为0时,会出现tickRange=NaN;
        var tickRange = ticks[1] - ticks[0];


        if (domain[0] % tickRange !== 0 && !isNaN(tickRange)) {

            var multiple = parseInt(domain[0] / tickRange);

            if (multiple < 0) {
                multiple--;
            }

            domain[0] = multiple * tickRange;
        }

        if (domain[1] % tickRange !== 0 && !isNaN(tickRange)) {

            var multiple = parseInt(domain[1] / tickRange);

            if (multiple >= 0) {
                multiple++;
            }

            domain[1] = multiple * tickRange;
        }

        scale.domain(domain);

        return scale;
    }

    /**
     * time类型
     * @param singleConfig
     * @param idx
     * @returns {*}
     */
    function timeAxis(singleConfig, idx) {

        var scale = d3.scaleTime()
            .domain(d3.extent(singleConfig.data, function (d) {
                return +new Date(d);
            }));

        //现在只考虑x坐标轴
        if (this.isXAxis) {
            //取得series中data的长度，均分domain,保证singleConfig.data长度一致
            var series = this.config.series;
            var dataLength = 1;
            for (var i = 0, serie; serie = series[i++];) {
                // 这里只支持折线图，暂不考虑其他
                var xIndex = serie.xAxisIndex == undefined ? 0 : serie.xAxisIndex;
                if (serie.type == 'line' && xIndex == idx) {
                    dataLength = serie.data.length - 1;
                    break;
                }
            }

            var domain = scale.domain(),
                timeDifference = domain[1] - domain[0], //最大最小时间差
                sectionTime = timeDifference / dataLength;//时间与时间之间的间隔

            singleConfig.data = [+domain[0]];
            for (var i = 0; i < dataLength; i++) {
                singleConfig.data[i + 1] = +domain[0] + Math.round(sectionTime * (i + 1), 1);
            }
        }
        scale.scaleType = "time";

        return scale;
    }


    //因图表类型而异，取得对应的最大最小值
    //需对每个series指定了xAxisIndex 或者 yAxisIndex
    //@return 数组[min,max]
    var axisSeries = {
        line: function (series, type, idx) {
            var stacks = {}, values = [];
            d3.map(series, function (serie) {
                if (serie.type !== 'line' || serie[type + 'Index'] !== idx || serie.show === false) {
                    return false;
                }
                if (serie.stack) {
                    stacks[serie.stack] || (stacks[serie.stack] = [])
                    stacks[serie.stack].push(serie.data);
                }
                values = values.concat(serie.data);
            })
            //处理堆积图，值相加
            for (var k in stacks) {
                if (stacks.hasOwnProperty(k)) {
                    var maxData = [];
                    stacks[k].forEach(function (data, i) {
                        data.forEach(function (d, i) {
                            maxData[i] = maxData[i] == null ? 0 : maxData[i];//默认为0
                            maxData[i] += parseFloat(d);
                        })
                    });
                    values = values.concat(maxData);

                }
            }

            return values.length == 0 ? false
                : d3.extent(values, function (value) {
                return parseFloat(value);
            })
        },
        bar: function (series, type, idx) {
            var stacks = {}, values = [];
            d3.map(series, function (serie) {
                if (serie.type !== 'bar' || serie[type + 'Index'] !== idx || serie.show === false) {
                    return false;
                }

                if (serie.legendShow === false && serie.axisLegendShow === undefined) {
                    serie.axisLegendShow = true;
                    return false;
                }

                if (serie.stack) {
                    stacks[serie.stack] || (stacks[serie.stack] = [])
                    stacks[serie.stack].push(serie.data);
                }
                values = values.concat(serie.data);
            })
            for (var k in stacks) {
                if (stacks.hasOwnProperty(k)) {
                    var maxData = [];
                    stacks[k].forEach(function (data) {
                        data.forEach(function (d, i) {
                            maxData[i] = maxData[i] == null ? 0 : maxData[i];//默认为0
                            maxData[i] += parseFloat(d);
                        })
                    })
                    values = values.concat(maxData);

                }
            }
            return values.length == 0 ? false
                : d3.extent(values, function (value) {
                return parseFloat(value);
            })
        },
        scatter: function (series, type, idx) {
            var values = [];
            d3.map(series, function (serie) {
                if (serie.type !== 'scatter' || serie[type + 'Index'] !== idx || serie.show === false) {
                    return;
                }
                d3.map(serie.data, function (d) {
                    values.push(d[type == 'xAxis' ? 0 : 1]); //[[161.2, 51.6]]包含x，y值的数组,第一个为x，第二个为y
                })
            });

            return values.length == 0 ? false
                : d3.extent(values, function (value) {
                return parseFloat(value);
            })
        }
    }

    /**
     * 计算哪些tick可能重叠,将其抛弃.留下需要显示的tick
     * TODO 保证第一个和最后一个点显示
     * @param scales 计算出来的scale
     * @param configs
     * @return {Array}
     */
    function xAxisShowTicks(scales, configs) {
        var domainList = [];
        for (var i = 0; i < scales.length; i++) {
            var scale = scales[i];

            // 只支持category类型
            if (scale.scaleType !== 'category' && scale.scaleType !== 'barCategory' &&
                scale.scaleType !== 'middleCategory') {
                continue;
            }

            var domain = utils.copy(scale.domain());
            var range = scale.range();
            var config = configs[i];
            var ticksTextList = domain.map(function (tickText) {
                return config.tickFormat(tickText);
            });
            var widthList = utils.calcTextWidth(ticksTextList, 14).widthList;

            // 每个tick的大小取最大的一个来进行判断
            var maxWidth = d3.max(widthList);

            // tick与tick之间的距离
            var rangeWidth = Math.ceil((range[range.length - 1] - range[0]) / (domain.length - 1));

            var preIdx = 0;
            for (var nowIdx = 1; nowIdx < widthList.length; nowIdx++) {
                var preWidth = maxWidth;
                var nowWidth = maxWidth;

                //两个tick挤在一起了
                if ((preWidth + nowWidth) / 2 > rangeWidth * (nowIdx - preIdx)) {
                    domain[nowIdx] = null;
                } else {
                    preIdx = nowIdx;
                }
            }

            // 因为不显示的tick全部置为null,所以保留不为null的即可
            domain = domain.filter(function (tick) {
                return tick !== null;
            });

            domainList.push(domain);
        }

        return domainList;
    }

    /**
     * 根据作为位置返回需要偏移的坐标量
     * @param config
     * @returns {string} translate(0,0)
     */
    function translate(config) {
        var position = config.position;
        var xy = [0, 0];

        if (position == 'right')
            xy = [this.width, 0];
        else if (position == 'bottom')
            xy = [0, this.height];
        return 'translate(' + xy + ')';
    }

    function isBar(series) {
        for (var i = 0, s; s = series[i++];)
            if (s.type === 'bar')
                return true;

        return false;
    }

    /**
     * 计算需要显示的ticks在config.data中的列表
     * @param showDomainList
     * @param configs
     * @returns {Array} [{1:true}] key是config.data中的位置
     */
    function getDataIndex(showDomainList, configs) {
        var ret = [];
        for (var i = 0; i < showDomainList.length; i++) {
            var list = showDomainList[i];
            var data = configs[i].data;
            var dataIndex = {};
            list.forEach(function (value) {
                for (var j = 0; j < data.length; j++) {
                    if (value === data[j]) {
                        break;
                    }
                }
                if (j == data.length) {
                    console.error("data和value不匹配");
                }
                dataIndex[j] = true;
            });
            ret[i] = dataIndex;
        }
        return ret;
    }

    function defaultConfig(type) {
        //注释掉是因为该项没有默认值,非必须或者必须由用户指定

        /**
         * @var axis
         * @type Object
         * @description 坐标轴配置项
         * @extends xCharts
         */
        var axis = {
            /**
             * @var type
             * @extends xCharts.axis
             * @description 坐标轴的类型
             * @type String
             * @values 'category'|'value'
             */
            //type:'value',
            /**
             * @var data
             * @extends xCharts.axis
             * @type Array
             * @description
             *  依赖于type类型
             *  type=value时,data值无效
             *  type=category时，data里的值为String|Number
             *  type=time时,data里是可以被new Date()识别的值
             * @example data:[1,2,3] data:['周一','周二','周三']
             */
            //data:[], //当type=category,time时，指定坐标轴的值
            /**
             * @var tickFormat
             * @extends xCharts.axis
             * @type Function
             * @description
             * 对坐标轴上的每一个label进行格式化,需要返回一个字符串作为显示
             * @example
             *  function(value){
             *      return value+'%';
             *  }
             *  @default 不做任何处理
             */
            tickFormat: utils.loop,
            /**
             * @var middleTick
             * @extends xCharts.axis
             * @type Boolean
             * @description 定义坐标轴类型为category时，标签和数据点是否会两个刻度之间的带(band)中间
             */
            middleBand: false,
            /**
             * @var ticks
             * @extends xCharts.axis
             * @type Number
             * @description
             *   对坐标轴类型为value时,设置坐标点的数量
             *  @default 动态计算,大概在4-6之间
             */
            ticks: -1,
            /**
             * @var formatter
             * @extends xCharts.axis
             * @type Function
             * @description
             * 对坐标轴上的每一个label进行格式化,需要返回一个字符串作为tooltip的title字段
             * @example
             *  function(value){
             *      return value+'%';
             *  }
             *  @default 调用tickFormat进行处理,两边包裹<p>标签
             */
            formatter: function (value) {
                return "<p>" + this.tickFormat(value) + "</p>";
            },
            /**
             * @var position
             * @extends xCharts.axis
             * @type String
             * @values x轴'top'|'bottom'；y轴'left'|'right'
             * @description
             *  多X多Y轴使用，控制坐标轴位置
             * @default x轴'bottom';y轴'left'
             */
            position: type == 'xAxis' ? 'bottom' : 'left',//left时y轴在左边，right时Y轴在右边,默认为left;top时x轴在顶端，bottom时x轴在底部,默认bottom.
            /**
             * @var maxValue
             * @extends xCharts.axis
             * @type Number
             * @description
             *  当type=value时有效
             *  控制坐标轴上最大值显示
             *  当传入值中的最大值超过maxValue时，以传入值为准
             *  注意: 如果设置不合理,内部会自动重新计算
             */
            //maxValue: 100,
            /**
             * @var minValue
             * @extends xCharts.axis
             * @type Number
             * @description
             *  当type=value时有效
             *  控制坐标轴上最小值显示
             *  当传入值中的最小值小于minValue时，以传入值为准
             *  注意: 如果设置不合理,内部会自动重新计算
             */
            //minValue: 0, //type=value有效，手动设置最大最小值,
            /**
             * @var hasNegativeAxis
             * @extends xCharts.axis
             * @type Number
             * @description
             *  控制是否将坐标轴分为正坐标轴和负坐标轴
             *  默认不区分
             */
            // hasNegativeAxis: false,
            /**
             * @var show
             * @extends xCharts.axis
             * @type Boolean
             * @default true
             * @description
             * 当不需要显示坐标轴时，可以关掉这个选项
             */
            show: true,
            /**
             * @var grid
             * @extends xCharts.axis
             * @type Object
             * @description
             * 坐标网格
             */
            grid: {
                /**
                 * @var show
                 * @extends xCharts.axis.grid
                 * @type Boolean
                 * @default true,x轴默认false
                 * @description
                 * 当不需要显示网格时,可以关掉此项
                 * 推荐只显示Y轴网格
                 */
                show: type === 'xAxis' ? false : true,
                /**
                 * @var opacity
                 * @extends xCharts.axis.grid
                 * @type Number
                 * @default 0.2
                 * @description
                 * 网格线的透明度
                 */
                opacity: 0.2,
                /**
                 * @var color
                 * @extends xCharts.axis.grid
                 * @type String
                 * @default #a2a2a2
                 * @description
                 * 网格线的颜色
                 */
                color: '#a2a2a2',
                /**
                 * @var controlSingleLineShow
                 * @extends xCharts.axis.grid
                 * @type Function
                 * @default 全部显示
                 * @description
                 *  精确控制每一根网格线的显示与否
                 *  传入data里的每一个值,返回true或者false控制显示或者不显示
                 *
                 */
                controlSingleLineShow: function () {
                    return true;
                }
            }
        };
        return axis;
    }


}(xCharts, d3));