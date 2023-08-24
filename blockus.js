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
		this.board = '';
	}
	emitToPlayers(msg,data){
		for(let p of this.players){
			if(p) p.emit(msg,data);
		}
	}
	end(){
		if(this.started) return;
		for(let p of this.players){
			if(p) p.game = null;
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
		if(this.players.length > 3) return false;
		this.players.push(player);
		player.game = this;
		player.canPlay = true;
		player.color = '';
		this.emitToPlayers('blockus-joinlobby',this.colors);
		this.emitToPlayers('blockus-playernames',this.players.map(e=>{return {name:e.name,color:e.color}}));
		return true;
	}
	removePlayer(player){
		let ix = this.players.indexOf(player);
		// console.log(`ix: ${ix}, turn: ${this.turn}, player: ${player.name}`);
		player.game = null;
		if(ix<0) return;
		if(!this.started){
			this.players.splice(ix,1);
			if(player.color){
				this.colors.push(player.color);
			}
			this.emitToPlayers('blockus-playernames',this.players.map(e=>{return {name:e.name,color:e.color}}));
		} else {
			this.players[ix] = null;
		}
		if(this.players.filter(e=>e).length==0){
			this.started = false;
			// console.log('all players left game');
			this.end();
			return;
		}
		if(ix == this.turn){
			this.nextTurnInit();
		}
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
			if(!player.name.length){
				player.name = player.color;
			}
		}
		this.nextTurn();
	}
	nextTurnInit(){
		this.turn = (this.turn + 1) % this.players.length;
		let next_player = this.players[this.turn];
		if(this.checkGameOver()) return;
		while(!next_player || !next_player.canPlay){
			this.turn = (this.turn + 1) % this.players.length;
			next_player = this.players[this.turn];
		}
		this.emitToPlayers('blockus-turname',next_player.name);
		next_player.emit('blockus-nextturn');
	}
	checkGameOver(){
		let player_remaining = this.players.filter(e=>e&&e.canPlay).length;
		console.log(player_remaining);
		if(player_remaining == 0){
			let winner = {final_score:100,name:'error'};
			for(let player of this.players){
				if(player){
					console.log(player.name+' '+player.final_score);
					if(player.final_score < winner.final_score){
						winner = player;
					}
				}
			}
			this.emitToPlayers('blockus-msg','Game Over! winner is: '+winner.name);
			let ix = games.indexOf(this);
			if(ix!=-1) games.splice(ix,1);
			return true;
		}
	}
	nextTurn(board='0'.repeat(400)){
		this.board = board;
		this.emitToPlayers('blockus-newboard',{board,turn:this.turn});
		this.nextTurnInit();
	}
	cantPlay(player,final_score){
		player.canPlay = false;
		console.log(final_score);
		player.final_score = final_score;
		this.nextTurnInit();
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
			// console.log(player.name+' joined '+gnames[0].host.name+'\'s game');
			let joined = gnames[0].addPlayer(player);
			if(!joined){
				socket.emit('blockus-msg','Couldn\'t join, already 4 players');
			}
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
	socket.on('blockus-resign',final_score=>{
		player.game.cantPlay(player,final_score);
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
	if(player.game?.host==player){
		player.game.end();
	}
	if(player.game){
		player.game.emitToPlayers('blockus-pdc',player.name);
		player.game.removePlayer(player);
	}
}




exports.join = join;
exports.disconnect = disconnect;