/**
 * xg-xcharts - charts base on d3.js
 * @version v0.3.2
 * @date 2018-08-09 21:58:57
*/
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define('xCharts',['d3'], function(d3) {
            return (root.xCharts = factory(d3));
        });
    } else if (typeof exports === 'object') {
        module.exports = factory(require('d3'));
    } else {
        root.xCharts = factory(root.d3);
    }

}(this, function(d3) {
    /**
 * Created by liuyang on 15/10/23.
 * TODO 当出现不支持的参数时，忽略还是报错关闭绘制
 */
var id = 1;
var mobileMode = isMobile();


/**
 * 入口，自动调用new init
 * @param container 块级元素 选中的容器,容器需要有宽高
 * @returns {xCharts.init}
 */
function xCharts(container) {

    if (!d3) {
        console.error('The library depends on d3js http://d3js.org/ ')
        return;
    }

    return new xCharts.prototype.init(container);
}

xCharts.extend = xCharts.prototype.extend = function (obj) {
    for (var k in obj) {
        if (obj.hasOwnProperty(k))
            this[k] = obj[k];
    }
};
var chartsList = {};
xCharts.prototype.extend({

    //初始化方法
    init: function (container) {
        container = d3.select(container);

        var xcContainer = container.select(".xc-container");
        if (xcContainer.node()) {
            removeBind(xcContainer);
        }

        container.html('');//清理容器里面的所有节点

        this.mobileMode = mobileMode;
        this.container = container;
        this.originalWidth = getWidth(container.node());
        this.originalHeight = getHeight(container.node());
        this.id = id++; //唯一标识，<use> 在多图表使用时，区别其他图用
        this.div = container.append('div').attr('class', 'xc-container');
        this.svg = this.div.append('svg').attr('class', 'xc-svg').attr('width', this.originalWidth).attr('height', this.originalHeight);
        // this.defs = this.svg.append('defs');
        // this.clippath = this.defs.append("clipPath").attr('id', "xc-firstdraw-" + this.id);
        // this.firstDrawingRect = this.clippath.append("rect").attr('x', 0).attr('y', 0).attr("width", 0).attr('height', this.originalHeight);

        //添加clippath
        // 去掉动画
        // this.svg.attr("clip-path", "url(#xc-firstdraw-" + this.id + ")");

        this.main = this.svg.append('g').attr('class', 'xc-main');
        this.margin = {top: 15, left: 10, right: 15, bottom: 30};
        this.originMargin = xCharts.utils.copy(this.margin);//克隆一个副本，提供给refresh重置用
        this.EventList = {};


        // 生成随机字符串
        var chartID = Math.random().toString(36).substr(2);
        this.div.attr('xcharts-id', chartID);
        //保留引用
        chartsList[chartID] = this;
        return this;
    },
    loadConfig: function (config) {
        //加入时间测试
        defaultConfigMerage.call(this, config);
        this.firstDrawing(this.config);

    },
    firstDrawing: function (config) {

        //可以使用的组件列表,需要修改margin的组件请放在'xAxis','yAxis'前面
        var componentsList = ['title', 'tooltip', 'legend','brush', 'yAxis', 'xAxis', 'guides','resize'];
        var component, i = 0;
        this.components = {};
        this.charts = {};
        if (!config.series) {
            config.series = [];
            console.error('series is required in configuration');
        }
        while (component = componentsList[i++]) {
            if (!config[component] || this.components[component]) {
                continue;
            }
            var componentClass = xCharts.components[component];

            //特殊处理下axis
            if (component == 'xAxis' || component == 'yAxis') {
                componentClass = xCharts.components['axis'];
            }

            //容错处理
            if (!componentClass) {
                console.warn('components/%s.js is not loaded!', component.match(/Axis/) ? 'axis' : component);
                continue;
            }
            this.components[component] = new componentClass(this, config, component);

        }

        seriesColor(config.series, this);

        //计算折线图之类的charts实际可用空间
        this.width = this.originalWidth - this.margin.left - this.margin.right;
        this.height = this.originalHeight - this.margin.top - this.margin.bottom;

        //mainGroup设置偏移量
        this.main.attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
        //调用图表
        for (var i = 0, s; s = config.series[i++];) {
            var type = s.type;
            if (this.charts[type]) {
                //每个图表类只调用一次
                continue;
            }
            var chartClass = xCharts.charts[type];


            //容错处理
            if (!chartClass) {
                console.warn('charts/%s.js is not loaded!', type);
                continue;
            }

            this.charts[type] = new chartClass(this, config);
        }

        // 绘画结束,淡入动画
        // 去掉动画
        /*var transitionStr;
        if (this.config.animation.enable) {
            transitionStr = "width " + this.config.animation.animationTime + "ms linear";
        } else {
            transitionStr = "width " + 0 + "ms linear";
        }

        this.firstDrawingRect.style("transition", transitionStr);
        this.firstDrawingRect.style("width", this.originalWidth);

        // 动画结束后删掉clip-path
        var _this = this;
        setTimeout(function () {
            _this.svg.attr("clip-path", "");
        }, this.config.animation.animationTime + 100);*/
    },
    refresh: function (chartList, k) {
        //console.time("refresh time");
        //刷新产生的条件,预知
        //1 容器大小发生了改变，修正

        try {
            this.originalWidth = getWidth(this.container.node());
            this.originalHeight = getHeight(this.container.node());

            // 找不到容器
            if (isNaN(this.originalWidth) || isNaN(this.originalHeight)) {
                throw "container not found";
            }
            this.margin = xCharts.utils.copy(this.originMargin);

            this.svg.attr('width', this.originalWidth).attr('height', this.originalHeight);

            var animationTime = this.refreshAnimationTime;
            var animationEase = this.refreshAnimationEase;
            // var animationEase = d3.easeLinear;

            //第二步 通知已有组件刷新
            var components = this.components, charts = this.charts;
            for (var k in components) {
                if (components.hasOwnProperty(k)) {
                    var component = components[k];
                    component.refresh(animationEase, animationTime);
                }
            }

            this.width = this.originalWidth - this.margin.left - this.margin.right;
            this.height = this.originalHeight - this.margin.top - this.margin.bottom;

            //第三步 通知已有图表刷新
            for (var k in charts) {
                if (charts.hasOwnProperty(k)) {
                    var chart = charts[k];
                    chart.refresh(animationEase, animationTime);
                }
            }
        } catch(error) {
            if (typeof error === 'string'){
                delete chartList[k];
            } else{
                console.error(error.stack);
            }
        }

    },
    _updateSeries: function (series) {

        // TODO 开放这个功能

        this.config.series = xCharts.utils.copy(series, true);
        this.margin = xCharts.utils.copy(this.originMargin);
        //第一步 通知已有组件刷新
        var components = this.components, charts = this.charts;
        for (var k in components) {
            if (components.hasOwnProperty(k)) {
                var component = components[k];
                component.updateSeries(this.config.series);
            }
        }

        this.width = this.originalWidth - this.margin.left - this.margin.right;
        this.height = this.originalHeight - this.margin.top - this.margin.bottom;

        //第二步 通知已有图表刷新
        for (var k in charts) {
            if (charts.hasOwnProperty(k)) {
                var chart = charts[k];
                chart.updateSeries(this.config.series);
            }
        }
    },
    on: function (name, callback) {
        //契合D3，一个namespace只会有一个fn，后来的会使上面的fn失效
        //满足先到先响应的策略

        // 一个实例有且仅有一个Eventlist，多个实例直接互不干扰
        var list = this.EventList;

        //分割eventname和namespace 例如tooltipSectionChange.axis
        var arr = name.split('.');
        var eventName = arr[0];

        //如果用户不设置namecpace，默认为default
        var nameSpace = arr[1] ? arr[1] : 'default';

        list[eventName] || ( list[eventName] = []);

        //如果有相同的namespace，移除该事件
        for (var i = 0, l; l = list[eventName][i++];) {
            if (l.nameSpace == nameSpace) {
                list[eventName].splice(i - 1, 1);
                break;
            }
        }
        list[eventName].push({nameSpace: nameSpace, callback: callback})
    },
    /**
     * 触发某个事件
     * @param type 事件名称
     * @param ...args 事件参数
     */
    fire: function (type/*,...args*/) {
        var args = Array.prototype.slice.call(arguments, 1);
        var list = this.EventList[type];
        if (!list) return;
        list.forEach(function (l) {
            l.callback.apply('', args);
        })
    }
});


//和jquery类似，这样做new init的实例能访问到xCharts.prototype上的属性和方法
xCharts.prototype.init.prototype = xCharts.prototype;

//组件和图表控件的注册存放地
// 这样做xCharts可以知道哪些组件被用户引入方便调用
// 为以后支持模块引入做准备
xCharts.extend({
    //图表库
    charts: {
        extend: xCharts.extend
    },
    //组件库
    components: {
        extend: xCharts.extend
    },
    //工具库
    utils: {
        extend: xCharts.extend
    },
});


/**
 * 获取对应的css值
 * @param container 需要计算的元素
 * @param type css名称
 * @param boolean 是否运用parseFloat
 * @returns {*}
 */
function css(container, type, boolean) {
    var style = getComputedStyle(container);
    var value = style[type];

    return boolean ? parseFloat(value) : value;

}

/**
 * 获取传入dom的真实宽，在border-box模式下会去掉padding和border宽度
 * @param {DOM} container
 * @returns width
 */
function getWidth(container) {
    var width = css(container, 'width', true);
    if (css(container, 'boxSizing') !== 'border-box') {
        return width;
    }
    width = width - css(container, 'borderLeftWidth', true)
        - css(container, 'paddingLeft', true)
        - css(container, 'paddingRight', true)
        - css(container, 'borderRightWidth', true);
    return width;
}

/**
 * 获取传入dom的真实高，在border-box模式下会去掉padding和border高度
 * @param {DOM} container
 * @returns height
 */
function getHeight(container) {
    var height = css(container, "height", true);
    if (css(container, 'boxSizing') !== 'border-box') {
        return height;
    }
    height = height - css(container, 'borderTopWidth', true)
        - css(container, 'paddingTop', true)
        - css(container, 'paddingBottom', true)
        - css(container, 'borderBottomWidth', true);
    return height;
}

/**
 * 处理图表sereis的color
 * @param series
 */
function seriesColor(series, ctx) {
    var serieClassify = {}, getColor = ctx.getColor;
    series.forEach(function (serie) {
        var type = serie.type;
        serieClassify[type] = serieClassify[type] == undefined ?
            serieClassify[type] = [] :
            serieClassify[type];
        serieClassify[type].push(serie);
    });

    for (var k in serieClassify) {
        if (serieClassify.hasOwnProperty(k)) {
            switch (k) {
                case "line":
                case "scatter":
                case "bar":
                    serieClassify[k].forEach(function (serie, index) {
                        serie.idx = index;
                    });
                    break;
                case "pie":
                case "funnel":
                case "radar":
                    serieClassify[k].forEach(function (serie) {
                        serie.data.forEach(function (dataValue, index) {
                            dataValue.idx = index;
                        });
                    });
                    break;
                default :
                    console.error("type=%d not supported")
            }
        }
    }
}

/**
 * 合并一些全局性质的config
 * @param config
 */
function defaultConfigMerage(config) {
    //深复制config
    var utils = xCharts.utils;
    this.config = utils.copy(config, true);
    this.getColor = utils.getColor(config.color);

    // 如果动画效果关闭，设置animationTime=0即可
    if (!this.config.animation || !this.config.animation.enable) {
        this.config.animation = utils.copy(animationConfig);
        this.config.animation.animationTime = 0;
    } else {
        this.config.animation = utils.merage(utils.copy(animationConfig), this.config.animation);
    }
    // 是否展示峰值点，只有折线图设置有效
    if (!this.config.peekPoints || !this.config.peekPoints.enable) {
        this.config.peekPoints = utils.copy(peekPoints);
    }
    this.config.animation.animationEase = utils.stringToD3Ease(this.config.animation.animationEase);
}


/**
 * 解除上一个图表的绑定事件
 * @param container
 */
function removeBind(container) {
    var chartID = container.attr("xcharts-id");
    var chart = chartsList[chartID];
    chart.fire("chartRemoveBind");
    //删除引用
    delete chartsList[chartID];
}

/**
 * 判断是不是手机
 * @returns {boolean} true 是,false 不是
 */
function isMobile() {
    var userAgentInfo = navigator.userAgent;
    var Agents = ["Android", "iPhone",
        "SymbianOS", "Windows Phone",
        "iPad", "iPod"];
    var flag = true;
    for (var v = 0; v < Agents.length; v++) {
        if (userAgentInfo.indexOf(Agents[v]) > 0) {
            flag = false;
            break;
        }
    }
    return !flag;
}

/**
 * @var animation
 * @type Object
 * @description 动画参数
 * @extends xCharts
 * @default true
 */
var animationConfig = {
    /**
     * @var enable
     * @type Boolean
     * @description 是否开启动画
     * @extends xCharts.animation
     * @default false
     */
    enable: false,
    /**
     * @var animationTime
     * @type Number
     * @description 动画时间,单位ms
     * @extends xCharts.animation
     * @default 500ms
     */
    animationTime: 500,
    /**
     * @var animationEase
     * @type String
     * @description 动画类型,注意:暂时不支持配置
     * @extends xCharts.animation
     * @default easeLinear
     */
    animationEase: 'easeLinear'
};
/**
 * @var peekPoints
 * @type Object
 * @description 峰值属性，暂时只在折线图中支持
 * @default false
 * @extends xCharts.peekPoints
 */
var peekPoints ={
    /**
     * @var enable
     * @type boolean
     * @description 是否绘制峰值点
     * @extends xCharts.peekPoints.enable
     * @default false
     */
    enable: false
};

/**
 * Created by liuyang on 15/10/23.
 * 工具类
 */
(function (xCharts) {
    var utils = xCharts.utils;

    var toString = Object.prototype.toString;

    /**
     * isArguments之类的函数
     * @type {string[]}
     */
    var list = ['Arguments', 'Object', 'Array', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'];
    list.forEach(function (name) {
        utils['is' + name] = function (obj) {
            return toString.call(obj) === '[object ' + name + ']';
        };
    });
    /**
     * 类型返回函数
     * @param obj 判断对象
     * @returns {*} [object Xxxx];
     */
    utils['getType'] = function (obj) {
        var string = toString.call(obj);
        var type = string.match(/\[object\s(\w+?)\]/)[1];
        return type;
    };
    utils['copy'] = copy;
    utils['merage'] = merage;
    utils['inherits'] = inherits;
    utils['loop'] = loop;
    utils['getColor'] = getColor;
    utils['calcTextWidth'] = calcTextWidth;
    utils['throttle'] = throttle;
    utils['debounce'] = debounce;
    utils['toFixed'] = toFixed;
    utils['stringToD3Ease'] = stringToD3Ease;
    utils['peekPointOfDrop'] = peekPointOfDrop;

    /**
     * 复制函数
     * @param form 需要复制的对象
     * @param deep 是否深复制
     * @returns {*}
     */
    function copy(form, deep) {
        if (!form) return form;
        var type = utils.getType(form);
        if (type == "Object" || type == 'Array') {
            var clone = type == 'Object' ? {} : [];
            var value;
            for (var k in form) {
                if (form.hasOwnProperty(k)) {
                    value = form[k];
                    if (deep && ( utils.isObject(value) || utils.isArray(value) )) {
                        clone[k] = arguments.callee(value, true);
                    } else {
                        clone[k] = form[k];
                    }
                }
            }
            return clone;
        } else {
            return form;
        }
    }

    /**
     * 合并函数
     * @param to 被合并对象
     * @param form 来源
     */
    function merage(to, form) {
        var value;
        for (var k in form) {
            if (form.hasOwnProperty(k)) {
                value = form[k];
                if (utils.isObject(value)) {
                    to[k] = to[k] || {};
                } else if (utils.isArray(value)) {
                    to[k] = to[k] || [];
                } else {
                    //非数组和对象不处理
                    to[k] = form[k];
                    continue;
                }
                arguments.callee(to[k], form[k], true);
            }
        }
        return to;
    }

    //原型继承
    function inherits(clazz, baseClazz) {
        var clazzPrototype = clazz.prototype;

        function F() {
            this.superClass = baseClazz.prototype;
        }

        F.prototype = baseClazz.prototype;
        clazz.prototype = new F();

        clazz.constructor = clazz;
    }

    //内部迭代用，返回第一个参数
    function loop(arg) {
        return arg;
    }

    /**
     * @var color
     * @extends xCharts
     * @type Array
     * @description 全局color数组，如果设置会覆盖默认的颜色配置，系统会循环从数组中取色
     * @example
     *  [
     * '#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80',
     * '#8d98b3', '#e5cf0d', '#97b552', '#95706d', '#dc69aa',
     * '#07a2a4', '#9a7fd1', '#588dd5', '#f5994e', '#c05050',
     * '#59678c', '#c9ab00', '#7eb00a', '#6f5553', '#c14089'
     * ]
     */
    function getColor(palette) {

        if (!palette && !Array.isArray(palette)) {
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
     * 计算当前文字的长度，放入浏览器中计算
     * @param fontSize 文字大小
     * @param offsetWidth 需要追加的长度
     * @param {Array} list 需要计算的文字
     * TODO 引起了刷新抖动
     */
    function calcTextWidth(list, fontSize, offsetWidth, offsetHeight) {
        if (!Array.isArray(list)) {
            list = [list];
        }

        if (offsetWidth === undefined) {
            offsetWidth = 2;
        }

        if (offsetHeight === undefined) {
            offsetHeight = 2;
        }


        /**
         * 添加一个隐藏的span
         * 设置span的文字来获取文字在浏览器里实际的宽高
         */
        var textSpan = document.createElement('span');
        textSpan.style.fontSize = fontSize + 'px';

        // 需要设置字体，以为d3中生成的坐标值是这种字体，否则获取不准确
        textSpan.style.fontFamily = 'sans-serif';
        textSpan.style.margin = "0px";
        textSpan.style.padding = "0px";
        textSpan.style.border = "none";
        textSpan.style.position = 'absolute';
        textSpan.style.visibility = "hidden";
        document.body.appendChild(textSpan);

        var widthList = [], heightList = [];
        list.forEach(function (text) {

            // 给span设置文字
            textSpan.textContent = text;

            //获取实际宽度,并在实际宽度上加上偏移宽度
            var itemWidth = parseFloat(textSpan.offsetWidth) + offsetWidth;
            var itemHeight = parseFloat(textSpan.offsetHeight) + offsetHeight;
            widthList.push(itemWidth);
            heightList.push(itemHeight);
        });

        //移除这个span,因为用不到了
        document.body.removeChild(textSpan);
        return {
            widthList: widthList,
            heightList: heightList
        };
    }

    /*
     * 频率控制 返回函数连续调用时，fn 执行频率限定为每多少时间执行一次
     * @param fn {function}  需要调用的函数
     * @param delay  {number}    延迟时间，单位毫秒
     * @param immediate  {bool} 给 immediate参数传递false 绑定的函数先执行，而不是delay后后执行。
     * @return {function}实际调用函数
     */
    function throttle(fn, delay, immediate, debounce) {
        var curr = +new Date(),//当前事件
            last_call = 0,
            last_exec = 0,
            timer = null,
            diff, //时间差
            context,//上下文
            args,
            exec = function () {
                last_exec = curr;
                fn.apply(context, args);
            };
        return function () {
            curr = +new Date();
            context = this,
                args = arguments,
                diff = curr - (debounce ? last_call : last_exec) - delay;
            clearTimeout(timer);
            if (debounce) {
                if (immediate) {
                    timer = setTimeout(exec, delay);
                } else if (diff >= 0) {
                    exec();
                }
            } else {
                if (diff >= 0) {
                    exec();
                } else if (immediate) {
                    timer = setTimeout(exec, -diff);
                }
            }
            last_call = curr;
        }
    };

    /*
     * 空闲控制 返回函数连续调用时，空闲时间必须大于或等于 delay，fn 才会执行
     * @param fn {function}  要调用的函数
     * @param delay   {number}    空闲时间
     * @param immediate  {bool} 给 immediate参数传递false 绑定的函数先执行，而不是delay后后执行。
     * @return {function}实际调用函数
     */

    function debounce(fn, delay, immediate) {
        return throttle(fn, delay, immediate, true);
    }

    function toFixed(number,digit){
        return Math.round(number * Math.pow(10, digit)) / Math.pow(10, digit);
    }


    /**
     * 将字符串转化为d3 的缓存函数
     * @param ease
     * @returns {*}
     */
    function stringToD3Ease(ease){
        var d3Ease = d3[ease];
        if(d3Ease === undefined && utils.isString(ease)){
            console.warn('animation.animationEase='+ease+' is not defined');
            d3Ease = d3.easeLinear;
        }
        return d3Ease;
    }

    /**
     * 返回峰值图形
     * @params x{data} y{data}
     * @returns path {string}
     */
    function peekPointOfDrop(x, y) {
        var path;
            path = 'M' + x + ' ' + (y - 7) +
                'L' + (x - 7) + ' ' + (y - 14) +
                'A10 10, 0, 1, 1, ' + (x + 7) + ' ' + (y - 14) + 'Z';
        return path;

    }
}(xCharts));
/**
 * Created by liuyang on 15/10/27.
 */
(function (xCharts) {

    function Component(messageCenter, config, type) {
        this.messageCenter = messageCenter;
        this.config = config;
        this.type = type;
        this.main = messageCenter.main;
        this.margin = messageCenter.margin;
        this.svg = messageCenter.svg;
        this.div = messageCenter.div;
        this.mobileMode = messageCenter.mobileMode;
        //绘画三大周期
        this.start();

    }

    Component.prototype = {
        constructor: Component,
        start: function () {

            // 绘画三大周期函数,可以被重载
            // 计算绘画所需的数据
            this.init(this.messageCenter, this.config, this.type, this.config.series);
            var animationTime = this.messageCenter.config.animation.animationTime;
            var animationEase = this.messageCenter.config.animation.animationEase;
            // 绘制图形，第一个参数是动画类型，第二个是动画时间，这里初始化绘制统一交给动画组件进行，所以时间为0
            this.render(animationEase, animationTime);

            // 绑定相应的事件
            this.ready();
        },
        init: function (messageCenter, config, type) {
            //初始化
        },
        render: function (animationEase, animationTime) {
            //绘制
        },
        ready: function () {
            //绑定事件
        },
        refresh: function (animationEase, animationTime) {

            // 关闭显示的组件不进行刷新
            if (!this._show) return true;

            //当容器改变时，刷新当前组件
            this.margin = this.messageCenter.margin;//每次刷新时，重置margin
            this.originalHeight = this.messageCenter.originalHeight; //将变化后的宽高重新赋值
            this.originalWidth = this.messageCenter.originalWidth
            this.init(this.messageCenter, this.config, this.type, this.config.series);//初始化
            this.render(animationEase, animationTime);//刷新
        },
        updateSeries: function (series) {

            // 关闭显示的组件不更新数据
            if (!this._show) return true;

            //加载新数据
            this.init(this.messageCenter, this.config, this.type, series);//重新初始化
            this.render('linear', 0);//刷新
            this.ready();//绘画完成，重新绑定事件
        },
        on: function () {
            this.messageCenter.on.apply(this.messageCenter, arguments);
        },
        fire: function () {
            this.messageCenter.fire.apply(this.messageCenter, arguments);
        }
    }

    xCharts.components.extend({Component: Component});

}(xCharts));
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
/**
 * Author mzefibp@163.com
 * Date 16/6/21
 * Describe 坐标系里的辅助线
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    var Component = components['Component'];

    utils.inherits(guides, Component);
    components.extend({guides: guides});

    function guides(messageCenter, config, type) {
        //show=false时不做显示处理
        // 不是坐标系不显示
        if (config.guides.show === false || messageCenter.xAxisScale===undefined || messageCenter.yAxisScale===undefined) {
            this._show = false;
            return;
        } else {
            this._show = true;
        }

        //继承Component的属性
        Component.call(this, messageCenter, config, type);
    }

    guides.prototype.extend = utils.extend;

    guides.prototype.extend({
        init: function () {
            this.guidesConfig = utils.merage(defaultConfig(), this.config.guides);
        },
        render: function () {
            __renderLine.call(this);
            __renderBox.call(this);
        },
        ready: function () {
            if (this.mobileMode) {
                this.mobileReady();
            } else {
                // 绑定到div上
                this.div.on('mousemove.scatter', assitLineTrigger(this));
            }
        }
    });

    /**
     * 绘出xy线
     * @private
     */
    function __renderLine() {
        var guidesConfig = this.guidesConfig;
        var xLine = this.svg.selectAll('line.xc-scatter-line-x').data([this]);
        xLine = xLine.enter().append('line')
            .attr('class', 'xc-scatter-line-x')
            .style('pointer-events', 'none')
            .attr('stroke-width',guidesConfig.lineStyle.width)
            .attr('stroke',guidesConfig.lineStyle.color)
            .attr('stroke-dasharray',guidesConfig.lineStyle.dasharray)
            .merge(xLine);

        var yLine = this.svg.selectAll('line.xc-scatter-line-y').data([this])
        yLine = yLine.enter().append('line')
            .attr('class', 'xc-scatter-line-y')
            .style('pointer-events', 'none')
            .attr('stroke-width',guidesConfig.lineStyle.width)
            .attr('stroke',guidesConfig.lineStyle.color)
            .attr('stroke-dasharray',guidesConfig.lineStyle.dasharray)
            .merge(yLine)


        this.width = this.messageCenter.originalWidth - this.margin.left - this.margin.right;
        this.height = this.messageCenter.originalHeight - this.margin.top - this.margin.bottom;

        var x1 = this.margin.left;
        var x2 = this.margin.left + this.width;
        var y1 = this.margin.top;
        var y2 = this.height + y1;
        xLine.attr('x1', x1)
            .attr('x2', x1)
            .attr('y1', y1)
            .attr('y2', y2)
            .style('display', 'none')

        yLine.attr('x1', x1)
            .attr('x2', x2)
            .attr('y1', y1)
            .attr('y2', y1)
            .style('display', 'none')

        this.xLine = xLine;
        this.yLine = yLine;
    }

    /**
     * 插入文字容器
     * @private
     */
    function __renderBox() {
        var guidesConfig = this.guidesConfig;
        var textBox = this.svg.selectAll('text.xc-scatter-assitline')
            .data([this])
            .enter()
            .append('text')
            .attr('class', 'xc-scatter-assitline')
            .attr('text-anchor', 'left');
        var textSpan = textBox.selectAll('tspan.xc-span').data([this]).enter().append('tspan')
            .attr('class', 'xc-span')
            .attr('fill',guidesConfig.textStyle.color)
            .attr('font-size',guidesConfig.textStyle.fontSize)

        this.textBox = textBox;
        this.textSpan = textSpan;
    }

    guides.assitLineTrigger = assitLineTrigger;

    function assitLineTrigger(ctx) {
        var textSpan = ctx.textSpan;
        var textBox = ctx.textBox;
        var margin = ctx.margin;
        var yScale = ctx.messageCenter.yAxisScale[0];
        var xScale = ctx.messageCenter.xAxisScale[0];
        var xLine = ctx.xLine;
        var yLine = ctx.yLine;
        var xFormat = ctx.guidesConfig.textStyle.xFormat;
        var yFormat = ctx.guidesConfig.textStyle.yFormat;
        return function () {
            
            if(xScale.scaleType !== 'value' || yScale.scaleType !== 'value'){
                // 辅助线必须在坐标轴都是value的情况下生效
                return;
            }
            
            var position = d3.mouse(ctx.svg.node());
            if (!judgeOutBoundary(ctx, position)) {
                xLine.style('display', 'none');
                yLine.style('display', 'none');
                textBox.style('display', 'none');
                return false;
            }
            var x = position[0] - margin.left;
            var y = position[1] - margin.top;

            var xValue = xScale.invert(x).toFixed(2);
            var yValue = yScale.invert(y).toFixed(2);

            textBox.style('display', 'block');
            textSpan.text(xFormat(xValue) + ',' + yFormat(yValue));

            xLine.attr('x1', position[0])
                .attr('x2', position[0])
                .style('display', 'block');
            yLine.attr('y1', position[1])
                .attr('y2', position[1])
                .style('display', 'block');

            // 文字向上偏移
            position[1] -= 10;
            position[0] += 10;
            textBox.attr('transform', 'translate(' + position.join(',') + ')');
        }
    }

    /**
     * 判断超出边界,边界以坐标轴为准
     * @param ctx 上下文this
     * @param position 当前鼠标坐标
     * @return {boolean} true:未超出边界,false超出边界
     */
    function judgeOutBoundary(ctx, position) {
        var x1 = ctx.margin.left;
        var x2 = ctx.margin.left + ctx.width;
        if (position[0] <= x1 || position[0] >= x2) {
            return false;
        }

        var y1 = ctx.margin.top;
        var y2 = ctx.margin.top + ctx.height;

        if (position[1] <= y1 || position[1] >= y2) {
            return false;
        }

        return true;
    }

    function defaultConfig() {
        /**
         * guides配置项
         * @var guides
         * @type Object
         * @extends xCharts
         * @description 辅助线配置项,注意只有在坐标系存在的情况下才存在
         */
        return {
            /**
             * @var show
             * @type Boolean
             * @extends xCharts.guides
             * @default true
             * @description 控制辅助线是否显示
             */
            show: true,
            /**
             * @var lineStyle
             * @type Object
             * @extends xCharts.guides
             * @description 两条直线样式控制
             */
            lineStyle: {
                /**
                 * @var color
                 * @type String
                 * @extends xCharts.guides.lineStyle
                 * @default '#a2a2a2'
                 * @description 辅助线颜色
                 */
                color: '#a2a2a2',
                /**
                 * @var width
                 * @type Number
                 * @extends xCharts.guides.lineStyle
                 * @default '#a2a2a2'
                 * @description 辅助线宽度
                 */
                width: 1,
                /**
                 * @var dasharray
                 * @type Number
                 * @extends xCharts.guides.lineStyle
                 * @default 5
                 * @description 数字越大,虚线越长
                 */
                dasharray: 5
            },
            /**
             * @var textStyle
             * @type Object
             * @extends xCharts.guides
             * @description 文字样式控制
             */
            textStyle: {
                /**
                 * @var color
                 * @type String
                 * @extends xCharts.guides.textStyle
                 * @default '#a2a2a2'
                 * @description 文字颜色
                 */
                color: '#a2a2a2',
                /**
                 * @var fontSize
                 * @type Number
                 * @extends xCharts.guides.textStyle
                 * @default 14
                 * @description 文字大小
                 */
                fontSize: 14,
                /**
                 * @var xFormat
                 * @type Function
                 * @extends xCharts.guides.textStyle
                 * @default Loop
                 * @description x轴文字格式化
                 */
                xFormat: utils.loop,
                /**
                 * @var yFormat
                 * @type Function
                 * @extends xCharts.guides.textStyle
                 * @default Loop
                 * @description y轴文字格式化
                 */
                yFormat:  utils.loop,
            }
        }
    }

}(xCharts, d3));
/**
 * Author liuyang46@meituan.com
 * Date 16/5/27
 * Describe 辅助线,移动端
 */

(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    var guides = components.guides;

    guides.prototype.extend({
        mobileReady: function () {
            var moveEvent = guides.assitLineTrigger(this);
            this.div.on('touchmove.scatter',moveEvent);
            this.div.on('touchstart.scatter',moveEvent);
        }
    });
}(xCharts, d3));

/**
 * Author liuyang46@meituan.com
 * Date 16/3/9
 * Describe
 */


(function(xCharts,d3){


    var utils = xCharts.utils;
    var components = xCharts.components;
    utils.inherits(resize, components['Component']);
    components.extend({resize: resize});

    var chartList={};

    d3.select(window).on('resize.refresh', function () {
        for(var k in chartList){
            if(chartList.hasOwnProperty(k)){
                chartList[k].resize(chartList, k);
            }
        }
    });

    function resize(messageCenter, config, type) {
        if(config.resize.enable) components['Component'].call(this, messageCenter, config, type);
    }

    resize.prototype.extend = xCharts.extend;

    resize.prototype.extend({
        init:function(messageCenter, config, type, series){
            this.config = utils.merage(defaultConfig(),config[type]);

            this.config.animationEase = utils.stringToD3Ease(this.config.animationEase);

            messageCenter.refreshAnimationEase = this.config.animationEase;
            messageCenter.refreshAnimationTime = this.config.animationTime;
        },
        ready:function(){

            // 绑定刷新事件
            d3.select(window)

            // 比动画时间多1S
            var _this = this,
                animationTime = _this.config.animationTime;


            var resizeFn = utils.debounce(function(chartList, k){
                _this.messageCenter.refresh(chartList, k);
            },animationTime+300,true);

            _this.resize = resizeFn;

            add(_this);

            _this.on("chartRemoveBind",function(){
                _this.unBind();
            })
        },
        unBind:function(){
            remove(this);
        },
        refresh:function(){},
        updateSeries:function(){}
    });

    function add(ctx){
        chartList[ctx.messageCenter.id] = ctx;
    }

    function remove(ctx){
        delete chartList[ctx.messageCenter.id];
    }

    function defaultConfig() {
        /**
         * @var resize
         * @type Object
         * @description 当容器改变时，是否自动刷新当前图表
         * @extends xCharts
         * @default true
         */
        var config = {
            /**
             * @var refresh
             * @type Boolean
             * @description 当容器改变时，是否自动刷新当前图表
             * @extends xCharts.resize
             * @default false
             */
            enable:false,
            /**
             * @var animationEase
             * @type String
             * @description 当容器改变时，刷新动画
             * @extends xCharts.resize
             * @default 'easeLinear'
             */
            animationEase:'easeLinear',
            /**
             * @var animationEase
             * @type Number
             * @description 当容器改变时，刷新动画时间,单位ms
             * @extends xCharts.resize
             * @default 300
             */
            animationTime:300
        }
        return config;
    }


}(xCharts,d3));
/**
 * Author mzefibp@163.com
 * Date 16/6/23
 * Describe 时间轴刷子
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    var Component = components['Component'];

    utils.inherits(brush, Component);
    components.extend({brush: brush});

    function brush(messageCenter, config, type) {
        //show=false时不做显示处理
        // 不是坐标系不显示
        if (config.brush.show === false) {
            this._show = false;
            return;
        } else {
            this._show = true;
        }

        //继承Component的属性
        Component.call(this, messageCenter, config, type);
    }

    brush.prototype.extend = utils.extend;

    brush.prototype.extend({
        init: function (messageCenter, config) {
            // 先占位,等坐标轴完成后再绘制时间刷

            this.messageCenter.brush = true;

            this.brushConfig = utils.merage(defaultConfig(), config.brush);

            this.margin.bottom += this.brushConfig.brushHeight + 20;

            var messageCenter = this.messageCenter;
            this.width = messageCenter.originalWidth - messageCenter.margin.left - messageCenter.margin.right; //计算剩余容器宽
        },
        render: function () {

            var brush = d3.brushX();

            brush.extent(initExtent(this));

            // brush.handleSize(50)

            var translateX = 0;
            var translateY = this.messageCenter.originalHeight - this.margin.bottom;
            var width = this.messageCenter.originalWidth - this.margin.left - this.margin.right;
            var height = this.messageCenter.originalHeight - this.margin.top - this.margin.bottom;

            var group = this.main.selectAll('g.xc-brush').data([this]);
            group = group.enter().append('g')
                .attr('class', 'xc-brush')
                .merge(group);

            group.attr('transform', 'translate(' + translateX + ',' + translateY + ')')
                .call(brush);


            brush.move(group, initMove(this));
            // group.selectAll('rect.background')
            //     .style('visibility', 'visible')
            //     .attr('fill', '#e0e0e0')
            //     .attr('opacity', 0.5)
            //
            // group.selectAll('rect')
            //     .attr('height', 25)
            //     .attr('fill', '#e0e0e0');
            //
            // group.selectAll('.resize rect')
            //     .style('visibility', 'visible')
            //     .attr('fill', '#a2a2a2')
            //     .attr('width', 10);

            group.selectAll('rect.overlay')
                .attr('fill', '#e0e0e0')
                .attr('opacity', 0.5);

            group.selectAll('rect.handle')
                .attr('fill', '#777');

            this.brush = brush;

            //添加clipath路径
            var defGroup = this.svg.selectAll('defs').data([this]);
            defGroup = defGroup.enter().append('defs').merge(defGroup);

            var clip = defGroup.selectAll('clipPath#xc-clip-main-path').data([this]);
            clip = clip.enter().append("clipPath").attr('id', 'xc-clip-main-path').merge(clip);

            var rect = clip.selectAll('rect').data([this]);
            rect = rect.enter().append('rect').merge(rect);
            rect.attr('width', width)
                .attr('height', height);

        },
        ready: function () {
            var brush = this.brush;
            var brushChangeBind = brushChange(this);
            this.brush.on('brush', brushChangeBind);

            // TODO 这里有问题,需要监听两个axis事件,什么时候梳理一下
            this.on('xAxisRender.brush', function () {
                // 手动通知别人刷新一次
                this.fire('brushChange', this.initBrushSelection);
            }.bind(this));

            this.on('xAxisReady.brush', function () {
                // 手动通知别人刷新一次
                this.fire('brushChange', this.initBrushSelection);
            }.bind(this));
        },
        refresh:function(animationEase, animationTime){

            // 关闭显示的组件不进行刷新
            if (!this._show) return true;

            //当容器改变时，刷新当前组件
            this.margin = this.messageCenter.margin;//每次刷新时，重置margin
            this.originalHeight = this.messageCenter.originalHeight; //将变化后的宽高重新赋值
            this.originalWidth = this.messageCenter.originalWidth
            this.init(this.messageCenter, this.config, this.type, this.config.series);//初始化
            this.render(animationEase, animationTime);//刷新
            this.ready();
        }
    });

    function initMove(ctx) {
        var min = parseFloat(ctx.brushConfig.domain[0]);
        var max = parseFloat(ctx.brushConfig.domain[1]);

        if (isNaN(min) || isNaN(max)) {
            console.warn('brush.domain is not percentage value', ctx.brushConfig.domain);
            return [0, 0];
        }

        var width = ctx.width;

        var initMove = [
            width * min / 100,
            width * max / 100
        ];

        ctx.initBrushSelection = [
            utils.toFixed(initMove[0] / width, 3),
            utils.toFixed(initMove[1] / width, 3)
        ];

        return initMove;
    }

    function brushChange(ctx) {
        var width = ctx.width;
        return function () {
            var domain = d3.event.selection;
            var min = utils.toFixed(domain[0] / width, 3);
            var max = utils.toFixed(domain[1] / width, 3);

            ctx.fire('brushChange', [min, max]);
        };

        // console.log(domain)

        // this.fire('brushChange',domain);
    }


    // 设置时间刷初始值
    function initExtent(ctx) {
        return [[0, 0], [ctx.width, ctx.brushConfig.brushHeight]]
    }

    function defaultConfig() {

        /**
         * brush配置项
         * @var brush
         * @type Object
         * @extends xCharts
         * @description 时间轴特有的时间刷
         */
        return {
            /**
             * @var show
             * @type Boolean
             * @extends xCharts.brush
             * @default true
             * @description 控制时间刷是否显示。注意时间刷只会在axis.type=time的情况下才会起作用
             */
            show: true,
            /**
             * @var domain
             * @type Array
             * @extends xCharts.brush
             * @default ['90%','100%']
             * @description 设置时间刷的初始值,只支持百分比的形式
             */
            domain: ['90%', '100%'],
            /**
             * @var brushHeight
             * @type Number
             * @extends xCharts.brush
             * @default 30
             * @description 设置时间刷的高
             */
            brushHeight: 30
        }
    }

}(xCharts, d3));
/**
 * xCharts.legend
 * extends Component
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    var Component = components['Component'];

    utils.inherits(legend, Component);
    components.extend({legend: legend});

    function legend(messageCenter, config, type) {

        //show=false时不做显示处理
        if (config.legend.show === false) {
            this._show = false;
            return;
        } else {
            this._show = true;
        }

        Component.call(this, messageCenter, config, type);
    }

    legend.prototype.extend = xCharts.extend;
    legend.prototype.extend({
        init: function (messageCenter, config) {

            // 配合tooltip显示
            messageCenter.lengendChange = false;

            // 合并默认配置项
            this.legendConfig = utils.merage(defaultConfig(), config.legend);

            this.legendSeries = parseSeries(config.series, this.legendConfig.data, messageCenter);
            this.originalHeight = messageCenter.originalHeight;
            this.originalWidth = messageCenter.originalWidth
            this.width = this.originalWidth - this.margin.left - this.margin.right;
            this.height = this.originalHeight - this.margin.top - this.margin.bottom;

            //计算位置
            this.groupPosition = calcPosition.call(this);

        },
        render: function () {
            var _this = this,
                fontSize = _this.legendConfig.item.fontSize,
                chartSize = _this.legendConfig.item.chartSize,
                itemHeight = fontSize > chartSize ? fontSize : chartSize,
                color = _this.legendConfig.item.color,
                groupPosition = _this.groupPosition;

            // 添加g.xc-legend-group
            var legendGroup = _this.svg.selectAll('.xc-legend-group')
                .data([_this]);
            legendGroup = legendGroup.enter().append('g')
                .attr('class', 'xc-legend-group')
                .merge(legendGroup);

            // 设置group的偏移值
            legendGroup.attr('transform', "translate(" + groupPosition + ")");

            // 添加每个legendItemGroup
            var itemList = legendGroup.selectAll('.xc-legend-item')
                .data(_this.legendSeries);

            itemList = itemList.enter().append('g')
                .attr("class", "xc-legend-item")
                .merge(itemList);

            // 如果动态更新数据时可能会出现item减少的情况，这里去掉多余的
            itemList = itemList.exit().remove()
                .merge(itemList);

            itemList.attr('transform', function (serie) {

                // 这里保存点击状态，默认选中
                // 为了刷新时只刷新位置，选中状态不变化

                if (this.isChecked === undefined) {
                    this.isChecked = serie.isChecked;
                }

                // this.isChecked = this.isChecked == undefined ?
                //     true : this.isChecked;

                return 'translate(' + serie.position + ')';
            })
                .attr('fill', color)
                .attr('opacity', function () {
                    return this.isChecked ?
                        1 : _this.legendConfig.item.opacity;
                });

            //因为事件是绑定在g上，所以里面的path和text可以删掉节约代码
            itemList.html("");
            //添加文字
            itemList.append('text')
                .attr('x', chartSize * 1.1)
                .attr('y', function () {
                    return 0.325 * chartSize + 0.25 * fontSize;
                })
                .append('tspan')
                .text(function (serie) {
                    return serie.name;
                })
                .attr('font-size', fontSize);


            //添加图案
            // var legendPathD={};
            // itemList.append('path')
            //     .attr('d', function (serie) {
            //
            //         //这里新添一个图表需要在这里添加自己独特的图案路径
            //         if (!pathD[serie.type]) {
            //             throw new Error("pathD." + serie.type + " not found")
            //         }
            //
            //         // 节约性能，因为图例的大小都是统一的，计算一次就够了
            //         if(!legendPathD[serie.type])  legendPathD[serie.type]=pathD[serie.type](chartSize, itemHeight);
            //
            //         return legendPathD[serie.type];
            //     })
            //     .attr('stroke', function (serie) {
            //         return serie.color;
            //     })
            //     .attr('fill', function (serie) {
            //         return serie.color;
            //     });

            itemList.append('rect')
                .attr('width', chartSize * 0.9)
                .attr('height', chartSize * 0.5)
                .attr('rx', chartSize * 0.1)
                .attr('ry', chartSize * 0.1)
                .attr('stroke', function (serie) {
                    return serie.color;
                })
                .attr('fill', function (serie) {
                    return serie.color;
                })
                .style('transform', function () {

                });

            _this.itemList = itemList;
        },
        ready: function () {
            var _this = this,
                config = _this.legendConfig,
                hoverColor = config.item.hoverColor,
                defaultColor = config.item.color,
                multiple = config.selectedMode != 'single',
                opacity = config.item.opacity;


            var nameList = multiple ?
                this.legendSeries.map(function (serie) {
                    return serie.name;
                }) : [];


            if (_this.mobileMode) {
                _this.mobileReady(nameList, opacity);
            } else {

                /**
                 * 点击legend事件
                 * 有多选和单选模式，
                 * 多选模式下，初始状态是全部选中，点击某一个legend，状态翻转
                 * 单选模式下，初始状态是全部选中，第一次点击某一个legend这个legend保持高亮，其他取消选中。这种模式下除了初始状态，其他都是有且仅有一个legend处于选中状态
                 * 刷新图例状态，触发legendClick事件
                 */
                _this.itemList.on('click.legend', legendMouseClick(this, nameList, opacity));

                /**
                 * 鼠标移入，高亮对应的图表
                 * 触发legendMouseenter
                 */
                _this.itemList.on('mouseenter.legend', function (data) {
                    var color;
                    if (hoverColor == 'auto')
                        color = data.color;
                    else
                        color = hoverColor;
                    var item = d3.select(this);
                    item.attr('fill', color);
                    _this.fire('legendMouseenter', data.name);
                });

                /**
                 * 鼠标移除，移除高亮状态
                 * 触发 legendMouseleave
                 */
                _this.itemList.on('mouseleave.legend', function (data) {
                    var item = d3.select(this);
                    item.attr('fill', defaultColor);

                    _this.fire('legendMouseleave', data.name);
                });
            }


        }
    });

    legend.legendMouseClick = legendMouseClick;

    function legendMouseClick(ctx, nameList, opacity) {

        return function (data) {

            // legend点击事件失效状态
            if (ctx.legendConfig.clickable === false) {
                return true;
            }

            // 通知tooltip,legend有操作
            ctx.messageCenter.lengendChange = true;

            this.isChecked = !this.isChecked;
            if (multiple) {
                //多选的情况下
                d3.select(this).attr('opacity', this.isChecked ? 1 : opacity)
            } else {
                // 单选，高亮自己，灰掉别人
                this.itemList.attr('opacity', opacity);
                d3.select(this).attr('opacity', 1);
            }

            reload.call(ctx, data.name, multiple, nameList, ctx.legendSeries);
        }
    }

    /**
     * 分两种模式处理刷新
     * 传递给接受者一个 name的数组
     * todo namelist 可以不用传了
     * @param name
     */
    function reload(name, multiple, nameList, series) {
        nameList = [];
        if (multiple) {
            //如果存在则删除，不存在则从_series中拿出添加
            // var isAdd = true;
            // for (var i = 0, s; s = nameList[i++];) {
            //     if (s == name) {
            //         nameList.splice(i - 1, 1);
            //         isAdd = false;
            //         break;
            //     }
            // }
            // if (isAdd)
            //     nameList.push(name);
            series.forEach(function (serie) {

                if (serie.name === name) {
                    serie.isChecked = !serie.isChecked;
                }

                if (serie.isChecked === true) {
                    nameList.push(serie.name)
                }
            });


            if (nameList.length == 0) this.fire('tooltipNone');
            else this.fire('tooltipShow');

        } else {
            nameList = [name];
        }

        this.fire('legendClick', nameList);
    }


    /**
     * 计算每一个serie的位置，并根据配置计算返回group位置
     * 此函数会根据计算结果修改margin的值
     * @returns {Array} 返回g.xc-legend-group 的xy位置
     */
    function calcPosition() {
        var _this = this,
            config = _this.legendConfig,
            series = _this.legendSeries,
            itemGap = config.itemGap,
            width = _this.width,
            height = _this.height,
            fontSize = _this.legendConfig.item.fontSize,
            chartSize = _this.legendConfig.item.chartSize,
            itemHeight = fontSize > chartSize ? fontSize : chartSize,
            configX = config.x,
            configY = config.y,
            orient = config.orient,
            margin = _this.margin,
            originalWidth = _this.originalWidth;


        var offsetLength = config.item.chartSize * 1.1;
        var nameList = series.map(function (serie) {
            return serie.name;
        });

        //计算name的长度
        var widthList = utils.calcTextWidth(nameList, config.item.fontSize, offsetLength).widthList;

        // 计算每个legendSerie的x,y位置
        var totalWidth = 0, totoalHeight = 0, maxWidth = 0, maxHeight = 0, colWidth = 0;
        series.forEach(function (serie, index) {

            var itemWidth = widthList[index];
            serie.position = [totalWidth, totoalHeight];

            if (orient != 'vertical') {
                //水平布局的情况
                totalWidth += itemWidth + itemGap;

                // 如果当前行的宽度已经大于当前可绘画区域的最大宽度，进行换行
                if ((totalWidth - itemGap) > width) {
                    maxWidth = width;
                    totalWidth = 0;
                    totoalHeight += itemHeight * 1.1;//加上高度的0.1的偏移量做分割

                    // 需要把当前的serie重新设置位置
                    serie.position = [totalWidth, totoalHeight];

                    totalWidth = itemWidth + itemGap;
                }
            } else {
                //垂直布局

                // 一列的宽度取决于当前列所有元素的最大宽度
                colWidth = d3.max([colWidth, itemWidth]);
                totoalHeight += itemHeight + itemGap;

                // 一列已经超过最大高度，起一列新列
                if (totoalHeight > height) {
                    maxHeight = height;
                    totoalHeight = 0;
                    totalWidth += colWidth * 1.1;
                }
            }

        });

        var posX, posY, gap = 30;
        maxWidth = maxWidth ? maxWidth : totalWidth; // 只有一行时，maxWidth为0，取totalWidth为这一行的宽度，高度同理
        maxHeight = maxHeight ? maxHeight : totoalHeight;

        if (orient != 'vertical') {
            maxHeight += itemHeight;//最后一行高度未算到
            if (configX == 'right')
                posX = originalWidth - margin.right - maxWidth;
            else if (configX == 'center')
                posX = (width - maxWidth) / 2 + margin.left;
            else
                posX = margin.left;//left

            if (configY == "top") {
                posY = margin.top;
                margin.top += totoalHeight + gap;
            }
            else {
                posY = height - totoalHeight + margin.top;
                margin.bottom += totoalHeight + gap;
            }
        } else {
            maxWidth += colWidth;//最后一列的宽度未算到
            if (configX == 'right') {
                posX = originalWidth - margin.right - maxWidth;
                margin.right += maxWidth + gap;
            } else {
                posX = 0;
                margin.left += maxWidth + gap;
            }

            if (configY == 'center') {
                posY = (height - maxHeight) / 2 + margin.top;
            } else if (configY == 'bottom') {
                posY = (height - maxHeight) + margin.top;
            }
            else
                posY = margin.top;
        }
        return [posX, posY]
    }


    /**
     * 对不同图表类型的serie进行提取成legendSereis统一类型
     * @param series
     * @param data
     * @param messageCenter
     * @param config
     * @returns {Array}
     */
    function parseSeries(series, data, messageCenter) {
        //首先对series按照类型分类，方便针对不同的chart做不同的处理
        var seriesClassify = {}, legendSeries = [];

        // 对series按照type类型进行分类,
        // 这里是为后续的多图联动做铺垫
        series.forEach(function (serie) {
            var type = serie.type;
            if (!type) return;
            seriesClassify[type] || (seriesClassify[type] = []);
            seriesClassify[type].push(serie);
        });


        for (var type in seriesClassify)
            if (seriesClassify.hasOwnProperty(type)) {
                var parseFn = speciallyParseFn(type);
                if (parseFn) legendSeries = legendSeries.concat(parseFn(seriesClassify[type], data, messageCenter));
            }

        //多图表共存时，需要对legendList的name去重，否则会出现name一样，legend图例颜色不一样的情况

        legendSeries.forEach(function (serie) {
            // 如果legendShow === false,legend默认不显示
            serie.isChecked = serie.legendShow === false ? false : true;
        })

        return legendSeries;
    }

    /**
     * 请返回一个Array
     * 其实就是加入了一个color属性，顺便把idx加上了
     * // TODO 不支持name重复问题，待解决
     */
    function speciallyParseFn(type) {
        switch (type) {
            case "radar":
            case "funnel":
            case "pie":
                return multiple;
                break;
            default:
                return defaultParse;
        }
    }

    /**
     * 处理饼图和雷达图之类，一个serie里面包括多个legend实例
     * @param series
     * @param data
     * @param messageCenter
     */
    function multiple(series, data, messageCenter) {
        var legendList = [];
        series.forEach(function (serie) {
            var nameIdx = {}, colorIdx = 0, type = serie.type;
            serie.data.forEach(function (d) {
                var name = d.name, dIdx;

                // 防止重复的名字出现
                if (nameIdx[name] == undefined) {
                    nameIdx[name] = colorIdx;
                    dIdx = colorIdx;
                } else {
                    // 重复出现的名字赋予同一种颜色
                    dIdx = nameIdx[name];
                }
                d.idx = dIdx;

                if (valueInArray(name, data)) {
                    d.color = messageCenter.getColor(dIdx);

                    //携带type类型，后面绘制legend图例有需要
                    d.type = type;
                    legendList.push(d);
                }

                colorIdx++;
            });
        });
        return legendList;
    }

    /**
     * 默认转化规则，适合折线图这种一个serie对象一个图形的图表
     * @param series
     * @param data
     * @param messageCenter
     * @returns {Array}
     */
    function defaultParse(series, data, messageCenter) {
        var dataInSeries = [], getColor = messageCenter.getColor;
        series.forEach(function (serie, idx) {
            if (serie.idx === undefined) serie.idx = idx;

            //name出现在legend.data中
            if (valueInArray(serie.name, data)) {

                // TODO  这里只有折线图可用，等把其他图表的源码看完后回来修改
                if (serie.lineStyle && serie.lineStyle.color !== 'auto')
                    serie.color = serie.lineStyle.color;
                else
                    serie.color = getColor(idx);

                dataInSeries.push(serie);
            }
        });
        return dataInSeries;
    }

    /**
     * array[i]===value or array[i][key]===value
     * @param value
     * @param array
     * @param key
     */
    function valueInArray(value, array, key) {
        for (var i = 0, a; a = array[i++];) {
            if (key && a[key] === value) return a;
            else if (a === value) return a;
        }
        return false;
    }

    var pathD = {
        'line': getLinePath,
        'radar': getRadarPath,
        'pie': getScatterPath,
        'scatter': getScatterPath,
        'funnel': getFunnelPath,
        'bar': getBarPath,
    }

    /**
     * 折线图图例
     * @param size 正方形 宽度
     * @returns {string} -o-
     */
    function getLinePath(size, itemHeight) {
        var r = size / 6, h = itemHeight / 2;
        var ret = 'M0,' + h + 'L' + 2 * r + ',' + h;
        ret += 'A' + r + ',' + r + ' 0 1 1 ' + 2 * r + ',' + (h + 0.00001);
        ret += 'M' + 4 * r + ',' + h + 'L' + 6 * r + ',' + h;
        return ret;
    }

    /**
     * 散点图图例,饼图图例
     * @param size  宽度
     * @returns {string} 圆圈 O
     */
    function getScatterPath(size) {
        var r = size;
        var ret = 'M0,' + 0.5 * r + ' A' + r / 2 + ',' + r / 2 + ' 0 1 1 0,' + (0.5 * r + 0.001);
        return ret;
    }

    /**
     * 六边形
     * @param size
     */
    function getRadarPath(size) {
        var r = size / 2, rad = Math.PI / 180 * 30;
        var x0 = 0, y0 = -r,
            x1 = Math.cos(rad) * r, y1 = Math.sin(rad) * (-r);
        var position = [], ret = "";
        position[0] = [x0, y0], position[1] = [x1, y1], position[2] = [x1, -y1], position[3] = [x0, -y0], position[4] = [-x1, -y1], position[5] = [-x1, y1];
        position.forEach(function (p) {
            //修正坐标
            p[0] += r;
            p[1] += r;
            if (!ret) {
                ret += 'M';
            } else {
                ret += 'L';
            }
            ret += p;
        });
        ret += 'z';
        return ret;

    }

    function getFunnelPath(size) {
        var offset = size / 10;
        return 'M0,' + offset + ' L' + size + ',' + offset + ' L' + size * 0.5 + ',' + size
    }

    function getBarPath(size) {
        var leftTop = [0, size / 4],
            rightTop = [size, size / 4],
            rightBottom = [size, size / 4 * 3],
            leftBottom = [0, size / 4 * 3]
        return 'M' + leftTop + ' L' + rightTop + 'L' + rightBottom + 'L' + leftBottom + 'z';
    }

    function defaultConfig() {
        /**
         * @var legend
         * @extends xCharts
         * @type Object
         */
        var legend = {
            /**
             * @var show
             * @type Boolean
             * @extends xCharts.legend
             * @default false
             * @description 是否显示图例(legend)
             */
            show: false,
            /**
             * @var orient
             * @type String
             * @extends xCharts.legend
             * @default 'horizontal'
             * @values 'horizontal'| 'vertical'
             * @description 图例是水平排列还是垂直排列
             */
            orient: 'horizontal',
            /**
             * @var x
             * @type String
             * @extends xCharts.legend
             * @default 'left'
             * @valuse 'left'|'center'|'right'
             * @description 水平布局时支持'left','center','right';垂直布局时支持'left','right'
             * @description 注：center只在图例只有一行有效，多行第二行开始会自动从最左边开始排
             */
            x: 'center',
            /**
             * @var y
             * @type String
             * @extends xCharts.legend
             * @default 'bottom'
             * @valuse 'top'|'bottom'
             * @description 水平布局时支持'top','bottom',垂直布局无效
             */
            y: 'bottom',
            /**
             * @var itemGap
             * @extends xCharts.legend
             * @type Number
             * @default 10
             * @description 图例与图例之间的间距，单位是像素。水平布局时是水平之间的间距，垂直是上下之间的间距
             */
            itemGap: 10,
            /**
             * @var formatter
             * @type Function
             * @extends xCharts.legend
             * @description 传入data中的每一个name值，返回一个以供显示的字符串
             * @default 默认不处理
             * @example
             *  function(name){
             *      return name+'%'
             *  }
             */
            formatter: function (name) {
                return name;
            },
            /**
             * @var selectedMode
             * @type String
             * @default 'multiple'
             * @extends xCharts.legend
             * @description 选择模式，multiple表示可以同时存在多个选中状态，single表示同一时间只能一个被选中
             * @values 'multiple'|'single'
             */
            selectedMode: 'multiple',
            /**
             * @var data
             * @type Array
             * @extends xCharts.legend
             * @description 要显示哪些legend，Array里面对应series里的name值
             */
            data: [],
            /**
             * @var item
             * @extends xCharts.legend
             * @type Object
             * @description 控制每个图例的样式
             */
            item: {
                /**
                 * @var fontSize
                 * @extends xCharts.legend.item
                 * @type String|Number
                 * @default 14
                 * @description 图例文字的大小
                 */
                fontSize: 14,
                /**
                 * @var color
                 * @extends xCharts.legend.item
                 * @type String
                 * @default '#000'
                 * @description 图例文字的颜色
                 */
                color: '#000',
                /**
                 * @var chartSize
                 * @extends xCharts.legend.item
                 * @type Number
                 * @default 20
                 * @description 图例图标的宽度
                 */
                chartSize: 20,
                /**
                 * @var opacity
                 * @extends xCharts.legend.item
                 * @type Number
                 * @default 0.3
                 * @description 图例未被选中时的透明程度
                 */
                opacity: 0.3,
                /**
                 * @var hoverColor
                 * @extends xCharts.legend.item
                 * @type String
                 * @default 'auto' 保持和图标颜色一致
                 */
                hoverColor: 'auto'
            },
            /**
             * @var clickable
             * @extends xCharts.legend
             * @type Boolean
             * @description 图例是否可以点击
             * @default true
             */
            clickable: true
        }
        return legend;
    }


}(xCharts, d3));
/**
 * Author liuyang46@meituan.com
 * Date 16/5/24
 * Describe legend移动端适配
 */

