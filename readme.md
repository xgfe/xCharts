#XCharts配置说明

##饼图
&emsp;&emsp;对饼图的配置是在series属性中完成的，作为series数组中的一个元素对象而存在。  

- type  
&emsp;&emsp;该属性表示图表类型，必需。它的值固定为 'pie' 。  

- center  
&emsp;&emsp;该属性表示饼图圆心的位置，必需。它是一个长度为2的数组，center[0]和center[1]分别表示圆心的x和y坐标。其值均为表示百分比的字符串。x和y坐标分别由百分比乘以作图区域（这里的作图区域指除掉margin以后的纯作图区域）的width和height来计算可得。  

- outerRadius  
&emsp;&emsp;该属性表示饼图的外半径，必需。其值为整型数字或者表示百分比的字符串。同center，当值为百分比时，外半径的具体值由百分比乘以作图区域的width计算可得。  

- innerRadius``(可选)``  
&emsp;&emsp;该属性表示饼图的内半径，可选。其值为整型数字或者表示百分比的字符串。同center，当值为百分比时，外半径的具体值由百分比乘以作图区域的width计算可得。若未显式配置，则默认为0。  

- data  
&emsp;&emsp;该属性是对饼图中弧形配置的集合，是一个数组，其中的一个元素对应一个弧形的配置对象。  

  * name  
  &emsp;&emsp;该属性表示弧形对应的业务块的名称。其值为字符串。 
  
  * value  
  &emsp;&emsp;该属性表示弧形对应的业务块的值，必需。其值为数字类型。  
  
示例：  

	option = {
		title: {...},
		legend: {...},
		series: [
			{
				type: 'pie',
				center: ['50%', '50%'],
				outerRadius: 80,
				innerRadius: 0,
				data: [
					{
						name: '交通费',
						value: 200
					},
					{
						name: '购物',
						value: 1000
					},
					{
						name: '日常饮食',
						value: 500
					}
				]
			}		
		]
	};  