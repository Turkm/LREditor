"use strict";

/**
* Import a level.
*
* @namespace LR
* @class LevelImporter
* @constructor
*/
LR.LevelImporter = function() {

};

/**
* Import all the level.
*
* @method import
* @param {Object} level The level to import
* @param {Phaser.Game} game The game where the level will be imported
* @param {function} promise A promise
*/
LR.LevelImporter.prototype.import = function(_level, _game, _promise) {
	var loader = new Phaser.Loader(_game);
	this.importAssets(_level.assets, loader, _game);
	// if assets need to be loaded
	if (loader.totalQueuedFiles() > 0) {
		loader.start();
		loader.onLoadComplete.add(function() {
			// now assets are loaded, we can import entities
			this.importEntitiesAndDo(_level.objects, _game, _promise);
		}, this);	
	} else {
		// directly create object
		this.importEntitiesAndDo(_level.objects, _game, _promise);
	}
};

/***********
** ASSETS **
***********/

/**
* Import all the assets (images, sounds, etc...)
*
* @method importAssets
* @param {Object} assets Assets informations
* @param {Phaser.Loader} loader The loader used to import assets
*/
LR.LevelImporter.prototype.importAssets = function(_assets, _loader) {
	if (_assets)
	{
		if (_assets.images) {
			this.importImages(_assets.images, _loader);
		}

		if (_assets.atlases) {
			this.importAtlases(_assets.atlases, _loader);
		}
	}
	
};

/***********
** IMAGES **
***********/

/**
* Import all the images
*
* @method importImages
* @param {Object} images Images informations
* @param {Phaser.Loader} loader The loader used to import images
*/
LR.LevelImporter.prototype.importImages = function(_images, _loader) {
	for (var i = 0; i < _images.length; i++) {
		var img = _images[i];
		_loader.spritesheet(
			img.name, img.path, img.frameWidth, img.frameHeight);
	};
};

LR.LevelImporter.prototype.importAtlases = function(_atlases, _loader) {
	if(_atlases == null)
		return;
	var atlasesPath = this.$scope.project.path+"/assets/atlases";
	for (var i = 0; i < _atlases.length; i++) {
		var atlas = _atlases[i];
		_loader.atlasJSONHash(
			atlas.name, atlasesPath+atlas.path + ".png", 
			atlasesPath+atlas.path+".json");
	};
};

/************
** ENTITIES **
************/

/**
* Import all entities and do the promise
*
* @method importEntitiesAndDo
* @param {Object} objects Entities informations
* @param {Phaser.Game} game The game where entities will be imported
* @param {function} promise A promise
* @return the root of all entities
*/
LR.LevelImporter.prototype.importEntitiesAndDo = function(_objects, _game, _promise) {
	var error = null;
	var root = null;

	if (_objects) {
		root = this.importEntities(_objects, _game);
		this.doAfterImportEntitiesAndBeforePromise(_objects, _game);
	} else {
		error = "No entity to import.";
	}	
	
	if (typeof _promise === "function") {
		_promise(error, root, _game, this.$scope?this.$scope.project:null );
	}
};

/**
* Import all entities
*
* @method importEntities
* @param {Object} Objects Entities informations
* @param {Phaser.Game} game The game where entities will be imported
*/
LR.LevelImporter.prototype.importEntities = function(_object, _game) {
	var entity = null;
	if (_object.name === "__world") {
		// do nothing (already created by Phaser)
		entity = _game.world;
		entity.setBounds(0, 0, _object.width, _object.height);
	} else {
		entity = this.importEntity(_object, _game);
		entity.updateTransform();
	}

	if (_object.children != null) {
		for (var i = 0; i < _object.children.length; i++) {
			var child = _object.children[i];
			var cChild = this.importEntities(child, _game);
			if( entity == null ){
				console.log("Parent is null");
			}else if (cChild) {			
				if(child.type == "LR.Entity.Group" && cChild.onAddedToGroup)
					cChild.onAddedToGroup(cChild ,entity);
				entity.add(cChild,true);
				cChild.updateTransform();
			}
		};
	}

	return entity;
}

/**
* Override this method to do something between the entities importation and
* the promise
*
* @method doAfterImportEntitiesAndBeforePromise
* @param {Object} objects Entities informations
* @param {Phaser.Game} game The game where entiites will be imported
*/
LR.LevelImporter.prototype.doAfterImportEntitiesAndBeforePromise = function(_object, _game) {

};

/**
* Import an entity
*
* @method importEntity
* @param {Object} object Entity informations
* @param {Phaser.Game} game The game where entities will be imported
*/
LR.LevelImporter.prototype.importEntity = function(_object, _game) {
	var entity = LR.LevelUtilities.CreateEntityByType(_object, _game);

	if (entity) {

		this.setGeneral(_object, entity);		

		this.setDisplay(_object, entity);

		if (_object.body) {
			this.setPhysics(_object, entity);
		}

		this.setBehaviours(_object, entity);

		this.setTweens(_object, entity);

		this.setSounds(_object, entity);
	}

	//ANCHOR
	if( _object.anchor ){
		entity.anchor.setTo(_object.anchor.x , _object.anchor.y);
	} 

	return entity;
};