(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    var legend = components.legend;

    legend.prototype.extend({
        mobileReady: function (nameList, opacity) {
            this.itemList.on('click.legend', legend.legendMouseClick(this, nameList, opacity));
        }
    });
}(xCharts, d3));
/**
 * xCharts.title
 * extends Component
 */
(function (xCharts,d3) {

    // 获取必须的全局声明
    var utils = xCharts.utils;

    // 获取xCharts的components存储点
    var components = xCharts.components;

    // 获取组件基类Component并继承方法
    var Component = components['Component'];
    utils.inherits(title, Component);

    // 往xCharts.components上添加自己
    components.extend({title: title});


    /**
     * title的构造函数
     * @param messageCenter 消息中心
     * @param config 配置文件
     * @param type title
     */
    function title(messageCenter, config, type) {

        //show=false时不做显示处理
        if(config.title.show === false) {
            this._show = false;
            return;
        }else{
            this._show = true;
        }

        //继承Component的属性
        Component.call(this, messageCenter, config, type);
    }

    title.prototype.extend = xCharts.extend;//添加extends函数

    title.prototype.extend({
        init: function (messageCenter) {

            // 用户的配置覆盖默认的配置项
            this.titleConfig = utils.merage(defaultConfig(), this.config.title);
            this.height = messageCenter.originalHeight;
            this.titlePosition = calculateTitlePosition.call(this);
        },
        render: function () {
            var _this = this,
                textFontSize = _this.titleConfig.textStyle.fontSize,
                subtextFontSize = _this.titleConfig.subtextStyle.fontSize,
                x = _this.titlePosition.x,
                y = _this.titlePosition.y,
                textAnchor = _this.titlePosition.textAnchor;

            /*===================================*/
            /* 绘画开始 */

            //第一步在svg下添加一个text，目的是为了能在浮动的时候能覆盖所有的charts
            var title = _this.svg.selectAll('.xc-title')
                .data([_this.titleConfig]);

            title = title.enter().append('text')
                .attr('class', 'xc-title')
                .merge(title);

            //添加主标题
            var titleText = title.selectAll('.xc-title-text')
                .data([_this.titleConfig]);

            titleText = titleText.enter().append('tspan')
                .attr('class', 'xc-title-text')
                .merge(titleText);

            titleText.text(function (config) {

                //设置主标题文字
                return config.text;
            })
                //设置主标题位置
                .attr('x', x)
                .attr('y', y)
                .attr('font-size', textFontSize)
                .attr('fill', function (config) {
                    return config.textStyle.color;
                })
                .attr('text-anchor', textAnchor);

            //添加副标题
            var subtitleText = title.selectAll('.xc-title-subtext')
                .data([_this.titleConfig]);

            subtitleText = subtitleText.enter().append('tspan')
                .attr('class', 'xc-title-subtext')
                .merge(subtitleText);

            subtitleText.text(function (config) {

                // 设置副标题文字
                return config.subtext;
            })
                .attr('x', x)
                .attr('dy', '1.2em')
                .attr('fill', function (config) {
                    return config.subtextStyle.color;
                })
                .attr('font-size', subtextFontSize)
                .attr('text-anchor', textAnchor);
        },
        updateSeries: function () {
            //数据更新与title无关，不做处理
        }
    });

    /**
     * 计算title的xy位置
     * @returns {{x: *, y: *, textAnchor: string}}
     */
    function calculateTitlePosition() {
        var _this = this,
            textAnchor = 'start',
            textFontSize = _this.titleConfig.textStyle.fontSize,
            subtextFontSize = _this.titleConfig.subtextStyle.fontSize,
            x = _this.titleConfig.x,
            y = _this.titleConfig.y,
            height = _this.height;

        /**
         * 计算title的x位置，默认center
         * 预定位置有left,start,end 只有这些预定值会改变textAnchor
         * 非预定值支持常用的css单位
         */
        if (x === 'left') {
            x = 0;
            textAnchor = 'start';
        } else if (x === 'center') {
            x = '50%';

            // 只有设置textAnchor为middle才能实现完全居中，强迫症的福音O(∩_∩)O
            textAnchor = 'middle';
        } else if (x === 'right') {
            x = '100%';
            textAnchor = 'end';
        }

        /**
         * 计算title的y位置
         * 默认top位置
         * 只有在top位置时会使margin.top增加，为了不和其他元素重叠
         * 但是非top情况实在难以计算重叠情况，直接不管,称之为浮动(会出现title遮盖住图表或其他文字的现象)
         */
        if (y == 'top') {
            y = '1em';

            // 只有在y==top时，文本不浮动，需要调整margin.top 防止和charts重叠
            _this.margin.top += parseFloat(textFontSize) * 1.5 + parseFloat(subtextFontSize);
        } else if (y == 'center') {
            y = '50%';
        } else if (y == 'bottom') {
            y = height - parseFloat(subtextFontSize) - parseFloat(textFontSize);
        }

        return {
            x: x,
            y: y,
            textAnchor: textAnchor,
        }
    }


    function defaultConfig() {
        /**
         * title配置项
         * @var title
         * @type Object
         * @extends xCharts
         * @description 标题配置项，设置标题文本，位置相关的属性
         */
        var title = {
            /**
             * @var show
             * @extends xCharts.title
             * @type Boolean
             * @default true
             * @description 是否显示标题
             */
            show: true,
            /**
             * @var text
             * @extends xCharts.title
             * @type String
             * @description 主标题文本
             */
            text: '',
            /**
             * @var subtext
             * @extends xCharts.title
             * @type String
             * @description 副标题文本
             */
            subtext: '', //副标题文本
            /**
             * @var x
             * @extends xCharts.title
             * @type String|Number
             * @values 'center'|'left'|'right'|number(单位px或百分比)
             * @default 'center'
             * @description
             * 控制标题水平位置
             * @example
             * x:'90'和x:90结果一样都是以x=0为基准向右偏移90px
             * x:'50%' 表示以x=0为基准向右偏移容器宽度的50%,居中请用center
             */
            x: 'center',
            /**
             * @var y
             * @extends xCharts.title
             * @type String|Number
             * @values 'top'|'center'|'bottom'|number(单位px或百分比)
             * @default 'top'
             * @description 控制标题垂直位置
             * @description 注意：修改y的位置会造成标题浮动，与图表重叠在一起
             * @example
             * y:'90'和y:90结果一样，以y=0为基准想下偏移90px
             * y:'50%' 表示以y=0为基准向下偏移容器高度的50%,居中请用center
             */
            y: 'top',
            /**
             * @var textStyle
             * @type Object
             * @extends xCharts.title
             * @description 主标题样式控制,也可以通过设置.xc-title-text的css属性控制样式
             * @example
             *  textStyle{
             *      fontSize:14,
             *      color:'#000'
             *  }
             */
            textStyle: {
                /**
                 * @var fontSize
                 * @extends xCharts.title.textStyle
                 * @type Number
                 * @default 14
                 * @description 主标题字号大小，可设置.xc-title-text的css属性控制
                 */
                fontSize: 14,
                /**
                 * @var color
                 * @extends xCharts.title.textStyle
                 * @type String
                 * @default '#000'
                 * @description 主标题颜色,可设置.xc-title-text的css属性控制
                 */
                color: '#000', //默认颜色
            },
            /**
             * @var subtextStyle
             * @type Object
             * @extends xCharts.title
             * @description 副标题样式控制,也可以通过设置.xc-title-subtext的css属性控制样式
             * @example
             *  subtextStyle{
             *      fontSize:14,
             *      color:'#000'
             *  }
             */
            subtextStyle: {
                /**
                 * @var fontSize
                 * @extends xCharts.title.subtextStyle
                 * @type Number
                 * @default 12
                 * @description 副标题字号大小，可设置.xc-title-subtext的css属性控制
                 */
                fontSize: 12,
                /**
                 * @var color
                 * @extends xCharts.title.subtextStyle
                 * @type String
                 * @default '#000'
                 * @description 副标题颜色,可设置.xc-title-subtext的css属性控制
                 */
                color: '#00',
            }

        }
        return title;
    }
}(xCharts,d3));
/**
 * components.tooltip
 */

