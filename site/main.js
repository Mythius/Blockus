const canvas = obj('canvas');
const ctx = canvas.getContext('2d');
const socket = io();
socket.emit('blockus-join');

var board = new Grid(20,20,600/20);
var my_pieces = [];
var my_turn = false,finished = false;
var rot_times = 0;

var opts = {open:false};


mouse.start(canvas);
// keys.start();

class Piece{
	constructor(code,color='red'){
		let data = [];
		let c = 0;
		this.x = 0;
		this.y = 0;
		for(let i=0;i<5;i++) data.push(new Array(5).fill(false));
		for(let i=0;i<5;i++){
			for(let j=0;j<5;j++){
				if(c>code.length) break;
				let char = code[c++];
				if(char=='x'){
					data[j][i]=true;
				} else {
					j += Number(char)-1;
				}
			}
		}
		this.data = data;
		this.color = color;
		this.dock_x = 0;
	}
	rotate(){
		let nd = [];
		for(let i=0;i<5;i++) nd.push(new Array(5));
		for(let i=0;i<5;i++){
			for(let j=0;j<5;j++){
				nd[4-j][i] = this.data[i][j];
			}
		}
		this.data = nd;
	}
	flip(){
		let nd = [];
		for(let i=0;i<5;i++) nd.push(new Array(5));
		for(let i=0;i<5;i++){
			for(let j=0;j<5;j++){
				nd[4-i][j] = this.data[i][j];
			}
		}
		this.data = nd;
	}
	setPos(x,y){
		this.x = x;
		this.y = y;
	}
	draw(board){
		let p = this;
		let x = p.x;
		let y = p.y;
		for(let i=0;i<5;i++){
			for(let j=0;j<5;j++){
				let t = board.getTileAt(x+i,y+j);
				if(!t) continue;
				if(p.data[i][j]){
					t.color = p.color;
				} else {
					// t.color = 'blue';
				}
			}
		}
	}
	drawDocked(scrollx){
		this.pgrid = new Grid(5,5,30);
		this.draw(this.pgrid);
		this.pgrid.offsetX = this.dock_x + scrollx;
		this.pgrid.offsetY = 650;
		this.pgrid.draw();
	}
	hasSquare(x,y){
		return this.data[x][y];
	}
	getValue(){
		return this.data.flat().filter(e=>e).length;
	}
}

var imgs = {};
let colors = ['red','blue','green','yellow','cancel','confirm','rotate','flip','confirm_lock'];
for(let c of colors){
	let i = new Image;
	i.src = c+'.png';
	imgs[c]=i;
}

Tile.prototype.draw = function(lines){
	let ctx = this.grid.ctx;
	let ct = this.getCenter();
	let w2 = this.grid.scale/2;
	if(this.color in imgs) ctx.drawImage(imgs[this.color],ct.x-w2,ct.y-w2,w2*2,w2*2);
	else if(lines) this.draw_box('lightgray');
}
Grid.prototype.draw = function(lines=false){
	this.forEach(tile=>{
		tile.draw(lines);
	})
}
Grid.prototype.reset = function(){
	this.forEach(tile=>{
		tile.color = '#222';
	})
}
Grid.prototype.ctx = ctx;
Grid.prototype.rotate = function(n){
	let m = 4+(rot_times-n);
	for(let t=0;t<m%4;t++){
		let nd = [];
		for(let i=0;i<20;i++) nd.push(new Array(20));
		for(let i=0;i<20;i++){
			for(let j=0;j<20;j++){
				nd[19-j][i] = this.tiles[i][j].color;
			}
		}
		for(let i=0;i<20;i++){
			for(let j=0;j<20;j++){
				this.tiles[i][j].color = nd[i][j];
			}
		}
	}
}

Grid.prototype.toCode = function(){
	var encoder = {
		'#222': 0,
		'green': 1,
		'blue': 2,
		'red':  3,
		'yellow': 4
	}
	return this.tiles.flat().map(e=>encoder[e.color]);
}