LR.LevelImporter.prototype.setGeneral = function(_objectData, _entity) {
	_entity.name = _objectData.name;
	_entity.go.name = _objectData.name;
	_entity.x = _objectData.x;
	_entity.y = _objectData.y;
	_entity.angle = _objectData.angle;

	/*if( _objectData.anchor ){
		console.log(_objectData.anchor);
		_entity.anchor.setTo(_objectData.anchor.x , _objectData.anchor.y);
		console.log(_entity.anchor);
	} */
	
	if( _objectData.scaleX && _objectData.scaleY){
		_entity.scale.x = _objectData.scaleX;
		_entity.scale.y = _objectData.scaleY;
	}

	if(		_objectData.type == "LR.Entity.Sprite"
		||	_objectData.type == "LR.Entity.TileSprite"
		||	_objectData.type == "LR.Entity.Button"
	) {
		_entity.width = _objectData.width;
		_entity.height = _objectData.height;
	}  
	//TEXT
	if(_objectData.type == "LR.Entity.Text"){
		if (_objectData.textData) {
			_entity.text = _objectData.textData.text;
			//Reset width after font settings are filled
			_entity.updateTransform();
		}
	}
	//BITMAP TEXT
	if( _objectData.type == "LR.Entity.BitmapText"){
		if (_objectData.textData) {
			if(_objectData.textData.fontSize)
				_entity.fontSize = _objectData.textData.fontSize;
			if(_objectData.textData.font)
				_entity.font = _objectData.textData.font;
			if(_objectData.textData.maxChar)
				_entity.maxCharPerLine = _objectData.textData.maxChar;
			_entity.text = _objectData.textData.text;	
			_entity.setStyle();	
		}
	}
};

LR.LevelImporter.prototype.setDisplay = function(_objectData, _entity) {
	_entity.visible = _objectData.visible;
	_entity.alpha = _objectData.alpha || 1;



	if (_objectData.key) {
		var w = _entity.width;
		var h = _entity.height;
		var scaleX = _objectData.scaleX;
		var scaleY = _objectData.scaleY;

		//don't set a frame for atalses, they don't need it and it can mess the entity up
		if( _objectData.frameName == null )
			_entity.loadTexture(_objectData.key, _objectData.frame);
		else
			_entity.loadTexture(_objectData.key);
		//scale and size can be messy after loading a texture
		_entity.width = w;
		_entity.height = h;
		_entity.scale.x = scaleX;
		_entity.scale.y = scaleY;

		if( _objectData.type == "LR.Entity.TileSprite" && _entity.game.renderType == Phaser.CANVAS){
			_entity.tilePosition.y = h ;//* 0.5;
			_entity.tilePosition.x = w ;//* 0.5;
		}
	}


	if( _objectData.frameName ){
		_entity.isAtlas = true;
		_entity.frameName = _objectData.frameName;
	}

	if(_objectData.type == "LR.Entity.Button"){
		_entity.setFrames(
			_objectData.onOverFrameID|0,
			_objectData.onOutFrameID|0,
			_objectData.onDownFrameID|0,
			_objectData.onUpFrameID|0
		);
	}

	//tint color
	if( _objectData.tint != null ){
		if( typeof(_objectData.tint) == "string"){
			_entity.tint = parseInt(_objectData.tint);
		}else{
			_entity.tint = _objectData.tint;
		}
	}

	//Animations
	if( _objectData.anims){
		for( var key in _objectData.anims){
			var newAnim = _entity.animations.add(
				key,
				_objectData.anims[key].frames,
				_objectData.anims[key].speed,
				_objectData.anims[key].loop
			);
			if( _objectData.anims[key].timer != null )
				newAnim.timer = _objectData.anims[key].timer ;
		}
	}
};

/*
* Adds a body to the entity with the data provided by objectData and creates all shapes
*/
LR.LevelImporter.prototype.setPhysics = function(_objectData, _entity) {
	_entity.go.layer = _objectData.layer;

	var motionState = Phaser.Physics.P2.Body.DYNAMIC;
	if (_objectData.body.motion === "STATIC"){
		motionState = Phaser.Physics.P2.Body.STATIC;
	} else if( _objectData.body.motion === "KINEMATIC"){
		motionState = Phaser.Physics.P2.Body.KINEMATIC;
	}

	//P2 crash when adding a body onto a sprite with scales < 0
	//so we need a workaround. we'll temporarily change its scale beforce adding the body
	var scale = { x : _entity.scale.x, y : _entity.scale.y};
	if( scale.x < 0 ) _entity.scale.x *= -1;
	if( scale.y < 0 ) _entity.scale.y *= -1;

	_entity.go.enablePhysics(motionState);

	//Rescale after sprite workaround
	_entity.scale.x = scale.x; _entity.scale.y = scale.y;

	//adding a body has prevented us from setting the position directly to the sprite
	_entity.body.x = _objectData.x;
	_entity.body.y = _objectData.y;

	_entity.body.fixedRotation = _objectData.body.fixedRotation;
	_entity.body.angle = _objectData.body.angle;
	_entity.body.data.gravityScale = _objectData.body.gravity;
	_entity.body.data.mass = _objectData.body.mass;

	_entity.body.bindRotation = _objectData.body.bindRotation || false;
	if( _entity.body.bindRotation ){
		_entity.body._offsetRotation = _objectData.body.offsetRotation;
	}
	// go through the shapes data and create real shapes
	for( var i=0; i < _objectData.body.shapes.length ; i++){
		var shapeData = _objectData.body.shapes[i];
		//this will replace a shape or replace the current one
		var newShape = null;
		if(shapeData.type == "rectangle" || shapeData.type == null){
			newShape = _entity.go.replaceShapeByRectangle(i, shapeData);	
		}else if(shapeData.type == "circle"){
			newShape = _entity.go.replaceShapeByCircle(i, shapeData);	
		} 	
		newShape.sensor = shapeData.sensor;
		newShape.lr_name = shapeData.name;
	}
};

LR.LevelImporter.prototype.setBehaviours = function(_objectData, _entity) {
	_entity.behaviours = JSON.parse( JSON.stringify(_objectData.behaviours) );
};

LR.LevelImporter.prototype.setTweens = function(_objectData, _entity) {};

LR.LevelImporter.prototype.setSounds = function(_objectData, _entity) {};