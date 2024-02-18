var settingsSantize = {
    allowedTags: [ 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'iframe','marquee','button','input'
    ,'details','summary','progress','meter','font','h1','h2','span','select','option','abbr',
    'acronym','adress','article','aside','bdi','bdo','big','center','site',
    'data','datalist','dl','del','dfn','dialog','dir','dl','dt','fieldset',
    'figure','figcaption','header','ins','kbd','legend','mark','nav',
    'optgroup','form','q','reveal','rp','rt','ruby','s','sample','spoiler','section','small',
    'sub','sup','template','textarea','tt','u'],
  allowedAttributes: {
    a: [ 'href', 'name', 'target' ],
    p:['align'],
    table:['align','border','bgcolor','cellpadding','cellspadding','frame','rules','width'],
    tbody:['align','valign'],
    tfoot:['align','valign'],
    td:['align','colspan','headers','nowrap'],
    th:['align','colspan','headers','nowrap'],
    textarea:['cols','dirname','disabled','placeholder','maxlength','readonly','required','rows','wrap'],
    pre:['width'],
    ol:['compact','reversed','start','type'],
    option:['disabled'],
    optgroup:['disabled','label','selected'],
    legend: ['align'],
    li:['type','value'],
    hr:['align','noshade','size','width'],
    fieldset:['disabled'],
    dialog:['open'],
    dir:['compact'],
    bdo:['dir'],
    div:['class'],
    marquee:['behavior','bgcolor','direction','width','height','loop'],
    reveal:[''],
    spoiler:[''],
    button: ['disabled'],
    input:['value','type','disabled','maxlength','max','min','placeholder','readonly','required'],
    details:['open'],
    div:['align'],
    progress:['value','max'],
    meter:['value','max','min','optimum','low','high'],
    font:['size','family','color'],
    select:['disabled','multiple','require'],
    ul:['type','compact'],  
    "*":['hidden','spellcheck','title','contenteditable','data-style']
  },
  selfClosing: [ 'img', 'br', 'hr', 'area', 'base', 'basefont', 'input', 'spoiler', 'reveal', 'link', 'meta' , 'wbr'],
  allowedSchemes: [ 'http', 'https', 'ftp', 'mailto', 'data' ],
  allowedSchemesByTag: {},
  allowedSchemesAppliedToAttributes: [ 'href', 'src', 'cite' ],
  allowProtocolRelative: true
} 
  // Code by ItzCrazyScout and 'HOST'

function emojify(txt){
    return txt.replace(/:(bonzi|evil|pink|earth|globe|sad|doggis|program|swag|flip):/g,"<img src=\"/img/emoji/$1.png\">")
}

function markup(text){
    if(text.startsWith("++")){
        return text.slice(2)
    }
    text = text.replace(/%%%%/g,"<br>")
    text = text.replace(/\*\*(.*?)\*\*/g,"<b>$1</b>")
    text = text.replace(/\*(.*?)\*/g,"<i>$1</i>")
    text = text.replace(/\~\~(.*?)\~\~/g,"<s>$1</s>")
    text = text.replace(/`(.*?)`/g,"<code>$1</code>")
    text = text.replace(/(<br>|^)>(.*?)(<br>|$)/g,"$1<div data-style=\"quote\">$2</div>")
    return text
}
  
var stickers = {
    sad:"so sad",
    bonzi:"BonziBUDDY",
    host:"host is a bathbomb",
    spook:"ew im spooky",
    forehead:"you have a big forehead",
    ban:"i will ban you so hard right now",
    flatearth:"this is true and you cant change my opinion loser",
    swag:"look at my swag",
    sans:"fuck you",
    flip:"fuck you",
    topjej:"toppest jej",
    high:"me high eh - f",
    sex:"bonzi sex",
    cyan:"cyan is yellow",
    no:"fuck no",
    bye:"bye im fucking leaving",
    kiddie:"kiddie"
}
const log = require("./log.js").log;
const Ban = require("./ban.js");
const Utils = require("./utils.js");
const io = require('./index.js').io;
const settings = require("./settings.json");
const sanitize = require('sanitize-html');

let roomsPublic = [];
let rooms = {};
let usersAll = [];

exports.beat = function() {
    io.on('connection', function(socket) {
        new User(socket);
    });
};

