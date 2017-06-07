	var socket = io.connect("http://vps.kirthos.dyjix.eu:8080");
	var cursors;
	var isLost = false;

	var spriteList = [];
	var txts = [];

	var game;
	var isClick = false;

	var width = window.innerWidth; //1142;
	var height = window.innerHeight; //648;

	var tileHeight = 32;
	var tileWidth = 32;

	var startX = 0;
	var startY = 0;
	var endX = Math.floor(width / tileWidth) + 2;
	var endY = Math.floor(height / tileHeight) + 2;
	var indexX = 0;
	var indexY = 0;

	var disconnect = false;

	var actifUsername = "";

	var loadFunct = function()
	{
		document.body.removeChild(menuDiv);
		console.log("Load start");
		game = new Phaser.Game(1920, 1080, Phaser.CANVAS, "", { preload: preload, create: create, update: update, render: render});
		function preload() {
		  game.load.image('cube', 'Client/Assets/Cube.png');
			game.load.image('cubePress', 'Client/Assets/CubePress.png');
			game.load.image('empty', 'Client/Assets/Empty.png');
			game.load.image('flag', 'Client/Assets/Flag.png');
			game.load.image('bomb', 'Client/Assets/Bomb.png');
			game.load.image('1', 'Client/Assets/1.png');
			game.load.image('2', 'Client/Assets/2.png');
			game.load.image('3', 'Client/Assets/3.png');
			game.load.image('4', 'Client/Assets/4.png');
			game.load.image('5', 'Client/Assets/5.png');
			game.time.advancedTiming = true;
			game.stage.backgroundColor = '#808080';
			game.canvas.id = "Game";
			game.canvas.style.left = "0px";
	    game.canvas.style.top = "0px";
			for (var i = 0; i < endX; i++) {
				var tmp = [];
				spriteList.push(tmp);
			}
		}

	}

	function create() {
		game.canvas.oncontextmenu = function (e) { e.preventDefault(); }
		game.world.setBounds(0, 0, (10025 + 1) * tileWidth, (10025 + 1) * tileHeight);
		cursors = game.input.keyboard.createCursorKeys();

		var ui = document.createElement('div');
		ui.id = "UI";
		ui.oncontextmenu = function(e) {e.preventDefault();}
		document.body.appendChild(ui);

		var connecting = document.createElement('div');
		connecting.id = "connectingDiv";
		connecting.oncontextmenu = function(e) {e.preventDefault();}
		connecting.innerHTML = '<h5 align="center">Connecting to the server...</h5>';
		document.getElementById('UI').appendChild(connecting);

		var sb = document.createElement('div');
		sb.id = "scoreboard";
		sb.oncontextmenu = function(e) {e.preventDefault();}
		sb.innerHTML = '<h5 align="center">Leaderboard</h5>';
		document.getElementById('UI').appendChild(sb);

		var moduleTpDiv = document.createElement('div');
		moduleTpDiv.id = "tpModuleDiv";
		moduleTpDiv.style.visibility = "hidden";
		moduleTpDiv.innerHTML = "<p style=\"position: absolute; top: -14px; width:80%; text-align: center; font-size: 80%;\">Teleport to coords:</p>";
		moduleTpDiv.oncontextmenu = function(e) {e.preventDefault();}
		document.getElementById('UI').appendChild(moduleTpDiv);

		var iX = document.createElement('input');
		iX.type = "text";
		iX.pattern = "[0-9]*";
		iX.id = "tpModuleX";
		document.getElementById('tpModuleDiv').appendChild(iX);

		var iY = document.createElement('input');
		iY.type = "text";
		iX.pattern = "[0-9]*";
		iY.id = "tpModuleY";
		document.getElementById('tpModuleDiv').appendChild(iY);

		var button = document.createElement('input');
		button.type = "button";
		button.value = "Go";
		button.id = "tpModuleGo";
		document.getElementById('tpModuleDiv').appendChild(button);
		button.onclick = function()
		{
			socket.emit('askTeleport', {x: iX.value, y:iY.value});
		};

		var deathDiv = document.createElement('div');
		deathDiv.id = "deathDiv";
		deathDiv.oncontextmenu = function(e) {e.preventDefault();}
		deathDiv.innerHTML = '<h5 align="center" style=\"font-size: 20px; position: absolute; top: -15px; left:45%\">Loose</h5><br><p id = \"paraLoose\">You have clicked on a bomb.<br> You lost half of your score and need to restart.</p><p id = \"restartLoading\">Loading ...</p>';
		deathDiv.style.visibility = "hidden";
		document.getElementById('UI').appendChild(deathDiv);

		var restartButton = document.createElement('input');
		restartButton.type = "button";
		restartButton.value = "Restart";
		restartButton.id = "restartLoose";
		document.getElementById('deathDiv').appendChild(restartButton);
		restartButton.onclick = function()
		{
			if (isLost === true)
			{
				document.getElementById('restartLoading').style.visibility = "visible";
				socket.emit('askSpawn');
			}
		};

		socket.emit('askSpawn');
	}

	var b = 1;
	var spr = undefined;
	var keyDown = false;

	function update() {
		if (isLost || disconnect || game.input == null)
			return;
		var tpModuleDiv = document.getElementById('tpModuleDiv');
		if (game.input.keyboard.isDown(Phaser.Keyboard.G) && tpModuleDiv.style.visibility === "hidden" && keyDown === false)
		{
			tpModuleDiv.style.visibility = "visible";
			keyDown = true;
		}
		else if (game.input.keyboard.isDown(Phaser.Keyboard.G) && keyDown === false)
		{
			tpModuleDiv.style.visibility = "hidden";
			keyDown = true;
		}
		if(game.input.keyboard.isDown(Phaser.Keyboard.G) === false)
		{
			keyDown = false;
		}
		moveCamera();
		var distanceMouse = 0;
		var fX = 0;
		var fY = 0;
		if (game.input.activePointer.isDown && !isClick)
   		{
			fX = game.input.position.x;
			fY = game.input.position.y;
			var pX = game.input.position.x + game.camera.x;
			var pY = game.input.position.y + game.camera.y;
			pX = Math.floor(pX / tileWidth);
			pY = Math.floor(pY / tileHeight);
			if (pX < startX + indexX || pX > endX + indexX || pY < startY + indexY || pY > endY + indexY)
				return;
			b = 1;
			if (game.input.mouse.button==2)
				b = 2;
			if (spriteList[pX % endX][pY % endY].key === "cube")
			{
				spriteList[pX % endX][pY % endY].destroy();
				spr = spriteList[pX % endX][pY % endY] = game.add.sprite(pX * tileWidth, pY * tileHeight, 'cubePress');
			}
			isClick = true;
   		}
		if (game.input.activePointer.isUp && isClick)
		{
			var pX = game.input.position.x + game.camera.x;
			var pY = game.input.position.y + game.camera.y;
			pX = Math.floor(pX / tileWidth);
			pY = Math.floor(pY / tileHeight);
			if (pX < startX + indexX || pX > endX + indexX || pY < startY + indexY || pY > endY + indexY)
				return;
			if (spr != undefined)
			{
				if (spr.x !== pX || spr.y !== pY)
					spriteList[spr.x/tileWidth % endX][spr.y/tileHeight % endY] = game.add.sprite(spr.x, spr.y, 'cube');
				spr.destroy();
				spr = undefined;
			}
			socket.emit('clic', {x: pX, y: pY, button: b});
			isClick = false;
		}
	}

