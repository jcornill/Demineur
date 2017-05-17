var http = require('http');
var fs = require('fs');
var readline = require('readline');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

try {
	var server = http.createServer(function(req, res) {});
} catch (e) {
	console.log(e);
}

var io = require('socket.io').listen(server);

var counter = [];
// Array contains name of region with load in progress
var loader = [];
var regionSize = 256;
var regions = [];
var length = 1000;

for (var i = 0; i < 4; i++) {
	for (var j = 0; j < 4; j++) {
		loadRegion(i,j);
	}
}

function createRegion(x, y)
{
	var tmpBombs = [];
	var tmpVisible = [];
	for (var i = 0; i < regionSize; i++) {
		var tmp = [];
		for (var j = 0; j < regionSize; j++) {
			tmp.push((Math.random() < 0.2));
		}
		tmpBombs.push(tmp);
	}
	for (var i = 0; i < regionSize; i++) {
		var tmp = [];
		for (var j = 0; j < regionSize; j++) {
			tmp.push(-1);
		}
		tmpVisible.push(tmp);
	}
	regions[x+":"+y] = {bombs:tmpBombs, visible:tmpVisible, x:x, y:y};
	saveRegion(x, y);
}

// Count the number of flag posed around a point
function getNbFlag(x, y)
{
	var nbFlag = 0;
	for (var i = x-1; i <= x+1; i++) {
		for (var j = y-1; j <= y+1; j++) {
			if (j === y && i === x)
				continue;
			if (getVisible(i, j) === -2)
				nbFlag++;
		}
	}
	return nbFlag;
}

function processAction(x, y, button, socket)
{
	var vis = getVisible(x, y);
	var bomb = getBomb(x, y);
	// player click on a empty case => do nothing
	if (vis === 0)
		return;
	// Player click(left or right) on a number
	// count number of flag and process if flag number is correct
	if (vis > 0)
	{
		if (vis === getNbFlag(x, y))
		{
			for (var i = x-1; i <= x+1; i++) {
				for (var j = y-1; j <= y+1; j++) {
					if (getVisible(i, j) === -1)
						processAction(i, j, 1, socket);
				}
			}
		}
	}

	if (button === 2)
	{
		if (vis === -2)
			vis = -1;
		else if (vis === -1)
			vis = -2;
		setVisible(x,y,vis);
		io.emit('processAction', {x:x, y:y, visibility:vis });
		return;
	}
	// Player press left click on a flag with don't do anything
	if (vis === -2)
		return;
	if (bomb)
	{
		socket.emit('loose');
		socket.death = true;
		return;
	}
	var nbBomb = getNbBomb(x, y);
	vis = nbBomb;
	setVisible(x,y,vis);
	if (nbBomb === 0)
	{
		for (var i = x-1; i <= x+1; i++) {
			for (var j = y-1; j <= y+1; j++) {
				if (i === x && j === y)
					continue;
				if (i < 0 || j < 0)
					continue;
				processAction(i,j, button, socket);
			}
		}
	}
	io.emit('processAction', {x:x, y:y, visibility:vis });
}

function getBomb(x, y)
{
	x2 = Math.floor(x / regionSize);
	y2 = Math.floor(y / regionSize);
	x %= regionSize;
	y %= regionSize;
	var tRegion = regions[x2+":"+y2];
	if (x2 < 0 || y2 < 0)
		return true;
	return tRegion.bombs[x][y];
}

function setVisible(x, y, vis)
{
	x2 = Math.floor(x / regionSize);
	y2 = Math.floor(y / regionSize);
	x %= regionSize;
	y %= regionSize;
	var tRegion = regions[x2+":"+y2];
	if (x2 < 0 || y2 < 0)
		return -1;
	tRegion.visible[x][y] = vis;
}

function getVisible(x, y)
{
	x2 = Math.floor(x / regionSize);
	y2 = Math.floor(y / regionSize);
	x %= regionSize;
	y %= regionSize;
	var tRegion = regions[x2+":"+y2];
	if (tRegion == undefined)
	{
		loadRegion(x2, y2);
		return -101;
	}
	return tRegion.visible[x][y];
}