function checkRoomEmpty(room) {
    if (room.users.length != 0) return;

    log.info.log('debug', 'removeRoom', {
        room: room
    });

    let publicIndex = roomsPublic.indexOf(room.rid);
    if (publicIndex != -1)
        roomsPublic.splice(publicIndex, 1);
    
    room.deconstruct();
    delete rooms[room.rid];
    delete room;
}

class Room {
    constructor(rid, prefs) {
        this.rid = rid;
        this.prefs = prefs;
        this.users = [];
    }

    deconstruct() {
        try {
            this.users.forEach((user) => {
                user.disconnect();
            });
        } catch (e) {
            log.info.log('warn', 'roomDeconstruct', {
                e: e,
                thisCtx: this
            });
        }
        //delete this.rid;
        //delete this.prefs;
        //delete this.users;
    }

    isFull() {
        return this.users.length >= this.prefs.room_max;
    }

    join(user) {
        user.socket.join(this.rid);
        this.users.push(user);

        this.updateUser(user);
    }

    leave(user) {
        // HACK
        try {
            this.emit('leave', {
                 guid: user.guid
            });
     
            let userIndex = this.users.indexOf(user);
     
            if (userIndex == -1) return;
            this.users.splice(userIndex, 1);
     
            checkRoomEmpty(this);
        } catch(e) {
            log.info.log('warn', 'roomLeave', {
                e: e,
                thisCtx: this
            });
        }
    }

    updateUser(user) {
		this.emit('update', {
			guid: user.guid,
			userPublic: user.public
        });
    }

    getUsersPublic() {
        let usersPublic = {};
        this.users.forEach((user) => {
            usersPublic[user.guid] = user.public;
        });
        return usersPublic;
    }

    emit(cmd, data) {
		io.to(this.rid).emit(cmd, data);
    }
}

function newRoom(rid, prefs) {
    rooms[rid] = new Room(rid, prefs);
    log.info.log('debug', 'newRoom', {
        rid: rid
    });
}

