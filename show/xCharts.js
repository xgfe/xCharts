/**
 * Created by liuyang on 15/10/16.
 * 本文件是旧的结构图
 */

(function(){
    /**
     * 入口函数，返回一个对象，该对象包含与指定dom相关的初始化参数
     * @param element
     * @returns {xCharts.init}
     */
    function xCharts(element) {
        return new xCharts.fn.init(element);
    }
    xCharts.fn = xCharts.prototype;

    /**
     * 初始化函数
     * 1. 添加svg节点
     * 2. 添加g.main节点
     * 3. 计算长宽
     * 4. 开启loading动画
     * @param element
     */
    xCharts.fn.init = function (element) {
    }
    /**
     * 这样处理可以使new出来的对象可以访问xCharts.prototype上的函数
     * @type {Object|Function|xCharts|*}
     */
    xCharts.fn.init.prototype = xCharts.fn;

    /**
     * 加载config
     * 预处理config，分析config并分发给各自的绘图函数处理
     * 这里准备采用策略模式重写代码，去掉繁琐的if-else分支
     * @param config
     */
    xCharts.fn.loadConfig = function (config) {
        var chartFnc=this.chartList[type]
        new chartFnc(series,config,this);
    }

    /**
     * 比如tooltip以axis触发条件时
     * 柱状图，折线图都可能会响应此事件
     * 针对这种不确定接受者的条件，tooltip采用观察者模式，推送消息
     * legend也是
     */


    //新构思
    /**
     * 现在实现的方式是所有的功能函数不管是chart，component，utils都是直接挂载在xCharts.prototype上
     * 造成的结果是，结构划分不清晰，所有与特定图表相关且需要通信给其他部分的变量是通过this来通信，容易使变量被覆
     * 修改：不同的chart和component分别建立指定的容器挂载自己的init函数，通过new来调用相应的函数
     * 好处是加载的组件有自己的this作用域，也可以通过原型链访问xCharts上的工具方法还不会相互污染this作用域
     */

})


(function () {

    /**
     * 漏斗图入口函数
     * 此函数只做任务的流程控制，不涉及具体的逻辑部分
     * @param series
     * @param config
     * @param messageCenter
     */
    function funnel(series, config, messageCenter) {
        this.__init();
        this.__render();
        this.__addMousehoverEvent(this.funnelPaths);
        this.__legendResponse(messageCenter, this.funnelGroup);
        this.__tooltipEvent(this.funnelGroup, this.funnelPaths, messageCenter);
    }

    funnel.prototype = {
        constructor: funnel,
        __init: function () {

        },
        //渲染漏斗图
        __render: function () {

        },
        __tooltipEvent: function (group, paths, messageCenter) {
        },
        __funnelPathAniamtions: function (paths, dir, ease, time, pointsFnc, values, size) {

        },
        __legendResponse: function (message, group) {


        },
        __addLabel: function (group, pointsFnc, ease, time) {
        },
        __addMousehoverEvent: function (paths) {
        },
        __sort: function () {

        },
        __funnelSize: function () {
        }
    }

    //这样做的好处是，可以使用xCharts原型上的变量，但是在funnel上的变量不会污染xcharts
    inherits(funnel, xCharts);

    //继承
    function inherits(clazz, baseClazz) {
        var clazzPrototype = clazz.prototype;

        function F() {
        }

        F.prototype = baseClazz.prototype;
        clazz.prototype = new F();
        for (var prop in clazzPrototype) {
            clazz.prototype[prop] = clazzPrototype[prop];
        }
        clazz.constructor = clazz;
    }
}

())
