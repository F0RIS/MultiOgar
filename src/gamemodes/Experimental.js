'use strict';
const FFA = require('./FFA');
const Entity = require('../entity');

function Experimental() {
    FFA.apply(this, Array.prototype.slice.call(arguments));
    this.ID = 2;
    this.decayMod = 1;
    this.name = "Experimental";
    this.nodesMother = [];
    this.motherSpawnInterval = 100;
    this.motherMinAmount = 7;
}

module.exports = Experimental;
Experimental.prototype = new FFA;

Experimental.prototype.spawnMotherCell = function(gameServer) {
    if (this.nodesMother.length >= this.motherMinAmount) return;
    if (!gameServer.willCollide(gameServer.randomPosition(), 149)) {
        var MotherCell = new Entity.MotherCell(gameServer, null, gameServer.randomPosition(), null);
        gameServer.addNode(MotherCell);
    }
};

Experimental.prototype.onServerInit = function(gameServer) {
    gameServer.running = 1;
    var self = this;
    Entity.Virus.prototype.onEat = function(cell) {
        var boost = Math.atan2(cell.boostDirection.x, cell.boostDirection.y);
        this.setBoost(gameServer.config.virusEjectSpeed - 460, boost);
    };
    Entity.MotherCell.prototype.onAdd = function() {
        self.nodesMother.push(this);
    };
    Entity.MotherCell.prototype.onRemove = function() {
        var index = self.nodesMother.indexOf(this); 
        index != -1 && self.nodesMother.splice(index, 1);
    };
};

Experimental.prototype.onTick = function(gameServer) {
    if ((gameServer.tickCount % this.motherSpawnInterval) === 0) this.spawnMotherCell(gameServer);
    for (var i = 0; i < this.nodesMother.length; ++i) {
        if (this.nodesMother[i]._size > this.nodesMother[i].minSize) var updateInt = 2;
        else updateInt = Math.random() * (50 - 25) + 25;
        if ((gameServer.tickCount % ~~updateInt) === 0) this.nodesMother[i].onUpdate();
    }
};

Experimental.prototype.onChange = function(gameServer) {
    for (var i in this.nodesMother) gameServer.removeNode(this.nodesMother[i]);
    for (;gameServer.nodes.all.length;) gameServer.removeNode(gameServer.nodes.all[0]);
    for (;gameServer.nodes.eject.length;) gameServer.removeNode(gameServer.nodes.eject[0]);
    for (;gameServer.nodes.food.length;) gameServer.removeNode(gameServer.nodes.food[0]);
    for (;gameServer.nodes.virus.length;) gameServer.removeNode(gameServer.nodes.virus[0]);
    Entity.Virus.prototype.feed = require('../entity/Virus').prototype.feed;
};