setInterval(testResize, 1000);

function testResize()
{
	if (height != window.innerHeight || width != window.innerWidth)
	{
		console.log("Update Cam");
		width = window.innerWidth;
		height = window.innerHeight;
		endX = Math.floor(width / tileWidth) + 2;
		endY = Math.floor(height / tileHeight) + 2;
		var test = {x:Math.floor(game.camera.x / tileWidth) + Math.floor(width / tileWidth / 2), y:Math.floor(game.camera.y / tileHeight) + Math.floor(height / tileHeight / 2)};
		console.log(test.x, test.y);
		for (var i = 0; i < spriteList.length; i++) {
			for (var j = 0; j < spriteList[i].length; j++) {
				spriteList[i][j].destroy();
			}
		}
		spriteList = [];
		for (var i = 0; i < endX; i++) {
			var tmp = [];
			spriteList.push(tmp);
		}
		moveCam(test);
	}
}

function moveCameraRight(speed)
{
	game.camera.x += speed;
	if (Math.floor(game.camera.x / tileWidth) > indexX)
	{
		for (var i = startY + indexY; i < endY + indexY; i++) {
			if (spriteList[(startX + indexX) % endX][i % endY] == undefined)
				continue;
			spriteList[(startX + indexX) % endX][i % endY].destroy();
			for (var tt of txts) {
				if (tt.x === (startX + indexX) && tt.y === i)
				{
					tt.txt.destroy();
					txts.splice(txts.indexOf(tt), 1);
				}
			}
		}
		indexX++;
		for (var i = startY + indexY; i < endY + indexY; i++) {
			socket.emit('askInfo', {x: endX + indexX - 1, y: i})
		}
	}
}

