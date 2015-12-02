/**
 * 单元测试窗口
 */


    describe('utils getType',function(){
        var getType=xCharts.utils.getType;


        it("Array in getType is true", function() {
            expect(getType([])).toBe('Array');
        });

        it('Object in getType is true',function(){
            expect(getType({})).toBe('Object');
        })

        it('Arguments in getType is true',function(){
            expect(getType(arguments)).toBe('Arguments');
        })

        it('Function in getType is true',function(){
            var fn=function(){};
            expect(getType(fn)).toBe('Function');
        })

        it('String in getType is true',function(){
            expect(getType('')).toBe('String');
        })

        it('Number in getType is true',function(){
            expect(getType(0)).toBe('Number');
            expect(getType('0')).not.toBe('Number')
        })
        it('Date in getType is true',function(){
            expect(getType(new Date())).toBe('Date');
        })

        it('RegExp in getType is true',function(){
            expect(getType(new RegExp('\w'))).toBe('RegExp');
        });


        it('Error in getType is true',function(){
            var error=new Error('error');
            expect(getType(error)).toBe('Error');
        })

    })

