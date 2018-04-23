# xCharts   

## 安装   
可以通过以下两种方法(任选其一)：  

1. npm安装方法    

  ```  
  npm install xg-xcharts
  ```   
2. 在github[项目](https://github.com/xgfe/xCharts/releases)中选择版本进行下载。

## 快速上手  
1. 把xCharts添加到项目中：   
  
  ```
<!DOCTYPE html>
<html lang="en">
		<head>
			<meta charset="UTF-8">
			<title>My first xCharts demo</title>
			<!-- ... -->  
			
			<!-- add xCharts.css -->
			<link rel="stylesheet" href="./dist/xCharts.css">
		</head>
		<body>
			<div id="chartContainer" style="width: 1000px; height: 500px;"></div>
			<!-- ... -->
			
			<!-- must add d3.js before xCharts.min.js -->
			<script src="d3.js"></script>
			<script src="./dist/xCharts.min.js"></script>
			
			<!-- Your code -->
		</body>
</html>  
  ```   
2. 用xCharts绘制图表：  

  ```  
var chart = xCharts(document.querySelector('#chartContainer'));
var option = {
		title: {
		    text: '单轴折线图-示例',
		},
		legend: {
		    data: ['网易','腾讯'],
		    x: 'center'
		},
		tooltip: {
		    trigger: 'axis'
		},
		xAxis: [
		    {
		        type: 'category',
		        data: ['一', '二', '三', '四', '五', '六', '日'],
		        tickFormat: function(data) {
		            return '周'+data;
		        }
		    }
		],
		yAxis: [
		    {
		        type: 'value',
		    }
		],
		resize: {
		    enable:true
		},
		series: [
		    {
		        type: 'line',
		        name: '网易',
		        data: [100, 230, 500, 160, 402, 340, 380]
		    },
		    {
		        type: 'line',
		        name: '腾讯',
		        data: [300, 450, 347, 792, 325, 683, 123]
		    }
		]
};
chart.loadConfig(option);
  ```

  如果你的项目支持AMD引入方式，那可以像下面这样引入xCharts。  

  ```
require(['xCharts'],function(xCharts){
	// your code  
	// ...
});
  ```  
 
  或者你的项目是支持CMD引入方式的，那就像下面这样引入xCharts。

  ```
var xCharts = require('xCharts');
// your code   
// ... 
  ```

## 实例及文档  
更多实例及API文档请移步[http://xgfe.github.io/xCharts/](http://xgfe.github.io/xCharts/)。  

## 联系方式  

- @scliuyang&emsp;(mzefibp@163.com)  
- @chenwubai&emsp;(chenwubai.cx@gmail.com)
- @young&emsp;(854394897@qq.com)