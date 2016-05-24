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