(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    var Component = components['Component'];

    utils.inherits(tooltip, Component);

    //继承方法
    components.extend({tooltip: tooltip});

    function tooltip(messageCenter, config, type) {

        //show=false时不做显示处理
        if (config.tooltip.show === false) {
            this._show = false;
            return;
        } else {
            this._show = true;
        }

        //继承属性
        Component.call(this, messageCenter, config, type);
    }

    tooltip.prototype.extend = xCharts.extend;

    // 扩展自己独有的方法
    tooltip.prototype.extend({
        init: function (messageCenter, config) {
            this.originalWidth = messageCenter.originalWidth;
            this.originalHeight = messageCenter.originalHeight;
            this.xAxisScale = messageCenter.xAxisScale;
            this.axisX = null;
            this.axisY = null;
            this.tooltipWidth = null;
            this.tooltipHeight = null;

            // tooltip显示一级开关
            // 设置为false，不论任何情况下都会不显示tooltip，主要是为了当图表没有显示的数据后强制不显示tooltip
            this.display = true;

            // tooltip显示二级开关
            // 当前tooltip框状态
            this.tooltipShow = false;


            //没有x轴，多x轴，x轴type==value 将会改成item触发方式
            if (!this.config.xAxis || this.config.xAxis.length > 1 || this.config.xAxis[0].type == 'value') this.config.tooltip.trigger = 'item';
            this.tooltipConfig = utils.merage(defaultConfig(), config.tooltip);
            config.tooltip = this.tooltipConfig;

        },
        render: function () {

            /**
             * 就是添加一个div框
             * @type {render}
             * @private
             */

            this.tooltip = this.div.append('div')
                .attr('class', 'xc-tooltip')
        },
        ready: function () {
            var _this = this;

            //触发方式为item时，交给各个chart自己处理去,这里只负责axis触发方式
            if (_this.tooltipConfig.trigger !== 'axis') return;


            //这里是为了当没有任何需要显示的值时，能保证tooltip不出现
            _this.on('tooltipNone', function () {
                _this.display = false;
            });
            _this.on('tooltipShow', function () {
                _this.display = true;
            });

            if (_this.mobileMode) {
                _this.mobileReady();
            } else {
                _this.div.on('mousemove.tooltip', tooltipMousemove(_this));
                _this.div.on('mouseleave.tooltip', function () {
                    _this.hiddenTooltip();//鼠标过快划出，单纯监听mousemove很容易造成隐藏失败，这里加重保险
                });
            }

            this.on('brushChange.tooltip', function (domain) {
                _this.brushDomain = domain;
            });

        },
        refresh: function () {
            /**
             * 只需重置图表位置，重新进行绑定事件
             * 并不需要重新render
             */
            if (!this._show) return true;
            this.hiddenTooltip();
            this.init(this.messageCenter, this.config, this.type, this.config.series);//初始化
            this.ready();
        },
        updateSeries: function () {
        },
        showTooltip: function () {
            var _this = this;
            _this.tooltipShow = true;
            _this.tooltip.style('visibility', 'visible');
            // 显示线条
            if (this.tooltipConfig.trigger === 'axis') _this.axisLine.attr('opacity', 1);

        },
        hiddenTooltip: function () {
            var _this = this;
            _this.fire('tooltipHidden');
            _this.tooltipShow = false;

            // 隐藏方框
            _this.tooltip.style('visibility', 'hidden');

            // 隐藏线条
            if (this.tooltipConfig.trigger === 'axis' && _this.axisLine) _this.axisLine.attr('opacity', 0);
            _this.main.selectAll('.xc-tooltip-line').attr('opacity', 0);
        },
        setPosition: function (position, offsetX, offsetY) {
            var _this = this;
            if (!_this.tooltipShow) return;//tooltip处于未显示状态，不做任何处理

            offsetX = offsetX || 5, offsetY = offsetY || 5;

            // 计算一次tooltip的宽高
            // if (!_this.tooltipWidth) {
                _this.tooltipWidth = _this.tooltip.node().clientWidth;
                _this.tooltipWidth = parseFloat(_this.tooltipWidth);
                _this.tooltipHeight = _this.tooltip.node().clientHeight;
                _this.tooltipHeight = parseFloat(_this.tooltipHeight);
            // }

            var tooltipWidth = _this.tooltipWidth,
                tooltipHeight = _this.tooltipHeight,
                width = _this.originalWidth,
                height = _this.originalHeight,
                tooltipX = position[0], tooltipY = position[1];


            //tooltip当前位置超出div最大宽度,强制往左边走
            if (tooltipX + tooltipWidth > width) {
                tooltipX = tooltipX - tooltipWidth - offsetX;
                tooltipX = tooltipX < 0 ? 0 : tooltipX;
            } else {
                tooltipX += offsetX;
            }
            if (tooltipY + tooltipHeight > height) {
                tooltipY = height - tooltipHeight - offsetY;
            } else {
                tooltipY += offsetY;
            }

            // 当tooltip高度 已经大于整个svg高度时,直接保持居中
            if (tooltipHeight > height) {
                tooltipY = (tooltipHeight - height) / 2;
            }


            _this.tooltip.style('transform', "translate(" + tooltipX + "px," + tooltipY + "px)")

        },
        setTooltipHtml: function (html) {
            this.tooltip.html(html);
        }
    });

    // 暴露给mobile的方法
    tooltip.tooltipMousemove = tooltipMousemove;

    /**
     * 判断鼠标是否出界
     * @param mouseX 鼠标X
     * @param mouseY 鼠标Y
     * @return {boolean} 是否出界
     */
    function judgeOutOfBounds(mouseX, mouseY) {
        var axisX = this.axisX,
            axisY = this.axisY;

        return mouseX < axisX[0] ||
            mouseX > axisX[1] ||
            mouseY < axisY[0] ||
            mouseY > axisY[1];
    }

    /**
     * 添加竖线
     */
    function appendTooltipLine() {
        // 添加一根竖线
        var axisLine = this.main.selectAll('.xc-tooltip-line')
            .data([this]);
        axisLine = axisLine.enter().append('line')
            .attr('class', 'xc-tooltip-line')
            .attr('stroke', this.tooltipConfig.lineColor)
            .attr('stroke-width', this.tooltipConfig.lineWidth)
            .attr('opacity', 0)
            .merge(axisLine);

        return axisLine;
    }

    /**
     * 计算图表边界
     * @param _this
     */
    function calcChartBorder(_this) {

        _this.axisX = [];
        _this.axisX[0] = _this.margin.left;
        _this.axisX[1] = _this.originalWidth - _this.margin.right;


        _this.axisY = [];
        _this.axisY[0] = _this.margin.top;
        _this.axisY[1] = _this.originalHeight - _this.margin.bottom;

    }

    /**
     * 监听鼠标移动
     */
    function tooltipMousemove(_this) {
        // 保存前一个tooltip所在的区域，用于判断当前tooltip是否需要刷新位置
        var oldSectionNumber = -1;
        var firstMove = true;
        var tooltipX = -1;
        return function () {
            // 一级开关关闭，强制不显示，即使鼠标在正常的范围内
            if (_this.display === false) return;

            // 只需第一次移动时计算边界即可
            if (firstMove) {
                firstMove = false;
                calcChartBorder(_this);
                _this.axisLine = appendTooltipLine.call(_this);
            }


            // 获取当前鼠标坐标
            var position = d3.mouse(this),
                mouseX = position[0],
                mouseY = position[1],
                axisLine = _this.axisLine;


            if (judgeOutOfBounds.call(_this, mouseX, mouseY)) {
                //超出边界，隐藏tooltip
                _this.hiddenTooltip();
                return;
            } else if (!_this.tooltipShow) {
                _this.showTooltip();
            }


            var xScale = _this.messageCenter.xAxisScale[0],
                xAxisData = _this.config.xAxis[0].data,

            // TODO 有结束绘制事件后，只需计算一次
                width = _this.originalWidth - _this.margin.left - _this.margin.right,
                height = _this.originalHeight - _this.margin.top - _this.margin.bottom;

            var sectionObj = getSectionLength.call(_this, xAxisData);

            var sectionLength = sectionObj.length - 1;

            if (_this.messageCenter.xAxisScale[0].scaleType === 'barCategory') {
                sectionLength++;
            }

            var sectionWidth = width / sectionLength; //计算每个区域的宽度,注意这里是均分
            var sectionNumber = 0; //得到在哪个区域，从0开始
            if (_this.messageCenter.xAxisScale[0].scaleType === 'barCategory') {
                sectionNumber = Math.floor((mouseX - _this.margin.left) / sectionWidth);
            } else {
                sectionNumber = Math.round((mouseX - _this.margin.left) / sectionWidth);
            }

            sectionNumber += sectionObj.offset;

            if (sectionNumber !== oldSectionNumber || _this.messageCenter.lengendChange ) {

                // tooltip已经响应过legend改变,不需要重复响应
                _this.messageCenter.lengendChange = false;

                //触发tooltipSectionChange事件，获取文本
                var tooltipHtml = "";

                _this.fire("tooltipSectionChange", sectionNumber, function (html) {
                    tooltipHtml += html;
                    _this.setTooltipHtml(tooltipHtml);
                }, _this.tooltipConfig.formatter);

                //如果是柱状图的话，需要使用bar上提供的接口来获取x坐标
                if (_this.messageCenter.charts['bar'] || _this.config.xAxis[0].middleBand) {
                    tooltipX = adjustTooltipX(xScale, sectionNumber);
                } else {
                    tooltipX = xScale(xAxisData[sectionNumber]);
                }

                axisLine.attr('x1', tooltipX).attr('x2', tooltipX).attr('y1', 0).attr('y2', height);
                tooltipX += _this.margin.left;//修正tooltip的位置

                oldSectionNumber = sectionNumber;
            }

            _this.setPosition([tooltipX, mouseY]);
        }
    }

    // 柱状图或者x轴的middleBand==true的折线图，tooltip的x轴需要重新计算
    function adjustTooltipX(xScale, sectionNumber) {
        var rangeBand = xScale.bandwidth(),
            rangeBandNum = xScale.domain().length,
            xRange = xScale.range();
        var outPadding = (xRange[1] - xRange[0] - rangeBand * rangeBandNum) / 2;
        return xRange[0] + outPadding + sectionNumber * rangeBand + rangeBand / 2;
    }

    function getSectionLength(data) {

        if (this.messageCenter.brush !== true) {
            return {
                length: data.length,
                offset: 0
            }
        }

        var domain = this.brushDomain || [0, 1];
        var minData = data[0];
        var maxData = data[data.length - 1];

        var extent = [
            (maxData - minData) * domain[0] + minData,
            (maxData - minData) * domain[1] + minData
        ];
        var length = 0, offset;
        for (var i = 0; i < data.length; i++) {
            if (data[i] <= extent[1] && data[i] >= extent[0]) {
                length++;

                if (offset === undefined) {
                    offset = i;
                }
            }

        }

        return {
            length: length,
            offset: offset
        };
    }

    function defaultConfig() {
        /**
         * @var tooltip
         * @type Object
         * @extends xCharts
         * @description 控制提示框
         */
        var tooltip = {
            /**
             * @var show
             * @extends xCharts.tooltip
             * @description 是否显示tooltip提示框
             * @type Boolean
             * @default true
             */
            show: true,
            /**
             * @var trigger
             * @extends xCharts.tooltip
             * @type String
             * @values 'axis'|'item'
             * @default 'item'
             * @description 触发方式,'axis'只对单x轴有效
             */
            trigger: 'axis',
            /**
             * @var formatter
             * @extends xCharts.tooltip
             * @type Function
             * @description 格式化函数，如果在各项series里面定义了formatter会覆盖此函数
             * @default 请查看各个series里面的格式化函数
             */
            //formatter: function (name,data,index) {
            //    return name+':&nbsp;'+data;
            //},
            /**
             * @var lineColor
             * @extends xCharts.tooltip
             * @type String
             * @default '#008ACD'
             * @description 在trigger='axis'时有效
             * @description 竖直线的颜色
             */
            lineColor: '#CCC',
            /**
             * @var lineWidth
             * @extends xCharts.tooltip
             * @type Number
             * @default 2
             * @description 在trigger='axis'时有效
             * @description 竖直线的宽度
             */
            lineWidth: 2
        };
        return tooltip;
    }
}(xCharts, d3));
/**
 * Author liuyang46@meituan.com
 * Date 16/5/24
 * Describe tooltip移动端适配
 */

