
import * as packet_data from "./packet_data"


function fisherYatesShuffle<T>(a : T[]){
    for(let i =a.length-1 ; i>0 ;i--){
        const j = Math.floor( Math.random() * (i + 1) );
        [a[i],a[j]]=[a[j],a[i]]; // swap
    }
}

export class CardData
{
	id : number;
	power : number;
	arrows : number[];
	constructor(id : number,power : number,arrows : number[])
	{
		this.id = id;
		this.power = power;
		this.arrows = arrows;
	}
}

export class Player
{
	deck : CardData[];
	hp : number;
	stock : number[] = [];
	hand : number[] = [];
	discard : number[] = [];
	
	rival? : Player;
	player_number : number;
	
	constructor(deck_list : CardData[],p_number : number)
	{
		this.deck = [...deck_list];
		this.hp = 20;
		this.stock = [0,1,2,3,4,5];
		fisherYatesShuffle(this.stock);
		for (let i = 0; i < 3; i++)
		{
			const c = this.stock.pop() as number;
			this.hand.push(c);
		}
		this.player_number = p_number;
	}

	create_first_data(): packet_data.FirstData
	{
		const rival = this.rival as Player;
		return new packet_data.FirstData(
			"","",
			this.deck.map((v : CardData)=> v.id),[...this.hand],
			rival.deck.length,rival.hand.length,
			["",""],["",""],this.player_number);
	}
	draw(): number[]
	{
		var drawn_cards : number[] = []
		while (this.hand.length < 3)
		{
			if (this.stock.length == 0)
			{
				if (this.discard.length == 0)
					break;
				else
				{
					fisherYatesShuffle(this.discard);
					this.stock = this.discard;
					this.discard = [];
				}
			}
			while (this.hand.length < 3 && this.stock.length > 0)
			{
				const card = this.stock.pop() as number;
				this.hand.push(card);
				drawn_cards.push(card);
			}
		}
		return drawn_cards;
	}
}

export class Square
{
	owner? : Player = undefined;
	deck_index : number = -1;
	opened : boolean = false;

	set_card(player : Player,index : number,open : boolean)
	{
		this.owner = player;
		this.deck_index = index;
		this.opened = open
	}
	
	reset()
	{
		this.owner = undefined;
		this.deck_index = -1;
		this.opened = false;
	}
}

export class Board
{
	player1? : Player;
	player2? : Player;

	field : Square[] = [
		new Square(),new Square(),new Square(),
		new Square(),new Square(),new Square(),
		new Square(),new Square(),new Square()
	];

	turn_count : number = 0;
	turn_player? : Player = undefined;
	exturn_player? : Player = undefined;
	draw_replay_index : number = -1;

	initialize(p1_deck :CardData[],p2_deck : CardData[]): packet_data.FirstData[]
	{
		if (p1_deck.length != 6 || p2_deck.length != 6)
			return []
		let p1_total : number = 0
		let p2_total : number = 0
		for (let i = 0; i < 6; i++)
		{
			p1_total += p1_deck[i].power
			p2_total += p2_deck[i].power
		}
		if (p1_total < 15 || p2_total < 15)
			return []
		
		this.player1 = new Player(p1_deck,1)
		this.player2 = new Player(p2_deck,2)
		this.player1.rival = this.player2
		this.player2.rival = this.player1

		this.turn_count = 1
		this.turn_player = this.player1
		
		return [this.player1.create_first_data(),this.player2.create_first_data()]
	}

/*
	get_next_player(): number
	{
		if (this.exturn_player)
			return this.exturn_player.player_number;
		if (this.turn_player)
			return this.turn_player.player_number;
		return 0;
	}
*/