let userCommands = {
    "godmode": function(word) {
        let success = word == this.room.prefs.godword;
        if (success){
            this.private.runlevel = 3;
            this.socket.emit('admin')
        }else{
            this.socket.emit('alert','Wrong password. Did you try "Password"?')
        }
        log.info.log('debug', 'godmode', {
            guid: this.guid,
            success: success
        });
    },
    "sanitize": function() {
        let sanitizeTerms = ["false", "off", "disable", "disabled", "f", "no", "n"];
        let argsString = Utils.argsString(arguments);
        this.private.sanitize = !sanitizeTerms.includes(argsString.toLowerCase());
    },
	"sticker": function(sticker){
        if(Object.keys(stickers).includes(sticker)){
            this.room.emit('talk',{
                text:`<img src="./img/stickers/${sticker}.png" height=170>`,
                say:stickers[sticker],
                guid:this.guid
            })
		} 
    },
    kick:function(data){
        if(this.private.runlevel<3){
            this.socket.emit('alert','admin=true')
            return;
        }
        let pu = this.room.getUsersPublic()[data]
        if(pu&&pu.color){
            let target;
            this.room.users.map(n=>{
                if(n.guid==data){
                    target = n;
                }
            });
                target.socket.emit("kick",{
                    reason:"You got kicked."
                });
                target.disconnect();
        }else{
            this.socket.emit('alert','The user you are trying to kick left. Get dunked on nerd')
        }
    },
    css:function(...txt){
        this.room.emit('css',{
            guid:this.guid,
            css:txt.join(' ')
        })
    },
    ban:function(data){
        if(this.private.runlevel<3){
            this.socket.emit('alert','admin=true')
            return;
        }
        let pu = this.room.getUsersPublic()[data]
        if(pu&&pu.color){
            let target;
            this.room.users.map(n=>{
                if(n.guid==data){
                    target = n;
                }
            })
            if (target.socket.request.connection.remoteAddress == "::1"){
                Ban.removeBan(target.socket.request.connection.remoteAddress)
            } else if (target.socket.request.connection.remoteAddress == "::ffff:127.0.0.1"){
                Ban.removeBan(target.socket.request.connection.remoteAddress)
            } else {

                target.socket.emit("ban",{
                    reason:"You got banned."
                })
                Ban.addBan(target.socket.request.connection.remoteAddress, 24, "You got banned.");
            }
        }else{
            this.socket.emit('alert','The user you are trying to kick left. Get dunked on nerd')
        }
    },
    "unban": function(ip) {
		Ban.removeBan(ip)
    },
    "joke": function() {
        this.room.emit("joke", {
            guid: this.guid,
            rng: Math.random()
        });
    },
    "fact": function() {
        this.room.emit("fact", {
            guid: this.guid,
            rng: Math.random()
        });
    },
    "youtube": function(vidRaw) {

			if(vidRaw.includes("\"")){
				this.room.emit("talk", {
					guid: this.guid,
					text: "I'M PRETENDING TO BE A 1337 HAX0R BUT I'M ACTUALLY A SKRIPT KIDDIE LMAO"
				}); 
				return;
			}
			if(vidRaw.includes("'")){ 
				this.room.emit("talk", {
					guid: this.guid,
					text: "I'M PRETENDING TO BE A 1337 HAX0R BUT I'M ACTUALLY A SKRIPT KIDDIE LMAO"
				}); 
				return;
			}
        var vid = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
        this.room.emit("youtube", {
            guid: this.guid,
            vid: vid
        });
    },
    "backflip": function(swag) {
        this.room.emit("backflip", {
            guid: this.guid,
            swag: swag == "swag"
        });
    },
    "swag": function(swag) {
        this.room.emit("swag", {
            guid: this.guid
        });
    },
    "shrug": function(swag) {
        this.room.emit("shrug", {
            guid: this.guid,
            text: sanitize(Utils.argsString(arguments))
        });
    },
    "grin": function(swag) {
        this.room.emit("grin", {
            guid: this.guid,
            text: sanitize(Utils.argsString(arguments))
        });
    },
    css:function(...txt){
        this.room.emit('css',{
            guid:this.guid,
            css:txt.join(' ')
        })
    },
    sendraw:function(...txt){
        this.room.emit('sendraw',{
            guid:this.guid,
            text:txt.join(' ')
        })
    },
    rickroll:function(...txt){
        this.room.emit('rickroll',{
            guid:this.guid,
            link:txt.join(' ')
        })
    },
    "linux": "passthrough",
    "pawn": "passthrough",
    "bees": "passthrough",
    "color": function(color) {
        if (typeof color != "undefined") {
            if (settings.bonziColors.indexOf(color) == -1)
                return;
            
            this.public.color = color;
        } else {
            let bc = settings.bonziColors;
            this.public.color = bc[
                Math.floor(Math.random() * bc.length)
            ];
        }

        this.room.updateUser(this);
    },
    "pope": function() {
        this.public.color = "pope";
        this.room.updateUser(this);
    },
    "asshole": function() {
        this.room.emit("asshole", {
            guid: this.guid,
            target: sanitize(Utils.argsString(arguments))
        });
    },
    "owo": function() {
        this.room.emit("owo", {
            guid: this.guid,
            target: sanitize(Utils.argsString(arguments))
        });
    },
    "triggered": "passthrough",
    "vaporwave": function() {
        this.socket.emit("vaporwave");
        this.room.emit("youtube", {
            guid: this.guid,
            vid: "aQkPcPqTq4M"
        });
    },
    "unvaporwave": function() {
        this.socket.emit("unvaporwave");
    },
    "name": function() {
        let argsString = Utils.argsString(arguments);
        if (argsString.length > this.room.prefs.name_limit)
            return;

        let name = argsString || this.room.prefs.defaultName;
        this.public.name = this.private.sanitize ? sanitize(name) : name;
        this.room.updateUser(this);
    },
    "group":function(...text){
        text = text.join(" ")
        if(text){
            this.private.group = text + ""
            this.socket.emit("alert","joined the group")
            return
        }
        this.socket.emit("alert","enter a group id")
    },
    "dm":function(...text){
        text = text.join(" ")
        text = sanitize(text,settingsSantize)
        if(!this.private.group){
            this.socket.emit("alert","join a group first")
            return
        }
        this.room.users.map(n=>{
            if(this.private.group === n.private.group){
                n.socket.emit("talk",{
                    guid:this.guid,
                    text:`<small><i>Only your group can see this.</i></small><br>${text}`,
                    say:text
                })
            }
        })
    },
    "startyping": function(swag) {
        this.room.emit("typing", {
            guid: this.guid
        });
    },
    "stoptyping": function(swag) {
        this.room.emit("stoptyping", {
            guid: this.guid
        });
    },
    "whynot": function(swag) {
        this.room.emit("whynot", {
            guid: this.guid
        });
    },
    "isee": function(swag) {
        this.room.emit("isee", {
            guid: this.guid
        });
    },
    imageapi: function (data) {
        if (data.includes('"') || data.length > 8 * 1024 * 1024) return;
        this.room.emit("talk", { guid: this.guid, text: `<img alt="assume png" src="data:image/png;base64,${data}"/>`, say: "-e" });
    },
	"dm2": function (data) {
		if (typeof data != "object") return
		let pu = this.room.getUsersPublic()[data.target]
		if (pu && pu.color) {
			let target;
			this.room.users.map(n => {
				if (n.guid == data.target) {
					target = n;
				}
			})
			data.text = sanitize(data.text, settingsSantize)
			target.socket.emit("talk", {
				guid: this.guid,
				text: `<small>Only you can see this.</small><br>${data.text}`,
				say: data.text
			})
			this.socket.emit("talk", {
				guid: this.guid,
				text: `<small>Only ${pu.name} can see this.</small><br>${data.text}`,
				say: data.text
			})
		} else {
			this.socket.emit('alert','The user you are trying to dm left. Get dunked on nerd')
		}
	},
    "pitch": function(pitch) {
        pitch = parseInt(pitch);

        if (isNaN(pitch)) return;

        this.public.pitch = Math.max(
            Math.min(
                parseInt(pitch),
                this.room.prefs.pitch.max
            ),
            this.room.prefs.pitch.min
        );

        this.room.updateUser(this);
    },
    "speed": function(speed) {
        speed = parseInt(speed);

        if (isNaN(speed)) return;

        this.public.speed = Math.max(
            Math.min(
                parseInt(speed),
                this.room.prefs.speed.max
            ),
            this.room.prefs.speed.min
        );
        
        this.room.updateUser(this);
    }
};


