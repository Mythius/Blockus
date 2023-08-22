var floatingPieces = [];
var bg_i;

var all_pieces = [];
all_pieces.push(generatePieces('red'));
all_pieces.push(generatePieces('green'));
all_pieces.push(generatePieces('blue'));
all_pieces.push(generatePieces('yellow'));
all_pieces = all_pieces.flat();

class fPiece{
	constructor(piece){
		this.c = create('canvas');
		this.c.width = 150;
		this.c.height = this.c.width;
		this.ctx = this.c.getContext('2d');
		this.piece = piece;
		this.grid = new Grid(5,5,this.c.width/5);
		this.grid.ctx = this.ctx;
		this.x = random(0,window.innerWidth);
		this.y = random(0,window.innerHeight);
		this.dx = random(-2,2);
		if(this.dx == 0) this.dx = -3;
		this.dy = random(-2,2);
		if(this.dy == 0) this.dy = 3;
		this.rot = 0;
		this.drot = random(-2,2);
		if(this.drot == 0) this.drot = -2;
		this.c.classList.add('floating');
		document.body.appendChild(this.c);
	}
	draw(){
		this.x = (this.x+this.dx+window.innerWidth)%window.innerWidth;
		this.y = (this.y+this.dy+window.innerHeight)%window.innerHeight;
		this.rot += this.drot;
		this.piece.draw(this.grid);
		this.grid.draw();
		this.c.style.left = this.x+'px';
		this.c.style.top = this.y+'px';
		this.c.style.transform = `rotate(${this.rot}deg)`;
	}
}

function startBackground(){
	obj('#game').style.visibility='hidden';
	for(let i=0;i<15;i++){
		let r = random(0,all_pieces.length-1);
		let fp = new fPiece(all_pieces.splice(r,1)[0]);
		floatingPieces.push(fp);
	}
	bgLoop();
}

function stopBackground(){
	obj('#game').style.visibility='inherit';
	clearTimeout(bg_i);
	for(let p of floatingPieces) p.c.remove();
	floatingPieces = [];
}

function bgLoop(){
	bg_i = setTimeout(bgLoop,1000/30);
	for(let p of floatingPieces){
		p.draw()
	}
}

startBackground();