(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    var tooltip = components.tooltip;

    tooltip.prototype.extend({
        mobileReady: function () {
            this.div.on('touchmove.tooltip', tooltip.tooltipMousemove(this));
            this.div.on('touchstart.tooltip', tooltip.tooltipMousemove(this));

        }
    });
}(xCharts, d3));
/**
 * Created by liuyang on 15/10/27.
 * chars的基类
 */
(function(xCharts,d3){

    /**
     * @var series
     * @extends xCharts
     * @type Array
     * @description 包含图表数据
     */

    var utils=xCharts.utils;
    var Component=xCharts.components.Component;
    function Chart(messageCenter,config,type){
        this.width = messageCenter.width;
        this.height = messageCenter.height;
        this.id = messageCenter.id;
        this.getColor = messageCenter.getColor;
        Component.call(this,messageCenter,config,type);
    }

    utils.inherits(Chart,Component);

    Chart.prototype.extend = xCharts.extend;//添加extends函数

    Chart.prototype.extend({
        refresh: function (animationEase, animationTime) {

            //当容器改变时，刷新当前图表
            this.margin = this.messageCenter.margin;//每次刷新时，重置margin
            this.originalHeight = this.messageCenter.originalHeight; //将变化后的宽高重新赋值
            this.originalWidth = this.messageCenter.originalWidth;
            this.width = this.messageCenter.width;
            this.height = this.messageCenter.height;
            this.init(this.messageCenter, this.config, this.type, this.config.series);//初始化
            this.render(animationEase, animationTime);//刷新
        }
    })

    xCharts.charts.extend({Chart:Chart});

}(xCharts,d3));
/**
 * Created by liuyang on 15/10/27.
 * 折线图
 *
 * TODO 动画效果
 * TODO 折线图鼠标hover影藏点出现
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;

    xCharts.charts.extend({line: line});
    utils.inherits(line, Chart);
    function line(messageCenter, config) {
        Chart.call(this, messageCenter, config, 'line');
    }

    line.prototype.extend = xCharts.extend;
    line.prototype.extend({
        init: function (messageCenter, config, type, series) {

            this.xAxisScale = messageCenter.xAxisScale;
            this.yAxisScale = messageCenter.yAxisScale;

            // 处理折线图数据
            this.series = parseSeries(this, series, config);

            // 判断是否是时间轴
            this.timeModel = config.xAxis[0].type == 'time';
        },
        render: function (animationEase, animationTime) {

            this.__renderArea(animationEase, animationTime);
            this.__renderLine(animationEase, animationTime);
            if (!this.timeModel) this.__renderCircle(animationEase, animationTime);
            if (this.config.peekPoints.enable) this.__renderPeek(animationEase, animationTime);
            if (this.timeModel) this._brushRender();
        },
        __renderLine: function (animationEase, animationTime) {
            var id = this.id, _this = this;

            var transitionStr = "opacity " + (animationTime / 2) + "ms linear";

            var lineGroup = this.main.selectAll('.xc-line-group').data([_this]);
            lineGroup = lineGroup.enter().append('g').attr('class', 'xc-line-group')
                .merge(lineGroup)

                // .exit().remove().merage(lineGroup);
            var lineScale = d3.line()
                .x(function (d) {
                    return d.x;
                })
                .y(function (d) {
                    return d.y;
                });
            var linePath = lineGroup.selectAll('.xc-line-path').data(_this.series);
            linePath = linePath.enter().append('path').attr('class', 'xc-line-path').attr('fill', 'none').merge(linePath);
            linePath.exit().remove();
            linePath.attr('stroke', function (d) {
                if (d.lineStyle.color != 'auto')
                    return d.lineStyle.color;
                return _this.getColor(d.idx);
            })
                .attr('stroke-width', function (d) {
                    return d.lineStyle.width;
                })
                .attr('id', function (d) {
                    return 'xc-line-path-id' + id + "-" + d.idx;
                })
                .style("transition", transitionStr)
                .style("opacity", function (d) {
                    if (d.show === false) {
                        return 0;
                    } else {
                        return 0.7;
                    }
                });

            linePath.transition()
                .duration(animationTime)
                .ease(animationEase)
                .attrTween("d", function (serie) {

                    var ctx = this;
                    if (serie.show === false) return function () {
                        return ctx.linePath;
                    };

                    var transitionData = serie.data.map(function (dataItem) {
                        return {
                            x: dataItem.adjustedX ? dataItem.adjustedX : serie.xScale(dataItem.x),
                            y: serie.yScale(dataItem.y)
                        }
                    });

                    if (this.transitionData === undefined) {
                        var minValue = serie.yScale.range()[1];
                        this.transitionData = serie.data.map(function (dataItem) {
                            return {
                                x: dataItem.adjustedX ? dataItem.adjustedX : serie.xScale(dataItem.x),
                                y: serie.yScale(minValue)
                            }
                        });
                        // serie.data.map(function (dataItem) {
                        //     return {
                        //         x: serie.xScale(dataItem.x),
                        //         y: serie.yScale(minValue)
                        //     }
                        // })
                    }

                    var interpolate = d3.interpolate(this.transitionData, transitionData);
                    this.transitionData = transitionData;

                    return function (t) {
                        var interpolateData = interpolate(t);
                        var invalidIdxList = [], validDataList = [];
                        serie.data.forEach(function (d, i) {
                            if (d.justCircle) {
                                invalidIdxList.push(i);
                            }
                        });
                        if (invalidIdxList.length > 0) {
                            var preIndex = 0;
                            invalidIdxList.push(interpolateData.length);
                            for (var index = 0; index < invalidIdxList.length; index++) {
                                var curIndex = invalidIdxList[index];
                                if (curIndex - preIndex > 0) {
                                    validDataList.push(interpolateData.slice(preIndex, curIndex));
                                }
                                preIndex = curIndex + 1;
                            }
                        } else {
                            validDataList = [interpolateData];
                        }
                        lineScale.curve(serie.interpolate === 'linear' ? d3.curveLinear : d3.curveMonotoneX);
                        var path = '';
                        validDataList.forEach(function (lineData) {
                            path += lineScale(lineData);
                        });
                        if (t == 1) {
                            ctx.linePath = path;
                            _this.fire('lineAnimationEnd');
                        }
                        return path;
                    }
                });

            this.lineGroup = lineGroup;
        },
        __renderArea: function (animationEase, animationTime) {
            //面积
            // DONE 不用d3.svg.area，重写一个以满足需求
            var id = this.id, _this = this;
            var transitionStr = "opacity " + (animationTime / 2) + "ms linear";
            var areaGroup = _this.main.selectAll('.xc-area-group').data([_this]);
            areaGroup = areaGroup.enter().append('g').attr('class', 'xc-area-group').merge(areaGroup);
            areaGroup.exit().remove();
            var areaPath = areaGroup.selectAll('.xc-line-area-path').data(_this.series);
            areaPath = areaPath.enter().append('path').attr('class', 'xc-line-area-path').attr('stroke', 'none').merge(areaPath);
            areaPath.exit().remove();
            areaPath.attr('fill', function (d) {
                if (d.areaStyle.color == 'auto') {
                    //当面积的颜色为auto时，和折线保持一致
                    if (d.lineStyle.color == 'auto')
                        return _this.getColor(d.idx);
                    else
                        return d.lineStyle.color
                }
                else
                    return d.areaStyle.color;
            })
                .attr('id', function (d) {
                    return 'xc-line-area-path-id' + id + "-" + d.idx;
                })
                .style("transition", transitionStr)
                .style("opacity", function (d) {
                    if (d.show === false) {
                        return 0;
                    } else {
                        return d.areaStyle.opacity;
                    }
                });


            // 动画
            areaPath.transition()
                .duration(animationTime)
                .ease(animationEase)
                .attrTween("d", function (serie) {
                    var ctx = this;

                    if (serie.show === false) {
                        return function () {
                            return ctx.areaPath == null ? "" : ctx.areaPath;
                        }
                    }

                    if (serie.areaStyle.show === false) {
                        return function () {
                            return "";
                        }
                    }


                    var areaData = serie.data.map(function (dataItem) {
                        return {
                            x: dataItem.adjustedX ? dataItem.adjustedX : serie.xScale(dataItem.x),
                            y: serie.yScale(dataItem.y),
                            y0: serie.yScale(dataItem.y0)
                        }
                    });

                    if (ctx.areaData === undefined) {
                        ctx.areaData = serie.data.map(function (dataItem) {
                            return {
                                x: serie.xScale(dataItem.x),
                                y: serie.yScale(dataItem.y0),
                                y0: serie.yScale(dataItem.y0)
                            }
                        });
                    }

                    // ctx.areaData = ctx.areaData == undefined ? areaData : ctx.areaData;
                    var interpolate = d3.interpolate(this.areaData, areaData);
                    ctx.areaData = areaData;

                    return function (t) {
                        var data = interpolate(t);
                        var invalidIdxList = [], validDataList = [];
                        serie.data.forEach(function (d, i) {
                            if (d.justCircle) {
                                invalidIdxList.push(i);
                            }
                        });
                        if (invalidIdxList.length > 0) {
                            var preIndex = 0;
                            invalidIdxList.push(data.length);
                            for (var index = 0; index <= invalidIdxList.length; index++) {
                                var curIndex = invalidIdxList[index];
                                if (curIndex - preIndex > 0) {
                                    validDataList.push(data.slice(preIndex, curIndex));
                                }
                                preIndex = curIndex + 1;
                            }
                        } else {
                            validDataList = [data];
                        }
                        var areaPath = '';
                        validDataList.forEach(function (areaData) {
                            areaPath += area(areaData, serie);
                        });
                        if (t == 1) {
                            ctx.areaPath = areaPath;
                        }
                        return areaPath;
                    }
                });
        },
        __renderCircle: function (animationEase, animationTime) {
            //画点
            //最后画点，防止面积遮盖
            var id = this.id, _this = this;
            var showDataList = _this.messageCenter.showDomainList[0];
            var transitionStr = "opacity " + (animationTime / 2) + "ms linear";
            var circleGroup = _this.main.selectAll('.xc-circle-group').data(_this.series);
            circleGroup = circleGroup.enter().append('g').attr('class', function (serie) {
                return 'xc-circle-group';
            }).merge(circleGroup);
            circleGroup .attr('id', function (d) {
                circleGroup.exit().remove();
                return 'xc-circle-group-id' + id + '-' + d.idx;
            }).attr('fill', function (serie) {
                    if (serie.lineStyle.color != 'auto')
                        return serie.lineStyle.color;
                    return _this.getColor(serie.idx);
                });
            var circle = circleGroup.selectAll('circle').data(function (d) {
                return d.data;
            });
            circle = circle.enter().append('circle').attr('class', function (d, i) {
                return 'xc-point xc-point-' + i;
            }).merge(circle);
            circle.exit().remove();

            circle.style("transition", transitionStr)
                .style("opacity", function (d) {
                    if (typeof d !== 'object') {
                        return 0;
                    } else {
                        return 0.7;
                    }
                })
                .style("display", function (d, idx) {
                    if (showDataList[idx] !== true) {
                        this.circleDisplay = false;
                        return "none";
                    }
                    this.circleDisplay = true;
                    return "block";
                })
                .attr('r', function (d) {
                    if (typeof d === 'object') {
                        this.circleRadius = d._serie.lineStyle.radius;
                    }
                    return this.circleRadius;
                });
            // .attr('cx', function (data) {
            //     var ctx = this;
            //     if (typeof data !== 'object') {
            //         return ctx.circleCX;
            //     }
            //     ctx.circleCX = data._serie.xScale(data.x);
            //     return ctx.circleCX;
            // })
            // .attr('cy', function (data) {
            //     var ctx = this;
            //     if (typeof data !== 'object') {
            //         return ctx.circleCY;
            //     }
            //     ctx.circleCY = data._serie.yScale(data.y);
            //     return ctx.circleCY;
            // })

            //动画
            circle.transition()
                .duration(animationTime)
                .ease(animationEase)
                .attrTween("cx", function (d) {
                    var ctx = this;
                    if (typeof d !== 'object') {
                        return function () {
                            return ctx.circleCX
                        }
                    }
                    var circleCX = d.adjustedX ? d.adjustedX : d._serie.xScale(d.x);
                    ctx.circleCX = ctx.circleCX == undefined ? circleCX : ctx.circleCX;
                    var interpolate = d3.interpolate(ctx.circleCX, circleCX);
                    ctx.circleCX = circleCX;
                    return function (t) {
                        return interpolate(t);
                    }
                })
                .attrTween("cy", function (d) {
                    var ctx = this;

                    if (typeof d !== 'object') {
                        return function () {
                            return ctx.circleCY;
                        }
                    }
                    var circleCY = d._serie.yScale(d.y);
                    if (ctx.circleCY === undefined) {
                        var minValue = d._serie.yScale.range()[1];
                        ctx.circleCY = d._serie.yScale(minValue);
                    }
                    ctx.circleCY = ctx.circleCY == undefined ? circleCY : ctx.circleCY;
                    var interpolate = d3.interpolate(ctx.circleCY, circleCY);
                    ctx.circleCY = circleCY;
                    return function (t) {
                        return interpolate(t);
                    }
                });

            _this.circle = circle;
            _this.circleGroup = circleGroup;
        },
        __renderPeek: function (animationEase, animationTime) {

            // 绘制峰值点
            var id = this.id, _this = this;
            var showDataList = _this.messageCenter.showDomainList[0];
            var transitionStr = "opacity " + (animationTime / 2) + "ms linear";
            var peekGroup = _this.main.selectAll('xc-peek-group').data(_this.series);
            peekGroup = peekGroup.enter().append('g').attr('class', 'xc-peek-group').merge(peekGroup);
            peekGroup.exit().remove();
            peekGroup.attr('id', function (d) {
                return 'xc-peek-group-id' + id + d.idx;
            }).attr('fill', function (serie) {
                if (serie.lineStyle.color != 'auto')
                    return serie.lineStyle.color;
                return _this.getColor(serie.idx);
            });
            var peekPoints = peekGroup.selectAll('path').data(function (d) {
                return d.peekPoints;
            });
            peekPoints = peekPoints.enter().append('path').merge(peekPoints)
                .attr('class', function (d, i) {
                    return 'xc-peek-point xc-peek-point-' + i;
                }).attr('d', function (d) {
                    var startX = d.adjustedX ? d.adjustedX : d._serie.xScale(d.x);
                    var startY = d._serie.yScale(d.y);
                    return utils.peekPointOfDrop(startX, startY);
                });
            peekPoints.exit().remove();
            peekPoints.style("transition", transitionStr)
                .style("opacity", function (d) {
                    if (typeof d !== 'object') {
                        return 0;
                    } else {
                        return 0.7;
                    }
                })
                .style("display", function (d, idx) {
                    if (showDataList[idx] !== true) {
                        this.circleDisplay = false;
                        return "none";
                    }
                    this.circleDisplay = true;
                    return "block";
                });

            // 添加峰值点文字
            var peekText = peekGroup.selectAll('text').data(function (d) {
                return d.peekPoints;
            });
            peekText = peekText.enter().append('text').merge(peekText)
                .text(function (d) {
                    return d.y;
                })
                .attr('fill', '#fff')
                .attr('class', function (d, i) {
                    return 'xc-peek-text xc-peek-text-' + i;
                })
                .attr('x', function (d) {
                    return d.adjustedX ? d.adjustedX : d._serie.xScale(d.x);
                })
                .attr('y', function (d) {
                    return d._serie.yScale(d.y) - 21;
                })
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .style('font-size', '0.5em');
            peekText.exit().remove();
        },
        _brushRender: function () {
            this.lineGroup.attr('clip-path', 'url(#xc-clip-main-path)');
        },
        ready: function () {
            if (this.mobileMode) {
                this.mobileReady();
            } else {
                if (this.config.legend && this.config.legend.show) {
                    this.__legendReady();
                }
                if (this.config.tooltip && this.config.tooltip.show) {
                    this.__tooltipReady();
                }
            }
            this._brushReady();
        },
        __legendReady: function () {
            var lineUse, areaUse, circleUse, _this = this, id = _this.id;
            this.on('legendMouseenter.line', function (name) {
                lineUse = _this.main.selectAll('.xc-line-use').data([_this]);
                areaUse = _this.main.selectAll('.xc-line-area-use').data([_this]);
                circleUse = _this.main.selectAll('.xc-circle-use').data([_this]);
                lineUse.enter().append('use').attr('class', "xc-line-use").attr('clip-path', 'url(#xc-clip-main-path)');
                areaUse.enter().append('use').attr('class', "xc-line-area-use").attr('clip-path', 'url(#xc-clip-main-path)');
                circleUse.enter().append('use').attr('class', "xc-circle-use").attr('clip-path', 'url(#xc-clip-main-path)');

                var serie = getSeries(name);
                if (!serie) return;
                var lineId = "#xc-line-path-id" + id + "-" + serie.idx,
                    areaId = "#xc-line-area-path-id" + id + "-" + serie.idx,
                    circleId = "#xc-circle-group-id" + id + "-" + serie.idx;

                lineUse.attr('xlink:href', lineId);
                areaUse.attr('xlink:href', areaId);
                circleUse.attr('xlink:href', circleId);
                d3.select(lineId).attr('stroke-width', serie.lineStyle.width + 1);
                //d3.select(circleId).attr('fill', 'yellow');
            });

            this.on('legendMouseleave.line', function (name) {

                var serie = getSeries(name);
                if (!serie) return;
                var lineId = "#xc-line-path-id" + id + "-" + serie.idx,
                    areaId = "#xc-line-area-path-id" + id + "-" + serie.idx,
                    circleId = "#xc-circle-group-id" + id + "-" + serie.idx;

                lineUse.attr('xlink:href', "");
                areaUse.attr('xlink:href', "");
                circleUse.attr('xlink:href', "");
                d3.select(lineId).attr('stroke', serie.color).attr('stroke-width', serie.lineStyle.width);
                d3.select(circleId).attr('fill', serie.color);
            });


            /**
             * 根据name 取得对应的serie
             * @param name
             * @returns {*}
             */
            function getSeries(name) {
                var series = _this.series;
                for (var i = 0, s; s = series[i++];)
                    if (s.name == name) return s;
            }

            this.on('legendClick.line', function (nameList) {
                var series = _this.config.series;
                var animationConfig = _this.config.animation;
                _this.init(_this.messageCenter, _this.config, _this.type, series);
                _this.render(animationConfig.animationEase, animationConfig.animationTime);
                // _this.render(d3.easeLinear, animationConfig.animationTime);
            });
        },
        __tooltipReady: function () {
            var _this = this;

            if (!this.config.tooltip || this.config.tooltip.show === false) return;//未开启tooltip

            if (this.config.tooltip.trigger === 'axis' || this.config.tooltip.trigger === undefined) {

                this.on('tooltipSectionChange.line', function (sectionNumber, callback, format) {

                    var html = "", series = _this.series;

                    if (_this.timeModel) {
                        //时间轴时，鼠标地方会出现圆点
                        _this.main.selectAll('.xc-tooltip-circle').remove();//清理上个区间的圆点
                        _this.series.forEach(function (serie) {

                            var data = serie.data[sectionNumber];
                            _this.main.append('circle').datum(data)
                                .attr('class', "xc-tooltip-circle")
                                .attr('r', function (d) {
                                    return d._serie.lineStyle.radius;
                                })
                                .attr('cx', function (d) {
                                    return d._serie.xScale(d.x);
                                })
                                .attr('cy', function (d) {
                                    return d._serie.yScale(d.y);
                                })
                                .attr('fill', function (d) {
                                    return d._serie.color;
                                })
                        });

                    } else {
                        // 首先将不显示的圆点全部隐藏
                        _this.circle.style('display', function () {
                            if (!this.circleDisplay) {
                                return 'none';
                            }
                        })
                            .classed('xc-tooltip-circle', false);

                        // 将其他circle都变小
                        _this.circle.attr('r', function () {
                            return this.circleRadius;
                        });

                        // 判断如果是 display:none; 显示为display:block;
                        var circle = _this.circleGroup.selectAll('circle:nth-child(' + (sectionNumber + 1) + ')');
                        circle.style('display', function () {
                            if (!this.circleDisplay) {
                                return 'block';
                            }
                        })
                            .classed('xc-tooltip-circle', true)
                            .attr('r', function () {
                                return this.circleRadius * 1.8;
                            });
                    }

                    series.forEach(function (serie) {
                        if (serie.show === false) return;
                        var data = serie.data[sectionNumber] === undefined ? "" : serie.data[sectionNumber].value;

                        var serieFormat = serie.formatter || format || defaultFormatter;
                        html += serieFormat(serie.name, data);
                    });

                    callback(html);
                });

                this.on('tooltipHidden', function () {
                    //当tooltip滑出区域时，需要清理圆点
                    if (_this.timeModel) {
                        _this.main.selectAll('.xc-tooltip-circle').remove();//清理上个区间的圆点
                    } else {
                        _this.circle.style('display', function () {
                            if (!this.circleDisplay) {
                                return 'none';
                            }
                        })
                            .classed('xc-tooltip-circle', false);
                    }
                })
            } else if (_this.mobileMode) {
                _this.mobileReady();
            } else {
                //trigger='item'
                var tooltip = _this.messageCenter.components['tooltip'];

                _this.circle.on('mouseenter', tooltipTriggerItem(_this));
                _this.circle.on('mouseleave', function () {
                    _this.circle.attr('r', function () {
                        return this.circleRadius;
                    });
                    tooltip.hiddenTooltip();
                });

            }

        },
        _brushReady: function () {
            this.on('brushChange.line', function (domain) {
                // scale.domain(domain);
                this.render(d3.easeLinear, 0);
            }.bind(this));
        }

    });

    line.tooltipTriggerItem = tooltipTriggerItem;


    function tooltipTriggerItem(ctx) {

        return function () {
            var tooltip = ctx.messageCenter.components['tooltip'];
            var tooltipFormatter = tooltip.tooltipConfig.formatter;
            var axisConfig = ctx.messageCenter.components['xAxis'].axisConfig;

            var target = d3.event.srcElement || d3.event.target;
            target = d3.select(target);
            var data = target.data()[0];
            var value = data.value;
            var name = data._serie.name;
            var serieFormatter = data._serie.formatter || tooltipFormatter || defaultFormatter;
            var html = serieFormatter(name, value);

            var xData = data.x;
            xData = axisConfig[data._serie.xAxisIndex].tickFormat(xData);
            var title = "<p>" + xData + "</p>";
            tooltip.showTooltip();
            tooltip.setTooltipHtml(title + html);

            var position = d3.mouse(ctx.svg.node());

            tooltip.setPosition(position);

            // 处理圆变大

            if (ctx.mobileMode) {
                ctx.circle.attr('r', function () {
                    return this.circleRadius;
                });
            }


            d3.select(this).attr('r', function () {
                return this.circleRadius * 1.8;
            });
        }
    }

    function parseSeries(ctx, series, config) {
        //先剔除不属于line的serie
        var stacks = {}, idx = 0, lineSeries = [];
        series.forEach(function (serie) {
            if (serie.type == 'line') {
                serie = utils.merage(defaultConfig(), serie);//与默认参数合并
                serie.idx = serie.idx == null ? idx++ : serie.idx;
                if (!serie.stack) {
                    lineSeries.push(serie);
                    return;
                }
                stacks[serie.stack] || ( stacks[serie.stack] = []);
                stacks[serie.stack].push(serie);
            }
        });
        //处理堆积情况
        var stackSeries = parseStacksSeries(ctx, stacks, config);
        //非堆积情况
        lineSeries = parseNormalSeries(ctx, lineSeries, config);
        return lineSeries.concat(stackSeries);//反转一下是为了解决堆积面积图时会产生重叠覆盖问题
    }

    /**
     *
     * 处理堆积状态下的series
     * @param _this
     * @param stacks
     * @param config
     * @returns {Array}
     */
    function parseStacksSeries(ctx, stacksSeries, config) {
        var stackSeries = [];
        for (var k in stacksSeries) {
            if (stacksSeries.hasOwnProperty(k)) {
                var oldData = null, oldInterpolate = 'linear';
                stacksSeries[k].forEach(function (serie) {
                    if (serie.show !== false) {
                        var xAxisIndex = serie.xAxisIndex,
                            yAxisIndex = serie.yAxisIndex;
                        var xConfig = config['xAxis'][xAxisIndex];
                        var yConfig = config['yAxis'][yAxisIndex];
                        var xScale = ctx.xAxisScale[xAxisIndex];
                        var yScale = ctx.yAxisScale[yAxisIndex];
                        var serieIdx = serie.idx;
                        serie.interpolate = serie.smooth ? 'monotone' : 'linear';
                        serie.y0Interpolate = oldInterpolate;
                        serie.xScale = xScale;
                        serie.yScale = yScale;
                        oldInterpolate = serie.interpolate;
                        if (serie.xScale.domain().length === 0) {
                            serie.data = [];
                        }
                        serie.data = serie.data.map(function (dataValue, idx) {
                            var data = {}, isStackPoint = true;

                            // TODO 这里好像只能满足category
                            if (xConfig.type != 'value') {
                                data.x = xConfig.data[idx];
                                if (data.x === undefined) {
                                    console.error('The length of xAxis.data and series.data is not match!', idx);
                                }
                                var maxY = yScale.domain()[1];
                                var minY = yScale.domain()[0];
                                if (!oldData) {
                                    data.y0 = minY;
                                    data.y = parseFloat(dataValue);
                                } else {
                                    isStackPoint = oldData[idx] && !oldData[idx].justCircle;
                                    data.y0 = isStackPoint ? oldData[idx].y : minY;
                                    data.y = parseFloat(dataValue) + (isStackPoint ? oldData[idx].y : 0);
                                }
                                data.isStackPoint = isStackPoint;
                                if (data.y > maxY) {
                                    data.y = maxY;
                                }
                                if (data.y < minY) {
                                    data.y = minY;
                                }
                                if (typeof data.y === 'number' && data.y !== data.y) {
                                    data.justCircle = true;
                                    dataValue = '-';
                                    data.y = maxY;
                                }
                                data.x = xConfig.data[idx];
                            }

                            data.value = dataValue;
                            data.idx = serieIdx;
                            data._serie = serie;
                            if (config.xAxis.middleBand) {
                                var rangeBand = xScale.bandwidth();
                                data.adjustedX = xScale(data.x) + idx * rangeBand / 2;
                            }
                            return data;
                        });
                        oldData = serie.data;
                    }
                    stackSeries.push(serie);
                });

            }
        }
        return stackSeries;
    }

    /**
     * 处理非堆积状态的series
     * @param _this
     * @param lineSeries
     * @param config
     * @returns {*}
     */
    function parseNormalSeries(_this, lineSeries, config) {
        var invalidPoints = 0;
        lineSeries = lineSeries.map(function (serie) {
            if (serie.show !== false) {

                var xAxisIndex = serie.xAxisIndex,
                    yAxisIndex = serie.yAxisIndex;

                var xConfig = config['xAxis'][xAxisIndex];
                var yConfig = config['yAxis'][yAxisIndex];
                var xScale = _this.xAxisScale[xAxisIndex];
                var yScale = _this.yAxisScale[yAxisIndex];
                var serieIdx = serie.idx;
                serie.interpolate = serie.smooth ? 'monotone' : 'linear';
                serie.y0Interpolate = 'linear';
                serie.xScale = xScale;
                serie.yScale = yScale;
                if (serie.xScale.domain().length === 0) {
                    console.error('xAxis.data is empty!');
                    serie.data = [];
                }
                serie.data = serie.data.map(function (dataValue, idx) {
                    var data = {};
                    if (xConfig.type != 'value') {
                        data.x = xConfig.data[idx];
                        if (data.x === undefined) {
                            console.error('The length of xAxis.data and series.data is not match!', idx);
                        }
                        var maxY = yScale.domain()[1];
                        var minY = yScale.domain()[0];
                        data.y = parseFloat(dataValue);
                        if (data.y > maxY) {
                            data.y = maxY;
                        }
                        if (data.y < minY) {
                            data.y = minY;
                        }
                        if (typeof data.y === 'number' && data.y !== data.y) {
                            data.justCircle = true;
                            dataValue = '-';
                            data.y = maxY;
                        }
                        data.y0 = minY;
                    }

                    data.value = dataValue;
                    data.idx = serieIdx;
                    data._serie = serie;
                    if (xConfig.middleBand) {
                        var rangeBand = xScale.bandwidth();
                        data.adjustedX = xScale(data.x) + rangeBand / 2;
                    }
                    return data;
                });
                if (config.peekPoints.enable) {
                    var sortedData = utils.copy(serie.data);
                    sortedData.sort(function (pre, cur) {
                        if (pre.y < cur.y) {
                            return -1;
                        } else if (pre.y === cur.y) {
                            return 0;
                        } else {
                            return 1;
                        }
                    });
                    serie.peekPoints = [sortedData[0], sortedData[sortedData.length - 1]];
                }
            }
            return serie;
        }).filter(function (item) {
            return item.data.length > 0;
        });
        return lineSeries;
    }

    /**
     * 替换d3.svg.area函数
     * @param data
     */
    function area(data, serie) {
        var lineScale = d3.line()
            .x(function (d) {
                return d.x;
            })
            .y(function (d) {
                return d.y;
            });
        var line0Scale = d3.line()
            .x(function (d) {
                return d.x;
            })
            .y(function (d) {
                return d.y0;
            });


        lineScale.curve(serie.interpolate === 'linear' ? d3.curveLinear : d3.curveMonotoneX);
        var path = lineScale(data);
        // line0Scale.interpolate(serie.line0Scale);
        line0Scale.curve(serie.y0Interpolate === 'linear' ? d3.curveLinear : d3.curveMonotoneX);
        var stackIdxList = [], stackDataList = [];
        serie.data.forEach(function (d, i) {
            if (!d.isStackPoint) {
                stackIdxList.push(i);
            }
        });
        if (stackIdxList.length > 0) {
            var preIndex = 0;
            stackIdxList.push(data.length);
            for (var index = 0; index < stackIdxList.length; index++) {
                var curIndex = stackIdxList[index];
                if (curIndex - preIndex > 0) {
                    stackDataList.push(data.slice(preIndex, curIndex));
                }
                preIndex = curIndex + 1;
            }
        } else {
            stackDataList = [data];
        }
        var path0 = '';
        stackDataList.forEach(function (data) {
            path0 += line0Scale(data.reverse());
        });
        // var path0 = line0Scale(data.reverse());
        data.reverse()//再次翻转，恢复原状
        return joinPath(path, path0, data);
    }

    /**
     * 将path和path0拼接成一个areaPath
     * @param serie
     */
    function joinPath(path, path0, data) {
        var firstData = data[0], lastData = data[data.length - 1];
        var leftTop = [firstData.x, firstData.y],
            rightBottom = [lastData.x, lastData.y0];

        return path + 'L' + rightBottom + path0 + 'L' + leftTop;
    }

    /**
     * 折线图tooltip默认格式化函数
     * @param name x轴值
     * @param value y轴值
     * @returns {string} 一段html文本
     */
    function defaultFormatter(name, value) {
        if (value !== '') {
            return '<p>' + name + ':&nbsp;' + value + '</p>';
        }
        return '';
    }

    function defaultConfig() {
        /**
         * @var line
         * @type Object
         * @extends xCharts.series
         * @description 折线图配置项
         */
        var config = {
            /**
             * @var name
             * @type String
             * @description 线条名字
             * @extends xCharts.series.line
             */
            name: '',
            /**
             * 定义图表类型是折线图
             * @var type
             * @type String
             * @description 指定图表类型
             * @values 'line'
             * @extends xCharts.series.line
             */
            type: 'line',
            xAxisIndex: 0,
            /**
             * @var yAxisIndex
             * @type Number
             * @description 使用哪一个y轴，从0开始，对应yAxis中的坐标轴
             * @default 0
             * @extends xCharts.series.line
             */
            yAxisIndex: 0,
            /**
             * @var smooth
             * @type Boolean
             * @description 折线是否开启平滑曲线,默认开启
             * @default true
             * @extends xCharts.series.line
             */
            smooth: true,
            /**
             * @var lineStyle
             * @type Object
             * @description 线条样式控制
             * @extends xCharts.series.line
             */
            lineStyle: {
                /**
                 * @var color
                 * @type String
                 * @description 折线颜色控制，不设或者设置为'auto',则由系统默认分配一个颜色
                 * @default 'auto'
                 * @values 'auto'|css颜色值
                 * @extends xCharts.series.line.lineStyle
                 */
                color: 'auto',
                /**
                 * @var width
                 * @type Number
                 * @description 折线宽度控制，数字越大折线越粗，不允许负值
                 * @default 2
                 * @extends xCharts.series.line.lineStyle
                 */
                width: 2,
                /**
                 * @var radius
                 * @type Number
                 * @description 折线上圆点的大小，数字越大，圆点越大
                 * @default 3
                 * @extends xCharts.series.line.lineStyle
                 */
                radius: 3
            },
            /**
             * @var areaStyle
             * @type Object
             * @description 面积图样式控制
             * @extends xCharts.series.line
             */
            areaStyle: {
                /**
                 * @var show
                 * @type Boolean
                 * @description 开启面积图，默认不开启
                 * @default false
                 * @extends xCharts.series.line.areaStyle
                 */
                show: false,
                /**
                 * @var color
                 * @type String
                 * @description 面积图颜色值,不设或者设置为'auto'，颜色和折线一致
                 * @default 'auto'
                 * @values 'auto'|css颜色值
                 * @extends xCharts.series.line.areaStyle
                 */
                color: 'auto',
                /**
                 * @var opacity
                 * @type Number
                 * @description 面积图颜色透明度控制
                 * @default 0.3
                 * @values 0-1
                 * @extends xCharts.series.line.areaStyle
                 */
                opacity: 0.3
            },
            /**
             * @var data
             * @type Array
             * @description 折线图数据，提供给type=value的坐标轴使用
             * @extends xCharts.series.line
             * @example
             * data: ['11%', 11, 15, 70, 12, 40, 60]
             * //这里最终会通过parseFloat转化，字符串和数字都无所谓，不过单位会丢失，如果需要单位需要配置units选项
             */
            data: [],
            /**
             * @var units
             * @type String
             * @description 补全数据的单位配合data使用，提供给tooltip使用,也可以在tooltip里的formatter里自己配置格式化结果
             * @extends xCharts.series.line
             * @example
             * units: '%'
             */
            units: ''
            /**
             * @var formatter
             * @extends xCharts.series.line
             * @type Function
             * @description 可以单独定义格式化函数来覆盖tooltip里面的函数
             * @example
             *  formatter: function (name,data) {
                 *   return '<p>'+name + ':&nbsp;' + data+'</p>';
                 *  }
             */
            //formatter:function(name,value){
            //    return name+':&nbsp;'+data;
            //}
        };
        return config;
    }

}(xCharts, d3));
/**
 * Author liuyang46@meituan.com
 * Date 16/5/26
 * Describe 折线图,移动端适配
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var charts = xCharts.charts;
    var line = charts.line;

    line.prototype.extend({
        mobileReady: function () {
            this.circle.on('touchstart', line.tooltipTriggerItem(this));
        }
    });
}(xCharts, d3));
/**
 * @file 雷达图
 * @author chenwubai.cx@gmail.com
 */
