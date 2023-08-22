var players = [],games = [];

class Game{
	constructor(host){
		this.host = host;
		this.started = false;
		this.players = [];
		this.colors = ['red','blue','green','yellow'];
		games.push(this);
		this.addPlayer(host);
		this.turn = -1;
	}
	emitToPlayers(msg,data){
		for(let p of this.players){
			p.emit(msg,data);
		}
	}
	end(){
		for(let p of this.players){
			p.game = null;
		}
		let ix = games.indexOf(this);
		if(ix>-1) games.splice(ix,1);
		emitGames();
	}
	updateColors(player,color){
		player.color = color;
		let ix = this.colors.indexOf(color);
		if(ix>-1) this.colors.splice(ix,1);
		this.emitToPlayers('blockus-joinlobby',this.colors);
		this.emitToPlayers('blockus-playernames',this.players.map(e=>{return {name:e.name,color:e.color}}));
	}
	addPlayer(player){
		this.players.push(player);
		player.game = this;
		player.color = '';
		this.emitToPlayers('blockus-joinlobby',this.colors);
		this.emitToPlayers('blockus-playernames',this.players.map(e=>{return {name:e.name,color:e.color}}));
	}
	start(){
		this.started = true;
		let i=0;
		for(let player of this.players){
			if(player.color){
				player.emit('blockus-start',{color:player.color,i});
			} else {
				player.emit('blockus-start',{color:this.colors.pop(),i});
			}
			i++;
		}
		this.nextTurn();
	}
	nextTurn(board='0'.repeat(400)){
		this.emitToPlayers('blockus-newboard',{board,turn:this.turn});
		this.turn = (this.turn + 1) % this.players.length;
		this.players[this.turn].emit('blockus-nextturn');
	}
}

function join(player){
	players.push(player);
	setupCommunication(player);
}

function setupCommunication(player){
	let socket = player.socket;
	socket.on('blockus-name',name=>{
		player.name = name;
	});
	socket.on('blockus-newgame',ng=>{
		let g = new Game(player);
		player.game = g;
		socket.emit('blockus-joinlobby',g.colors);
		socket.emit('blockus-host');
		emitGames();
	});
	socket.on('blockus-color',color=>{
		player.game.updateColors(player,color);
	});
	socket.on('blockus-jgame',name=>{
		let gnames = games.filter(game=>!game.started&&game.host.name==name);
		if(gnames[0]){
			console.log(player.name+' joined '+gnames[0].host.name+'\'s game');
			gnames[0].addPlayer(player);
		} else {
			console.log('Game not found');
		}
	});
	socket.on('blockus-reqstart',e=>{
		player.game.start();
	});
	socket.on('blockus-board',board=>{
		player.game.nextTurn(board);
	});
	emitGames();
}

function emitGames(){
	let gnames = games.filter(e=>!e.started).map(e=>e.host.name);
	for(let p of players){
		p.emit('blockus-lobby',gnames);
	}
}

function disconnect(player){
	if(!player.game) return;
	if(player.game.host==player){
		player.game.end();
	}
	if(player.game){
		// player.game.emitToPlayers('blockus-pdc'
	}
}




exports.join = join;
exports.disconnect = disconnect;