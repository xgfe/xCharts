# xCharts   

## Installation   
You can choose one of the following methods：  

-  Use NPM.    

  ```  
  npm install xg-xcharts
  ```   
-  Download [source code](https://github.com/xgfe/xCharts/release) in github.

## Get Started  
1. Add xCharts to your project.   
  
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
2. Use xCharts to create a chart.  

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
  
  If your project support AMD, code like this.  

  ```
require(['xCharts'],function(xCharts){
	// your code  
	// ...
});
  ```  
 
  Or your project support CMD, code like this.  

  ```
var xCharts = require('xCharts');
// your code   
// ... 
  ```

## More examples 
You can access [http://xgfe.github.io/xCharts/](http://xgfe.github.io/xCharts/) for more examples and API documents.  

## Contact  

- @scliuyang&emsp;(mzefibp@163.com)  
- @chenwubai&emsp;(chenwubai.cx@gmail.com)
- @young&emsp;(854394897@qq.com)