Grid.prototype.fromCode = function(code){
	this.reset();
	var decoder = ['#222','green','blue','red','yellow'];
	let i=0;
	this.forEach(tile=>{
		tile.color = decoder[code[i++]];
	});
}

function setup(data){
	my_pieces = generatePieces(data.color);
	rot_times = data.i;
}


function generatePieces(color){
	let pieces = [];
	pieces.push(new Piece('552x',color));
	pieces.push(new Piece('551xx',color));
	pieces.push(new Piece('551xxx',color));
	pieces.push(new Piece('551xx32x',color));
	pieces.push(new Piece('51xx22xx',color));
	pieces.push(new Piece('55xxxx',color));
	pieces.push(new Piece('51xx22x22x',color));
	pieces.push(new Piece('52x31xxx',color));
	pieces.push(new Piece('52xx12xx',color));
	pieces.push(new Piece('51xxx12xx',color));
	pieces.push(new Piece('55xxxxx',color));
	pieces.push(new Piece('55xxxx13x',color));
	pieces.push(new Piece('51x1x11xxx',color));
	pieces.push(new Piece('51x31xxx12x',color));
	pieces.push(new Piece('52x21xxx12x',color));
	pieces.push(new Piece('51x31xxx13x',color));
	pieces.push(new Piece('51xx22xx13x',color));
	pieces.push(new Piece('51xx22xxx',color));
	pieces.push(new Piece('51xxx13x13x',color));
	pieces.push(new Piece('51xxx12x22x',color));
	pieces.push(new Piece('52x21xxxx',color));
	return pieces.reverse();
}

let cur_piece = null,scrollx=0,partx=0,mox=0,moy=0,mreset=false;
var placed_pieces = [];

function main(c=true){
	if(c) setTimeout(main,1000/60);
	ctx.clearRect(-2,-2,canvas.width+2,canvas.height+2);
	board.draw(true);
	if(mouse.down){
		if(!cur_piece || mreset){
			if(!cur_piece && my_turn) cur_piece = getActiveGrid();
			if(cur_piece || mreset){
				mox = mouse.pos.x - cur_piece.pgrid.offsetX;
				moy = mouse.pos.y - cur_piece.pgrid.offsetY;
				mreset = false;
			}
		}
		if(cur_piece){
			let opt = touchingOpt();
			if(opt){
				if(opt == 'cancel'){
					cur_piece = null;
					opts.p = null;
					opts.g = null;
				} else if(opt == 'rotate'){
					cur_piece.rotate();
					cur_piece.pgrid.reset();
					cur_piece.draw(cur_piece.pgrid);
					cur_piece.pgrid.draw();
				} else if(opt == 'flip'){
					cur_piece.flip();
					cur_piece.pgrid.reset();
					cur_piece.draw(cur_piece.pgrid);
					cur_piece.pgrid.draw();
				} else if(opt == 'confirm'){
					let {p,g} = opts;
					placed_pieces.push(cur_piece);
					let ix = my_pieces.indexOf(cur_piece);
					cur_piece.x = g.x-p.x;
					cur_piece.y = g.y-p.y;
					if(ix != -1){
						my_pieces.splice(ix,1);
					}
					opts.p = null;
					opts.g = null;
					cur_piece = null;
					finished = true;
				} else {
					cur_piece.pgrid.draw();
				}
				if(cur_piece) drawOpts(cur_piece.pgrid.offsetX+130,cur_piece.pgrid.offsetY+130);
			} else {
				opts.open = false;
				cur_piece.pgrid.offsetX = mouse.pos.x - mox;
				cur_piece.pgrid.offsetY = mouse.pos.y - moy;
				cur_piece.pgrid.draw();
			}
		}
	} else {
		if(cur_piece){
			mreset = true;
			let w2 = board.scale/2;
			let g = board.getActiveTile();
			let p = cur_piece.pgrid.getActiveTile();
			if(g && p){
				opts.g = g;
				opts.p = p;
				calcOffscreenPieceDraw();
				opts.open = true;
				drawOpts(cur_piece.pgrid.offsetX+130,cur_piece.pgrid.offsetY+130)
			} else if(opts.g && opts.p){
				if(!opts.open){
					let temp = board.getActiveTile(mouse.pos.x-mox+w2*5,mouse.pos.y-moy+w2*5);
					let tempp = cur_piece.pgrid.getTileAt(1,1);
					let ng = calcOffscreenPieceDraw(temp,tempp,false);
					if(ng){
						opts.g = ng;
						opts.p = cur_piece.pgrid.getTileAt(1,1);
					}
				}
				calcOffscreenPieceDraw();
				opts.open = true;
				drawOpts(cur_piece.pgrid.offsetX+130,cur_piece.pgrid.offsetY+130);

			} else {
				cur_piece.drawDocked(scrollx);
				opts.open = true;
				drawOpts(cur_piece.pgrid.offsetX+130,cur_piece.pgrid.offsetY+130);
			}
		}
	}
	for(let pp of placed_pieces){
		pp.draw(board);
	}
	draw_my_pieces();
	if(finished) finishTurn();
}

