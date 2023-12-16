'use strict';

import * as ws from "ws"

import * as packet_data from "./game/packet_data"
import * as mechanics from "./game/mechanics"

import {CardData,get_card_data} from "./game/card_list"

const PORT : number = Number(process.env.PORT) ||  14740;

const wss = new ws.Server({ port:PORT });



var _version : string = "0.0"


class ClientData
{
	socket : ws.WebSocket;
	name : string;
	deck : number[];
	colors : string[];
	ready : boolean = false;
	first_data? : packet_data.FirstData = undefined;

    constructor(ws : ws.WebSocket,n : string,d : number[],pc : string,sc : string)
    {
        this.socket = ws;
        this.name = n;
        this.deck = d;
        this.colors = [pc,sc]
    }
}

class GameRoom
{
	game : mechanics.Board;
	
	player1 : ClientData;
	player2 : ClientData;

    initialized : boolean = false;

	constructor(p1 : ClientData,p2 : ClientData)
    {
        this.game = new mechanics.Board();
		if (Math.floor(Math.random() * 256) & 1)
        {
			this.player1 = p1;
			this.player2 = p2;
        }
    	else
        {
			this.player1 = p2;
			this.player2 = p1;
        }
		const deck1 : mechanics.CardData[] = this.player1.deck.map((v)=> {
            const card_data = get_card_data(v);
            return new mechanics.CardData(card_data.id,card_data.power,card_data.arrows);
        });
		const deck2 : mechanics.CardData[] = this.player2.deck.map((v)=>{
            const card_data = get_card_data(v);
            return new mechanics.CardData(card_data.id,card_data.power,card_data.arrows);
        })
		const firsts = this.game.initialize(deck1,deck2);
		if (firsts.length != 2)
			return;

		this.player1.first_data = firsts[0];
		this.player2.first_data = firsts[1];
		this.player1.first_data.my_name = this.player1.name;
		this.player1.first_data.rival_name = this.player2.name;
		this.player1.first_data.my_colors = this.player1.colors;
		this.player1.first_data.rival_colors = this.player2.colors;
		this.player2.first_data.my_name = this.player2.name;
		this.player2.first_data.rival_name = this.player1.name;
		this.player2.first_data.my_colors = this.player2.colors;
		this.player2.first_data.rival_colors = this.player1.colors;
		
        this.player1.socket.send(JSON.stringify({type:"Matched",data:{}}));
        this.player2.socket.send(JSON.stringify({type:"Matched",data:{}}));
        this.initialized = true;
		return;
    }
	
	receive_ready(ws : ws.WebSocket)
    {
		if (this.player1.socket == ws)
			this.player1.ready = true;
		else if (this.player2.socket == ws)
			this.player2.ready = true;
		if (this.player1.ready && this.player2.ready)
        {
            this.player1.socket.send(JSON.stringify({type:"First",data:this.player1.first_data?.serialize()}));
            this.player2.socket.send(JSON.stringify({type:"First",data:this.player2.first_data?.serialize()}));
    	}
    }

    receive_play(ws : ws.WebSocket,index : number,position : number)
    {
		let result : packet_data.Result | undefined = undefined
		if (ws == this.player1.socket)
			result = this.game.play(this.game.player1 as mechanics.Player,index,position);
		else if (ws == this.player2.socket)
			result = this.game.play(this.game.player2 as mechanics.Player,index,position);
		
		if (result == undefined)
        {
            ws.send(JSON.stringify({type:"Result",data:{}}));
            return;
        }
		const draw = result.draw_cards;
        const hidden_draw : number[] = Array(draw.length).fill(-1);

		if (ws == this.player1.socket)
        {
			result.draw_cards = result.next_player != 1 ? hidden_draw : draw;
            this.player1.socket.send(JSON.stringify({type:"Result",data:result.serialize()}));
			result.draw_cards = result.next_player == 1 ? hidden_draw : draw;
			result.closed_play_card = result.play_card;
			this.player2.socket.send(JSON.stringify({type:"Result",data:result.serialize()}));
        }
		else if (ws == this.player2.socket)
        {
			result.draw_cards = result.next_player != 2 ? hidden_draw : draw;
			this.player2.socket.send(JSON.stringify({type:"Result",data:result.serialize()}));
			result.draw_cards = result.next_player == 2 ? hidden_draw : draw;
			result.closed_play_card = result.play_card;
            this.player1.socket.send(JSON.stringify({type:"Result",data:result.serialize()}));
        }
    }

