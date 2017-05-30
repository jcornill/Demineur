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
// The size of the regions
var regionSize = 256;
// Array contains all loaded region
// A region is a array of int value
// Negative value is a error when data send or receive by the player these value are not saved but used to reask the data
// 0 to 8 => number of bombs around (when discover)
// 9 => a number of bombs undiscover
// 10 => bomb without flag
// 11 => bomb with flag
// 12 => flag without bomb (maybe delete after if the player loose when place flag)
var regions = [];
// TODO: Need to be eliminate
var length = 1000;
// Array contains players already playing
var players = [];

// Laod all the spawning regions
for (var i = 0; i < 4; i++) {
	for (var j = 0; j < 4; j++) {
		loadRegion(i,j);
	}
}

// Load the leaderboard players
loadLeaderboardLeader();

function createRegion(x, y)
{
	var regionData = [];
	for (var i = 0; i < regionSize; i++) {
		var tmp = [];
		for (var j = 0; j < regionSize; j++) {
			tmp.push(((Math.random() < 0.2) ? 10 : 9));
		}
		regionData.push(tmp);
	}
	regions[x+":"+y] = {data:regionData};
	console.log("Creating complete");
	saveRegion(x, y);
}

// Count the number of flag posed around a point
function getNbFlag(x, y)
{
	var nbFlag = 0;
	var info = 0;
	for (var i = x-1; i <= x+1; i++) {
		for (var j = y-1; j <= y+1; j++) {
			if (j === y && i === x)
				continue;
			info = getRegionData(i,j);
			if (info === 11 || info === 12)
				nbFlag++;
		}
	}
	return nbFlag;
}

function processAction(x, y, button, socket)
{
	var info = getRegionData(x, y);
	// player click on a empty case => do nothing
	if (info === 0)
		return;
	// Player click(left or right) on a number
	// count number of flag and process if flag number is correct
	if (info > 0 && info < 9)
	{
		if (info === getNbFlag(x, y))
		{
			for (var i = x-1; i <= x+1; i++) {
				for (var j = y-1; j <= y+1; j++) {
					// If the case is not reveal and is not a flag
					var v = getRegionData(i, j)
					if (v === 9 || v === 10)
						processAction(i, j, 1, socket);
				}
			}
		}
		return;
	}

	// The player press right click
	if (button === 2)
	{
		// If it's a flag switch state
		if (info === 9)
			info = 12;
		else if (info === 12)
			info = 9;
		else if (info === 10)
			info = 11;
		else if (info === 11)
			info = 10;
		setRegionData(x,y,info);
		// If place flag on bomb
		if (info === 11){
			players[socket.username].score += 10;
		}
		else if (info === 10) {
			// Player remove a placed flag where is a bomb
			players[socket.username].score -= 10;
		}
		else if (info === 12){
			//TODO: Player place flag where is no bomb, What we do
		}
		// Send the acion to all players
		io.emit('processAction', {x:x, y:y, visibility:convertInfoForClient(info) });
		return;
	}
	// Player press left click on a flag with don't do anything
	if (info === 11 || info === 12)
		return;
	// Player click on a bomb
	if (info === 10)
	{
		socket.emit('loose');
		socket.death = true;
		return;
	}
	// if we got there the player click on a undiscover case
	var nbBomb = getNbBomb(x, y);
	info = nbBomb;
	setRegionData(x,y,info);
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
	io.emit('processAction', {x:x, y:y, visibility:convertInfoForClient(info) });
}

function setRegionData(x, y, data)
{
	x2 = Math.floor(x / regionSize);
	y2 = Math.floor(y / regionSize);
	x %= regionSize;
	y %= regionSize;
	var tRegion = regions[x2+":"+y2];
	if (x2 < 0 || y2 < 0)
		return -1;
	tRegion.data[x][y] = data;
}

function getRegionData(x, y)
{
	x2 = Math.floor(x / regionSize);
	y2 = Math.floor(y / regionSize);
	x %= regionSize;
	y %= regionSize;
	var tRegion = regions[x2+":"+y2];
	if (tRegion == undefined)
	{
		loadRegion(x2, y2);
		return -1;
	}
	return tRegion.data[x][y];
}