class User {
    constructor(socket) {
        this.guid = Utils.guidGen();
        this.socket = socket;

        // Handle ban
	    if (Ban.isBanned(this.getIp())) {
            Ban.handleBan(this.socket);
        }

        this.private = {
            login: false,
            sanitize: true,
            runlevel: 0
        };

        this.public = {
            color: settings.bonziColors[Math.floor(
                Math.random() * settings.bonziColors.length
            )]
        };

        log.access.log('info', 'connect', {
            guid: this.guid,
            ip: this.getIp()
        });

       this.socket.on('login', this.login.bind(this));
    }

    getIp() {
        return this.socket.request.connection.remoteAddress;
    }

    getPort() {
        return this.socket.handshake.address.port;
    }

    login(data) {
        if (typeof data != 'object') return; // Crash fix (issue #9)
        
        if (this.private.login) return;

		log.info.log('info', 'login', {
			guid: this.guid,
        });
        
        let rid = data.room;
        
		// Check if room was explicitly specified
		var roomSpecified = true;

		// If not, set room to public
		if ((typeof rid == "undefined") || (rid === "")) {
			rid = roomsPublic[Math.max(roomsPublic.length - 1, 0)];
			roomSpecified = false;
		}
		log.info.log('debug', 'roomSpecified', {
			guid: this.guid,
			roomSpecified: roomSpecified
        });
        
		// If private room
		if (roomSpecified) {
            if (sanitize(rid) != rid) {
                this.socket.emit("loginFail", {
                    reason: "nameMal"
                });
                return;
            }

			// If room does not yet exist
			if (typeof rooms[rid] == "undefined") {
				// Clone default settings
				var tmpPrefs = JSON.parse(JSON.stringify(settings.prefs.private));
				// Set owner
				tmpPrefs.owner = this.guid;
                newRoom(rid, tmpPrefs);
			}
			// If room is full, fail login
			else if (rooms[rid].isFull()) {
				log.info.log('debug', 'loginFail', {
					guid: this.guid,
					reason: "full"
				});
				return this.socket.emit("loginFail", {
					reason: "full"
				});
			}
		// If public room
		} else {
			// If room does not exist or is full, create new room
			if ((typeof rooms[rid] == "undefined") || rooms[rid].isFull()) {
				rid = Utils.guidGen();
				roomsPublic.push(rid);
				// Create room
				newRoom(rid, settings.prefs.public);
			}
        }
        
        this.room = rooms[rid];

        // Check name
		this.public.name = sanitize(data.name) || this.room.prefs.defaultName;

		if (this.public.name.length > this.room.prefs.name_limit)
			return this.socket.emit("loginFail", {
				reason: "nameLength"
			});
        
		if (this.room.prefs.speed.default == "random")
			this.public.speed = Utils.randomRangeInt(
				this.room.prefs.speed.min,
				this.room.prefs.speed.max
			);
		else this.public.speed = this.room.prefs.speed.default;

		if (this.room.prefs.pitch.default == "random")
			this.public.pitch = Utils.randomRangeInt(
				this.room.prefs.pitch.min,
				this.room.prefs.pitch.max
			);
		else this.public.pitch = this.room.prefs.pitch.default;

        // Join room
        this.room.join(this);

        this.private.login = true;
        this.socket.removeAllListeners("login");

		// Send all user info
		this.socket.emit('updateAll', {
			usersPublic: this.room.getUsersPublic()
		});

		// Send room info
		this.socket.emit('room', {
			room: rid,
			isOwner: this.room.prefs.owner == this.guid,
			isPublic: roomsPublic.indexOf(rid) != -1
		});

        this.socket.on('talk', this.talk.bind(this));
        this.socket.on('command', this.command.bind(this));
        this.socket.on('disconnect', this.disconnect.bind(this));
    }

