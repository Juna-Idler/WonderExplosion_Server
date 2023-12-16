
export class FirstData
{
	my_name : string;
	rival_name : string;
	
	my_deck : number[]; //# card id
	my_hand : number[]; //# deck index

	rival_deck_count : number; // #デッキの総数(通常6)
	rival_hand_count : number; // #手札の数(通常3)

	my_colors : string[];
	rival_colors : string[];

//先攻(1)か後攻(2)か
	player_number : number;

    constructor(my_name : string,rival_name : string,my_deck : number[],my_hand : number[],
            rival_deck_count : number,rival_hand_count : number,
            my_colors : string[],rival_colors : string[],player_number : number)
    {
        this.my_name = my_name;
        this.rival_name = rival_name;
        this.my_deck = my_deck;
        this.my_hand = my_hand;
        this.rival_deck_count = rival_deck_count;
        this.rival_hand_count = rival_hand_count;
        this.my_colors = my_colors
        this.rival_colors = rival_colors;
        this.player_number = player_number;
    }

	serialize():object
    {
        return {
			mn:this.my_name,
			rn:this.rival_name,
			md:this.my_deck,
			mh:this.my_hand,
			rd:this.rival_deck_count,
			rh:this.rival_hand_count,
			mc:this.my_colors,
			rc:this.rival_colors,
			pn:this.player_number,
		};
    }
}

export class Result
{
	turn_count : number //#ターン数
	player : number //#このプレイをしたプレイヤーナンバー
	position : number //#プレイしたフィールドの位置
	play_card : number //#プレイしたカードのID setした場合は-1
	
//	#バトルが発生しなければnull
	battle? : Battle
//	#起爆が発生しなければnull
	explosion? : Explosion

//	#次のプレイのプレイヤー ゲーム終了なら0
	next_player : number
	
//	#setをした場合、ターンプレイヤーにだけそのカードのIDをエコーバックする
	closed_play_card : number
//	#next_playerがドローしたカードのデッキindex（自分のドローでない場合は-1がドローした枚数分だけ入る）
	draw_cards : number[] = []

    constructor(turn_count : number,player : number,position : number,play_card : number,
        battle : Battle|undefined,explosion : Explosion|undefined,next_player : number,
        closed_play_card : number,draw_cards : number[])
    {
        this.turn_count = turn_count;
        this.player = player;
        this.position = position;
        this.play_card = play_card;
        this.battle = battle;
        this.explosion = explosion;
        this.next_player = next_player;
        this.closed_play_card = closed_play_card;
        this.draw_cards = draw_cards;
    }

	serialize(): object
    {
		return {
			t:this.turn_count,
			n:this.player,
			p:this.position,
			c:this.play_card,
			b:this.battle ? this.battle.serialize() : {},
			e:this.explosion ? this.explosion.serialize() : {},
			np:this.next_player,
			cc:this.closed_play_card,
			d:this.draw_cards,
		};
    }
}

//	#バトルの結果
export class Battle
{
    card : number //#もともとフィールドにあったカードのID
    result : number // #バトル結果 1:turn player win , -1:turn player lose , 0:draw

    constructor(card : number,result : number)
    {
        this.card = card;
        this.result = result;
    }
    serialize(): object
    {
        return {
            c:this.card,
            r:this.result,
        }
    }
}

//	#起爆データ
export class Explosion
{
    positions : number[] = []; //#起爆したカードの位置
    cards : number[] = []; //	#起爆したカードのID
    power : number = 0; //	#起爆の総合威力
    
    other? : OtherExplosion = undefined //	#通常はnull

    constructor(positions : number[],cards : number[],power : number,other? : OtherExplosion)
    {
        this.positions = positions;
        this.cards = cards;
        this.power = power;
        this.other = other;
    }

    serialize():object
    {
        return {
            p:this.positions,
            c:this.cards,
            d:this.power,
            o:this.other ? this.other.serialize() : {},
        }
    }
}
//    #盤面が埋まった時、プレイしていない方の起爆データ
export class OtherExplosion
{
    positions : number[] = []; //#起爆したカードの位置
    cards : number[] = []; //	#起爆したカードのID
    power : number = 0; //	#起爆の総合威力
    constructor(positions : number[],cards : number[],power : number)
    {
        this.positions = positions;
        this.cards = cards;
        this.power = power;
    }
    
    serialize():object
    {
        return {
            p:this.positions,
            c:this.cards,
            d:this.power,
        }
    }
}

