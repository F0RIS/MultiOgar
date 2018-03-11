'use strict';
const PlayerTracker = require("../PlayerTracker");
const Vector = require("../modules/Vec2");
    
function BotPlayer() {
    PlayerTracker.apply(this, Array.prototype.slice.call(arguments));
    this.splitCooldown = 0;
    this.isBot = 1;
    this.targetPursuit = 0;
    this.splitTarget = null;
}

module.exports = BotPlayer;

BotPlayer.prototype = new PlayerTracker;

BotPlayer.prototype.largest = function(list) {
    if (!list.length) return null;
    var sorted = list.valueOf();
    sorted.sort(function(list, sorted) {
        return sorted._size - list._size;
    });
    return sorted[0];
};

BotPlayer.prototype.checkConnection = function() {
    if (this.socket.isCloseReq) {
        for (;this.cells.length;) this.gameServer.removeNode(this.cells[0]);
        return void(this.isRemoved = 1);
    }
    this.cells.length || (this.gameServer.gameMode.onPlayerSpawn(this.gameServer, this), this.cells.length || this.socket.close());
};

BotPlayer.prototype.sendUpdate = function() {
    if (this.splitCooldown) this.splitCooldown--;
    this.decide(this.largest(this.cells));
};

BotPlayer.prototype.decide = function(cell) {
    if (!cell) return;
    if (this.splitTarget) {
        if (this.splitTarget.isRemoved && (this.splitTarget = null, this.targetPursuit = 0),
        !(this.targetPursuit <= 0)) return this.targetPursuit--, void(this.mouse = {
            x: this.splitTarget.position.x,
            y: this.splitTarget.position.y
        });
        this.splitTarget = null;
    }
    for (var result = new Vector(0, 0), threats = [], prey = null, merge = this.gameServer.config.playerMergeTime <= 0 ||
        this.recMode, time = merge ? .1 : .4, splitCooldown = 1.5 * this.cells.length <= 8 &&
        !this.splitCooldown, size = cell._size / 1.3, i = 0; i < this.viewNodes.length; i++) {
        var node = this.viewNodes[i];
        if (node.owner !== this) {
            var influence = 0;
            if (0 == node.cellType) {
                if (this.gameServer.gameMode.haveTeams && cell.owner.team == node.owner.team) continue;
                cell._size > 1.3 * node._size ? influence = node._size / Math.log(this.viewNodes.length) :
                node._size > 1.3 * cell._size ? (influence = -Math.log(node._size / cell._size),
                node._size > 1.3 * size && dist < Math.max(6 * cell._size, this.gameServer.config.playerSplitSpeed) &&
                threats.push(node)) : influence = -node._size / cell._size;
            } else 1 == node.cellType ? influence = 1 : 2 == node.cellType ? node.isMotherCell ? influence = -1 : cell._size > 1.3 * node._size &&
            (influence = this.cells.length >= this.gameServer.config.playerMaxCells ? 2 : -1) : 3 == node.cellType &&
            cell._size > 1.3 * node._size && (influence = 2);
            if (influence != 0) {
                var displacement = new Vector(node.position.x - cell.position.x, node.position.y - cell.position.y);
                var dist = displacement.length();
                influence < 0 && (dist -= cell._size + node._size), dist < 1 && (dist = 1), influence /= dist;
                var scale = displacement.normalize().scale(influence);
                splitCooldown && 0 == node.cellType && size > 1.3 * node._size && cell._size * time < node._size && this.splitkill(cell, node, dist) &&
                (prey ? node._size > prey._size && (prey = node) : prey = node), result.add(scale);
            }
        }
    }
    if (result.normalize(), this.mouse = {
            x: cell.position.x + result.x * this.viewBox.halfWidth,
            y: cell.position.y + result.y * this.viewBox.halfWidth
        }, null != prey) {
        var radius = Math.sqrt(size * size + node.radius) + 40;
        if (this.gameServer.quadTree.any({
            minX: prey.position.x - radius,
            minY: prey.position.y - radius,
            maxX: prey.position.x + radius,
            maxY: prey.position.y + radius
        }, function(item) {return item.cellType == 2})) return;
        this.mouse = {
            x: prey.position.x,
            y: prey.position.y
        };
        this.splitTarget = prey;
        this.targetPursuit = merge ? 5 : 20;
        this.splitCooldown = merge ? 5 : 15;
        this.socket.packetHandler.pressSpace = 1;
    }
};

BotPlayer.prototype.splitkill = function(cell, prey, dist) {
    if (prey.cellType == 2) return 1.3 * this.gameServer.config.virusEjectSpeed - cell._size / 2 - prey._size >= dist;
    var speed = Math.max(1.3 * this.gameServer.config.playerSplitSpeed, cell._size / 1.4142 * 4.5); // 1.4142
    return speed >= dist;
};