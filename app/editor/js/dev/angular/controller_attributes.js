"use strict";

// get module LREditor.controllers
var LREditorCtrlMod = angular.module('LREditor.controllers');

// create controller LoginCtrol in the module LREditor.controllers
LREditorCtrlMod.controller('AttributesCtrl', ["$scope", "$http","$modal", "$timeout",
	function($scope, $http,$modal, $timeout) {
	function main() {
		$scope.currentEntity = null;
		$scope.noneImage = new Image();
		$scope.noneImage.name = "none";
		$scope.data = {
			newBehaviour: "",
			image: $scope.noneImage,
			imageFrame: 0,
			images: new Array(),
			body : {shapes : []}
		};

		$scope.modalArgsData = {
			args : {}
		};

		$scope.$on("sendImagesBroadcast", function(_event, _args) {
			if (_args.images) {
				$scope.data.images = [$scope.noneImage];
				$scope.data.images = $scope.data.images.concat(_args.images);
			}
		});

		$scope.$on("refreshCurrentEntityBroadcast", function(_event, _args) {
			$scope.refreshCurrentEntity(_args.entity,_args.forceBodyRefresh);
		});

		$timeout(function() {
			$scope.$emit("getImagesEmit");
		}, 1000);
	};

	//================================================================
	//						GENERAL
	//================================================================

	$scope.setX = function(_x){
		if( $scope.currentEntity && $scope.currentEntity.go){
			if( $scope.currentEntity.ed_fixedToCamera){
				$scope.currentEntity.cameraOffset.x = _x;
			}else{				
				$scope.currentEntity.go.setX(_x);
			}
		}
	};

	$scope.setY = function(_y){
		if( $scope.currentEntity && $scope.currentEntity.go ){
			if( $scope.currentEntity.ed_fixedToCamera){
				$scope.currentEntity.cameraOffset.y = _y;
			}else{				
				$scope.currentEntity.go.setY(_y);
			}
		}
	};

	$scope.refreshCurrentEntity = function(_entity,_forceBody) {
		if (_entity != null) {
			var isNew = ($scope.currentEntity !== _entity);

			if ($scope.currentEntity) {
				$scope.currentEntity.drawBounds = false;
			}

			$scope.currentEntity = _entity;

			//TYPE
			if( _entity.type == Phaser.GROUP ){
				$scope.data.type = "group";
				return;
			}else if( _entity.type == Phaser.TEXT){
				$scope.data.type = "text";
			}else{
				$scope.data.type = "sprite";
			}
			
			var key = $scope.currentEntity.key;
			if (key === "" || key === "__missing" || key == null) {
				$scope.data.image = $scope.noneImage;
			} if (key !== "none") {
				var image = $scope.currentEntity.game.cache.getImage(key);
				$scope.data.image = image;
			}
			$scope.data.imageFrame = $scope.currentEntity.frame;

			//position
			if( _entity.ed_fixedToCamera == true){
				$scope.data.entityX = _entity.cameraOffset.x;
				$scope.data.entityY = _entity.cameraOffset.y;
			}else{
				$scope.data.entityX = _entity.x;
				$scope.data.entityY = _entity.y;
			}
			//body
			if( (isNew || _forceBody==true) && $scope.currentEntity.body ){
				$scope.data.body.shapes = new Array();
				//Get shapes and store their data
				for(var i=0; i < $scope.currentEntity.go.getShapesCount(); i++){
					var data = $scope.currentEntity.go.getShapeData(i);
					var shape = $scope.currentEntity.go.getShape(i);
					var edDataShape = { 
						"x" : data.x , "y" : data.y, 
						"width" : data.width, "height" : data.height,
						"rotation" : data.rotation,
						"id":i
						};
					$scope.data.body.shapes.push(edDataShape);
				}
			}
		} else {
			console.error("entity is null");
		}
	};

	$scope.clone = function() {
		$scope.$emit("cloneEntityEmit", {entity: $scope.currentEntity});
	}

	$scope.delete = function() {
		$scope.$emit("deleteEntityEmit", {entity: $scope.currentEntity});
	}

	$scope.setParent = function(_parent) {
		if (_parent != null) {
			var oldParent = $scope.currentEntity.parent;
			oldParent.remove($scope.currentEntity);
			_parent.add($scope.currentEntity);
		}
	};

	//================================================================
	//						BEHAVIOURS
	//================================================================

	$scope.deleteBehaviour = function(_behaviour) {
		if (_behaviour) {
			var behaviours = $scope.currentEntity.behaviours;
			var i=0;
			var found = false;
			while (i<behaviours.length && found == false) {
				var b = behaviours[i];
				if (b === _behaviour) {
					behaviours.splice(i, 1);
				}

				i++;
			}
		}
	};

	$scope.addBehaviour = function(classname) {
		if ($scope.currentEntity) {
			if (typeof classname === "string" && classname != "") {
				if( $scope.currentEntity.behaviours == null )
					$scope.currentEntity.behaviours = new Array();
				var behaviour = {
					classname: classname,
					args: "{}"
				};
				$scope.currentEntity.behaviours.push(behaviour);
				$scope.data.newBehaviour = "";
			}
		}
	};

	//================================================================
	//						DISPLAY
	//================================================================

	$scope.changeTexture = function(_image, _frame) {
		if (typeof _image !== "object") {
			_image = new Image();
		}
		if (_image.name === "" || _image.name == null) {
			_image.name = null;
		}

		if (_frame === "" || _frame == null) {
			_frame = 0;
		}

		$scope.currentEntity.loadTexture(_image.name);
		$scope.currentEntity.frame = parseInt(_frame);
	};

	$scope.changeDepth = function(_value){
		if( $scope.currentEntity ){
			if( _value < 0 ){
				$scope.currentEntity.parent.moveDown($scope.currentEntity);
			}else{
				$scope.currentEntity.parent.moveUp($scope.currentEntity);
			}
		}
	}

	$scope.toggleVisible = function(){
		if( $scope.currentEntity ){
			$scope.currentEntity.visible = ! $scope.currentEntity.visible;
		}
	}

	$scope.toggleLock = function(_lock){
		if( $scope.currentEntity && $scope.currentEntity.type != Phaser.GROUP ){
			$scope.currentEntity.ed_locked = _lock;
			if( $scope.currentEntity.ed_locked)
				$scope.$emit("lockEntityEmit",{ entity : $scope.currentEntity});
			else
				$scope.currentEntity.go.sendMessage("unlock");
		}
	}

	$scope.toggleFixedToCamera = function(){
		if( $scope.currentEntity && $scope.currentEntity.ed_fixedToCamera ){
			$scope.$emit("fixEntityToCameraEmit",{entity : $scope.currentEntity});
		}else{
			var bh = $scope.currentEntity.go.getBehaviour(LR.Editor.Behaviour.EntityCameraFixer);
			if( bh ){
				bh.enabled = false;
			}
		}
	}


	//================================================================
	//						BODY
	//================================================================

	$scope.addBodyToCurrentEntity = function(){
		if( $scope.currentEntity && $scope.currentEntity.go ){
			//console.log("AddBody");
			$scope.currentEntity.go.enablePhysics(Phaser.Physics.P2.Body.DYNAMIC);
			$scope.currentEntity.go.enableSensor();
			$scope.currentEntity.body.debug = true;

			$scope.currentEntity.body.ed_enabled = true;
			$scope.currentEntity.body.ed_motion = "DYNAMIC";
			$scope.currentEntity.body.ed_debugEditor = true;

			$scope.currentEntity.go.getShape().lr_name = "mainShape";
			//move group of the debug body in the editor group ( preventing from exporting it )
			$scope.$emit("moveEntityToEditorEmit",{ entity : $scope.currentEntity.body.debugBody});

			$scope.refreshCurrentEntity($scope.currentEntity,true);
		}
	};

	$scope.removeBodyFromCurrentEntity = function(){
		if( $scope.currentEntity && $scope.currentEntity.go ){
			$scope.currentEntity.go.removePhysics();
			$scope.currentEntity.body = null;
			$scope.refreshCurrentEntity($scope.currentEntity,true);
		}
	};

	$scope.toggleBodyDebug = function(){
		if( $scope.currentEntity.body ){
			if($scope.currentEntity.body.debugBody != null){
				$scope.currentEntity.body.debug = false;
			}else{
				$scope.currentEntity.body.debug = true;
				//move group of the debug body in the editor group ( preventing from exporting it )
				$scope.$emit("moveEntityToEditorEmit",{ entity : $scope.currentEntity.body.debugBody});
			}
		}
	}

	$scope.resizeBody = function(){
		if( $scope.currentEntity && $scope.currentEntity.body ){
			console.log($scope.data.body);
			var newShape = $scope.currentEntity.body.setRectangle(
					$scope.data.body.width, $scope.data.body.height,
					$scope.data.body.x, $scope.data.body.y,
					LR.Utils.toRadians($scope.data.body.rotation)
				);
			newShape.sensor = true;
		}
	}

	$scope.addShapeToCurrentEntity = function(_name){
		if( $scope.currentEntity && $scope.currentEntity.body ){
			if( _name == null ||_name == "" )
				_name = "shape"+ ( $scope.currentEntity.go.getShapesCount() - 1 );

			var newShape = $scope.currentEntity.body.addRectangle($scope.currentEntity.width,$scope.currentEntity.height);
			newShape.mass = 0;
			newShape.sensor = true;
			newShape.lr_name = _name;
			$scope.refreshCurrentEntity($scope.currentEntity,true);
			$scope.shapeName = "";
		}
	}

	$scope.resizeShape = function(_index){
		if( $scope.currentEntity && $scope.currentEntity.body ){
			var formerEdSensor = this.currentEntity.go.getShape(_index).ed_sensor;
			var shape = $scope.currentEntity.go.replaceShapeByRectangle(_index, $scope.data.body.shapes[_index] )		
			shape.sensor = true;
			shape.ed_sensor = formerEdSensor;
		}
	}

	$scope.resetShape = function(_index){
		if( $scope.currentEntity && $scope.currentEntity.body ){
			var dataShape = { 
						"x" : 0, "y" : 0, 
						"width" : $scope.currentEntity.width, "height" : $scope.currentEntity.height,
						"rotation" : 0
						};
			var shape = $scope.currentEntity.go.replaceShapeByRectangle(_index, dataShape )		
			shape.sensor = true;
			$scope.refreshCurrentEntity($scope.currentEntity,true);
		}
	}

	$scope.deleteShape = function(_index){
		if( $scope.currentEntity && $scope.currentEntity.body && $scope.currentEntity.go.getShapesCount() > 1){
			console.log("Delete Shape");
			$scope.currentEntity.body.removeShape($scope.currentEntity.go.getShape(_index));
			$scope.currentEntity.body.shapeChanged();
			$scope.refreshCurrentEntity($scope.currentEntity,true);
		}
	}

	//=========================================================
	//					MODALS
	//=========================================================
	/*
	* Opens the Edit Modal. At validation, this will modify the _textVarName varialbe of the _textContext
	*/
	$scope.openEditModal = function(_textContext, _textVarName, _isLong) {
   		$scope.$emit("openEditModalEmit", { context : _textContext, varName : _textVarName, isLong : _isLong});
	};

	$scope.openBehaviourArgsModal = function( _behaviour ) {

		// we need args as an object, but it is stored as a string
		$scope.modalArgsData.classname = _behaviour.classname;
		$scope.modalArgsData.args = jQuery.parseJSON( _behaviour.args);
		$scope.modalArgsData.behaviour = _behaviour;
		//Stringify args value
		for(var key in $scope.modalArgsData.args ){
			$scope.modalArgsData.args[key] = JSON.stringify( $scope.modalArgsData.args[key]);
		}
		
		var modalInstance = $modal.open({
			scope: $scope,
			templateUrl: 'partials/modals/behaviour_args_modal.html',
			controller: BehaviourArgsCtrlModal,
			resolve: {
			}
		});

		modalInstance.result.then(function (_data) {
		}, function () {
			// clean modal data
			console.info('Modal dismissed at: ' + new Date());
		});
	};

	main();
}]);