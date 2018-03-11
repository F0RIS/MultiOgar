'use strict';
var Cell = require("./Cell");

function Virus() {
    Cell.apply(this, Array.prototype.slice.call(arguments));
    this.cellType = 2;
    this.isSpiked = 1;
    this.isMotherCell = 0;
    var config = this.gameServer.config;
    if (!config.virusRandomColor) this.color = {r: 51, g: 255, b: 51};
    else this.color = this.gameServer.randomColor();
}

module.exports = Virus;
Virus.prototype = new Cell;

Virus.prototype.canEat = function(prey) {
    if (this.gameServer.nodes.virus.length < this.gameServer.config.virusMaxAmount) return prey.cellType == 3;
};

Virus.prototype.onEat = function(prey) {
    if (this.gameServer.config.virusPush)
        this.setBoost(this.gameServer.config.virusEjectSpeed - 460, Math.atan2(prey.boostDirection.x, prey.boostDirection.y));
    else {
        this.setSize(Math.sqrt(this.radius + prey.radius));
        if (this._size >= this.gameServer.config.virusMaxSize) {
            this.setSize(this.gameServer.config.virusMinSize);
            this.gameServer.shootVirus(this, prey.boostDirection.angle);
        }
    }
};

Virus.prototype.onEaten = function(c) {
    if (c.owner) {
        var cfg = this.gameServer.config;
        var cl = (cfg.virusMaxCells || cfg.playerMaxCells) - c.owner.cells.length;
        if (!(cl <= 0)) {
            var sc, min = cfg.virusSplitDiv;
            var m = c._mass;
            var s = [];
            if (m / cl < min) {
                for (sm = m / (sc = 2); sm > min && 2 * sc < cl;) sm = m / (sc *= 2);
                for (sm = m / (sc + 1); sc-- > 0;) s.push(sm);
                return this.explode(c, s);
            }
            for (var sm = m / 2, ml = m / 2; cl-- > 0;) {
                if (ml / cl < min) for (sm = ml / cl; cl-- > 0;) s.push(sm);
                for (;sm >= ml && cl > 0;) sm /= 2;
                s.push(sm), ml -= sm;
            }
            this.explode(c, s);
        }
    }
};

Virus.prototype.explode = function(c, s) {
    for (var i = 0; i < s.length; i++) 
        this.gameServer.splitPlayerCell(c.owner, c, 2 * Math.PI * Math.random(), s[i]);
};

Virus.prototype.onAdd = function(gameServer) {
    gameServer.nodes.virus.push(this);
};

Virus.prototype.onRemove = function(gameServer) {
    var index = gameServer.nodes.virus.indexOf(this);
    index != -1 && gameServer.nodes.virus.splice(index, 1);
};