function moveCameraLeft(speed)
{
	game.camera.x -= speed;
	if (Math.floor(game.camera.x / tileWidth) < indexX)
	{
		for (var i = startY + indexY; i < endY + indexY; i++) {
			if (spriteList[(endX + indexX - 1) % endX][i % endY] == undefined)
				continue;
			spriteList[(endX + indexX - 1) % endX][i % endY].destroy();
			for (var tt of txts) {
				if (tt.x === (endX + indexX - 1) && tt.y === i)
				{
					tt.txt.destroy();
					txts.splice(txts.indexOf(tt), 1);
				}
			}
		}
		indexX--;
		for (var i = startY + indexY; i < endY + indexY; i++) {
			socket.emit('askInfo', {x: startX + indexX, y: i})
		}
	}
}

function moveCameraTop(speed)
{
	game.camera.y -= speed;
	if (Math.floor(game.camera.y / tileHeight) < indexY)
	{
		for (var i = startX + indexX; i < endX + indexX; i++) {
			if (spriteList[i % endX][(endY + indexY - 1) % endY] == undefined)
				continue;
			spriteList[i % endX][(endY + indexY - 1) % endY].destroy();
			for (var tt of txts) {
				if (tt.x === i && tt.y === (endY + indexY - 1))
				{
					tt.txt.destroy();
					txts.splice(txts.indexOf(tt), 1);
				}
			}
		}
		indexY--;
		for (var i = startX + indexX; i < endX + indexX; i++) {
			socket.emit('askInfo', {x: i, y: startY + indexY})
		}
	}
}

function moveCameraBottom(speed)
{
	game.camera.y += speed;
	if (Math.floor(game.camera.y / tileHeight) > indexY)
	{
		for (var i = startX + indexX; i < endX + indexX; i++) {
			if (spriteList[i % endX][(startY + indexY) % endY] == undefined)
				continue;
			spriteList[i % endX][(startY + indexY) % endY].destroy();
			for (var tt of txts) {
				if (tt.x === i && tt.y === (startY + indexY))
				{
					tt.txt.destroy();
					txts.splice(txts.indexOf(tt), 1);
				}
			}
		}
		indexY++;
		for (var i = startX + indexX; i < endX + indexX; i++) {
			socket.emit('askInfo', {x: i, y: endY + indexY - 1})
		}
	}
}

function moveCamera()
{
	var speed = 4;
	if (cursors.right.shiftKey)
		speed = 20;
	if (cursors.down.shiftKey)
		speed = 20;
	if (cursors.up.shiftKey)
		speed = 20;
	if (cursors.left.shiftKey)
		speed = 20;
	if (cursors.right.isDown)
	{
		moveCameraRight(speed);
	}
	if (cursors.left.isDown)
	{
		moveCameraLeft(speed);
	}
	if (cursors.up.isDown)
	{
		moveCameraTop(speed);
	}
	if (cursors.down.isDown)
	{
		moveCameraBottom(speed);
	}
}

