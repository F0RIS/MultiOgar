'use strict';
const PlayerTracker = require('../PlayerTracker');
const Vec2 = require('../modules/Vec2');

function BotPlayer() {
    PlayerTracker.apply(this, Array.prototype.slice.call(arguments));
    this.splitCooldown = 0;
    this.isBot = 1;
}
module.exports = BotPlayer;
BotPlayer.prototype = new PlayerTracker();


BotPlayer.prototype.largest = function (list) {
    var sorted = list.valueOf();
    sorted.sort(function (a, b) {
        return b._size - a._size;
    });
    return sorted[0];
};

BotPlayer.prototype.checkConnection = function () {
    if (this.socket.isCloseReq) {
        while (this.cells.length) {
            this.gameServer.removeNode(this.cells[0]);
        }
        this.isRemoved = 1;
        return;
    }
    if (!this.cells.length) this.gameServer.gameMode.onPlayerSpawn(this.gameServer, this);
};

BotPlayer.prototype.sendUpdate = function () {
    if (this.splitCooldown) this.splitCooldown--;
    this.decide(this.largest(this.cells));
};

BotPlayer.prototype.decide = function (cell) {
    if (!cell) return;
    var result = new Vec2(0, 0);
    for (var i = 0; i < this.viewNodes.length; i++) {
        var check = this.viewNodes[i];
        if (check.owner == this) continue;
        var influence = 0;
        if (check.cellType == 0) {
            if (this.gameServer.gameMode.haveTeams && (cell.owner.team == check.owner.team)) influence = 0;
            else if (cell._size > check._size * 1.15) influence = check._size * 2.5;
            else if (check._size > cell._size * 1.15) influence = -check._size;
            else influence = -(check._size / cell._size) / 3;
        } else if (check.cellType == 1) influence = 1;
        else if (check.cellType == 2) {
            if (cell._size > check._size * 1.15) {
                if (this.cells.length >= this.gameServer.config.playerMaxCells) influence = check._size * 2.5;
                else influence = -1;
            } else if (check.isMotherCell && check._size > cell._size * 1.15) influence = -1;
        } else if (check.cellType == 3) {
            if (cell._size > check._size * 1.15) influence = check._size;
        }
        if (!influence) continue;
        var displacement = new Vec2(check.position.x - cell.position.x, check.position.y - cell.position.y);
        var distance = displacement.length();
        if (influence < 0) distance -= cell._size + check._size;
        if (distance < 1) distance = 1;
        influence /= distance;
        var force = displacement.normalize().scale(influence);
        if (check.cellType == 0 && cell._size > check._size * 1.15
            && !this.splitCooldown && this.cells.length < 8 && 
            820 - cell._size / 2 - check._size >= distance) {
            this.splitCooldown = 15;
            this.mouse = {
                x: check.position.x,
                y: check.position.y
            };
            this.socket.packetHandler.pressSpace = 1;
            return;
        } else result.add(force);
    }
    result.normalize();
    this.mouse = {
        x: cell.position.x + result.x * 800,
        y: cell.position.y + result.y * 800
    };
};