function draw_my_pieces(){
	let i=0;
	scrollx = Math.max(Math.min(50,scrollx),-my_pieces.length*170+450)
	for(let piece of my_pieces){
		if(piece == cur_piece){
			i++;
			continue;
		}
		piece.dock_x = (i * 170) + 40;
		piece.drawDocked(partx);
		if(partx - scrollx < -2){
			partx+=3;
		} else if(partx - scrollx > 2){
			partx-=3;
		}
		i++;
	}
}

function isValidSpot(){
	if(!cur_piece) return false;
	if(!opts.g||!opts.p) return false;
	let start_corner = board.getTileAt(board.width-1,board.height-1);
	let start_pos_filled = start_corner.color!='#222';
	let spx = opts.g.x-opts.p.x;
	let spy = opts.g.y-opts.p.y;
	let req_diag = false;
	for(let ix=0;ix<5;ix++){
		for(let iy=0;iy<5;iy++){
			let p = cur_piece.data[ix][iy];
			let b = board.getTileAt(spx+ix,spy+iy);
			if(p){
				if(!b) return false;
				if(b==start_corner){
					req_diag=true;
					start_pos_filled=true;
				} 
				if(b.color!='#222') return false;
				let st = edgeTouch(spx+ix,spy+iy,cur_piece.color);
				if(st==2) req_diag |= true;
				if(st==0) return false;
			}
		}
	}
	function edgeTouch(x,y,c){
		let state = 1;
		for(let dx=-1;dx<=1;dx++){
			for(let dy=-1;dy<=1;dy++){
				let diag = Math.abs(dx)+Math.abs(dy);
				if(diag==0) continue;
				let s = board.getTileAt(x+dx,y+dy);
				if(!s) continue;
				// s.color = 'blue';
				if(diag==2){
					if(s.color==c && state>0){
						state = 2;
					}
				} else {
					if(s.color==c){
						state = 0;
					}
				}
			}
		}
		return state;
	}
	return start_pos_filled&&req_diag;
}

function getActiveGrid(){
	for(let piece of my_pieces){
		if(piece.pgrid.getActiveTile()){
			return piece;
		}
	}
}

function calcOffscreenPieceDraw(tile,ptile,draw=true){						
	let {p,g} = opts;
	if(tile) g=tile;
	if(ptile) p=ptile;
	let t = board.getTileAt(g.x-p.x,g.y-p.y);
	let ct;
	if(t){
		ct = t.getCenter();
	} else {
		let ofx = 0;
		let ofy = 6;
		t = board.getTileAt(g.x-p.x,g.y-p.y+6);
		if(!t){
			ofx = 6;
			ofy = 0;
			t = board.getTileAt(g.x-p.x+6,g.y-p.y);
		}
		if(!t){
			ofx = 6;
			ofy = 6;
			t = board.getTileAt(g.x-p.x+6,g.y-p.y+6);
		}
		ct = t.getCenter();
		ct.x -= board.scale*ofx;
		ct.y -= board.scale*ofy;
	}
	cur_piece.pgrid.offsetX = ct.x - board.scale/2;
	cur_piece.pgrid.offsetY = ct.y - board.scale/2;
	if(draw) cur_piece.pgrid.draw();
	return t;
}