function getNbBomb(x, y)
{
	var nbBomb = 0;
	for (var i = x-1; i <= x+1; i++) {
		for (var j = y-1; j <= y+1; j++) {
			if (i === x && j === y)
				continue;
			if (i < 0 || j < 0)
				continue;
			if (getBomb(i, j))
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

function loadRegion(x, y)
{
	if (loader.includes(x+":"+y))
		return;
	console.log("Load region " + x + ":" + y);
	var tmpBombs = [];
	var tmpVisible = [];
	loader.push(x+":"+y);
	fs.readFile('./Save/r-' + x + '-' + y + '.json', 'utf8', function (err,data)
	{
		console.log("reading file IN " + './Save/r-' + x + '-' + y + '.json');
		if (err)
		{
			if (err.errno === -2)
			{
				createRegion(x, y);
				return;
			}
			return console.log(err);
		}
		var jsonData = JSON.parse(data);
		for (var i = 0; i < jsonData.bombs.length; i++) {
			tmpBombs[i] = [];
			for (var j = 0; j < jsonData.bombs[i].length; j++){
				tmpBombs[i][j] = (jsonData.bombs[i][j] === 1);
			}
		}
		tmpVisible = jsonData.visible;
		regions[x+":"+y] = {bombs:tmpBombs, visible: tmpVisible, x:x, y:y};
		loader.splice(loader.indexOf(x+":"+y), 1);
		console.log("Load end");
	});
}

function saveRegion(x, y)
{
	console.log("save region " + x + ":" + y);
	var tmpBombs = regions[x+":"+y].bombs;
	var tmp = [];
	for (var i = 0; i < tmpBombs.length; i++) {
		tmp.push([]);
		for (var j = 0; j < tmpBombs[i].length; j++) {
			tmp [i][j] = ((tmpBombs[i][j]) ? 1 : 0);
		}
	}
	var save = {bombs:tmp, visible: regions[x+":"+y].visible};
	fs.writeFile(
    './Save/r-' + x + '-' + y + '.json',
    JSON.stringify(save),
    function (err) {
        if (err) {
            console.error('Crap happens');
        }
		console.log("save end");
    });
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

	var test = function()
	{
		while(true)
		{
			var r1 = Math.floor(Math.random() * (length - 200));
			var r2 = Math.floor(Math.random() * (length - 200));
			r1 += 100;
			r2 += 100;

			var vis = getVisible(r1, r2);
			var bomb = getBomb(r1, r2);
			if (vis === -1 && bomb === false && getNbBomb(r1, r2) === 0)
			{
				var emp = getEmptySpaceFromPoint(r1, r2);
					counter = [];
				if (emp < 10 || emp > 15)
					continue;
				processAction(r1, r2, 1, socket);
				var spawnPoint = {x: r1, y:r2};
				console.log("Found spawnPoint at " + r1 + ":" + r2);
				socket.emit('moveTo', spawnPoint);
				break;
			}
		}
	}

	socket.on('finishLoad', test);

	socket.on('disconnect', function()
	{
		if (socket.username != undefined)
			socket.broadcast.emit('printText', socket.username + " has leave the game.");
	});

	socket.on('clic', function(action)
	{
		if (socket.death)
			return;
		processAction(action.x, action.y, action.button, socket);
	});

	socket.on('askInfo', function(pos)
	{
		if (pos.x !== Math.floor(pos.x) || pos.y !== Math.floor(pos.y))
			return undefined;
		if (pos.x < 0 || pos.Y < 0)
			return undefined;
		vis = getVisible(pos.x, pos.y);
		socket.emit('returnInfo', {x:pos.x, y:pos.y, v:vis});
	});

	socket.on('askTeleport', function(pos)
	{
		socket.emit('moveTo', pos);
	});
});

rl.on('line', function(input) {
	if (input === "Stop")
	{
		io.emit('askDisconnect');
		server.close();
		rl.close();
	}
	else if (input === "Save")
	{
		console.log("saveall");
		for (var v in regions) {
			if (regions.hasOwnProperty(v)) {
				saveRegion(v.split(":")[0], v.split(":")[1]);
			}
		};
	}
});

server.listen(8080);