function process(x, y, visibility)
{
	if (x < startX + indexX || x > endX + indexX - 1 || y < startY + indexY || y > endY + indexY - 1)
		return;
	if (spriteList[x % endX] == undefined)
		return;
	if (visibility < 0) // If visibility is negative => error occurs we re ask the info
		socket.emit('askInfo', {x: x, y: y})
	if (spriteList[x % endX][y % endY] != undefined)
		spriteList[x % endX][y % endY].destroy();
		// If flag we print the flag
	if (visibility === 10)
	{
		var sprite = game.add.sprite(x * tileWidth, y * tileHeight, 'flag');
		spriteList[x % endX][y % endY] = sprite;
	}
	// if undiscover we place a cube
	else if (visibility === 9)
	{
		spriteList[x % endX][y % endY] = game.add.sprite(x * tileWidth, y * tileHeight, 'cube');
	}
	else
	{
		if (visibility === 0)
			spriteList[x % endX][y % endY] = game.add.sprite(x * tileWidth, y * tileHeight, 'empty');
		else if (visibility === 1)
			spriteList[x % endX][y % endY] = game.add.sprite(x * tileWidth, y * tileHeight, '1');
		else if (visibility === 2)
			spriteList[x % endX][y % endY] = game.add.sprite(x * tileWidth, y * tileHeight, '2');
		else if (visibility === 3)
			spriteList[x % endX][y % endY] = game.add.sprite(x * tileWidth, y * tileHeight, '3');
		else if (visibility === 4)
			spriteList[x % endX][y % endY] = game.add.sprite(x * tileWidth, y * tileHeight, '4');
		else if (visibility === 5)
			spriteList[x % endX][y % endY] = game.add.sprite(x * tileWidth, y * tileHeight, '5');
		else if (visibility === 6)
		{
			spriteList[x % endX][y % endY] = game.add.sprite(x * tileWidth, y * tileHeight, 'empty');
			var tmp = game.add.text(x * tileWidth + 7, y * tileHeight + 5, visibility, { font: "25px Arial", fill: "#ffffff" });
			tmp.tint = 0x3b9999;
			var txt = {x: x, y: y, txt:tmp};
			txts.push(txt);
		}
		else if (visibility === 7)
		{
			spriteList[x % endX][y % endY] = game.add.sprite(x * tileWidth, y * tileHeight, 'empty');
			var tmp = game.add.text(x * tileWidth + 7, y * tileHeight + 5, visibility, { font: "25px Arial", fill: "#ffffff" });
			tmp.tint = 0x000000;
			var txt = {x: x, y: y, txt:tmp};
			txts.push(txt);
		}
	}
}

var logText = [];

function render() {
	if (game == undefined)
		return;
	game.debug.cameraInfo(game.camera, 32, 32);
	if (logText.length > 5)
		logText.splice(0, 1);
	for (var i = 0; i < logText.length; i++) {
		game.debug.text(logText[i], 32, height - 85 + 16*i);
	}
	game.debug.text("fps:" + (game.time.fps || '--'), 2, 14, "#00ff00");
	game.debug.text('window.innerWidth: ' + window.innerWidth, 64, 20);
	game.debug.text('window.innerWidth: ' + window.innerHeight, 64, 52);
}

socket.on('load', loadFunct);
socket.on('finishSpawn', function ()
{
	if (document.getElementById("connectingDiv") != null)
		document.getElementById('UI').removeChild(document.getElementById("connectingDiv"));
	document.getElementById("deathDiv").style.visibility = "hidden";
	document.getElementById('restartLoading').style.visibility = "hidden";
	isLost = false;
});
socket.on('processAction', function(action)
{
	if (game)
		process(action.x, action.y, action.visibility);
});

socket.on('loose', function() {
	var pX = game.input.position.x + game.camera.x;
	var pY = game.input.position.y + game.camera.y;
	pX = Math.floor(pX / tileWidth);
	pY = Math.floor(pY / tileHeight);
	game.add.sprite(pX * tileWidth, pY * tileHeight, 'bomb');
	document.getElementById("deathDiv").style.visibility = "visible";
	document.getElementById('restartLoading').style.visibility = "hidden";
	isLost = true;
});