	play(player : Player,index : number,position : number): packet_data.Result | undefined
	{
		if (!player.hand.includes(index))
			return undefined;
		
		const result = new packet_data.Result(
			this.turn_count,
			player.player_number,
			position,player.deck[index].id,
			undefined,undefined,
			0,player.deck[index].id,[]
		);
		const square = this.field[position];

		if (this.exturn_player)
		{
			if (player != this.exturn_player)
				return undefined;
			if (square.owner)
				return undefined;
			square.set_card(player,index,true);
			player.hand.splice(player.hand.indexOf(index),1);
			this.exturn_player = undefined;
		}
		else
		{
			if (player != this.turn_player)
				return undefined;
			if (this.draw_replay_index != -1)
			{
				if (index != this.draw_replay_index)
					return undefined;
				if (square.owner)
					return undefined;
				square.set_card(player,index,true);
				player.hand.splice(player.hand.indexOf(index),1);
				this.draw_replay_index = -1;
			}
			else
			{
				if (!square.owner)
				{
					square.set_card(player,index,false);
					player.hand.splice(player.hand.indexOf(index),1);
					result.play_card = -1;
				}
				else if (square.owner != player && !square.opened)
				{
					square.opened = true;
					const play_card = player.deck[index];
					const square_card = square.owner.deck[square.deck_index];

					const battle = new packet_data.Battle(square_card.id,0);
					const square_power = Math.max(square_card.power + this.get_total_arrows(position),0);
					if (square_power > play_card.power)
					{
						square.owner.discard.push(square.deck_index);
						square.set_card(player,index,true);
						player.hand.splice(player.hand.indexOf(index),1);
						battle.result = 1;
					}
					else if (square_power < play_card.power)
					{
						player.discard.push(index)
						player.hand.splice(player.hand.indexOf(index),1);
						battle.result = -1
					}
					else
					{
						this.draw_replay_index = index;
						battle.result = 0;
						result.battle = battle;
						result.next_player = player.player_number;
						return result;
					}
					result.battle = battle;
				}
				else
				{
					return undefined;
				}
			}
			this.turn_player = player.rival;
		}
		result.explosion = this.explode(player);
		
		if (!this.turn_player)
		{
			result.next_player = 0;
			return result;
		}
		if (player.hand.length == 0 && player.discard.length == 0 && player.stock.length == 0)
		{
			result.next_player = 0;
			return result;
		}

		if (!this.exturn_player)
		{
			this.turn_count += 1;
			result.draw_cards = this.turn_player.draw();
			result.next_player = this.turn_player.player_number;
		}
		else
		{
//			this.explode()内で変更される可能性を追跡できなくて、neverになる？
			const exturn_player = this.exturn_player as Player;
			if (exturn_player.hand.length == 0)
				result.draw_cards = exturn_player.draw();
			result.next_player = exturn_player.player_number;
		}
		return result
	}

	get_arrow(square : Square,direction : number):number
	{
		if (!square.opened || !square.owner)
			return 0;
		if (square.owner == this.player1)
			return this.player1.deck[square.deck_index].arrows[direction]
		if (square.owner == this.player2)
			return this.player2.deck[square.deck_index].arrows[(direction + 4) % 8]
		return 0
	}
	get_total_arrows(position : number): number
	{
		switch (position)
		{
			case 0:
				return this.get_arrow(this.field[1],6) + this.get_arrow(this.field[3],0) + this.get_arrow(this.field[4],7)
			case 1:
				return this.get_arrow(this.field[0],2) + this.get_arrow(this.field[2],6) + this.get_arrow(this.field[3],1) + this.get_arrow(this.field[4],0) + this.get_arrow(this.field[5],7)
			case 2:
				return this.get_arrow(this.field[1],2) + this.get_arrow(this.field[4],1) + this.get_arrow(this.field[5],0)
			case 3:
				return this.get_arrow(this.field[0],4) + this.get_arrow(this.field[1],5) + this.get_arrow(this.field[4],6) + this.get_arrow(this.field[6],0) + this.get_arrow(this.field[7],7)
			case 4:
				return this.get_arrow(this.field[0],3) + this.get_arrow(this.field[1],4) + this.get_arrow(this.field[2],5) + this.get_arrow(this.field[3],2)
						+ this.get_arrow(this.field[5],6) + this.get_arrow(this.field[6],1) + this.get_arrow(this.field[7],0) + this.get_arrow(this.field[8],7)
			case 5:
				return this.get_arrow(this.field[1],3) + this.get_arrow(this.field[2],4) + this.get_arrow(this.field[4],2) + this.get_arrow(this.field[7],1) + this.get_arrow(this.field[8],0)
			case 6:
				return this.get_arrow(this.field[3],4) + this.get_arrow(this.field[4],5) + this.get_arrow(this.field[7],6)
			case 7:
				return this.get_arrow(this.field[3],3) + this.get_arrow(this.field[4],4) + this.get_arrow(this.field[5],5) + this.get_arrow(this.field[6],2) + this.get_arrow(this.field[8],6)
			case 8:
				return this.get_arrow(this.field[4],3) + this.get_arrow(this.field[5],4) + this.get_arrow(this.field[7],2)
		}
		return 0
	}

