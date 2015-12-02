/**
 * Created by liuyang on 15/11/24.
 */

describe('utils copy function',function(){
    var form,to;
    var copy=xCharts.utils.copy;

    beforeEach(function(){
        form={
            number:1,
            string:'123',
            obj:{number:2,array:[{number:0},2,3]},
            n:null,
            d:undefined
        }
    })

    describe('not deep copy',function(){

        beforeEach(function(){
            to=copy(form);
        })

        it('number',function(){
            expect(to).toEqual(jasmine.objectContaining({number:1}));
        })

        it('string',function(){
            expect(to).toEqual(jasmine.objectContaining({string:'123'}))
        })

        it('obj',function(){
            expect(to.obj).toBe(form.obj);
        })

        it('null',function(){
            expect(to.n).toBeNull();
        })

        it('undefined',function(){
            expect(to.d).toBeUndefined()
        })
    })

    describe('deep copy',function(){

        beforeEach(function(){
            to=copy(form,true);
        })
        it('number',function(){
            expect(to).toEqual(jasmine.objectContaining({number:1}));
        });

        it('string',function(){
            expect(to).toEqual(jasmine.objectContaining({string:'123'}))
        })

        it('obj',function(){
            expect(to.obj).toEqual({number:2,array:[{number:0},2,3]})
            expect(to.obj).not.toBe(form.obj);
        })

        it('obj.array',function(){
            expect(to.obj.array).not.toBe(form.obj.array);
            expect(to.obj.array).toEqual([{number:0},2,3])
        })
    })
})