socket.on('askUsername', function()
{
	menuDiv = document.createElement("div");
	menuDiv.id = "menuDiv";

	var loginDiv = document.createElement("div");
	loginDiv.id = "loginDiv";

	var errorMessageStr = document.createTextNode("");
	var errorMessageSpan = document.createElement("span");
	errorMessageSpan.id = "errorMessage";
	errorMessageSpan.appendChild(errorMessageStr);
	loginDiv.appendChild(errorMessageSpan);

	var titleNameStr = document.createTextNode("Demineur");
	var titleNameSpan = document.createElement("span");
	titleNameSpan.id = "title";
	titleNameSpan.appendChild(titleNameStr);
	loginDiv.appendChild(titleNameSpan);

	var usernameStr = document.createTextNode(" Username: ");
	var usernameSpan = document.createElement("span");
	usernameSpan.id = "username";
	usernameSpan.appendChild(usernameStr);
	loginDiv.appendChild(usernameSpan);

	var nameInput = document.createElement('input');
	nameInput.type = "text";
	nameInput.id = "nameInput";

	loginDiv.appendChild(nameInput);

	var passStr = document.createTextNode(" Password: ");
	var passSpan = document.createElement("span");
	passSpan.id = "password";
	passSpan.appendChild(passStr);
	loginDiv.appendChild(passSpan);

	var pass = document.createElement('input');
	pass.type = "text";
	pass.id = "passInput";
	loginDiv.appendChild(pass);

	var varvar = document.createTextNode("  ");
	loginDiv.appendChild(varvar);

	var button = document.createElement('input');
	button.type = "button";
	button.id = "buttonPlay";
	button.value = "Play";
	loginDiv.appendChild(button);
	button.onclick = function()
	{
		if (nameInput.value.length > 32)
		{
			errorMessageStr.nodeValue = "Username need to be less than 32 characters";
			return;
		}
		else if (nameInput.value.length < 3)
		{
			errorMessageStr.nodeValue = "Username need to have at least 2 characters";
			return;
		}
		actifUsername = nameInput.value;
		socket.emit('username', {name:nameInput.value, pass:pass.value});
	};
	menuDiv.appendChild(loginDiv);
	document.body.appendChild(menuDiv);
});

socket.on('errorConnect', function()
{
	document.getElementById("errorMessage").childNodes[0].nodeValue = "Error in login or password";
});

socket.on('returnInfo', function(value)
{
	process(value.x, value.y, value.v);
});

socket.on('printText', function(message)
{	logText.push(message);
});

socket.on('askDisconnect', function()
{
	disconnect = true;
	socket.disconnect();
	alert("The server has been shut down");
});

socket.on('updateScore', function(score)
{
	if(document.getElementById('scoreboard') == undefined)
		return;
	var arr = score.split("</pre>");
	var found = -1;
	for (var i = 0; i < arr.length; i++) {
		found = arr[i].search(" " + actifUsername + ":");
		if (found >= 0)
		{
			arr[i] = arr[i].replace(actifUsername, "<font color=\"#ffd700\">" + actifUsername);
			arr[i] = arr[i].replace("<br>", "</font><br>");
			break;
		}
	}
	if (found >= 0)
	{
		score = arr.join("</pre>");
	}
	document.getElementById('scoreboard').innerHTML = "<p align=\"center\">Leaderboard</p><pre> Rank   Name            Score</pre>" + score;
	socket.emit('askPersonalScore');
});

socket.on('returnPersonalScore', function(score)
{
	document.getElementById('scoreboard').innerHTML += score;
});

var moveCam = function(pos)
{

	if (pos.x * tileWidth < width / 2)
		pos.x = Math.floor((width / 2) / tileWidth) + 1;
	if (pos.y * tileHeight < height / 2)
		pos.y = Math.floor((height / 2) / tileHeight) + 1;
	if (pos.x + Math.floor((width / 2) / tileWidth) - 1 > 10000)
		pos.x = 10000 - Math.floor((width / 2) / tileWidth) - 1;
	if (pos.y + Math.floor((height / 2) / tileHeight) - 1 > 10000)
		pos.y = 10000 - Math.floor((height / 2) / tileHeight) - 1;

	if (pos.x == undefined || pos.y == undefined)
	{
		alert("Error");
		return;
	}
	game.camera.x = pos.x * tileWidth - width / 2;
	game.camera.y = pos.y * tileHeight - height / 2;

	console.log("movingCam to " + (pos.x * tileWidth - width / 2) + ":" + (pos.y * tileHeight - height / 2));

	indexX = pos.x - Math.floor((width / tileWidth + 2) / 2);
	indexY = pos.y - Math.floor((height / tileHeight + 2) / 2);

	console.log("Index " + indexX + ":" + indexY + "   " + startX + ":" + startY + "  " + endX + ":" + endY);

	for (var i = startX + indexX; i < endX + indexX; i++) {
		for (var j = startY + indexY; j < endY + indexY; j++) {
			socket.emit('askInfo', {x: i, y: j})
		}
	}
}

socket.on('moveTo', moveCam);