function touchingOpt(){
	if(!opts.open) return;
	let mx=mouse.pos.x,my=mouse.pos.y,ox=opts.x,oy=opts.y,s=opts.spacing;
	if(mx>ox&&mx<ox+40&&my>oy&&my<oy+40){
		mouse.down = false;
		return 'rotate';
	}
	if(mx>ox&&mx<ox+40&&my>oy+s&&my<oy+s+40){
		mouse.down = false;
		return 'flip';
	}
	if(mx>ox+s&&mx<ox+s+40&&my>oy&&my<oy+40){
		mouse.down = false;
		return 'cancel';
	}
	if(mx>ox+s&&mx<ox+s+40&&my>oy+s&&my<oy+s+40){
		mouse.down = false;
		if(opts.p && opts.g && isValidSpot()){
			return 'confirm';
		} else {
			return 'attempted';
		}
	}
}

function drawOpts(x,y){
	let spacing = 45;
	if(x+spacing+40 > canvas.width){
		drawOpts(x-200,y);
		return;
	}
	opts.x = x;
	opts.y = y;
	var is_valid_placement = isValidSpot();
	opts.spacing = spacing;
	ctx.drawImage(imgs.rotate,x,y);
	ctx.drawImage(imgs.flip,x,y+spacing);
	ctx.drawImage(imgs.cancel,x+spacing,y);
	ctx.drawImage(opts.p&&opts.g&&is_valid_placement?imgs.confirm:imgs.confirm_lock,x+spacing,y+spacing);
}

function finishTurn(){
	my_turn = false;
	finished = false;
	socket.emit('blockus-board',board.toCode());
	obj('#resign').disabled=true;
}

Touch.init(dat=>{
	if(dat.type == 'click'){
		mouse.pos.x = dat.x;
		mouse.pos.y = dat.y;
		ctx.beginPath();
		ctx.fillStyle = 'red';
		ctx.arc(dat.x,dat.y,10,0,Math.PI*2);
		ctx.fill();
		mouse.down = true;
		main(false);
		setTimeout(()=>{
			mouse.down = false;
		},500);
	} else if(dat.type == 'scroll'){
		mouse.pos.x = dat.x;
		mouse.pos.y = dat.y;
		if(cur_piece){
			mouse.down = true;
		} else if(Math.abs(dat.dx) > Math.abs(dat.dy)){
			scrollx +=  dat.dx;
		} else if(getActiveGrid()){
			mouse.down = true;
		} else {
			scrollx +=  dat.dx;
		}
	} else if(dat.type == 'end'){
		mouse.down = false;
	}
});

document.on('wheel',e=>{
	scrollx -= e.deltaY;
});

socket.on('blockus-nextturn',data=>{
	my_turn = true;
	obj('#resign').disabled=false;
});

socket.on('blockus-newboard',code=>{
	board.fromCode(code.board);
	board.rotate(code.turn);
});

socket.on('blockus-turname',name=>{
	msg(`${name}\'s Turn!`);
});

socket.on('blockus-msg',data=>{
	msg(data);
});

obj('#resign').on('click',e=>{
	if(confirm('Are you sure you want to finish?')){
		let final_score = my_pieces.map(e=>e.getValue()).reduce((a,b)=>a+b);
		if(my_pieces.length==0) final_score = 0;
		socket.emit('blockus-resign',final_score);
		obj('#resign').disabled = true;
	}
});

// main();