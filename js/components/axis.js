/**
 * xCharts.axis
 * 坐标系绘制函数
 */
(function (window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var d3 = window.d3;
    utils.inherits(axis, xCharts.components['Component']);
    xCharts.components.extend({axis: axis})

    function axis(messageCenter, config, type) {
        xCharts.components['Component'].call(this, messageCenter, config, type);
    }

    axis.prototype.extend = xCharts.extend;
    axis.prototype.extend({
        //一些初始化参数的计算
        init: function (messageCenter, config, type, series) {
            this.isXAxis = type === 'xAxis';
            this.axisConfig = config[type];
            this.width = messageCenter.originalWidth - messageCenter.margin.left - messageCenter.margin.right; //计算剩余容器宽
            this.height = messageCenter.originalHeight - messageCenter.margin.top - messageCenter.margin.bottom;//计算剩余容器高
            this.range = this.isXAxis ? [0, this.width] : [this.height, 0];
            this.series = series;
        },
        render: function (ease, durationTime) {
            this.messageCenter[this.type + 'Scale'] = [];
            var type = this.type;
            for (var i = 0, a; a = this.axisConfig[i]; i++) {
                var scale = this.__axis(a, i); //每个坐标轴都会生成一个scale
                this.messageCenter[this.type + 'Scale'][i] = scale; //通过messageCenter将scale提供给其他组件使用
                a = utils.merage(defaultConfig(type), a); //给予默认配置
                this.axisConfig[i]=a;//为了tooltip时，能获取到格式化函数
                //坐标轴函数
                var axis = d3.svg.axis().scale(scale).orient(a.position).tickFormat(a.tickFormat);
                //添加<g>
                var axisGroup = this.main.selectAll(".xc-axis." + type + '-' + i).data([a]);
                axisGroup.enter().append('g').attr('class', 'xc-axis ' + type + '-' + i).attr('fill', 'none').attr('stroke', '#000');
                axisGroup.attr('transform', this.__translate(a))
                    .transition()
                    .ease(ease)
                    .duration(durationTime)
                    .call(axis);

            }
        },
        ready: function () {
            //DONE tooltip完成后再写
            this.__tooltipReady();
            this.__lengendReady();
        },
        __tooltipReady: function () {
            //有些情况不需要加载tooltip事件
            if (!this.config.tooltip ||!this.config.tooltip.show ||this.config.tooltip.trigger !== 'axis' || this.type=='yAxis') return;

            //默认已经是单x轴,且type！=value

            var axis = this.axisConfig[0];
            this.on('tooltipSectionChange.axis', function (sectionNumber, callback) {
                var data =axis.data[sectionNumber];
                data=axis.tickFormat(data);
                var html = "<p>"+data+"</p>";
                callback(html);
            });

        },
        __lengendReady: function () {
            var _this = this;
            this.on('legendClick.'+_this.type, function (nameList) {
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
                _this.init(_this.messageCenter, _this.config, _this.type, series);
                _this.render('linear', 0);
            });
        },
        __translate: function (singleConfig, type) {
            var position = singleConfig.position;
            var xy = [0, 0];

            if (position == 'right')
                xy = [this.width, 0];
            else if (position == 'bottom')
                xy = [0, this.height];
            return 'translate(' + xy + ')';
        },
        __axis: function (singleConfig, idx) {
            var axisClass = this['__' + singleConfig.type + 'Axis'];
            if (!axisClass) {
                console.error('axis[%d].type = "%s" is not supported', idx, singleConfig.type);
                return;
            }

            return axisClass.call(this, singleConfig, idx);

        },
        __categoryAxis: function (singleConfig, idx) {
            var range = this.range;

            if (!singleConfig.data) {
                console.error('axis[%d].data is not defined!', idx);
                return;
            }

            if(isBar(this.config.series)){
                var scale = d3.scale.ordinal()
                    .domain(singleConfig.data)
                    .rangeRoundBands(range,0,0.1);

            }else{
                var scale = d3.scale.ordinal()
                    .domain(singleConfig.data)
                    .rangeRoundPoints(range);
            }

            return scale;

        },
        __valueAxis: function (singleConfig, idx) {
            // TODO 最大最小值，多一格出来，否则气泡图容易出界
            var series = this.series;
            var type = this.type;
            var range = this.range;
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
            //用户手动控制最大最小值
            if (domain[0] > singleConfig.minValue) {
                domain[0] = singleConfig.minValue;
            }
            if (domain[1] < singleConfig.maxValue) {
                domain[1] = singleConfig.maxValue;
            }

            var scale = d3.scale.linear()
                .domain(domain)
                .range(range);
            return scale;
        },
        __timeAxis: function (singleConfig, idx) {
            var range = this.range;
            var scale = d3.time.scale()
                .domain(d3.extent(singleConfig.data, function (d) {
                    return +new Date(d);
                }))
                .range(range);

            //现在只考虑x坐标轴
            if(this.isXAxis){
                //取得series中data的长度，均分domain,保证singleConfig.data长度一致
                var series = this.config.series;
                var dataLength=1;
                for(var i= 0,serie;serie=series[i++];){
                    // 这里只支持折线图，暂不考虑其他
                    var xIndex = serie.xAxisIndex==undefined?0:serie.xAxisIndex;
                    if(serie.type=='line' && xIndex==idx){
                        dataLength=serie.data.length-1;
                        break;
                    }
                }

                var domain = scale.domain(),
                    timeDifference=domain[1]-domain[0], //最大最小时间差
                    sectionTime = timeDifference/dataLength;//时间与时间之间的间隔

                singleConfig.data=[+domain[0]];
                for(var i=0;i<dataLength;i++){
                    singleConfig.data[i+1]=+domain[0]+Math.round(sectionTime*(i+1),1);
                }
            }

            return scale;
        }
    });
    //因图表类型而异，取得对应的最大最小值
    //需对每个series指定了xAxisIndex 或者 yAxisIndex
    //@return 数组[min,max]
    var axisSeries = {
        line: function (series, type, idx) {
            var stacks = {}, values = [];
            d3.map(series, function (serie) {
                if (serie.type != 'line' || serie[type + 'Index'] != idx || serie.show == false) {
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
                            maxData[i] += d;
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
        bar: function (series, type, idx) {
            var stacks = {}, values = [];
            d3.map(series, function (serie) {
                if (serie.type != 'bar' || serie[type + 'Index'] != idx || serie.show == false) {
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
                    stacks[k].forEach(function (data, i) {
                        data.forEach(function (d, i) {
                            maxData[i] = maxData[i] == null ? 0 : maxData[i];//默认为0
                            maxData[i] += d;
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
                if (serie.type != 'scatter' || serie[type + 'Index'] != idx || serie.show == false) {
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


    function isBar(series){
        for(var i= 0,s;s=series[i++];)
            if(s.type==='bar')
                return true;

        return false;
    }

    function defaultConfig(type) {
        //注释掉是因为该项没有默认值,非必须或者必须由用户指定

        /**
         * @var axis
         * @type Object
         * @describtion 坐标轴配置项
         * @extends xCharts
         */
        var axis = {
            /**
             * @var type
             * @extends xCharts.axis
             * @describtion 坐标轴的类型
             * @type String
             * @values 'category'|'value'|'time'
             */
            //type:'value',
            /**
             * @var data
             * @extends xCharts.axis
             * @type Array
             * @describtion
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
             * @describtion
             * 对坐标轴上的每一个label进行格式化,需要返回一个字符串作为显示
             * @example
             *  function(value){
             *      return value+'%';
             *  }
             *  @default 不做任何处理
             */
            tickFormat: utils.loop,
            /**
             * @var position
             * @extends xCharts.axis
             * @type String
             * @values x轴'top'|'bottom'；y轴'left'|'right'
             * @describtion
             *  多X多Y轴使用，控制坐标轴位置
             * @default x轴'bottom';y轴'left'
             */
            position: type == 'xAxis' ? 'bottom' : 'left',//left时y轴在左边，right时Y轴在右边,默认为left;top时x轴在顶端，bottom时x轴在底部,默认bottom.
            /**
             * @var maxValue
             * @extends xCharts.axis
             * @type Number
             * @describtion
             *  当type=value时有效
             *  控制坐标轴上最大值显示
             *  当传入值中的最大值超过maxValue时，以传入值为准
             */
            //maxValue: 100,
            /**
             * @var minValue
             * @extends xCharts.axis
             * @type Number
             * @describtion
             *  当type=value时有效
             *  控制坐标轴上最小值显示
             *  当传入值中的最小值小于minValue时，以传入值为准
             */
            //minValue: 0, //type=value有效，手动设置最大最小值
        }
        return axis;
    }


}(window))