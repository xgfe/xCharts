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