    talk(data) {
        if (typeof data != 'object') { // Crash fix (issue #9)
            data = {
                text: "HEY EVERYONE LOOK AT ME I'M TRYING TO SCREW WITH THE SERVER LMAO"
            };
        }

        log.info.log('debug', 'talk', {
            guid: this.guid,
            text: data.text,
            say:sanitize(data.text,{allowedTags: []})
        });

        if (typeof data.text == "undefined")
            return;
        let text;
        if(this.room.rid.startsWith('js-')){
            text = data.text
        }else{
            text = this.private.sanitize ? sanitize(data.text+"",settingsSantize) : data.text;
        }
        if ((text.length <= this.room.prefs.char_limit) && (text.length > 0)) {
            this.room.emit('talk', {
                guid: this.guid,
                text: text,
                say: sanitize(text,{allowedTags: []})
            });
        }
    }

    command(data) {
        if (typeof data != 'object') return; // Crash fix (issue #9)

        var command;
        var args;
        
        try {
            var list = data.list;
            command = list[0].toLowerCase();
            args = list.slice(1);
    
            log.info.log('debug', command, {
                guid: this.guid,
                args: args
            });

            if (this.private.runlevel >= (this.room.prefs.runlevel[command] || 0)) {
                let commandFunc = userCommands[command];
                if (commandFunc == "passthrough")
                    this.room.emit(command, {
                        "guid": this.guid
                    });
                else commandFunc.apply(this, args);
            } else
                this.socket.emit('commandFail', {
                    reason: "runlevel"
                });
        } catch(e) {
            log.info.log('debug', 'commandFail', {
                guid: this.guid,
                command: command,
                args: args,
                reason: "unknown",
                exception: e
            });
            this.socket.emit('commandFail', {
                reason: "unknown"
            });
        }
    }

    disconnect() {
		let ip = "N/A";
		let port = "N/A";

		try {
			ip = this.getIp();
			port = this.getPort();
		} catch(e) { 
			log.info.log('warn', "exception", {
				guid: this.guid,
				exception: e
			});
		}

		log.access.log('info', 'disconnect', {
			guid: this.guid,
			ip: ip,
			port: port
		});
         
        this.socket.broadcast.emit('leave', {
            guid: this.guid
        });
        
        this.socket.removeAllListeners('talk');
        this.socket.removeAllListeners('command');
        this.socket.removeAllListeners('disconnect');

        this.room.leave(this);
    }
}