(function(xCharts, d3) {
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

            // 提取雷达图配置项(目前不支持多图,直接忽略其他图表配置项)
            for(var i = 0, length = series.length; i < length; i++) {
                if(series[i].type === 'radar') {
                    this.radarConfig = utils.copy(series[i], true);
                    break;
                }
            }

            // 合并默认值,转换百分比为数值等
            __correctConfig.apply(this);

            // 计算网轴点坐标
            this.polygonWebs = __getPolygonWebs.apply(this);
            // 计算雷达图形的点坐标
            this.areas = __getAreas.apply(this);
            // 计算文字标签的点
            this.textPoints = __getTextPoints.apply(this);
            // 计算覆盖整个网轴的多边形的点坐标
            this.coverPolygons = __getCoverPolygons.apply(this);
        },
        render: function(animationEase, animationTime) {
            // 添加雷达图的g容器
            this.radar = __renderRadarWrapper.apply(this);
            // 添加网轴
            this.webList = __renderWebs.apply(this);
            // 添加网轴线
            this.lineList = __renderLines.apply(this);
            // 添加雷达图形
            this.areaList = __renderAreas.apply(this, [animationEase, animationTime]);
            // 添加文字标签
            this.textList = __renderText.apply(this);
            // 添加覆盖的多边形
            this.coverPolygonList = __renderCoverPolygons.apply(this);
        },
        ready: function() {
            if(this.mobileMode) {
                this.mobileReady();
            } else {
                if(this.config.legend && this.config.legend.show) {
                    __legendReady.apply(this);
                }
                if(this.config.tooltip && this.config.tooltip.show) {
                    __tooltipReady.apply(this);
                }
            }
        },
        _reRenderAreas: function(nameList) {
            for(var i=0;i<this.areas.length;i++) {
                this.areas[i].isShow = false;
            }
            for(var i=0;i<nameList.length;i++) {
                for(var k=0;k<this.areas.length;k++) {
                    if(nameList[i] == this.areas[k].originalData.name) {
                        this.areas[k].isShow = true;
                        break;
                    }
                }
            }
            for(var i=0;i<this.areas.length;i++) {
                d3.select(this.areaList._groups[0][i]).classed('hidden', !this.areas[i].isShow);
            }
        },
        _showTooltip: function(index, ele) {
            var tooltip = this.messageCenter.components.tooltip;
            var tooltipFormatter = tooltip.tooltipConfig.formatter,
                radarFormatter = this.radarConfig.formatter;
            var formatter = radarFormatter || tooltipFormatter || defaultFormatter;
            var position = d3.mouse(this.svg.node());
            position = [
                position[0] + 40,
                position[1] + 40
            ];
            var indicator = this.radarConfig.indicator[index].text;
            var valueList = [];
            for(var i=0;i<this.radarConfig.data.length;i++) {
                if(this.areas[i].isShow) {
                    valueList.push({
                        name: this.radarConfig.data[i].name,
                        value: this.radarConfig.data[i].value[index]
                    });
                }
            }
            tooltip.setTooltipHtml(formatter(indicator, valueList));
            tooltip.showTooltip();
            tooltip.setPosition(position);
            var areaPointsList = this.areaList.selectAll('.xc-radar-area-point');
            for(var i=0;i<areaPointsList.length;i++) {
                var areaPoints = areaPointsList[i];
                d3.select(areaPoints[index]).style('stroke-width', 5);
            }
            this.lineList.classed('xc-radar-tooltip-line', false);
            d3.select(this.lineList._groups[0][index]).classed('xc-radar-tooltip-line', true);
        }
    });
    function __correctConfig() {

        // 合并默认值
        this.radarConfig = utils.merage(defaultConfig(), this.radarConfig);

        // 计算图的中心坐标
        var center = this.radarConfig.center;
        if(typeof center[0] === 'string') {
            center[0] = parseFloat(center[0]) * 0.01 * this.width;
        }
        if(typeof center[1] === 'string') {
            center[1] = parseFloat(center[1]) * 0.01 * this.height;
        }
        // 计算最大的多边形的半径
        if(typeof this.radarConfig.radius === 'string') {
            this.radarConfig.radius = parseFloat(this.radarConfig.radius) * 0.01 * this.width;
        }
        // 添加对雷达图大小的处理,如果半径太大,自动把半径保持在可控的最大值
        var minLength = this.width < this.height ? this.width : this.height;
        // 减20是考虑到还有文字标签占着位置
        if(this.radarConfig.radius * 2 + 20 > minLength) {
            this.radarConfig.radius = (minLength - 20)/2 ;
        }
    }
    function __getPolygonWebs() {

        // 计算网轴多边形的点
        this.radarConfig.total = this.radarConfig.data[0].value.length;
        var onePiece = 2 * Math.PI/this.radarConfig.total;
        var polygonWebs = [];
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
    }
    function __getAreas() {
        // 计算雷达图形的点
        var areas = [];
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
                points.push({
                    x: x,
                    y: y,
                    // 增加一个属性存放原始属性,方便后面设置颜色
                    originalData: d
                });
            }
            areas.push({
                areaString: area,
                areaPoints: points,
                originalData: d,
                isShow: true
            });
        }
        return areas;
    }
    function __getTextPoints() {
        // 计算文字标签的点
        // TODO 优化文字标签分布
        var textPoints = [];
        var textRadius = this.radarConfig.radius + 20;
        for(var i=0;i<this.radarConfig.total;i++) {
            textPoints.push({
                x: textRadius/this.radarConfig.radius * this.polygonWebs[0].webPoints[i].x,
                y: textRadius/this.radarConfig.radius * this.polygonWebs[0].webPoints[i].y + 8
            });
        }
        return textPoints;
    }
    function __getCoverPolygons() {
        // 计算覆盖整个多边形网轴的多边形的坐标
        var webPoints = this.polygonWebs[0].webPoints;
        var coverPolygons = [];
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
    }
    function __renderRadarWrapper() {
        var radar = this.main
            .selectAll('.xc-radar')
            .data([1]);
        radar = radar.enter()
            .append('g')
            .classed('xc-radar', true)
            .merge(radar);
        radar.attr('transform', 'translate(' + this.radarConfig.center[0] + ',' + this.radarConfig.center[1] + ')');
        return radar;
    }
    function __renderWebs() {
        var webs = this.radar
            .selectAll('.xc-radar-webs')
            .data([1]);
        webs = webs.enter()
            .append('g')
            .classed('xc-radar-webs', true)
            .merge(webs);
        var webList = webs.selectAll('.xc-radar-web')
            .data(this.polygonWebs);
        webList = webList.enter()
            .append('polygon')
            .classed('xc-radar-web', true)
            .merge(webList);
        webList.attr('points', function(d) { return d.webString; });
        return webList;
    }
    function __renderLines() {
        var lines = this.radar
            .selectAll('.xc-radar-lines')
            .data([1]);
        lines = lines.enter()
            .append('g')
            .classed('xc-radar-lines', true)
            .merge(lines);
        var lineList = lines.selectAll('.xc-radar-line')
            .data(this.polygonWebs[0].webPoints);
        lineList = lineList.enter()
            .append('line')
            .classed('xc-radar-line', true)
            .merge(lineList);
        lineList.attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', function(d) {
                return d.x;
            })
            .attr('y2', function(d) {
                return d.y;
            });
        return lineList;
    }
    function __renderAreas(animationEase, animationTime) {
        var _self = this;
        var areas = this.radar
            .selectAll('.xc-radar-areas')
            .data([1]);
        areas = areas.enter()
            .append('g')
            .classed('xc-radar-areas', true)
            .merge(areas);
        var areaList = areas.selectAll('.xc-radar-area')
            .data(this.areas);
        areaList = areaList.enter()
            .append('g')
            .attr('class', function(d, i) {
                return 'xc-radar-area xc-radar-area' + d.originalData.idx;
            })
            .merge(areaList);
        var polygonList = areaList.selectAll('polygon')
            .data(function(d) {
                return [d];
            });
        polygonList = polygonList.enter()
            .append('polygon')
            .attr('points', function(d) {
                return Array.apply(0, Array(_self.radarConfig.total)).map(function() {
                    return '0,0';
                }).join(' ');
            })
            .style('stroke', function (d) {
                if(!d.originalData.color) {
                    d.originalData.color = _self.getColor(d.originalData.idx);
                }
                return d.originalData.color;
            })
            .style('fill', function(d) {
                if(_self.radarConfig.fill) {
                    return d.originalData.color;
                }
                return '';
            })
            .merge(polygonList);
        polygonList.transition()
            .duration(animationTime)
            .ease(animationEase)
            .attr('points', function(d) {
                return d.areaString;
            });
        var pointsList = areaList.selectAll('.xc-radar-area-point')
            .data(function(d) {
                return d.areaPoints;
            });
        pointsList = pointsList.enter()
            .append('circle')
            .classed('xc-radar-area-point', true)
            .attr('cx', 0)
            .attr('cy', 0)
            .merge(pointsList);
        pointsList.style('stroke', function(d){
            return d.originalData.color;
        });
        pointsList.transition()
            .duration(animationTime)
            .ease(animationEase)
            .attr('cx', function(d) {
                return d.x;
            })
            .attr('cy', function(d) {
                return d.y;
            });
        return areaList;
    }
    function __renderText() {
        var _self = this;
        var texts = this.radar
            .selectAll('.xc-radar-texts')
            .data([1]);
        texts = texts.enter()
            .append('g')
            .classed('xc-radar-texts', true)
            .merge(texts);
        var textList = texts.selectAll('.xc-radar-text')
            .data(this.textPoints);
        textList = textList.enter()
            .append('text')
            .classed('xc-radar-text', true)
            .text(function(d, i) {
                return _self.radarConfig.indicator[i].text;
            })
            .attr('text-anchor', 'middle')
            .merge(textList);
        textList.attr('x', function(d) {
            return d.x;
        })
            .attr('y', function(d) {
                return d.y;
            });
        return textList;
    }
    function __renderCoverPolygons() {
        var coverPolygons = this.radar
            .selectAll('.xc-radar-coverPolygons')
            .data([1]);
        coverPolygons = coverPolygons.enter()
            .append('g')
            .classed('xc-radar-coverPolygons', true)
            .merge(coverPolygons);
        var coverPolygonList = coverPolygons.selectAll('.xc-radar-coverPolygon')
            .data(this.coverPolygons);
        coverPolygonList = coverPolygonList.enter()
            .append('polygon')
            .classed('xc-radar-coverPolygon', true)
            .merge(coverPolygonList);
        coverPolygonList.attr('points', function(d) {
            return d.pointsStr;
        });
        return coverPolygonList;
    }
    function __legendReady() {
        __legendMouseEnter.apply(this);
        __legendMouseOut.apply(this);
        __legendClick.apply(this);
    }
    function __legendMouseEnter() {
        var _this = this;
        var areas = this.areas;
        this.on('legendMouseenter.radar', function (name) {
            var areaData = {};
            for(var i=0;i<areas.length;i++) {
                if(name == areas[i].originalData.name) {
                    areaData = areas[i];
                    break;
                }
            }
            for(var i=0;i<_this.areaList._groups[0].length;i++) {
                var areaEle = d3.select(_this.areaList._groups[0][i]);
                if(areaEle.datum() == areaData) {
                    areaEle.selectAll('.xc-radar-area-point')
                        .style('stroke-width', 5);
                    break;
                }
            }
        });
    }
    function __legendMouseOut() {
        var _this = this;
        var areas = this.areas;
        this.on('legendMouseleave.radar', function(name) {
            var areaData = {};
            for(var i=0;i<areas.length;i++) {
                if(name == areas[i].originalData.name) {
                    areaData = areas[i];
                    break;
                }
            }
            for(var i=0;i<_this.areaList._groups[0].length;i++) {
                var areaEle = d3.select(_this.areaList._groups[0][i]);
                if(areaEle.datum() == areaData) {
                    areaEle.selectAll('.xc-radar-area-point')
                        .style('stroke-width', 3);
                    break;
                }
            }
        });
    }
    function __legendClick() {
        var _this = this;
        this.on('legendClick.radar', function(nameList) {
            _this._reRenderAreas(nameList);
        });
    }
    function __tooltipReady() {
        __tooltipMouseMove.apply(this);
        __tooltipMouseOut.apply(this);
    }
    function __tooltipMouseMove() {
        var _this = this;
        this.coverPolygonList.on('mousemove.radar', function () {
            var index = d3.select(this).datum().index;
            _this._showTooltip(index, this);
        });
    }
    function __tooltipMouseOut() {
        var _this = this;
        this.coverPolygonList.on('mouseout.radar', function () {
            var tooltip = _this.messageCenter.components.tooltip;
            tooltip.hiddenTooltip();
            var areaPointsList = _this.areaList.selectAll('.xc-radar-area-point');
            areaPointsList.style('stroke-width', 3);
            _this.lineList.classed('xc-radar-tooltip-line', false);
        });
    }

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
                    // text: '',
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
                    // name: '',
                    /**
                     * @var value
                     * @type Array
                     * @description 数据项对应所有指标的值的集合，其中的顺序必须和indicator中指标的顺序相对应。
                     * @extends xCharts.series.radar.data
                     */
                    // value: []
                }
            ]
        }
        return config;
    }
}(xCharts, d3));
/**
 * @file 雷达图(移动端)
 * @date 2016-05-30
 * @author chenxuan.cx@gmail.com
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var charts = xCharts.charts;
    var radar = charts.radar;

    radar.prototype.extend({
        mobileReady: function() {
            if(this.config.legend && this.config.legend.show) {
                __legendMobileReady.apply(this);
            }
            if(this.config.tooltip && this.config.tooltip.show) {
                __tooltipMobileReady.apply(this);
            }
        }
    });
    function __legendMobileReady() {
        __legendTouch.apply(this);
    }
    function __legendTouch() {
        var _this = this;
        this.on('legendClick.radar', function(nameList) {
            _this._reRenderAreas(nameList);
            _this.messageCenter.components.tooltip.hiddenTooltip();
        });
    }
    function __tooltipMobileReady() {
        __tooltipTouch.apply(this);
    }
    function __tooltipTouch() {
        var _this = this;
        this.coverPolygonList.on('touchstart.radar', function () {
            var index = d3.select(this).datum().index;
            _this.areaList.selectAll('.xc-radar-area-point').style('stroke-width', 3);
            _this._showTooltip(index, this);
        });
    }
}(xCharts, d3));

/**
 * @file 柱状图
 * @author chenwubai.cx@gmail.com
 */