	receive_surrender(ws : ws.WebSocket)
    {
		if (ws == this.player1.socket)
        {
            this.player1.socket.send(JSON.stringify({type:"End",data:{"msg":"you surrender"}}));
			this.player2.socket.send(JSON.stringify({type:"End",data:{"msg":"rival surrender"}}));
        }
		else if (ws == this.player2.socket)
        {
            this.player2.socket.send(JSON.stringify({type:"End",data:{"msg":"you surrender"}}));
			this.player1.socket.send(JSON.stringify({type:"End",data:{"msg":"rival surrender"}}));
        }
    }

	socket_disconnect(ws : ws.WebSocket)
    {
		if (ws == this.player1.socket)
        	this.player2.socket.send(JSON.stringify({type:"End",data:{"msg":"rival disconnect"}}));
		else if (ws == this.player2.socket)
        	this.player1.socket.send(JSON.stringify({type:"End",data:{"msg":"rival disconnect"}}));
    }
	
	terminalize()
    {
        this.player1.socket.send(JSON.stringify({type:"End",data:{"msg":"server error"}}));
        this.player2.socket.send(JSON.stringify({type:"End",data:{"msg":"server error"}}));
    }

}


type match_command = {
    type: string,
    data:{
        n: string,
        d: number[],
        c: string[]
    }
};

type play_command = {
    type : string,
    data : {
        i: number,
        p: number,
    }
};


let wait : ClientData | null
const match_users = new Map<ws.WebSocket,GameRoom>() //



wss.on('connection', (ws,req) => {
//    req.url
    console.log("connect:");
    ws.on('message', (json,isBinary) => {
        const msg = JSON.parse(json.toString());
        switch (msg.type)
        {
        case "Version":
            ws.send(JSON.stringify({type:"Version",data:{version:_version}}));
            break;
        
        case "Match":
            {
                const data = (msg as match_command).data;
                const client = new ClientData(ws,data.n,data.d,data.c[0],data.c[1]);
            
                if (wait != null)
                {
                    console.log("Match:" + ws + "&" + wait.socket);
                    const room = new GameRoom(wait,client);
                    if (room.initialized)
                    {
                        match_users.set(wait.socket,room);
                        match_users.set(client.socket,room);
                        wait = null
                    }
                }
                else
                    wait = client
            }
            break;

        case "Ready":
            if (match_users.has(ws))
                match_users.get(ws)?.receive_ready(ws);
            break;

        case "Play":
            {
                const data = (msg as play_command).data;
                if (match_users.has(ws))
                    match_users.get(ws)?.receive_play(ws,data.i,data.p);
            }
            break;

        case "End":
			if (match_users.has(ws))
            {
				const room = match_users.get(ws);
                if (room)
                {
                    room.receive_surrender(ws);
                    match_users.delete(room.player1.socket);
                    match_users.delete(room.player2.socket);
                }
            }
			else if (wait != null && wait.socket == ws)
				wait = null;
            break;
        }
    });

    ws.on('close', () => {
        console.log("connection:close");
        if (match_users.has(ws))
        {
            const room = match_users.get(ws);
            if (room)
            {
                room.socket_disconnect(ws);
                match_users.delete(room.player1.socket);
                match_users.delete(room.player2.socket);
            }
        }
        else if (wait != null && wait.socket == ws)
            wait = null;
    });
});
