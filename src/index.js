'use strict';
const Log = require("./modules/Logger");
const Commands = require("./modules/CommandList");
const GameServer = require("./GameServer");
const showConsole = 1;

function prompt() {
    in_.question(">", function (str) {
        try {parseCommands(str);
        } catch (err) {Log.error(err.stack);
        } finally {setTimeout(prompt, 0)}
    });
}

function parseCommands(str) {
    Log.write(">" + str);
    if (str === '') return;
    var split = str.split(" ");
    var first = split[0].toLowerCase();
    var execute = Commands.list[first];
    if (typeof execute != 'undefined') execute(gameServer, split);
    else Log.warn("That is an invalid Command!");
}

Log.start();
process.on("exit", function(err) {
    Log.debug("process.exit(" + err + ")");
    Log.shutdown();
});
process.on("uncaughtException", function(err) {
    Log.fatal(err.stack);
    process.exit(1);
});
process.argv.forEach(function (val) {
    if (val == "--noconsole") showConsole = 0;
    else if (val == "--help") {
        Log.print("Proper Usage: node index.js");
        Log.print("    --noconsole         Disables the console");
        Log.print("    --help              Help menu.");
        Log.print("");
    }
});
var gameServer = new GameServer();
Log.info("\u001B[1m\u001B[32mMultiOgar-Edited " + gameServer.version + "\u001B[37m - An open source multi-protocol ogar server!\u001B[0m");
gameServer.start();
if (showConsole) {
    var readline = require('readline');
    var in_ = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    setTimeout(prompt, 100);
}