(function (xCharts, d3) {
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;

    // 创建bar构造函数
    function bar(messageCenter, config) {
        // 调用这一步的原因是为了继承属性
        Chart.call(this, messageCenter, config, 'bar');
    }

    // 在xCharts中注册bar构造函数
    xCharts.charts.extend({bar: bar});
    // 从父类Chart里继承一系列的方法
    utils.inherits(bar, Chart);

    bar.prototype.extend = xCharts.extend;
    bar.prototype.extend({
        init: function (messageCenter, config, type, series) {
            var _self = this;
            if (!this.barSeries) {
                // 提出type为bar的series的子元素对象

                // 按stack分类,没有stack的话默认

                // bar的全局配置
                var globalBarConfig = utils.merage(barDefaultConfig(), this.config.bar);
                this.globalBarConfig = globalBarConfig;

                var barSeries = {};
                var xAxisData = this.config.xAxis[0].data;
                // 保存未分类的值
                var seriesList = [];
                for (var i = 0; i < series.length; i++) {
                    if (series[i].type == 'bar') {
                        var serie = __correctConfig(series[i], globalBarConfig);
                        var stack = serie.stack || ('%bar' + i);
                        serie.isShow = serie.legendShow === false ? false : true;
                        // 转化为列表
                        serie.labelList = labelToArray(xAxisData, serie.label);

                        // 为了让没有stack有默认值
                        serie.stack = stack;

                        barSeries[stack] = barSeries[stack] || [];
                        barSeries[stack].push(serie);

                        // 添加颜色值
                        serie.color = this.getColor(serie.idx);
                        seriesList.push(serie);
                    }
                }
                // 给每种柱状添加颜色值
                // this.barSeries.forEach(function (series) {
                //     series.color = _self.getColor(series.idx);
                //     series.isShow = true;
                // });

                this.barSeries = barSeries;
                this.seriesList = seriesList;
            }


            // 用变量存储messageCenter里的一些信息，方便后面使用
            this.xAxisScale = messageCenter.xAxisScale;
            this.yAxisScale = messageCenter.yAxisScale;

            // TODO 这里暂时只考虑柱状图都在一个x轴和y轴上进行绘制，且x轴在下方
            for (var i = 0; i < this.xAxisScale.length; i++) {
                // TODO 这个判断条件是否靠谱待调研
                if (this.xAxisScale[i].scaleType === 'barCategory') {
                    this.barXScale = this.xAxisScale[i];
                    break;
                }
            }


            this.barYScale = this.yAxisScale[0];

            // 获取每组矩形容器的左上角坐标以及其内的矩形左上角的坐标、宽度和高度
            this.rectsData = __getDefaultData.apply(this);
            // 如果有series的isShow为false，则重新计算每组矩形的坐标和宽高
            for (var i = 0; i < this.seriesList.length; i++) {
                if (!this.seriesList[i].isShow) {
                    __changeRectsData.apply(this);
                    break;
                }
            }
        },
        render: function (animationEase, animationTime) {

            // 添加柱状图容器
            this.bar = __renderBarWrapper.apply(this);

            // 添加背景对比
            this.bgRect = __renderBgRect.apply(this);


            // 添加每组矩形的容器
            this.rectWrapperList = __renderRectWrapper.apply(this);
            // 添加柱状
            this.rectList = __renderRect.apply(this, [animationEase, animationTime]);

            // 添加label,业务相关
            this.labelList = __renderLabel.apply(this);

            // 添加文字
            this.textList = __renderText.apply(this);


        },
        ready: function () {
            if (this.mobileMode) {
                this.mobileReady();
            } else {
                if (this.config.legend && this.config.legend.show) {
                    __legendReady.apply(this);
                }
                if (this.config.tooltip && this.config.tooltip.show) {
                    __tooltipReady.apply(this);
                }
            }
        },
        _reRenderBars: function (nameList) {
            var animationConfig = this.config.animation;
            // 先把所有series的isShow属性设为false
            this.barYScale = this.messageCenter.yAxisScale[0];
            var keys = Object.keys(this.barSeries);

            for (var i = 0; i < keys.length; i++) {
                var series = this.barSeries[keys[i]];
                series.forEach(function (series) {
                    series.isShow = false;
                });
            }

            // 根据nameList把其中对应的series的isShow属性设为true
            for (var i = 0; i < nameList.length; i++) {
                for (var k = 0; k < this.seriesList.length; k++) {
                    if (nameList[i] == this.seriesList[k].name) {
                        this.seriesList[k].isShow = true;
                        break;
                    }
                }
            }
            // 根据新的isShow配置进行计算
            __changeRectsData.apply(this);
            __renderRect.apply(this, [animationConfig.animationEase, animationConfig.animationTime]);
            __renderLabel.apply(this);
            __renderText.apply(this);
        },
        _tooltipSectionChange: function () {
            var _this = this;
            this.on('tooltipSectionChange.bar', function (sectionNumber, callback, format) {
                var htmlStr = '';
                _this.seriesList.forEach(function (series) {
                    if (!series.isShow) {
                        return;
                    } else {
                        var formatter = series.formatter || format || defaultFormatter;
                        htmlStr += formatter(series.name, series.data[sectionNumber]);
                    }
                });
                callback(htmlStr);
            });
        }
    });

    function __renderBgRect() {
        var that = this;
        var bgRect = this.bar
            .selectAll('.xc-bar-bg-rect')
            .data(function () {
                return that.backgroundRectList;
            });
        bgRect = bgRect.enter('rect')
            .append('rect')
            .classed('xc-bar-bg-rect', true)
            .merge(bgRect);

        bgRect.attr('x', function (d) {
            return d.x;
        })
            .attr('y', function (d) {
                return d.y;
            })
            .attr('width', function (d) {
                return d.width;
            })
            .attr('height', function (d) {
                return d.height;
            })
            .attr('fill', function (d) {
                return d.fill;
            })
            .attr('opacity', function (d) {
                return d.opacity;
            })

    }

    function __renderText() {
        var textList = this.rectWrapperList
            .selectAll('.xc-bar-text')
            .data(function (d) {
                return d.rectsData
            });
        textList = textList.enter()
            .append('text')
            .classed('xc-bar-text', true)
            .merge(textList);

        textList.attr('x', function (d) {
            return d.text.x;
        })
            .attr('y', function (d) {
                return d.text.y;
            })
            .attr('text-anchor', 'middle')
            .attr('fill', function (d) {
                return d.text.color;
            })
            .attr('font-size', function (d) {
                return d.text.fontSize;
            })
            .attr('opacity', function (d) {
                if (d.text.show === false) {
                    return 0;
                }

                return 1;
            })
            .text('');
        this.on('drawBarEnd.barText', function () {
            textList.text(function (d) {

                // 不显示情况 空串即可
                if (d.text.show === false) {
                    return '';
                }

                return d.text.value;
            })
        });

        return textList;

    }

    function __correctConfig(serie, globalConfig) {

        var defaultCon = utils.merage(defaultConfig(), globalConfig);

        // 合并默认值
        return utils.merage(defaultCon, serie);
    }

    function __getDefaultData() {
        var paddingOuter = this.globalBarConfig.paddingOuter;
        var paddingInner = this.globalBarConfig.paddingInner;

        this.barXScale.paddingOuter(paddingOuter);
        this.barXScale.paddingInner(paddingInner);
        var rangeBand = this.barXScale.bandwidth(),
            rangeBandNum = this.barXScale.domain().length,
            xRange = this.barXScale.range(),
            yRange = this.barYScale.range();

        var stackGap = 2;

        this.xRange = xRange[1] - xRange[0];
        this.yRange = yRange[0] - yRange[1];
        var bgWidth = this.barXScale.step();
        var outWidth = bgWidth * paddingOuter;
        this.outWidth = outWidth;
        var outPadding = (this.xRange - rangeBand * rangeBandNum) / 21;
        // 定义同组矩形之间的间距
        var rectMargin = this.globalBarConfig.barGap;
        // 假设所有矩形均可见的情况下，计算矩形宽度
        var seriesKeys = Object.keys(this.barSeries);
        var seriesLength = seriesKeys.length;
        var rectWidth = (rangeBand - (seriesLength + 1) * rectMargin) / seriesLength;
        var rectGroupData = [],
            tempX = outPadding;
        var backgroundRectList = [];
        var bgX = 0;

        for (var i = 0; i < rangeBandNum; i++) {
            // 假设所有矩形均可见的情况，求得矩形的坐标和宽高
            var rectsData = [];
            var labelData = [];
            var rectX = rectMargin;

            backgroundRectList.push({
                x: bgX,
                y: 0,
                height: this.yRange,
                width: bgWidth,
                opacity: i % 2 === 0 ? this.globalBarConfig.background.oddOpacity : this.globalBarConfig.background.evenOpacity,
                fill: i % 2 === 0 ? this.globalBarConfig.background.oddColor : this.globalBarConfig.background.evenColor
            });

            if (i === 0) {
                backgroundRectList[i].width += outWidth;
                backgroundRectList[i].x -= outWidth;
            }

            if (i === rangeBandNum - 1) {
                backgroundRectList[i].width += outWidth;
            }

            bgX += bgWidth;

            for (var k = 0; k < seriesLength; k++) {

                // 处理每一个柱子的x,y坐标和宽度高度
                var key = seriesKeys[k];
                var series = this.barSeries[key];
                var rects = [];
                var bottomY = this.yRange;
                var bottomRect = true;
                for (var l = 0; l < series.length; l++) {
                    var serie = series[l];
                    var labelObj = serie.labelList[i];
                    var parsedData = parseFloat(serie.data[i]);
                    if (parsedData !== parsedData) {
                        parsedData = 0;
                    }
                    var tempRect = {
                        x: rectX,
                        width: rectWidth > 0 ? rectWidth : 0,
                        height: this.yRange - this.barYScale(parsedData),
                        color: serie.color,
                        idx: serie.idx
                    };

                    // 如果label存在,最小高度不能小于5
                    if (labelObj && tempRect.height < 5) {
                        tempRect.height = 5;
                    }

                    tempRect.y = bottomY - tempRect.height;

                    if (tempRect.y < 0) {

                        tempRect.height += tempRect.y;

                        tempRect.y = 0;
                    }

                    if (tempRect.height > 0 && bottomRect === false) {
                        // 最底层的柱子不需要修正高度
                        tempRect.height -= stackGap;
                    } else if (tempRect.height > 0) {
                        bottomRect = false;
                    }


                    // 中心显示文字
                    tempRect.text = {
                        x: tempRect.x + tempRect.width / 2,
                        y: tempRect.y + tempRect.height / 2 + serie.textStyle.fontSize / 2,
                        value: serie.textFormat(serie.data[i]),
                        color: serie.textStyle.color,
                        fontSize: serie.textStyle.fontSize,
                        show: true
                    };

                    tempRect.text.show = serie.textShow;

                    if (tempRect.text.fontSize + 2 >= tempRect.height) {
                        tempRect.text.show = false;
                    }

                    // 特殊处理高度为0的且不堆积的情况,将0显示出来
                    if (tempRect.height === 0 && series.length === 1) {
                        tempRect.text.show = true;
                        tempRect.text.y -= tempRect.text.fontSize/1.5;
                    }

                    if (labelObj) {

                        // 最小显示高度5
                        var minHeight = 5;
                        var labelHeight = 14;
                        var fontSzie = 12;
                        var labelWidth = labelObj.value.length * fontSzie + 10;


                        var label = {
                            x: tempRect.x,
                            y: tempRect.y,
                            height: labelHeight,
                            width: labelWidth,
                            color: labelObj.color,
                            text: {
                                value: labelObj.value,
                                x: tempRect.x + labelWidth / 2,
                                y: tempRect.y + labelHeight / 2 + fontSzie / 2 - 2,
                                fontSize: fontSzie
                            }
                        };

                        if (tempRect.height / 2 < (tempRect.text.fontSize / 2 + label.height)) {

                            // 这种情况是已经没有什么位置给label显示了
                            label.showValue = false;
                            label.height = minHeight;
                        } else {
                            label.showValue = true;
                        }

                        if (labelWidth > tempRect.width) {
                            label.showValue = false;
                            label.width = tempRect.width / 2;
                        }

                        labelData.push(label);
                    }


                    bottomY = tempRect.y;
                    rects.push(tempRect);
                }


                rectsData = rectsData.concat(rects);
                rectX += rectWidth + rectMargin;
            }
            // 每组矩形容器的坐标以及每组矩形的坐标和宽高
            var tempData = {
                x: tempX,
                y: 0,
                rectsData: rectsData,
                labelData: labelData
            };
            rectGroupData.push(tempData);
            tempX += rangeBand;
        }
        this.backgroundRectList = backgroundRectList;
        return rectGroupData;
    }

    function __changeRectsData() {
        var rangeBand = this.barXScale.bandwidth();
        // 定义同组矩形之间的间距
        var rectMargin = this.globalBarConfig.barGap;
        var stackGap = 2;

        // 根据矩形是否可见，求出实际的矩形宽度
        var visibleStack = {};
        var visibleSeriesLength = 0;
        for (var i = 0; i < this.seriesList.length; i++) {
            if (this.seriesList[i].isShow) {
                visibleStack[this.seriesList[i].stack] = true;
            }
        }

        visibleSeriesLength = Object.keys(visibleStack).length;

        var realRectWidth = (rangeBand - (visibleSeriesLength + 1) * rectMargin) / visibleSeriesLength;

        for (var i = 0; i < this.rectsData.length; i++) {
            // 假设所有矩形均可见的情况，求得矩形的坐标和宽高
            // var tempRect = this.rectsData[i].rectsData;
            var rectX = rectMargin;
            var labelData = [];
            var stackKeys = Object.keys(this.barSeries);
            var rectsList = [];
            for (var k = 0; k < stackKeys.length; k++) {
                // 根据矩形是否显示重新对一些矩形的坐标和宽高进行计算并赋值

                var series = this.barSeries[stackKeys[k]];
                var rects = [];
                var bottomY = this.yRange;
                var bottomRect = true;
                for (var l = 0; l < series.length; l++) {
                    var serie = series[l];
                    var labelObj = serie.labelList[i];
                    var parsedData = parseFloat(serie.data[i]);
                    if (parsedData !== parsedData) {
                        parsedData = 0;
                    }

                    if (serie.isShow) {
                        // tempRect[k].x = rectX;
                        // tempRect[k].y = this.barYScale(this.barSeries[k].data[i]);
                        // tempRect[k].width = realRectWidth;
                        // tempRect[k].height = this.yRange - this.barYScale(this.barSeries[k].data[i]);
                        // rectX += realRectWidth + rectMargin;

                        var tempRect = {
                            x: rectX,
                            width: realRectWidth,
                            height: this.yRange - this.barYScale(parsedData),
                            color: serie.color,
                            idx: serie.idx
                        };

                        // 如果label存在,最小高度不能小于5
                        if (labelObj && tempRect.height < 5) {
                            tempRect.height = 5;
                        }

                        tempRect.y = bottomY - tempRect.height;

                        if (tempRect.y < 0) {

                            tempRect.height += tempRect.y;

                            tempRect.y = 0;
                        }

                        if (tempRect.height > 0 && bottomRect === false) {
                            // 最底层的柱子不需要修正高度
                            tempRect.height -= stackGap;
                        } else if (tempRect.height > 0) {
                            bottomRect = false;
                        }

                        tempRect.text = {
                            x: tempRect.x + tempRect.width / 2,
                            y: tempRect.y + tempRect.height / 2 + serie.textStyle.fontSize / 2,
                            value: serie.textFormat(serie.data[i]),
                            color: serie.textStyle.color,
                            fontSize: serie.textStyle.fontSize,
                            show: true
                        };

                        // 中心显示文字
                        tempRect.text = {
                            x: tempRect.x + tempRect.width / 2,
                            y: tempRect.y + tempRect.height / 2 + serie.textStyle.fontSize / 2,
                            value: serie.textFormat(serie.data[i]),
                            color: serie.textStyle.color,
                            fontSize: serie.textStyle.fontSize,
                            show: true
                        };
                        tempRect.text.show = serie.textShow;
                        if (tempRect.text.fontSize + 2 >= tempRect.height) {
                            tempRect.text.show = false;
                        }

                        // 特殊处理高度为0的且不堆积的情况,将0显示出来
                        if (tempRect.height === 0 && series.length === 1) {
                            tempRect.text.show = true;
                            tempRect.text.y -= tempRect.text.fontSize/1.5;
                        }


                        if (labelObj) {

                            // 最小显示高度5
                            var minHeight = 5;
                            var labelHeight = 14;
                            var fontSzie = 12;
                            var labelWidth = labelObj.value.length * fontSzie + 10;


                            var label = {
                                x: tempRect.x,
                                y: tempRect.y,
                                height: labelHeight,
                                width: labelWidth,
                                color: labelObj.color,
                                text: {
                                    value: labelObj.value,
                                    x: tempRect.x + labelWidth / 2,
                                    y: tempRect.y + labelHeight / 2 + fontSzie / 2 - 2,
                                    fontSize: fontSzie
                                }
                            };

                            if (tempRect.height / 2 < (tempRect.text.fontSize / 2 + label.height)) {

                                // 这种情况是已经没有什么位置给label显示了
                                label.showValue = false;
                                label.height = minHeight;
                            } else {
                                label.showValue = true;
                            }

                            if (labelWidth > tempRect.width) {
                                label.showValue = false;
                                label.width = tempRect.width / 2;
                            }

                            labelData.push(label);
                        }


                        bottomY = tempRect.y;
                        rects.push(tempRect);
                    } else {
                        // tempRect[k].y = this.yRange;
                        // tempRect[k].height = 0;

                        var tempRect = {
                            x: rectX,
                            width: 0,
                            height: 0,
                            color: serie.color,
                            idx: serie.idx
                        };

                        tempRect.text = {
                            x: 0,
                            y: 0,
                            value: 0,
                            color: serie.textStyle.color,
                            fontSize: 0,
                            show: false
                        };

                        tempRect.y = bottomY;
                        rects.push(tempRect);

                    }

                }

                var maxWidth = 0;
                var maxMargin = 0;
                for (var index = 0; index < rects.length; index++) {
                    if (rects[index].width > 0) {
                        maxWidth = rects[index].width;
                        maxMargin = rectMargin;
                        break;
                    }
                }

                rectX += maxWidth + maxMargin;
                rectsList = rectsList.concat(rects);

            }

            this.rectsData[i].rectsData = rectsList;
            this.rectsData[i].labelData = labelData;
        }
    }

    function __renderLabel() {

        // 添加rect
        var labelList = this.rectWrapperList.selectAll('.xc-bar-label-rect')
            .data(function (d) {
                return d.labelData;
            });

        labelList.exit().remove();
        labelList = labelList.enter()
            .append('rect')
            .classed('xc-bar-label-rect', true)
            .merge(labelList);


        labelList.attr('x', function (d) {
            return d.x;
        })
            .attr('y', function (d) {
                return d.y;
            })
            .attr('width', function (d) {
                return d.width;
            })
            .attr('height', function (d) {
                return d.height;
            })
            .attr('fill', 'transparent');


        // 添加text
        var textList = this.rectWrapperList.selectAll('.xc-bar-label-text')
            .data(function (d) {
                return d.labelData;
            });
        textList.exit().remove();
        textList = textList.enter()
            .append('text')
            .classed('xc-bar-label-text', true)
            .merge(textList);


        textList.attr('x', function (d) {
            return d.text.x;
        })
            .attr('y', function (d) {
                return d.text.y;
            })
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', function (d) {
                return d.text.fontSize;
            })
            .text('');

        this.on('drawBarEnd.barLabel', function () {
            textList.text(function (d) {

                if (d.showValue === false) {
                    return '';
                }

                return d.text.value;
            });
            labelList.attr('fill', function (d) {
                return d.color;
            });
        });


    }

    function __renderBarWrapper() {
        var that = this;
        var bar = this.main
            .selectAll('.xc-bar')
            .data([1]);
        bar = bar.enter()
            .append('g')
            .classed('xc-bar', true)
            .attr('transform', function () {
                return 'translate(' + that.outWidth + ',0)';
            })
            .merge(bar);
        return bar;
    }

    function __renderRectWrapper() {
        var rectWrapperList = this.bar.selectAll('.xc-bar-rectWrapper')
            .data(this.rectsData);
        rectWrapperList = rectWrapperList.enter()
            .append('g')
            .classed('xc-bar-rectWrapper', true)
            .merge(rectWrapperList);
        rectWrapperList.attr('transform', function (d) {
            return 'translate(' + d.x + ',' + d.y + ')';
        });
        return rectWrapperList;
    }

    function __renderRect(animationEase, animationTime) {
        var that = this;
        var rectList = this.rectWrapperList
            .selectAll('.xc-bar-rect')
            .data(function (d) {
                return d.rectsData;
            });
        rectList = rectList.enter()
            .append('rect')
            .classed('xc-bar-rect', true)
            .attr('x', function (d) {
                return d.x;
            })
            .attr('y', this.yRange)
            .attr('width', function (d) {
                return d.width;
            })
            .attr('height', 0)
            .attr('fill', function (d) {
                return d.color;
            })
            .attr('data-index', function (d) {
                return d.idx;
            })
            // 没办法只控制rect的某一个角,暂时不用rx,ry,后期可以考虑用path来画
            // 通过js设置rx和ry是因为
            // .attr('rx', 5)
            // .attr('ry', 5)
            .merge(rectList);
        var transition = rectList.transition()
            .duration(animationTime)
            .ease(animationEase)
            .attr('x', function (d) {
                return d.x;
            })
            .attr('y', function (d) {
                return d.y;
            })
            .attr('width', function (d) {
                return d.width;
            })
            .attr('height', function (d) {
                return d.height;
            });
        var flag = false;
        transition.on('end.bar', function () {
            if (flag === false) {
                that.fire('drawBarEnd')
            } else {
                flag = true;
            }
        });
        return rectList;
    }

    function __legendReady() {
        __legendMouseenter.apply(this);
        __legendMouseleave.apply(this);
        __legendClick.apply(this);
    }

    function __legendMouseenter() {
        var _this = this;
        this.on('legendMouseenter.bar', function (name) {
            // 取出对应rect的idx
            var idx = 0;
            for (var i = 0; i < _this.seriesList.length; i++) {
                if (_this.seriesList[i].name == name) {
                    idx = _this.seriesList[i].idx;
                    break;
                }
            }
            // 把对应的矩形透明度设成0.5
            _this.rectList._groups.forEach(function (rectArr) {

                rectArr.forEach(function (rect) {
                    if (rect.__data__.idx === idx) {
                        d3.select(rect)
                            .attr('fill-opacity', 0.5);
                    }
                });

            });
        });
    }

    function __legendMouseleave() {
        var _this = this;
        this.on('legendMouseleave.bar', function (name) {
            // 取出对应rect的idx
            var idx = 0;
            for (var i = 0; i < _this.seriesList.length; i++) {
                if (_this.seriesList[i].name == name) {
                    idx = _this.seriesList[i].idx;
                    break;
                }
            }
            // 把对应的矩形透明度的属性去掉
            _this.rectList._groups.forEach(function (rectArr) {

                rectArr.forEach(function (rect) {
                    if (rect.__data__.idx === idx) {
                        d3.select(rect)
                            .attr('fill-opacity', null);
                    }
                });


            });
        });
    }

    function __legendClick() {
        var _this = this;
        this.on('legendClick.bar', function (nameList) {
            _this._reRenderBars(nameList);
        });
    }

    function __tooltipReady() {
        if (this.config.tooltip.trigger == 'axis') {
            this._tooltipSectionChange();
        } else {
            //TODO 待添加trigger为 'item'时的tooltip事件
        }
    }

    function defaultFormatter(name, value) {
        var htmlStr = '';
        htmlStr += "<div>" + name + "：" + value + "</div>";
        return htmlStr;
    }


    /**
     * label对象转化为数据,和xAxis.data一一对应
     * @param data
     * @param label
     */
    function labelToArray(data, label) {
        label = label || {};
        var list = [];
        var keys = Object.keys(label);
        for (var i = 0; i < data.length; i++) {
            list[i] = null;
            for (var j = 0; j < keys.length; j++) {
                var obj = label[keys[j]];
                if (obj.xAxis == data[i]) {
                    list[i] = obj;
                    break;
                }
            }
        }
        return list;
    }

    function defaultConfig() {
        /**
         * @var bar
         * @type Object
         * @extends xCharts.series
         * @description 柱状图配置项
         */
        var config = {
            /**
             * @var type
             * @type String
             * @description 指定图表类型
             * @values 'bar'
             * @extends xCharts.series.bar
             */
            type: 'bar',
            /**
             * @var name
             * @type String
             * @description 数据项名称
             * @extends xCharts.series.bar
             */
            // name: '',
            /**
             * @var data
             * @type Array
             * @description 柱状图数据项对应的各项指标的值的集合
             * @extends xCharts.series.bar
             */
            // data: [],
            /**
             * @var formatter
             * @type function
             * @description 数据项信息展示文本的格式化函数
             * @extends xCharts.series.bar
             */
            // formatter: function(name, value) {},
            /**
             * @var
             * @type Number|String
             * @description 堆栈柱状图使用,相同stack会被堆叠为一个柱子
             * @extends xCharts.series.bar
             */
            // stack: 'one',
            /**
             * @var label
             * @type Array
             * @description 添加左上角label
             * @extends xCharts.series.bar
             * @example
             *  [{
             *      xAxis: '语文',
             *      value:'下降',
             *       color:'#344c09'
             *  }]
             */
            // label: [{
            /**
             * @var xAxis
             * @type String
             * @description 与xAxis.data值对应
             * @extends xCharts.series.bar.label
             */
            // xAxis: '语文',
            /**
             * @var value
             * @type String
             * @description label的显示文本
             * @extends xCharts.series.bar.label
             */
            // value: '语文',
            /**
             * @var color
             * @type String
             * @description 文本的颜色
             * @extends xCharts.series.bar.label
             */
            // color: '#fff',
            // }]
        };
        return config;
    }

    // TODO 设置全局的bar变量,控制间隔啊之类的
    function barDefaultConfig() {
        /**
         * @var bar
         * @type Object
         * @extends xCharts
         * @description 柱状图通用配置项
         */
        var config = {
            /**
             * @var textShow
             * @type Boolean
             * @extends xCharts.bar
             * @description 是否在柱状图中心显示文字
             * @default false
             */
            textShow: false,
            /**
             * @var textFormat
             * @type Function
             * @extends xCharts.bar
             * @description 格式化文字
             * @example
             *  function (data, index) {
             *       return value;
             *   },
             */
            textFormat: function (data, index) {
                return data;
            },
            /**
             * @var textStyle
             * @type Object
             * @extends xCharts.bar
             * @description 文字样式
             */
            textStyle: {
                /**
                 * @var fontSize
                 * @type Number
                 * @extends xCharts.bar.textStyle
                 * @description 文字大小
                 * @default 14
                 */
                fontSize: 14,
                /**
                 * @var color
                 * @type String
                 * @extends xCharts.bar.textStyle
                 * @description 文字颜色
                 * @default #fff
                 */
                color: '#fff'
            },
            /**
             * @var hoverOpacity
             * @type Number
             * @extends xCharts.bar
             * @description 鼠标响应legend透明度
             * @default 0.5
             */
            hoverOpacity: 0.5,
            /**
             * @var label
             * @type Array
             * @extends xCharts.bar
             * @description 类似于小tip
             */
            // label:[{
            /**
             * @var xAxis
             * @type Any
             * @extends xCharts.bar.label
             * @description 和xAxis轴上的data对应
             */
            // xAxis: 1,
            /**
             * @var value
             * @type Any
             * @extends xCharts.bar.label
             * @description 显示文字
             */
            // value: 1,
            /**
             * @var color
             * @type Any
             * @extends xCharts.bar.label
             * @description 背景色
             */
            // color: #fff,
            // }],
            /**
             * @var barGap
             * @type Number
             * @extends xCharts.bar
             * @description 组内每个bar之间的间隔
             * @default 10
             */
            barGap: 10,
            /**
             * @var legendShow
             * @type Boolean
             * @extends xCharts.bar
             * @description 控制legend默认显示情况,false 默认不显示
             * @default true
             */
            legendShow: true,
            /**
             * @var paddingOut
             * @type Number
             * @extends xCharts.bar
             * @description 柱状图最左边和最右边距离Y坐标的间距,越大空白越大
             * @default 0.05
             * @value 0-1
             */
            paddingOuter: 0.05,
            /**
             * @var paddingInner
             * @type Number
             * @extends xCharts.bar
             * @description 柱状图每组柱子与柱子之间的间距,越大距离越大,如果想控制组内柱子的间距请使用barGap
             * @default 0
             * @value 0-1
             */
            paddingInner: 0,
            /**
             * @var background
             * @type Object
             * @extends xCharts.bar
             * @description 每一组柱子的背景
             */
            background: {
                /**
                 * @var enable
                 * @type Boolean
                 * @extends xCharts.bar.background
                 * @description 是否显示背景区分
                 * @default true
                 */
                enable: true,
                /**
                 * @var oddOpacity
                 * @type Number
                 * @extends xCharts.bar.background
                 * @description 奇数列颜色透明度
                 * @default 0.8
                 */
                oddOpacity: 0.8,
                /**
                 * @var oddColor
                 * @type String
                 * @extends xCharts.bar.background
                 * @description 奇数列颜色
                 * @default #eee
                 */
                oddColor: '#eee',
                /**
                 * @var evenOpacity
                 * @type Number
                 * @extends xCharts.bar.background
                 * @description 偶数列颜色透明度
                 * @default 0.4
                 */
                evenOpacity: 0.4,
                /**
                 * @var evenColor
                 * @type String
                 * @extends xCharts.bar.background
                 * @description 偶数列颜色
                 * @default #eee
                 */
                evenColor: '#eee'
            }
        };

        return config;
    }

}(xCharts, d3));
/**
 * @file 柱状图(移动端)
 * @date 2016-05-30
 * @author chenxuan.cx@gmail.com
 */
