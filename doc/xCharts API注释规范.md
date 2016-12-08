#根据注释生成API文档的规范
- 注释支持类型: /** */
- @var xAxis; 声明一个类型的名字
- @type Array|Object|String|Number|Function|Boolean;声明类型
- @values 指定可以取值的列表
- @default value;默认值
- @description 到下一个@为止都会被认为是describtion；可以多个@describtion并存
- @demo name url 示例的name和url(空格分隔),可以多个@demo并存
- @extends xChart.axis 依赖关系 表示此项是xChart->axis的子项(请保持xCharts开头)
- @example 示例代码,可以多个@example并存