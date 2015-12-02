/**
 * Created by liuyang on 15/11/25.
 */
describe('loop',function(){
    var loop=xCharts.utils.loop;
    it('return "abc"',function(){
        expect(loop('abc')).toBe('abc')
    })
})

describe('getColor',function(){
   var Color=xCharts.utils.getColor;

    it('default color',function(){
        var getColor=Color();
        expect(getColor(0)).toEqual('#2ec7c9');
        expect(getColor(1)).toEqual('#b6a2de');
    })

    it('custom color',function(){
        var getColor=Color(['#000','#fff']);
        expect(getColor(0)).toEqual('#000')
        expect(getColor(2)).toEqual('#000')
        expect(getColor(1)).toEqual('#fff')
    })
});


describe('merage',function(){

    var form,to;
    var merage=xCharts.utils.merage;

    beforeEach(function(){
        form={
            number:1,
            string:'123',
            obj:{number:2,array:[{number:0},2,3]},
            n:null,
            d:undefined
        }
    })

    it('merage test',function(){
        var to={
            number:2,
            str:'456',
            obj:{number:3}
        }
        to=merage(form,to);
        expect(to.number).toEqual(2);
        expect(to.string).toEqual('123');
        expect(to.str).toEqual('456');
        expect(to.obj.number).toEqual(3);
        expect(to.obj.array).toEqual([{number:0},2,3]);
    })

})