(function(xCharts, d3) {
    var utils = xCharts.utils;
    var charts = xCharts.charts;
    var bar = charts.bar;

    bar.prototype.extend({
        mobileReady: function() {
            if(this.config.legend && this.config.legend.show) {
                __legendMobileReady.apply(this);
            }
            if(this.config.tooltip && this.config.tooltip.show) {
                __tooltipMobileReady.apply(this);
            }
        }
    });
    function __legendMobileReady() {
        __legendTouch.apply(this);
    }
    function __legendTouch() {
        var _this = this;
        this.on('legendClick.bar', function(nameList) {
            _this._reRenderBars(nameList);
            _this.messageCenter.components.tooltip.hiddenTooltip();
        });
    }
    function __tooltipMobileReady() {
        if(this.config.tooltip.trigger == 'axis') {
            this._tooltipSectionChange();
        } else {
            //TODO 待添加trigger为 'item'时的tooltip事件
        }
    }
}(xCharts, d3));
/**
 * @file 饼图
 * @author chenwubai.cx@gmail.com
 */
// TODO 把代码里的魔数尽量提出来作为配置项
(function(xCharts, d3) {
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;

    // 创建pie构造函数
    function pie(messageCenter, config) {
        // 调用这一步的原因是为了继承属性
        Chart.call(this, messageCenter, config, 'pie');
    }

    // 在xCharts中注册pie构造函数
    xCharts.charts.extend({ pie: pie });
    // 从父类Chart里继承一系列的方法
    utils.inherits(pie, Chart);

    pie.prototype.extend = xCharts.extend;
    pie.prototype.extend({
        // config是option的深拷贝的对象
        // series是config里的series的引用,修改series后config内部也会相应修改
        init: function(messageCenter, config, type, series) {
            // 提取饼图配置项(目前不支持多图,直接忽略其他图表配置项)
            for(var i=0, length=series.length;i<length;i++) {
                if(series[i].type === 'pie') {
                    this.pieConfig = utils.copy(series[i], true);
                    break;
                }
            }
            // 合并默认值, 转换百分比为数值等
            __correctConfig.apply(this);
            // 转化原始数据为画弧形需要的数据
            this.pieData = __getPieData(this.pieConfig.data);
            // 生成弧形路径计算函数
            this.arcFunc = __getArcFunc(this.pieConfig.radius);
            this.bigArcFunc = __getBigArcFunc(this.pieConfig.radius);
            this.textArcFunc = __getTextArcFunc(this.pieConfig.radius);
        },
        render: function(animationEase, animationTime) {
            // 添加饼图g容器
            this.pieWrapper = __renderPieWrapper.apply(this);
            // 添加弧形
            this.arcList = __renderArcs.apply(this, [animationEase, animationTime]);
            if(this.mobileMode) {
                this.mobileRender(animationEase, animationTime);
            } else if(this.pieConfig.labels && this.pieConfig.labels.enable) {
                // 添加文字标签
                this.textList = __renderText.apply(this, [animationEase, animationTime]);
                // 添加连接弧形和文字标签的线条
                this.textLineList = __renderTextLine.apply(this, [animationEase, animationTime]);
            }
        },
        ready: function() {
            if(this.mobileMode) {
                this.mobileReady();
            } else {
                if(this.config.legend && this.config.legend.show) {
                    __legendReady.apply(this);
                }
                if(this.config.tooltip && this.config.tooltip.show) {
                    __tooltipReady.apply(this);
                }
            }
        },
        _reRenderArcs: function(nameList) {
            var animationConfig = this.config.animation;
            if(!nameList.length) {
                this.pieData.forEach(function(d) {
                    d.startAngle = 0;
                    d.endAngle = 0;
                    d.data.isShow = false;
                });
            } else {
                // 先把所有弧形的可见配置设为不可见
                this.pieConfig.data.forEach(function(d) {
                    d.isShow = false;
                    d.value = 0;
                });
                for(var i=0;i<nameList.length;i++) {
                    var name = nameList[i];
                    for(var k=0;k<this.pieConfig.data.length;k++) {
                        if(this.pieConfig.data[k].name == name) {
                            this.pieConfig.data[k].isShow = true;
                            this.pieConfig.data[k].value = this.pieConfig.data[k].initialValue;
                            break;
                        }
                    }
                }
                this.pieData = __getPieData(this.pieConfig.data);
            }
            __renderArcs.apply(this, [animationConfig.animationEase, animationConfig.animationTime]);
            if(this.pieConfig.labels && this.pieConfig.labels.enable) {
                if(this.mobileMode) {
                    this.__renderMobileText(animationConfig.animationEase, animationConfig.animationTime);
                    return;
                }
                __renderText.apply(this, [animationConfig.animationEase, animationConfig.animationTime]);
                __renderTextLine.apply(this, [animationConfig.animationEase, animationConfig.animationTime]);
            }
        },
        _defaultTooltipFormatter: function (name, value) {
            return "<div>" + name + '：' + value + "</div>";
        }
    });
    
    /**
     * @description 合并默认值,转换百分比,并添加一些属性
     */
    function __correctConfig() {
        // 合并默认值
        this.pieConfig = utils.merage(defaultConfig(), this.pieConfig);
        // 计算饼图原点
        var center = this.pieConfig.center;
        if(typeof center[0] === 'string') {
            center[0] = parseInt(center[0]) * 0.01 * this.width;
        }
        if(typeof center[1] === 'string') {
            center[1] = parseInt(center[1]) * 0.01 * this.height;
        }
        // 计算饼图半径
        var radius;
        if(this.mobileMode && this.pieConfig.mRadius.outerRadius) {
            radius = this.pieConfig.mRadius;
        } else {
            radius = this.pieConfig.radius;
        }
        if(typeof radius.innerRadius === 'string') {
            radius.innerRadius = parseInt(radius.innerRadius) * 0.01 * this.width;
        }
        if(typeof radius.outerRadius === 'string') {
            radius.outerRadius = parseInt(radius.outerRadius) * 0.01 * this.width;
        }
        this.pieConfig.radius = radius;
        // 添加对饼图大小的处理,如果半径太大,自动把半径保持在可控的最大值
        // 这里只考虑了原点在[50%, 50%]的位置,如果原点在其他位置该处理不能起到作用
        var minLength = this.width<this.height ? this.width : this.height;
        if(radius.outerRadius*2 > minLength) {
            radius.outerRadius = minLength/2;
        }
        // 添加一些属性供后面render和ready使用
        this.pieConfig.data.forEach(function(d) {
            d.isShow = true;
            d.initialValue = d.value;
        });
    }
    function __getPieData(data) {
        var pieFunc = d3.pie()
            .sort(null)
            .value(function(d, i) {
                return d.value;
            }),
            pieData = pieFunc(data);
        return pieData;
    }
    function __getArcFunc(radius) {
        var arcFunc = d3.arc()
            .innerRadius(radius.innerRadius)
            .outerRadius(radius.outerRadius);
        return arcFunc;
    }
    function __getBigArcFunc(radius) {
        var distance = 10;
        var bigArcFunc = d3.arc()
            .innerRadius(radius.innerRadius)
            .outerRadius(radius.outerRadius + distance);
        return bigArcFunc;
    }
    function __getTextArcFunc(radius) {
        var mulriple = 1.1;
        var textArcFunc = d3.arc()
            .innerRadius(radius.outerRadius * mulriple)
            .outerRadius(radius.outerRadius * mulriple);
        return textArcFunc;
    }
    function __renderPieWrapper() {
        var pieWrapper = this.main
            .selectAll('.xc-pie')
            .data([1]);
        pieWrapper = pieWrapper.enter()
            .append('g')
            .classed('xc-pie', true)
            .merge(pieWrapper);
        pieWrapper.attr('transform', 'translate(' + this.pieConfig.center[0] + ',' + this.pieConfig.center[1] + ')');
        return pieWrapper;
    }
    function __renderArcs(animationEase, animationTime) {
        var _self = this;
        // 这里selectAll和enter不要连续写
        // arcs = var.selectAll.enter.append
        // arcs = var.selectAll; arcs.enter.append
        // 上面两种方式得到的arcs是不一样的
        var arcs = this.pieWrapper
            .selectAll('.xc-pie-arcs')
            .data([1]);
        arcs = arcs.enter()
            .append('g')
            .classed('xc-pie-arcs', true)
            .merge(arcs);
        var arcList = arcs.selectAll('.xc-pie-arc')
            .data(this.pieData);
        // 如果不是初次加载,则enter这一步什么都不会做
        arcList = arcList.enter()
            .append('path')
            .classed('xc-pie-arc', true)
            .style('fill', function(d) {
                if(!d.data.color) {
                    d.data.color = _self.getColor(d.data.idx);
                }
                return d.data.color;
            })
            .merge(arcList);
        arcList.transition()
            .duration(animationTime)
            .ease(animationEase)
            .attrTween('d', function(d) {
                this._current = this._current || {startAngle: 0, endAngle: 0};
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(1);
                return function (t) {
                    return _self.arcFunc(interpolate(t));
                }
            });
        return arcList;
    }
    function __renderText(animationEase, animationTime) {
        var _this = this;
        var texts = this.pieWrapper
            .selectAll('.xc-pie-texts')
            .data([1]);
        texts = texts.enter()
            .append('g')
            .classed('xc-pie-texts', true)
            .merge(texts);
        var textList = texts.selectAll('.xc-pie-text')
            .data(this.pieData);
        textList = textList.enter()
            .append('text')
            .classed('xc-pie-text', true)
            // TODO 后面考虑是否把这个提成配置项
            .attr('dy', '0.35em')
            .attr('fill', function(d) {
                return d.data.color;
            })
            .text(function(d) {
                var formatter = _this.pieConfig.labels.formatter || defaultLabelFormatter;
                return formatter(d.data.name, d.data.value);
            })
            .merge(textList);
        textList.transition()
            .duration(animationTime)
            .ease(animationEase)
            .attr('transform', function(d) {
                // 找出外弧形的中心点
                var pos = _this.textArcFunc.centroid(d);
                // 适当改变文字标签的x坐标
                pos[0] = _this.pieConfig.radius.outerRadius * (midAngel(d)<Math.PI ? 1.2 : -1.2);
                return 'translate(' + pos + ')';
            })
            .style('display', function(d) {
                return d.data.isShow ? null : 'none';
            })
            .style('text-anchor', function(d) {
                return midAngel(d)<Math.PI ? 'start' : 'end';
            });
    }
    function __renderTextLine(animationEase, animationTime) {
        var _this = this;
        var arcFunc = d3.arc()
            .innerRadius(this.pieConfig.radius.outerRadius * 1.05)
            .outerRadius(this.pieConfig.radius.outerRadius * 1.05);
        var textLines = this.pieWrapper
            .selectAll('.xc-pie-textLines')
            .data([1]);
        textLines = textLines.enter()
            .append('g')
            .classed('xc-pie-textLines', true)
            .merge(textLines);
        var textLineList = textLines.selectAll('.xc-pie-textLine')
            .data(this.pieData);
        textLineList = textLineList.enter()
            .append('polyline')
            .classed('xc-pie-textLine', true)
            .attr('points', function(d) {
                return [arcFunc.centroid(d), arcFunc.centroid(d), arcFunc.centroid(d)];
            })
            .merge(textLineList);
        textLineList.transition()
            .duration(animationTime)
            .ease(animationEase)
            .attr('points', function(d) {
                // 找出外弧形的中心点
                var pos = _this.textArcFunc.centroid(d);
                // 适当改变文字标签的x坐标
                pos[0] = _this.pieConfig.radius.outerRadius * (midAngel(d)<Math.PI ? 1.2 : -1.2);
                return [arcFunc.centroid(d), _this.textArcFunc.centroid(d), pos];
            })
            .style('display', function(d) {
                return d.data.isShow ? null : 'none';
            });
    }
    function __legendReady() {
        // 绑定hover事件
        __legendMouseEnter.apply(this);
        __legendMouseLeave.apply(this);

        // 绑定click事件
        __legendClick.apply(this);
    }
    function __legendMouseEnter () {
        var _this = this;
        this.on('legendMouseenter.pie', function(name) {
            for(var i=0;i<_this.arcList._groups[0].length;i++) {
                var arcEle = d3.select(_this.arcList._groups[0][i]);
                if(arcEle.datum().data.name == name) {
                    arcEle.attr('d', function(d) {
                        return _this.bigArcFunc(d);
                    });
                    break;
                }
            }
        });
    }
    function __legendMouseLeave () {
        var _this = this;
        this.on('legendMouseleave.pie', function(name) {
            for(var i=0;i<_this.arcList._groups[0].length;i++) {
                var arcEle = d3.select(_this.arcList._groups[0][i]);
                if(arcEle.datum().data.name == name) {
                    arcEle.attr('d', function(d) {
                        return _this.arcFunc(d);
                    });
                    break;
                }
            }
        });
    }
    function __legendClick () {
        var _this = this;
        this.on('legendClick.pie', function(nameList) {
            _this._reRenderArcs(nameList);
        });
    }
    function __tooltipReady() {
        __tooltipMouseMove.apply(this);
        __tooltipMouseOut.apply(this);
    }
    function __tooltipMouseMove() {
        var _this = this;
        var tooltip = this.messageCenter.components.tooltip;
        this.arcList.on('mousemove.pie', function() {
            var bindData = d3.select(this).datum();
            var position = d3.mouse(_this.svg.node());
            position = [
                position[0] + 10,
                position[1] + 10
            ];
            var tooltipFormatter = tooltip.tooltipConfig.formatter,
                pieFormatter = _this.pieConfig.formatter;
            var formatter = pieFormatter || tooltipFormatter || _this._defaultTooltipFormatter;
            tooltip.setTooltipHtml(formatter(bindData.data.name, bindData.data.value));
            tooltip.showTooltip();
            tooltip.setPosition(position);

            d3.select(this).attr('d', function(d) {
                return _this.bigArcFunc(d);
            });
        });
    }
    function __tooltipMouseOut() {
        var _this = this;
        var tooltip = this.messageCenter.components.tooltip;
        this.arcList.on('mouseout.pie', function() {
            tooltip.hiddenTooltip();
            d3.select(this).attr('d', function(d) {
                return _this.arcFunc(d);
            });
        });
    }
    function defaultLabelFormatter(name) {
        return name;
    }
    function midAngel(d) {
        return d.startAngle + (d.endAngle - d.startAngle)/2;
    }
    function defaultConfig() {
        /**
         * @var pie
         * @type Object
         * @extends xCharts.series
         * @description 饼图配置项
         */
        var config = {
            /**
             * 定义图表类型是饼图
             * @var type
             * @type String
             * @description 指定图表类型
             * @values 'pie'
             * @extends xCharts.series.pie
             */
            type: 'pie',
            /**
             * @var center
             * @type Array
             * @description 饼图圆心位置，可为百分比或数值。若为百分比则center[0]（圆心x坐标）参照容器宽度，center[1]（圆心y坐标）参照容器高度。
             * @default ['50%','50%']
             * @extends xCharts.series.pie
             */
            center: ['50%', '50%'],
            /**
             * @var radius
             * @type Object
             * @description 定义饼图的内半径和外半径
             * @extends xCharts.series.pie
             */
            radius: {
                /**
                 * @var outerRadius
                 * @type String|Number
                 * @description 定义饼图的外半径，可取百分比或数值，若为百分比则参照容器宽度进行计算。
                 * @default '30%'
                 * @extends xCharts.series.pie.radius
                 */
                outerRadius: '30%',
                /**
                 * @var innerRadius
                 * @type String|Number
                 * @description 定义饼图的内半径，可取百分比或数值，若为百分比，则参照容器宽度进行计算。
                 * @default 0
                 * @extends xCharts.series.pie.radius
                 */
                innerRadius: 0
            },
            mRadius: {
                innerRadius: 0
            },
            /**
             * @var labels
             * @type Object
             * @description 定义饼图弧形的文字标签
             * @extends xCharts.series.pie
             */
            labels: {
                /**
                 * @var enable
                 * @type Boolean
                 * @description 定义是否绘制弧形的文字标签
                 * @default false
                 * @extends xCharts.series.pie.labels
                 */
                enable: false,
                /**
                 * @var formatter
                 * @type Function
                 * @description 定义弧形的文字标签的显示格式
                 * @default 返回弧形的名称
                 * @extends xCharts.series.pie.labels
                 */
                formatter: defaultLabelFormatter,
                mobileFormatter: function (name, value, percentage) {
                    return name;
                }
            },
            /**
             * @var data
             * @type Array
             * @description 饼图数据
             * @extends xCharts.series.pie
             */
            data: [
                {
                    /**
                     * @var name
                     * @type String
                     * @description 弧形名称
                     * @extends xCharts.series.pie.data
                     */
                    // name: '',
                    /**
                     * @var value
                     * @type Number
                     * @description 弧形所代表的项的数据值
                     * @extends xCharts.series.pie.data
                     */
                    // value: 0
                }
            ]
        }
        return config;
    }
}(xCharts, d3));
/**
 * @file 饼图(移动端)
 * @date 2016-05-30
 * @author chenxuan.cx@gmail.com
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var charts = xCharts.charts;
    var pie = charts.pie;

    pie.prototype.extend({
        mobileRender: function (animationEase, animationTime) {
            if(this.pieConfig.labels && this.pieConfig.labels.enable) {
                this.textList = this.__renderMobileText(animationEase, animationTime);
            }
        },
        mobileReady: function() {
            if(this.config.legend && this.config.legend.show) {
                __legendMobileReady.apply(this);
            }
            if(this.config.tooltip && this.config.tooltip.show) {
                __tooltipMobileReady.apply(this);
            }
        },
        __renderMobileText: function(animationEase, animationTime) {
            var _this = this;
            var texts = this.pieWrapper
                .selectAll('.xc-pie-m-texts')
                .data([1]);
            texts = texts.enter()
                .append('g')
                .classed('xc-pie-m-texts', true)
                .merge(texts);
            var textList = texts.selectAll('.xc-pie-m-text')
                .data(this.pieData);
            textList = textList.enter()
                .append('text')
                .classed('xc-pie-m-text', true)
                .attr('dy', '.35em')
                .attr('fill', function (d) {
                    return '#fff';
                })
                .text(function (d) {
                    return _this.pieConfig.labels.mobileFormatter(d.data.name);
                })
                .merge(textList);
            textList.transition()
                .duration(animationTime)
                .ease(animationEase)
                .attr('transform', function(d) {
                    // 找出外弧形的中心点
                    var pos = _this.arcFunc.centroid(d);
                    // 适当改变文字标签的x坐标
                    // pos[0] = _this.pieConfig.radius.outerRadius * (midAngel(d)<Math.PI ? 1.2 : -1.2);
                    return 'translate(' + pos + ')';
                })
                .style('display', function(d) {
                    return d.data.isShow ? null : 'none';
                })
                .style('text-anchor', function(d) {
                    return 'middle';
                });
        }
    });

    function __legendMobileReady() {
        __legendTouch.apply(this);
    }
    function __legendTouch() {
        var _this = this;
        this.on('legendClick.pie', function(nameList) {
            _this._reRenderArcs(nameList);
            _this.messageCenter.components.tooltip.hiddenTooltip();
        });
    }
    function __tooltipMobileReady() {
        __tooltipTouch.apply(this);
    }
    function __tooltipTouch() {
        var _this = this;
        var tooltip = this.messageCenter.components.tooltip;
        this.arcList.on('touchstart.pie', function () {
            var bindData = d3.select(this).datum();
            var bigD = _this.bigArcFunc(bindData);
            if(bigD === d3.select(this).attr('d')) {

                // 此时弧形处于放大的状态,应该被恢复正常状态并隐藏tooltip
                d3.select(this).attr('d', function(d) {
                    return _this.arcFunc(d);
                });
                tooltip.hiddenTooltip();
            } else {

                // 此时弧形处于正常状态,应该被放大并且显示tooltip
                _this.arcList.attr('d', function (d) {
                    return _this.arcFunc(d);
                });
                d3.select(this).attr('d', function(d) {
                    return _this.bigArcFunc(d);
                });

                var position = d3.mouse(_this.svg.node());
                position = [
                    position[0] + 10,
                    position[1] + 10
                ];
                var tooltipFormatter = tooltip.tooltipConfig.formatter;
                var pieFormatter = _this.pieConfig.formatter;
                var formatter = pieFormatter || tooltipFormatter || _this._defaultTooltipFormatter;
                tooltip.setTooltipHtml(formatter(bindData.data.name, bindData.data.value));
                tooltip.showTooltip();
                tooltip.setPosition(position);
            }
        });
    }
}(xCharts, d3));

/**
 * 漏斗图
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;
    xCharts.charts.extend({funnel: funnel});
    utils.inherits(funnel, Chart);

    function funnel(messageCenter, config) {
        Chart.call(this, messageCenter, config, 'funnel');
    }

    funnel.prototype.extend = xCharts.extend;
    funnel.prototype.extend({
        init: function (messageCenter, config, type, series) {
            var _this = this;
            _this.series = parseSeries(series, _this);
        },
        render: function (animationEase, animationTime) {
            //注意一个serie就是一个图
            var _this = this;
            var animationConfig = _this.config.animation;

            var funnelGroup = _this.main.selectAll('.xc-funnel-group')
                .data(_this.series);

            funnelGroup = funnelGroup.enter().append('g')
                .attr('class', 'xc-funnel-group')
                .merge(funnelGroup);

            funnelGroup.exit().remove();//updateSeries时，删除多余的组

            funnelGroup.attr('transform', function (serie) {
                return 'translate(' + serie.xOffset + ',' + serie.yOffset + ')';
            })
            //画区块
            var funnelSection = funnelGroup.selectAll('.xc-funnel-section').data(function (serie) {
                return serie.data;
            });
            funnelSection = funnelSection.enter().append('path')
                .attr('class', 'xc-funnel-section')
                .merge(funnelSection)

            funnelSection.attr('fill', function (d) {
                    return _this.getColor(d.idx);
                })
                .transition()
                .ease(animationEase)
                .duration(animationTime)
                .attrTween('d', function (d) {

                    if (this.pathArr === undefined) {
                        var pathArr = utils.copy(d.pathArr, true);
                        pathArr[2][1] = pathArr[2][1] * 0.95;
                        pathArr[3][1] = pathArr[3][1] * 0.95;
                        this.pathArr = pathArr;
                    }

                    // this.pathArr = this.pathArr === undefined ? d.pathArr : this.pathArr;
                    var interpolate = d3.interpolate(this.pathArr, d.pathArr);
                    this.pathArr = d.pathArr;
                    return function (t) {
                        return buildFunnelPath(interpolate(t));
                    }
                });

            //画label
            var funnelLabel = funnelGroup.selectAll('.xc-funnel-label')
                .data(function (serie) {
                    return serie.data;
                });

            var transitionStr = "opacity " + animationConfig.animationTime + "ms linear";

            funnelLabel = funnelLabel.enter().append('g')
                .attr('class', 'xc-funnel-label')
                .style("transition", transitionStr)
                .merge(funnelLabel);

            funnelLabel.exit().remove();
            funnelLabel.attr('opacity', function (d) {
                    if (d.show == false)
                        return 0;
                    else
                        return 1;
                })
                .transition()
                .ease(animationEase)
                .duration(animationTime)
                .attrTween('transform', function (d) {

                    if (this.labelPosition === undefined) {
                        this.labelPosition = [d.labelPosition[0] * 1.1, d.labelPosition[1]];
                    }

                    // this.labelPosition = this.labelPosition === undefined ? d.labelPosition : this.labelPosition;
                    var interpolate = d3.interpolate(this.labelPosition, d.labelPosition);
                    this.labelPosition = d.labelPosition;
                    return function (t) {
                        return 'translate(' + interpolate(t) + ')';
                    }

                })

            var labelLine = funnelLabel.selectAll('.xc-funnel-label-line')
                .data(function (d) {
                    if (d.show != false)
                        return [d]
                    else
                        return [];
                });

            labelLine = labelLine.enter().append('path')
                .attr('class', 'xc-funnel-label-line')
                .merge(labelLine);

            labelLine.attr('d', function (d) {
                    return 'M0,0 L' + d.labelWidth + ',0';
                })
                .attr('stroke', function (d) {
                    return _this.getColor(d.idx);
                });

            var labelText = funnelLabel.selectAll('.xc-funnel-label-text')
                .data(function (d) {
                    if (d.show != false)
                        return [d]
                    else
                        return [];
                });

            labelText = labelText.enter().append('text')
                .attr('class', 'xc-funnel-label-text')
                .merge(labelText);
            labelText.text(function (d) {
                    return d.name
                })
                .attr('font-size', 14)
                .attr('x', function (d) {
                    return d.labelWidth + 5;
                })
                .attr('y', '0.2em');

            _this.funnelSection = funnelSection;
        },
        ready: function () {
            this.__legendReady();
            this.__tooltipReady();
        },
        __legendReady: function () {
            var _this = this;
            _this.on('legendMouseenter.funnel', function (name) {
                _this.funnelSection.attr('opacity', function (d) {
                    var op = 1;
                    if (d.name == name) op = d._serie.itemStyle.opacity
                    return op;
                });
            });
            _this.on('legendMouseleave.funnel', function () {
                _this.funnelSection.attr('opacity', 1);
            });
            _this.on('legendClick.funnel', function (nameList) {
                var series = legendClickSeries(_this.config.series, nameList);
                var animationConfig = _this.config.animation;
                _this.init(_this.series, _this.config, _this.type, series);
                _this.render(animationConfig.animationEase, animationConfig.animationTime);
            });
        },
        __tooltipReady: function () {
            if (!this.config.tooltip || this.config.tooltip.show === false || this.config.tooltip.trigger == 'axis') return;//未开启tooltip
            var _this = this;
            var tooltip = _this.messageCenter.components['tooltip'];
            var tooltipFormatter = tooltip.tooltipConfig.formatter;

            if (_this.mobileMode) {
                _this.mobileReady();
            } else {
                _this.funnelSection.on('mousemove.funnel', function (data) {
                    var event = d3.event;
                    var x = event.layerX || event.offsetX, y = event.layerY || event.offsetY;
                    var formatter = data._serie.formatter || tooltipFormatter || defaultFormatter;

                    var title = "<p>" + data._serie.name + "</p>";
                    tooltip.setTooltipHtml(title + formatter(data.name, data.value, (data.percentage * 100).toFixed(1)));
                    tooltip.setPosition([x, y]);
                });

                _this.funnelSection.on('mouseenter.funnel', function (data) {
                    d3.select(this).attr('opacity', data._serie.itemStyle.opacity);
                    tooltip.showTooltip();
                })

                _this.funnelSection.on('mouseleave.funnel', function () {
                    d3.select(this).attr('opacity', 1);
                    tooltip.hiddenTooltip();
                });
            }
        }
    });


    function legendClickSeries(series, nameList) {
        series.forEach(function (serie) {

            if (serie.type != 'funnel') return;

            serie.data.forEach(function (d) {
                if (inNameList(d.name, nameList)) d.show = true;
                else d.show = false;
            })
        })
        return series;
    }

    function inNameList(name, nameList) {
        for (var i = 0, n; n = nameList[i++];) {
            if (name == n)
                return true;
        }
        return false;
    }

    function buildFunnelPath(pathArr) {
        var dStr = 'M';
        dStr += pathArr[0];
        dStr += 'L' + pathArr[1];
        dStr += 'L' + pathArr[2];
        dStr += 'L' + pathArr[3];
        return dStr;
    }

    function parseSeries(series, that) {
        var funnelSeries = []
        for (var i = 0, s; s = series[i++];) {
            //第一步判断是否是漏斗图
            if (s.type != 'funnel') return;
            s = utils.merage(defaultConfig(), s);
            calcWidth(s, that);
            calcPosition(s, that);
            s.funnelPath = funnelPath(s);
            s.data.forEach(function (d, idx) {
                d.idx = d.idx == null ? idx : d.idx;
                d._serie = s;
                d.pathArr = s.funnelPath(idx);

                //计算label的位置
                var labelX = (d.pathArr[0][0] + d.pathArr[1][0]) / 2;
                var labelY = (d.pathArr[0][1] + d.pathArr[2][1]) / 2;
                d.labelPosition = [labelX, labelY];
                //计算label线的长度
                d.labelWidth = d.sectionWidth / 2 + 30;//30是突出多少
            });

            funnelSeries.push(s);
        }
        return funnelSeries;
    }


    function funnelPath(serie) {
        var width = serie.width, height = serie.height, data = serie.data, sort = serie.sort;
        //塔尖向下，从大到小排序，塔尖向上，从小到大排序
        data.sort(function (a, b) {
            var ret = a.value - b.value;
            if (sort == 'top') {
                return ret;
            } else {
                return -ret;
            }
        });
        //计算还有多少区块需要显示
        var length = data.length, maxValue = -Infinity;
        data.forEach(function (d) {
            if (d.show == false) length--;
            maxValue = d3.max([maxValue, parseFloat(d.value)])
        });
        var sectionHeight = height / length;//每个区块的高度
        //计算每个data对应的起点和终点
        var index = sort == 'top' ? 1 : 0,//如果是塔尖向上，则第一个变量的y坐标不是0，而是一个sectionHeigth的高度,该变量是用来计算区块y坐标
            position = [];
        data.forEach(function (d, i) {
            d.maxValue = maxValue;
            d.percentage = parseFloat(d.value) / maxValue;
            if (d.show == false) {
                position[i] = undefined;
                return
            }
            ;
            var sectionWidth = d.percentage * width;
            d.sectionWidth = sectionWidth;
            var xOffset = (width - sectionWidth) / 2;
            position[i] = [];
            position[i][0] = [xOffset, sectionHeight * index];
            position[i][1] = [xOffset + sectionWidth, sectionHeight * index];
            index++;
        });

        //保证每个区块是由四个点组成，所以塔尖需要两个重复的点
        if (sort == 'top') {
            var topP = [width / 2, 0];
            position.unshift([topP, topP]);
        } else {
            var bottomP = [width / 2, sectionHeight * index];
            position.push([bottomP, bottomP]);
        }
        //在第一次计算区块坐标时会导致show=false的position位置为undefined，这里根据塔尖方向的不同进行补全
        //主要是为了动画效果,show=false的时候，只是区块高度为0，并不代表没有这个区块
        for (var i = 0, len = position.length; i < len; i++) {
            var p = position[i];
            if (p != undefined) continue;
            var j = 1;
            //防止偏移后还是undefined
            while (position[i] === undefined) {
                if (sort == 'top')
                    position[i] = position[i - j];
                else
                    position[i] = position[i + j];

                j++;
            }

        }
        return function (idx) {
            //传入一个区块index，获取区块的4个点，依次是左上，又上，右下，左下
            if (idx < 0 || idx >= data.length) {
                console.error('内部代码错误,漏斗图获取区块%d，最大值为%d', idx, data.length);
            }
            var pathPoints = [];
            pathPoints[0] = position[idx][0], pathPoints[1] = position[idx][1];
            pathPoints[2] = position[idx + 1][1], pathPoints[3] = position[idx + 1][0];
            return pathPoints;
        }
    }

    /**
     * 计算每个漏斗图的宽高
     * @param serie
     * @param that
     */
    function calcWidth(serie, that) {
        var width = that.width, heigth = that.height, size = serie.size;
        var fw = size[0];
        if (typeof fw == 'string') {
            if (fw.substr(-1) === '%') {
                var percent = parseFloat(fw) / 100;
                fw = percent * width;
            } else if (fw.substr(-2) == 'px') {
                fw = parseFloat(fw);
            } else {
                fw = parseFloat(fw);
                if (isNaN(fw)) console.error("name:" + serie.name + " size[0] not support");
            }
        } else if (typeof  fw != 'number') {
            console.error("name:" + serie.name + " size[0] not support");
        }

        var fh = size[1];

        if (typeof fh == 'string') {
            if (fh.substr(-1) === '%') {
                var percent = parseFloat(fh) / 100;
                fh = percent * heigth;
            } else if (fh.substr(-2) == 'px') {
                fh = parseFloat(fh);
            } else {
                fh = parseFloat(fh);
                if (isNaN(fh)) console.error("name:" + serie.name + " size[1] not support");
            }
        } else if (typeof  fh != 'number') {
            console.error("name:" + serie.name + " size[1] not support");
        }
        serie.width = fw;
        serie.height = fh;
    }

    /**
     * 计算漏斗图的起始位置
     * @param series
     * @param that
     */
    function calcPosition(serie, that) {
        var width = that.width, height = that.height, x = serie.x, y = serie.y;
        var xOffset = 0, yOffset = 0;
        if (x == 'center') {
            xOffset = (width - serie.width) / 2;
        }
        else if (x == 'right') {
            xOffset = (width - serie.width);
        }
        else if (x.substr(-1) == '%') {
            xOffset = parseFloat(x) / 100 * width;
        } else {
            x = parseFloat(x);
            if (isNaN(x)) console.error("name:" + serie.name + " serie.x not support")
            else xOffset = x;
        }

        if (y == 'middle') {
            yOffset = (height - serie.height) / 2;
        }
        else if ('y' == 'bottom') {
            yOffset = (height - serie.height);
        }
        else if (y.substr(-1) == '%') {
            yOffset = parseFloat(y) / 100 * height;
        } else {
            y = parseFloat(y);
            if (isNaN(y)) console.error("name:" + serie.name + " serie.y not support")
            else yOffset = y;
        }
        serie.xOffset = xOffset;
        serie.yOffset = yOffset;
    }

    funnel.defaultFormatter = defaultFormatter;
    function defaultFormatter(name, value, percentage) {
        return '<p>' + name + ':&nbsp;' + value + ' 占比:' + percentage + '%</p>';
    }

    function defaultConfig() {
        /**
         * @var funnel
         * @type Object
         * @extends xCharts.series
         * @description 漏斗图配置项
         */
        var funnel = {
            /**
             * @var name
             * @type String
             * @extends xCharts.series.funnel
             * @description 漏斗图代表的名字
             */
            name: '漏斗图',
            /**
             * @var type
             * @type String
             * @extends xCharts.series.funnel
             * @default funnel
             * @description 漏斗图指定类型
             */
            type: 'funnel',
            /**
             * @var sort
             * @type String
             * @values 'top'|'down'
             * @default 'down'
             * @description 漏斗图尖角朝向
             * @extends xCharts.series.funnel
             */
            sort: 'down',
            /**
             * @var size
             * @extends xCharts.series.funnel
             * @type Array
             * @description 漏斗图大小
             * @description 可以为百分比，也可以为具体数字，默认单位px
             * @default ['50%', '50%']
             * @example
             *  size:['50%','50%']//百分比
             *  size:[500,'300']//固定宽高
             */
            size: ['50%', '50%'],
            /**
             *  @var x
             *  @extends xCharts.series.funnel
             *  @type String|Number
             *  @default 'center'
             *  @values 'left'|'right'|'center'|Number(单位像素)|Percentage
             *  @description 漏斗图左上角在x轴方向的偏移量
             */
            x: 'center',
            /**
             *  @var y
             *  @extends xCharts.series.funnel
             *  @type String|Number
             *  @default 'center'
             *  @values 'top'|'middle'|'bottom'|Number(单位像素)|Percentage
             *  @description 漏斗图左上角在y轴方向的偏移量
             */
            y: 'middle',
            /**
             * @var data
             * @type Array
             * @extends xCharts.series.funnel
             * @description 一个装有漏斗图数据的二维数组
             * @example
             *   [
             *      {name: '腾讯', value: '80'},
             *      {name: '百度', value: '100'},
             *      {name: '阿里巴巴', value: '60'},
             *      {name: '京东', value: '40'},
             *      {name: '淘宝', value: '20'},
             *   ]
             */
            data: [],
            /**
             * @var formatter
             * @extends xCharts.series.funnel
             * @type Function
             * @description 可以单独定义格式化函数来覆盖tooltip里面的函数
             * @example
             *  formatter: function (name,x,y) {
             *      return '<p>'+name + ':&nbsp;' + value+' 占比:'+percentage+'%</p>';
             *  }
             */
            //formatter:function(){},
            /**
             * @var itemStyle
             * @extends xCharts.series.funnel
             * @type Object
             * @description 每个漏斗图区块的样式
             */
            itemStyle: {
                /**
                 * @var opacity
                 * @extends xCharts.series.funnel.itemStyle
                 * @type Number
                 * @values 0-1
                 * @description 鼠标移入时，变化的透明度
                 * @default 0.5
                 */
                opacity: 0.5
            }
        }
        return funnel;
    }

}(xCharts, d3));
/**
 * Author liuyang46@meituan.com
 * Date 16/5/27
 * Describe 漏斗图,移动端适配
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var charts = xCharts.charts;
    var funnel = charts.funnel;

    funnel.prototype.extend({
        mobileReady: function () {
            this.funnelSection.on('touchstart.funnel', funnelSectionTrigger(this));
        }
    });

    var defaultFormatter = funnel.defaultFormatter;

    function funnelSectionTrigger(ctx) {
        var tooltip = ctx.messageCenter.components['tooltip'];
        var tooltipFormatter = tooltip.tooltipConfig.formatter;

        return function (data) {
            ctx.funnelSection.attr('opacity', 1);
            d3.select(this).attr('opacity', data._serie.itemStyle.opacity);
            tooltip.showTooltip();

            // 设置HTML
            var formatter = data._serie.formatter || tooltipFormatter || defaultFormatter;

            var title = "<p>" + data._serie.name + "</p>";
            tooltip.setTooltipHtml(title + formatter(data.name, data.value, (data.percentage * 100).toFixed(1)));

            // 获取坐标
            var position = d3.mouse(ctx.svg.node());
            tooltip.setPosition(position);
            

        }
    }
}(xCharts, d3));
/**
 *  scatter 散点图
 *  继承自 Chart
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;
    xCharts.charts.extend({scatter: scatter});
    utils.inherits(scatter, Chart);

    function scatter(messageCenter, config) {
        Chart.call(this, messageCenter, config, 'scatter');
    }

    scatter.prototype.extend = xCharts.extend;
    scatter.prototype.extend({
        init: function (messageCenter, config, type, series) {
            var _this = this;
            _this.xAxisScale = messageCenter.xAxisScale;
            _this.yAxisScale = messageCenter.yAxisScale;
            _this.series = parseSeries(series, _this.xAxisScale, _this.yAxisScale);
            _this.data = getData(_this.series);

        },
        render: function (animationEase, animationTime) {

            var _this = this;

            // 手机模式下动画卡
            if (_this.mobileMode) {
                animationTime = 0;
            }

            var scatterGroup = _this.main.selectAll('.xc-scatter-group')
                .data([1]);

            scatterGroup = scatterGroup.enter().append('g')
                .attr('class', 'xc-scatter-group')
                .merge(scatterGroup);

            var scatterItem = scatterGroup.selectAll('.xc-scatter-item')
                .data(_this.data);

            var transitionStr = "r " + animationTime + "ms linear,cx " + animationTime + "ms linear,cy " + animationTime + "ms linear";

            scatterItem = scatterItem.enter().append('circle').merge(scatterItem);
            scatterItem.exit().remove();

            scatterItem.style("transition", transitionStr)
                .attr('cx', function (d) {
                    return d._serie.xScale(d.data[0]);
                })
                .attr('cy', function (d) {
                    return d._serie.yScale(d.data[1]);
                })
                .attr('r', function (d) {
                    //这里如果是不显示的话，直接返回一个半径0
                    if (d._serie.show != false)
                        return d.radius;
                    else
                        return 0;
                })
                .attr('fill', function (d) {
                    return _this.getColor(d._serie.idx);
                })
                .attr('opacity', function (d) {
                    return d._serie.opacity;
                })
                .attr('class', function (d) {
                    var classStr = 'xc-scatter-item';
                    classStr += ' xc-scatter-group-' + d._serie.idx;
                    return classStr;
                });

            // scatterItem.transition()
            //     .duration(animationConfig.animationTime)
            //     .ease(animationConfig.animationEase)
            //     .attrTween('cx', function (d) {
            //         var cx = d._serie.xScale(d.data[0]);
            //         this.cxPosition = this.cxPosition === undefined ? cx : this.cxPosition;
            //         var interpolate = d3.interpolate(this.cxPosition, cx);
            //         this.cxPosition = cx;
            //         return function (t) {
            //             return interpolate(t);
            //         }
            //     })
            //     .attrTween('cy', function (d) {
            //         // return d._serie.yScale(d.data[1]);
            //         var cy = d._serie.yScale(d.data[1]);
            //         this.cyPosition = this.cyPosition === undefined ? cy : this.cyPosition;
            //         var interpolate = d3.interpolate(this.cyPosition, cy);
            //         this.cyPosition = cy;
            //         return function (t) {
            //             return interpolate(t);
            //         }
            //     })

            _this.scatterItem = scatterItem;//暴露出去，为了tooltip事件
        },
        ready: function () {
            this.__legendReady();
            this.__tooltipReady();
        },
        __legendReady: function () {
            var _this = this, selectGroup = null;
            var animationConfig = _this.config.animation;

            _this.on('legendMouseenter.scatter', function (name) {
                var serie = getSeriesByName(_this.series, name);
                selectGroup = _this.main.selectAll('.xc-scatter-group-' + serie.idx);
                selectGroup.attr('opacity', 1);
            });
            _this.on('legendMouseleave.scatter', function (name) {
                selectGroup.attr('opacity', function (d) {
                    return d._serie.opacity;
                });
            });
            this.on('legendClick.scatter', function (nameList) {
                var series = _this.config.series;
                _this.init(_this.messageCenter, _this.config, _this.type, series);
                _this.render(animationConfig.animationEase, animationConfig.animationTime);
            });
        },
        __tooltipReady: function () {
            if (!this.config.tooltip || this.config.tooltip.show === false || this.config.tooltip.trigger == 'axis') return;//未开启tooltip
            var _this = this;
            var tooltip = _this.messageCenter.components['tooltip'];
            var tooltipFormatter = tooltip.tooltipConfig.formatter;


            // TODO 这里修改为轴触发方式和点击共存
            // 移动端就不需要点击了
            if (_this.mobileMode) {
                _this.mobileReady();
            } else {
                // _this.div.on('mousemove.scatter', assitLineTrigger(_this));

                _this.scatterItem.on('mouseenter.scatter', function (data) {

                    d3.select(this).attr('opacity', 1);
                    //设置tooltip
                    var event = d3.event;
                    var x = event.layerX || event.offsetX, y = event.layerY || event.offsetY;
                    var formatter = data._serie.formatter || tooltipFormatter || defaultFormatter;
                    tooltip.showTooltip();
                    tooltip.setTooltipHtml(formatter(data._serie.name, data.data[0], data.data[1]));
                    tooltip.setPosition([x, y]);
                })

                _this.scatterItem.on('mouseleave.scatter', function (data) {
                    d3.select(this).attr('opacity', function (d) {
                        return d._serie.opacity;
                    });
                    tooltip.hiddenTooltip();
                });
            }


        }
    });

    

    // function

    /**
     * 通过name找到对应的serie
     * @param series
     * @param name
     * @returns {*}
     */
    function getSeriesByName(series, name) {
        for (var i = 0, s; s = series[i++];)
            if (s.name == name) return s;
    }

    /**
     * 处理sereies
     * @param series 未处理的全部series
     * @param xScale xAxisScale
     * @param yScale yAxisScale
     * @returns {Array}
     */
    function parseSeries(series, xScale, yScale) {
        var scatterSeries = [];
        for (var i = 0, s; s = series[i++];) {
            //第一步，判断是否是type=scatter，不是，则直接跳过
            if (s.type != 'scatter') continue;

            //加入默认config
            s = utils.merage(defaultConfig(), s);
            var size = s.size;
            s.idx = s.idx == null ? i - 1 : s.idx;//分配一个idx，用来获取颜色
            s.xScale = xScale[s.xAxisIndex];
            s.yScale = yScale[s.yAxisIndex];
            //处理散点图的每个data,格式化成一个object对象，保存一些绘画数据
            s.data = s.data.map(function (d, idx) {
                var radius = typeof size == 'function' ? size(d) : size;
                var obj = {};
                obj.data = d;
                obj.radius = radius;
                obj._serie = s;
                return obj;
            })

            scatterSeries.push(s);
        }
        return scatterSeries;
    }

    /**
     * 将已经处理过的sereis里面data拿出来，合并按半径从大到小的顺序排序
     * @param series
     * @returns {Array} [object,object]
     */
    function getData(series) {
        var data = [];
        series.forEach(function (serie) {
            data = data.concat(serie.data);
        })
        data = data.sort(function (a, b) {
            //将每个点按半径从大到小的顺序排序，尽可能的避免小点被大点盖住，鼠标无法点击的情况
            return b.radius - a.radius;
        })
        return data;
    }

    /**
     * 默认散点图tooltip格式化函数
     * @param name series.name
     * @param x
     * @param y
     * @returns {string}
     */
    function defaultFormatter(name, x, y) {
        var html = "<p>" + name + "</p>";
        html += "<p>" + x + "," + y + "</p>";
        return html;
    }

    function defaultConfig() {
        /**
         * @var scatter
         * @type Object
         * @extends xCharts.series
         * @description 散点图(气泡图)配置项
         */
        var scatter = {
            /**
             * @var name
             * @type String
             * @extends xCharts.series.scatter
             * @description 散点图(气泡图)代表的名字
             */
            name: '业绩',
            /**
             * @var type
             * @type String
             * @extends xCharts.series.scatter
             * @description 散点图(气泡图)指定类型
             */
            type: 'scatter',
            /**
             * @var data
             * @type Array
             * @extends xCharts.series.scatter
             * @description 一个装有散点图(气泡图)数据的二维数组,第一个为x轴数据，第二个为y轴数据
             * @example
             *   [
             *      [161.2, 51.6], [167.5, 59.0], [159.5, 49.2], [157.0, 63.0], [155.8, 53.6],
             *      [170.0, 59.0], [159.1, 47.6], [166.0, 69.8], [176.2, 66.8], [160.2, 75.2],
             *      [172.5, 55.2], [170.9, 54.2], [172.9, 62.5], [153.4, 42.0], [160.0, 50.0]
             *   ]
             */
            data: [], //包含x，y值的数组,第一个为x，第二个为y
            /**
             * @var size
             * @type Number|Function
             * @extends xCharts.series.scatter
             * @description 散点图(气泡图)的大小，数字表示所有气泡运用同一个大小，函数需计算返回一个表示气泡大小的数值
             * @default 5
             * @example
             *  function(data){
             *      //data是一个二维数组，和传入的series.data的值对应
             *      return data[0];
             *  }
             */
            size: 5,
            /**
             * @var xAxisIndex
             * @type Number
             * @description 使用哪一个x轴，从0开始，对应xAxis中的坐标轴
             * @default 0
             * @extends xCharts.series.scatter
             */
            xAxisIndex: 0,
            /**
             * @var yAxisIndex
             * @type Number
             * @description 使用哪一个y轴，从0开始，对应yAxis中的坐标轴
             * @default 0
             * @extends xCharts.series.scatter
             */
            yAxisIndex: 0,
            /**
             * @var opacity
             * @type Number
             * @values 0-1
             * @description 散点（气泡）的透明程度
             * @default 0.6
             * @extends xCharts.series.scatter
             */
            opacity: 0.6,
            /**
             * @var formatter
             * @extends xCharts.series.scatter
             * @type Function
             * @description 可以单独定义格式化函数来覆盖tooltip里面的函数
             * @example
             *  formatter: function (name,x,y) {
             *      var html = "<p>"+name+"</p>";
             *      html+="<p>"+x+","+y+"</p>";
             *      return html;
             *  }
             */
            //formatter:

        }
        return scatter;
    }

}(xCharts, d3));
/**
 * Author liuyang46@meituan.com
 * Date 16/5/27
 * Describe 散点图,移动端适配
 */

(function (xCharts, d3) {
    var utils = xCharts.utils;
    var charts = xCharts.charts;
    var scatter = charts.scatter;

    scatter.prototype.extend({
        mobileReady:function(){
            
        }
    });
}(xCharts, d3));

    return xCharts;
}));