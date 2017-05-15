var http = require('http');
var fs = require('fs');
var readline = require('readline');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

try {
	var server = http.createServer(function(req, res) {
	    fs.readFile('./index.html', 'utf-8', function(error, content) {
	        res.writeHead(200, {"Content-Type": "text/html"});
	        res.write(content);
	    });
		res.end();
	});
} catch (e) {
	console.log(e);
}

var io = require('socket.io').listen(server);

var bombs = [];
var visible = [];
var counter = [];
var length = 1000;

var sendDeath = false;

createWorld();

function createWorld()
{
	for (var i = 0; i < length; i++) {
		var tmp = [];
		for (var j = 0; j < length; j++) {
			tmp.push((Math.random() < 0.2));
		}
		bombs.push(tmp);
	}
	for (var i = 0; i < length; i++) {
		var tmp = [];
		for (var j = 0; j < length; j++) {
			tmp.push(-1);
		}
		visible.push(tmp);
	}
}

function processAction(x, y, button, socket)
{
	if (visible[x][y] >= 0)
		return;

	if (button === 2)
	{
		if (visible[x][y] === -2)
			visible[x][y] = -1;
		else if (visible[x][y] === -1)
			visible[x][y] = -2;
		io.emit('processAction', {x:x, y:y, visibility:visible[x][y] });
		return;
	}
	var isBomb = bombs[x][y];
	if (isBomb)
	{
		sendDeath = true;
		socket.death = true;
		return;
	}
	var nbBomb = getNbBomb(x, y);
	visible[x][y] = nbBomb;
	if (nbBomb === 0)
	{
		for (var i = x-1; i <= x+1; i++) {
			for (var j = y-1; j <= y+1; j++) {
				if (i === x && j === y)
					continue;
				if (i < 0 || j < 0 || i >= length || j >= length)
					continue;
				processAction(i,j, button, socket);
			}
		}
	}
	io.emit('processAction', {x:x, y:y, visibility:visible[x][y] });
}

function getNbBomb(x, y)
{
	var nbBomb = 0;
	for (var i = x-1; i <= x+1; i++) {
		for (var j = y-1; j <= y+1; j++) {
			if (i === x && j === y)
				continue;
			if (i < 0 || j < 0 || i >= length || j >= length)
				continue;
			if (bombs[i][j])
				nbBomb++;
		}
	}
	return nbBomb;
}

function getEmptySpaceFromPoint(x, y)
{
	var nbEmpty = 1;
	for (var i = 0; i < counter.length; i++) {
		if (counter[i].a === x && counter[i].b === y)
		{
			return 0;
		}
	}
	var tmp = {a:x, b:y};
	counter.push(tmp);
	for (var i = x-1; i <= x+1; i++) {
		for (var j = y-1; j <= y+1; j++) {
			if (getNbBomb(i,j) === 0)
				nbEmpty += getEmptySpaceFromPoint(i, j);
		}
	}
	return nbEmpty;
}

function getRandomSpawnPoint(socket)
{
	console.log("Searching spawn point");
	while(true)
	{
		var r1 = Math.floor(Math.random() * (length - 200));
		var r2 = Math.floor(Math.random() * (length - 200));
		r1 += 100;
		r2 += 100;
		if (visible[r1][r2] === -1 && bombs[r1][r2] === false && getNbBomb(r1, r2) === 0)
		{
			var emp = getEmptySpaceFromPoint(r1, r2);
			counter = [];
			if (emp < 10 || emp > 15)
				continue;
			processAction(r1, r2, 1, socket);
			var spawnPoint = {x: r1, y:r2};
			console.log("Found spawnPoint at " + r1 + ":" + r2);
			return spawnPoint;
		}
	}
	return undefined;
}

io.sockets.on('connection', function (socket) {
	socket.death = false;
	socket.emit('askUsername');
	socket.on('username', function(value)
	{
		if (socket.username == undefined)
		{
			socket.username = value;
			socket.emit('printText', "You join the game.");
			socket.broadcast.emit('printText', value + " has join the game.");
		}
	});
	socket.emit('load', { pLength: length});

	socket.on('finishLoad', function()
	{
		var spawn = getRandomSpawnPoint(socket);
		socket.emit('moveTo', spawn);
	});

	socket.on('disconnect', function()
	{
		if (socket.username != undefined)
			socket.broadcast.emit('printText', socket.username + " has leave the game.");
	});

	socket.on('clic', function(action)
	{
		if (socket.death)
			return;
		sendDeath = false;
		processAction(action.x, action.y, action.button, socket);
		if (sendDeath)
		{
			socket.emit('loose');
		}
	});

	socket.on('askInfo', function(pos)
	{
		if (pos.x !== Math.floor(pos.x) || pos.y !== Math.floor(pos.y))
			return undefined;
		if (pos.x < visible.length && pos.y < visible[0].length)
			socket.emit('returnInfo', {x:pos.x, y:pos.y, v:visible[pos.x][pos.y] });
	});
});

rl.on('line', function(input) {
	if (input === "Stop")
	{
		io.emit('askDisconnect');
		server.close();
		rl.close();
	}
});

server.listen(8080);
