"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtherExplosion = exports.Explosion = exports.Battle = exports.Result = exports.FirstData = void 0;
class FirstData {
    constructor(my_name, rival_name, my_deck, my_hand, rival_deck_count, rival_hand_count, my_colors, rival_colors, player_number) {
        this.my_name = my_name;
        this.rival_name = rival_name;
        this.my_deck = my_deck;
        this.my_hand = my_hand;
        this.rival_deck_count = rival_deck_count;
        this.rival_hand_count = rival_hand_count;
        this.my_colors = my_colors;
        this.rival_colors = rival_colors;
        this.player_number = player_number;
    }
    serialize() {
        return {
            mn: this.my_name,
            rn: this.rival_name,
            md: this.my_deck,
            mh: this.my_hand,
            rd: this.rival_deck_count,
            rh: this.rival_hand_count,
            mc: this.my_colors,
            rc: this.rival_colors,
            pn: this.player_number,
        };
    }
}
exports.FirstData = FirstData;
class Result {
    constructor(turn_count, player, position, play_card, battle, explosion, next_player, closed_play_card, draw_cards) {
        //	#next_playerがドローしたカードのデッキindex（自分のドローでない場合は-1がドローした枚数分だけ入る）
        this.draw_cards = [];
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
    serialize() {
        return {
            t: this.turn_count,
            n: this.player,
            p: this.position,
            c: this.play_card,
            b: this.battle ? this.battle.serialize() : {},
            e: this.explosion ? this.explosion.serialize() : {},
            np: this.next_player,
            cc: this.closed_play_card,
            d: this.draw_cards,
        };
    }
}
exports.Result = Result;
//	#バトルの結果
class Battle {
    constructor(card, result) {
        this.card = card;
        this.result = result;
    }
    serialize() {
        return {
            c: this.card,
            r: this.result,
        };
    }
}
exports.Battle = Battle;
//	#起爆データ
class Explosion {
    constructor(positions, cards, power, other) {
        this.positions = []; //#起爆したカードの位置
        this.cards = []; //	#起爆したカードのID
        this.power = 0; //	#起爆の総合威力
        this.other = undefined; //	#通常はnull
        this.positions = positions;
        this.cards = cards;
        this.power = power;
        this.other = other;
    }
    serialize() {
        return {
            p: this.positions,
            c: this.cards,
            d: this.power,
            o: this.other ? this.other.serialize() : {},
        };
    }
}
exports.Explosion = Explosion;
//    #盤面が埋まった時、プレイしていない方の起爆データ
class OtherExplosion {
    constructor(positions, cards, power) {
        this.positions = []; //#起爆したカードの位置
        this.cards = []; //	#起爆したカードのID
        this.power = 0; //	#起爆の総合威力
        this.positions = positions;
        this.cards = cards;
        this.power = power;
    }
    serialize() {
        return {
            p: this.positions,
            c: this.cards,
            d: this.power,
        };
    }
}
exports.OtherExplosion = OtherExplosion;
