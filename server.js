var http = require('http');
var fs = require('fs');
var readline = require('readline');
var mysql      = require('mysql');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'Demineur'
});
connection.connect();

var table = "Player";

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
var players = [];

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
		return;
	}

	if (button === 2)
	{
		if (vis === -2)
			vis = -1;
		else if (vis === -1)
			vis = -2;
		setVisible(x,y,vis);
		if (getBomb(x, y) && vis === -2){
			players[socket.username].score += 10;
		}
		else if (getBomb(x, y) && vis === -1) {
			// Player remove a placed flag where is a bomb
			players[socket.username].score -= 10;
		}
		else{
			//TODO: Player place flag where is no bomb, What we do
		}
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
	players[socket.username].score += 1;
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

// Return a string that contain the all the leaderboard sorted
function getLeaderboardText()
{
	var sortedPlayer = [];
	var cpt = 0;
	for (var player in players) {
		if (players.hasOwnProperty(player)) {
			sortedPlayer[cpt] = players[player];
			sortedPlayer[cpt].name = player;
			cpt++;
		}
	}
	var returnValue = "";
	sortedPlayer = sortedPlayer.sort(function (a, b)
	{
		if (a.score > b.score)
			return -1;
		if (a.score < b.score)
			return 1;
		return 0;
	});
	for (var i = 0; i < sortedPlayer.length; i++) {
		if (i === 6)
			break;
		returnValue += sortedPlayer[i].name + ": " + sortedPlayer[i].score + "<br>";
	}
	return returnValue;
}

String.prototype.escape = function() {
    var tagsToReplace = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };
    return this.replace(/[&<>]/g, function(tag) {
        return tagsToReplace[tag] || tag;
    });
};

io.sockets.on('connection', function (socket) {
	socket.death = false;
	socket.emit('askUsername');
	socket.on('username', function(value)
	{
		console.log("Username Received");
		var name = value.name.escape();
		var pass = value.pass.escape();

		connection.query('SELECT * from ' + table, function(err, rows, fields)
		{
			if (!err)
			{
				var found = false;
				for (var i = 0; i < rows.length; i++) {
					if (rows[i].Name === name)
					{
						if (rows[i].Password === pass)
						{
							found = true;
							players[name] = {score:rows[i].Score, pos:{x:rows[i].camX, y:rows[i].camY}};
							socket.username = name;
							socket.emit('printText', "You join the game.");
							socket.broadcast.emit('printText', name + " has join the game.");
							socket.emit('load', { pLength: length});
							break;
						}
						else {
							socket.emit('kick');
							return;
						}
					}
				}
				if (found === false)
				{
					connection.query('INSERT INTO ' + table + " (Name, Password, Score) VALUES('" + name + "', '" + pass + "', 0)", function(err, rows, fields)
					{
						if (!err)
						{
							players[name] = {score:0};
							socket.username = name;
							socket.emit('printText', "You join the game.");
							socket.broadcast.emit('printText', name + " has join the game.");
							socket.emit('load', { pLength: length});
						}
						else
							console.log('Error while performing Query.');
					});
				}
			}
			else
				console.log('Error while performing Query.');
		});
	});

	var test = function()
	{
		if (players[socket.username].pos == undefined)
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
					players[socket.username].pos = spawnPoint;
					socket.emit('moveTo', spawnPoint);
					break;
				}
			}
		}
		else {
			socket.emit('moveTo', players[socket.username].pos);
		}
		socket.emit('updateScore', getLeaderboardText());
	}

	socket.on('finishLoad', test);

	socket.on('disconnect', function()
	{
		if (socket.username != undefined)
		{
			socket.broadcast.emit('printText', socket.username + " has leave the game.");
			var queryStr = 'UPDATE ' + table + " SET Score = '" + players[socket.username].score + "', camX = '"+ players[socket.username].pos.x +"', camY = '"+ players[socket.username].pos.y +"' WHERE Name = '" + socket.username + "'";
			connection.query(queryStr, function(err, rows, fields)
			{
				if (!err)
				{
					console.log("Database updated for " + socket.username);
				}
				else
					console.log('Error while performing Query: ' + queryStr);
			});
		}
	});

	socket.on('clic', function(action)
	{
		if (socket.death)
			return;
		players[socket.username].pos.x = action.x;
		players[socket.username].pos.y = action.y;
		processAction(action.x, action.y, action.button, socket);
		socket.emit('updateScore', getLeaderboardText());
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
		connection.end();
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
		io.emit('askDisconnect');
	}
});

server.listen(8080);
