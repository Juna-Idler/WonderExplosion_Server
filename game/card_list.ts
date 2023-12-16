
const CARD_LIST = `
1	0	0,0,0,0,0,0,0,0		
2	1	0,0,0,1,0,0,0,0		
3	2	0,1,0,0,0,1,0,0		
4	3	0,0,0,0,0,3,0,0		
5	4	0,1,0,0,0,1,2,0		
6	5	0,0,0,0,0,0,0,5		
7	0	0,0,0,0,0,0,0,0		
8	1	0,0,0,0,0,1,0,0		
9	2	0,0,0,1,0,0,0,1		
10	3	0,0,0,0,0,0,1,2		
11	4	2,0,2,0,0,0,0,0		
12	5	1,1,0,1,0,1,0,1		
13	1	0,0,1,0,0,0,0,0		
14	2	0,0,1,0,0,0,1,0		
15	3	1,0,0,1,0,1,0,0		
16	4	1,2,1,0,0,0,0,0		
`;

export type CardData = {
    id:number,
    power:number,
    arrows: number[],
    illust:string,
    other:string,
};

export function get_card_data(id : number):CardData{
    return card_list[id];
}

const card_list : CardData[] = create_card_list();

function create_card_list():CardData[] {
    const lines = CARD_LIST.split("\n").filter((v)=> v.length > 0);
    return lines.map((v)=>{
        const columns = v.split("\t");
        return {
            id:Number(columns[0]),
            power:Number(columns[1]),
            arrows:columns[2].split(",").map((v)=>Number(v)),
            illust:columns[3],
            other:columns[4],
        };
    });
}