	explode(player : Player): packet_data.Explosion | undefined
	{
		const rival = player.rival as Player;

		const PATTERN = [
			[0,1,2],
			[3,4,5],
			[6,7,8],
			[0,3,6],
			[1,4,7],
			[2,5,8],
			[0,4,8],
			[2,4,6],
		];
		const exp_pattern = PATTERN.filter( (p) =>
				this.field[p[0]].owner == player &&
				this.field[p[1]].owner == player &&
				this.field[p[2]].owner == player
		);
		if (exp_pattern.length == 0)
		{
			if (this.field.every((s)=> s.owner))
			{
				const exp_pos : number[] = []
				const exp_cards : number[] = []
				const rexp_pos : number[] = []
				const rexp_cards : number[] = []

				this.field.forEach((v)=>v.opened = true);
				let exp_total_power = 0;
				let rexp_total_power = 0;
				for (let i = 0; i < this.field.length; i++)
				{
					const square = this.field[i];
					if (square.owner == player)
					{
						exp_total_power += player.deck[square.deck_index].power + this.get_total_arrows(i);
						exp_pos.push(i);
						exp_cards.push(player.deck[square.deck_index].id);
					}
					else if (square.owner == player.rival)
					{
						rexp_total_power += rival.deck[square.deck_index].power + this.get_total_arrows(i);
						rexp_pos.push(i);
						rexp_cards.push(rival.deck[square.deck_index].id);
					}
				}
				exp_total_power = Math.max(exp_total_power,0);
				rexp_total_power = Math.max(rexp_total_power,0);
				if (exp_total_power >= rexp_total_power)
				{
					rival.hp -= exp_total_power;
					if (exp_total_power > rexp_total_power)
						this.exturn_player = rival;
					this.field.forEach((v)=> {
						if (v.owner == player)
						{
							v.owner.discard.push(v.deck_index);
							v.reset();

						}
					});
				}
				if (rexp_total_power >= exp_total_power)
				{
					player.hp -= rexp_total_power;
					if (rexp_total_power > exp_total_power)
						this.exturn_player = player;
					this.field.forEach((v)=>{
						if (v.owner == rival)
						{
							v.owner.discard.push(v.deck_index);
							v.reset();
						}
					});
				}
				if (player.hp <= 0 || rival.hp <= 0)
					this.turn_player = undefined;

				const oexp = new packet_data.OtherExplosion(rexp_pos,rexp_cards,rexp_total_power);
				return new packet_data.Explosion(exp_pos,exp_cards,exp_total_power,oexp);
			}
			return undefined;
		}
		else
		{
			const exp_pos : number[] = []
			const exp_cards : number[] = []

			var positions : Set<number> = new Set()
			exp_pattern.forEach((v)=> v.forEach((e)=> {
				positions.add(e);
				this.field[e].opened = true;
			}));
			let total_power = 0;
			positions.forEach((v)=>{
				const square = this.field[v];
				const owner = square.owner as Player;
				total_power += owner.deck[square.deck_index].power + this.get_total_arrows(v);
				exp_pos.push(v);
				exp_cards.push(owner.deck[square.deck_index].id);
			});

			rival.hp -= Math.max(total_power,0)
			if (rival.hp > 0)
				this.exturn_player = rival;
			else
				this.turn_player = undefined
			
			positions.forEach((v)=>{
				const square = this.field[v];
				player.discard.push(square.deck_index);
				square.reset()
			});
		
			return new packet_data.Explosion(exp_pos,exp_cards,total_power,undefined);
		}
	}
}