'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws = __importStar(require("ws"));
const mechanics = __importStar(require("./game/mechanics"));
const card_list_1 = require("./game/card_list");
const PORT = Number(process.env.PORT) || 14740;
const wss = new ws.Server({ port: PORT });
var _version = "0.0";
class ClientData {
    constructor(ws, n, d, pc, sc) {
        this.ready = false;
        this.first_data = undefined;
        this.socket = ws;
        this.name = n;
        this.deck = d;
        this.colors = [pc, sc];
    }
}
class GameRoom {
    constructor(p1, p2) {
        this.initialized = false;
        this.game = new mechanics.Board();
        if (Math.floor(Math.random() * 256) & 1) {
            this.player1 = p1;
            this.player2 = p2;
        }
        else {
            this.player1 = p2;
            this.player2 = p1;
        }
        const deck1 = this.player1.deck.map((v) => {
            const card_data = (0, card_list_1.get_card_data)(v);
            return new mechanics.CardData(card_data.id, card_data.power, card_data.arrows);
        });
        const deck2 = this.player2.deck.map((v) => {
            const card_data = (0, card_list_1.get_card_data)(v);
            return new mechanics.CardData(card_data.id, card_data.power, card_data.arrows);
        });
        const firsts = this.game.initialize(deck1, deck2);
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
        this.player1.socket.send(JSON.stringify({ type: "Matched", data: {} }));
        this.player2.socket.send(JSON.stringify({ type: "Matched", data: {} }));
        this.initialized = true;
        return;
    }
    receive_ready(ws) {
        var _a, _b;
        if (this.player1.socket == ws)
            this.player1.ready = true;
        else if (this.player2.socket == ws)
            this.player2.ready = true;
        if (this.player1.ready && this.player2.ready) {
            this.player1.socket.send(JSON.stringify({ type: "First", data: (_a = this.player1.first_data) === null || _a === void 0 ? void 0 : _a.serialize() }));
            this.player2.socket.send(JSON.stringify({ type: "First", data: (_b = this.player2.first_data) === null || _b === void 0 ? void 0 : _b.serialize() }));
        }
    }
    receive_play(ws, index, position) {
        let result = undefined;
        if (ws == this.player1.socket)
            result = this.game.play(this.game.player1, index, position);
        else if (ws == this.player2.socket)
            result = this.game.play(this.game.player2, index, position);
        if (result == undefined) {
            ws.send(JSON.stringify({ type: "Result", data: {} }));
            return;
        }
        const draw = result.draw_cards;
        const hidden_draw = Array(draw.length).fill(-1);
        if (ws == this.player1.socket) {
            result.draw_cards = result.next_player != 1 ? hidden_draw : draw;
            this.player1.socket.send(JSON.stringify({ type: "Result", data: result.serialize() }));
            result.draw_cards = result.next_player == 1 ? hidden_draw : draw;
            result.closed_play_card = result.play_card;
            this.player2.socket.send(JSON.stringify({ type: "Result", data: result.serialize() }));
        }
        else if (ws == this.player2.socket) {
            result.draw_cards = result.next_player != 2 ? hidden_draw : draw;
            this.player2.socket.send(JSON.stringify({ type: "Result", data: result.serialize() }));
            result.draw_cards = result.next_player == 2 ? hidden_draw : draw;
            result.closed_play_card = result.play_card;
            this.player1.socket.send(JSON.stringify({ type: "Result", data: result.serialize() }));
        }
    }
    receive_surrender(ws) {
        if (ws == this.player1.socket) {
            this.player1.socket.send(JSON.stringify({ type: "End", data: { "msg": "you surrender" } }));
            this.player2.socket.send(JSON.stringify({ type: "End", data: { "msg": "rival surrender" } }));
        }
        else if (ws == this.player2.socket) {
            this.player2.socket.send(JSON.stringify({ type: "End", data: { "msg": "you surrender" } }));
            this.player1.socket.send(JSON.stringify({ type: "End", data: { "msg": "rival surrender" } }));
        }
    }
    socket_disconnect(ws) {
        if (ws == this.player1.socket)
            this.player2.socket.send(JSON.stringify({ type: "End", data: { "msg": "rival disconnect" } }));
        else if (ws == this.player2.socket)
            this.player1.socket.send(JSON.stringify({ type: "End", data: { "msg": "rival disconnect" } }));
    }
    terminalize() {
        this.player1.socket.send(JSON.stringify({ type: "End", data: { "msg": "server error" } }));
        this.player2.socket.send(JSON.stringify({ type: "End", data: { "msg": "server error" } }));
    }
}
let wait;
const match_users = new Map(); //
wss.on('connection', (ws, req) => {
    //    req.url
    console.log("connect:");
    ws.on('message', (json, isBinary) => {
        var _a, _b;
        const msg = JSON.parse(json.toString());
        console.log(msg.type);
        switch (msg.type) {
            case "Version":
                ws.send(JSON.stringify({ type: "Version", data: { version: _version } }));
                break;
            case "Match":
                {
                    const data = msg.data;
                    const client = new ClientData(ws, data.n, data.d, data.c[0], data.c[1]);
                    if (wait != null) {
                        console.log("Match:" + wait.name + "&" + client.name);
                        const room = new GameRoom(wait, client);
                        if (room.initialized) {
                            match_users.set(wait.socket, room);
                            match_users.set(client.socket, room);
                            wait = null;
                        }
                    }
                    else
                        wait = client;
                }
                break;
            case "MatchCancel":
                if (wait != null && ws == wait.socket)
                    wait = null;
                break;
            case "Ready":
                if (match_users.has(ws))
                    (_a = match_users.get(ws)) === null || _a === void 0 ? void 0 : _a.receive_ready(ws);
                break;
            case "Play":
                {
                    const data = msg.data;
                    if (match_users.has(ws))
                        (_b = match_users.get(ws)) === null || _b === void 0 ? void 0 : _b.receive_play(ws, data.i, data.p);
                }
                break;
            case "End":
                if (match_users.has(ws)) {
                    const room = match_users.get(ws);
                    if (room) {
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
        if (match_users.has(ws)) {
            const room = match_users.get(ws);
            if (room) {
                room.socket_disconnect(ws);
                match_users.delete(room.player1.socket);
                match_users.delete(room.player2.socket);
            }
        }
        else if (wait != null && wait.socket == ws)
            wait = null;
    });
});