// Get the number of bomb around the point x/y
function getNbBomb(x, y)
{
	var nbBomb = 0;
	for (var i = x-1; i <= x+1; i++) {
		for (var j = y-1; j <= y+1; j++) {
			if (i === x && j === y)
				continue;
			if (i < 0 || j < 0)
				continue;
			var info = getRegionData(i, j);
			if (info === 10 || info === 11)
				nbBomb++;
		}
	}
	return nbBomb;
}

// Get number of blank space at x/y used when the player spawn
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

// Load the region file x/y
function loadRegion(x, y)
{
	if (loader.includes(x+":"+y))
		return;
	console.log("Ask load region " + x + ":" + y);
	var tmpData = [];
	loader.push(x+":"+y);
	fs.readFile('./Save/r-' + x + '-' + y + '.json', 'utf8', function (err,data)
	{
		console.log("Starting load region " + x + ":" + y);
		if (err)
		{
			// If file not found error we create the region
			if (err.errno === -2)
			{
				createRegion(x, y);
				return;
			}
			return console.log(err);
		}
		var jsonData = JSON.parse(data);
		tmpData = jsonData.data;
		regions[x+":"+y] = {data:tmpData};
		loader.splice(loader.indexOf(x+":"+y), 1);
		console.log("Load end");
	});
}

function saveRegion(x, y)
{
	console.log("Ask save region " + x + ":" + y)
	fs.writeFile(
    './Save/r-' + x + '-' + y + '.json',
    JSON.stringify(regions[x+":"+y]),
    function (err) {
        if (err) {
            console.error('Crap happens');
        }
		console.log("save end");
    });
}

// Load in the players array the top 5 on leaderboard
function loadLeaderboardLeader()
{
	connection.query("SELECT Name, Score from " + table + " ORDER BY Score DESC LIMIT 5", function(err, rows, fields)
	{
		if (!err)
		{
			for (var i = 0; i < rows.length; i++) {
				if (players[rows[i].Name] == undefined)
				{
					players[rows[i].Name] = {score: rows[i].Score};
				}
			}
		}
		else
			console.log('Error while performing Query.');
	});
}

// Return a string that contain the all the leaderboard sorted
//TODO: Rework this
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
		if (i === 5)
			break;
		returnValue += sortedPlayer[i].name + ": " + sortedPlayer[i].score + "<br>";
	}
	return returnValue;
}

// Convert the data info for the client. We don't want the client know that under is cube it's a bomb or not
function convertInfoForClient(info)
{
	// If cube need to be print return 9
	if (info === 10)
		return 9;
	// If flag need to be print return 10
	if (info === 11 || info === 12)
		return 10;
	return info;
}

// Fucntion to escape char (suppress html injection)
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
							socket.emit('errorConnect');
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

				var info = getRegionData(r1, r2);
				if (info === 9 && getNbBomb(r1, r2) === 0)
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
	}

	socket.on('finishLoad', test);

	socket.on('disconnect', function()
	{
		if (socket.username != undefined)
		{
			socket.broadcast.emit('printText', socket.username + " has leave the game.");
			var queryStr = 'UPDATE ' + table + " SET Score = '" + players[socket.username].score + "', camX = '"+ players[socket.username].pos.x +"', camY = '"+ players[socket.username].pos.y +"' WHERE Name = '" + socket.username + "'";
			players.splice(players.indexOf(socket.name), 1);
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
		if (socket.username == undefined)
			return;
		players[socket.username].pos.x = action.x;
		players[socket.username].pos.y = action.y;
		processAction(action.x, action.y, action.button, socket);
	});

	socket.on('askInfo', function(pos)
	{
		if (pos.x !== Math.floor(pos.x) || pos.y !== Math.floor(pos.y))
			return undefined;
		if (pos.x < 0 || pos.Y < 0)
			return undefined;
		var info = getRegionData(pos.x, pos.y);
		socket.emit('returnInfo', {x:pos.x, y:pos.y, v:convertInfoForClient(info)});
	});

	socket.on('askTeleport', function(pos)
	{
		socket.emit('moveTo', pos);
	});
});

setInterval(function() {io.emit("updateScore", getLeaderboardText());}, 3000);

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

try {
	server.listen(8080);
} catch (e) {
	console.log("crap: "+e);
}